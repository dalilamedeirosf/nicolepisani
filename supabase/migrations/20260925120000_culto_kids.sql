-- =====================================================================
-- Culto Kids | CBVIDA RIO — lista virtual de doações
--
-- Todas as tabelas ficam com RLS ativado e SEM políticas: somente o
-- servidor da aplicação (service role) lê e escreve. Nenhum dado de
-- doador (telefone, comprovante) é acessível pela chave pública.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- SETTINGS (linha única, id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id                 integer primary key default 1 check (id = 1),
  campaign_name      text        not null default 'Culto Kids',
  institution_name   text        not null default 'CBVIDA RIO',
  campaign_deadline  timestamptz not null default '2026-12-15 23:59:59-03',
  campaign_active    boolean     not null default true,
  pix_key            text        not null default '+5521986422434',
  pix_recipient      text        not null default '',
  pix_city           text        not null default 'RIO DE JANEIRO',
  pix_qr_enabled     boolean     not null default true,
  delivery_location  text        not null default 'Na CBVIDA RIO',
  campaign_message   text        not null default 'Estamos preparando um Culto Kids muito especial para aproximadamente 100 crianças e você pode fazer parte desse momento conosco.',
  children_goal      integer     not null default 100 check (children_goal > 0),
  show_supporters    boolean     not null default true,
  updated_at         timestamptz not null default now()
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  name              text          not null,
  category          text          not null,
  description       text          not null default '',
  unit_description  text          not null,             -- o que é 1 cota. Ex.: "1 kg de salsicha"
  unit_amount       numeric(10,2) not null default 1 check (unit_amount > 0),
  unit_singular     text          not null default 'unidade',
  unit_plural       text          not null default 'unidades',
  total_units       integer       not null check (total_units >= 0), -- número de cotas necessárias
  estimated_price   numeric(10,2) not null check (estimated_price >= 0), -- valor estimado por cota
  icon              text          not null default '🎁',
  sort_order        integer       not null default 0,
  active            boolean       not null default true,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);

create index if not exists products_sort_idx on public.products (sort_order, created_at);

-- ---------------------------------------------------------------------
-- DONATIONS
-- ---------------------------------------------------------------------
create table if not exists public.donations (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid          not null references public.products(id) on delete restrict,
  donor_name          text          not null check (length(donor_name) between 2 and 120),
  phone               text          not null check (length(phone) between 10 and 13),
  donation_type       text          not null check (donation_type in ('PRODUCT', 'PIX')),
  quantity            integer       not null check (quantity > 0),
  unit_price          numeric(10,2) not null,   -- preço da cota no momento da contribuição
  estimated_value     numeric(10,2) not null,   -- unit_price * quantity (nunca muda retroativamente)
  reported_pix_value  numeric(10,2),
  status              text          not null check (status in
                        ('RESERVED', 'PRODUCT_RECEIVED', 'PIX_PENDING', 'PIX_CONFIRMED', 'CANCELLED')),
  admin_notes         text          not null default '',
  status_changed_at   timestamptz,
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now(),
  constraint donations_status_matches_type check (
    status = 'CANCELLED'
    or (donation_type = 'PRODUCT' and status in ('RESERVED', 'PRODUCT_RECEIVED'))
    or (donation_type = 'PIX'     and status in ('PIX_PENDING', 'PIX_CONFIRMED'))
  )
);

create index if not exists donations_product_idx on public.donations (product_id, status);
create index if not exists donations_created_idx on public.donations (created_at desc);

-- ---------------------------------------------------------------------
-- COMPROVANTES PIX (privados; só o painel administrativo acessa)
-- ---------------------------------------------------------------------
create table if not exists public.donation_receipts (
  donation_id  uuid primary key references public.donations(id) on delete cascade,
  filename     text        not null default 'comprovante',
  mime         text        not null,
  data_base64  text        not null,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists donations_touch on public.donations;
create trigger donations_touch before update on public.donations
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- RLS: bloqueia tudo para anon/authenticated. O service role ignora RLS.
-- ---------------------------------------------------------------------
alter table public.settings          enable row level security;
alter table public.products          enable row level security;
alter table public.donations         enable row level security;
alter table public.donation_receipts enable row level security;

-- ---------------------------------------------------------------------
-- create_donation: reserva atômica de cotas.
--
-- Trava a linha do produto (FOR UPDATE) antes de somar as cotas já
-- comprometidas. Duas pessoas tentando a última cota ao mesmo tempo são
-- serializadas: a primeira reserva, a segunda recebe SOLD_OUT.
-- ---------------------------------------------------------------------
create or replace function public.create_donation(
  p_product_id     uuid,
  p_donation_type  text,
  p_quantity       integer,
  p_donor_name     text,
  p_phone          text,
  p_reported_value numeric default null,
  p_receipt_mime   text    default null,
  p_receipt_data   text    default null,
  p_receipt_name   text    default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings  public.settings%rowtype;
  v_product   public.products%rowtype;
  v_used      integer;
  v_donation  public.donations%rowtype;
begin
  if p_donation_type not in ('PRODUCT', 'PIX') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TYPE');
  end if;
  if p_quantity is null or p_quantity < 1 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_QUANTITY');
  end if;

  select * into v_settings from public.settings where id = 1;
  if not v_settings.campaign_active or now() > v_settings.campaign_deadline then
    return jsonb_build_object('ok', false, 'code', 'CAMPAIGN_CLOSED');
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found or not v_product.active then
    return jsonb_build_object('ok', false, 'code', 'PRODUCT_UNAVAILABLE');
  end if;

  select coalesce(sum(quantity), 0) into v_used
    from public.donations
   where product_id = p_product_id and status <> 'CANCELLED';

  if v_used + p_quantity > v_product.total_units then
    return jsonb_build_object(
      'ok', false,
      'code', 'SOLD_OUT',
      'available', greatest(v_product.total_units - v_used, 0)
    );
  end if;

  insert into public.donations (
    product_id, donor_name, phone, donation_type, quantity,
    unit_price, estimated_value, reported_pix_value, status
  ) values (
    p_product_id, trim(p_donor_name), p_phone, p_donation_type, p_quantity,
    v_product.estimated_price, v_product.estimated_price * p_quantity,
    case when p_donation_type = 'PIX' then p_reported_value else null end,
    case when p_donation_type = 'PIX' then 'PIX_PENDING' else 'RESERVED' end
  ) returning * into v_donation;

  if p_donation_type = 'PIX' and p_receipt_data is not null and p_receipt_mime is not null then
    insert into public.donation_receipts (donation_id, filename, mime, data_base64)
    values (v_donation.id, coalesce(p_receipt_name, 'comprovante'), p_receipt_mime, p_receipt_data);
  end if;

  return jsonb_build_object('ok', true, 'donation', to_jsonb(v_donation));
end $$;

-- ---------------------------------------------------------------------
-- admin_update_donation: altera status / quantidade / dados de uma
-- doação. Revalida a disponibilidade com a mesma trava quando a doação
-- volta a ocupar cotas (ex.: reativar uma reserva cancelada).
-- Parâmetros nulos = manter o valor atual.
-- ---------------------------------------------------------------------
create or replace function public.admin_update_donation(
  p_id             uuid,
  p_status         text    default null,
  p_quantity       integer default null,
  p_donor_name     text    default null,
  p_phone          text    default null,
  p_reported_value numeric default null,
  p_admin_notes    text    default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current  public.donations%rowtype;
  v_product  public.products%rowtype;
  v_status   text;
  v_quantity integer;
  v_used     integer;
  v_result   public.donations%rowtype;
begin
  select * into v_current from public.donations where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  -- trava o produto e relê a doação já sob a trava
  select * into v_product from public.products where id = v_current.product_id for update;
  select * into v_current from public.donations where id = p_id;

  v_status   := coalesce(p_status, v_current.status);
  v_quantity := coalesce(p_quantity, v_current.quantity);

  if v_quantity < 1 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_QUANTITY');
  end if;
  if not (
    v_status = 'CANCELLED'
    or (v_current.donation_type = 'PRODUCT' and v_status in ('RESERVED', 'PRODUCT_RECEIVED'))
    or (v_current.donation_type = 'PIX'     and v_status in ('PIX_PENDING', 'PIX_CONFIRMED'))
  ) then
    return jsonb_build_object('ok', false, 'code', 'INVALID_STATUS');
  end if;

  if v_status <> 'CANCELLED' then
    select coalesce(sum(quantity), 0) into v_used
      from public.donations
     where product_id = v_current.product_id and status <> 'CANCELLED' and id <> p_id;
    if v_used + v_quantity > v_product.total_units then
      return jsonb_build_object(
        'ok', false,
        'code', 'SOLD_OUT',
        'available', greatest(v_product.total_units - v_used, 0)
      );
    end if;
  end if;

  update public.donations set
    status             = v_status,
    quantity           = v_quantity,
    estimated_value    = unit_price * v_quantity,  -- usa o preço registrado, nunca o atual
    donor_name         = coalesce(nullif(trim(p_donor_name), ''), donor_name),
    phone              = coalesce(p_phone, phone),
    reported_pix_value = coalesce(p_reported_value, reported_pix_value),
    admin_notes        = coalesce(p_admin_notes, admin_notes),
    status_changed_at  = case when v_status <> v_current.status then now() else status_changed_at end
  where id = p_id
  returning * into v_result;

  return jsonb_build_object('ok', true, 'donation', to_jsonb(v_result));
end $$;

revoke all on function public.create_donation(uuid, text, integer, text, text, numeric, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_update_donation(uuid, text, integer, text, text, numeric, text) from public, anon, authenticated;

-- O servidor da aplicação usa a service role (garantido explicitamente).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema public to service_role;
    grant select, insert, update, delete on public.settings, public.products, public.donations, public.donation_receipts to service_role;
    grant execute on function public.create_donation(uuid, text, integer, text, text, numeric, text, text, text) to service_role;
    grant execute on function public.admin_update_donation(uuid, text, integer, text, text, numeric, text) to service_role;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Lista inicial de itens (somente se a tabela estiver vazia).
-- Tudo pode ser alterado depois pelo painel /admin.
-- ---------------------------------------------------------------------
insert into public.products
  (name, category, unit_description, unit_amount, unit_singular, unit_plural, total_units, estimated_price, icon, sort_order)
select * from (values
  ('Pães',               'Cachorro-quente', '20 pães de cachorro-quente',       20, 'pão',                'pães',                  6, 20.00, '🥖',  10),
  ('Salsicha',           'Cachorro-quente', '1 kg de salsicha',                  1, 'kg de salsicha',     'kg de salsicha',        7, 15.00, '🌭',  20),
  ('Molho de tomate',    'Cachorro-quente', '2 unidades de molho de tomate',     2, 'molho de tomate',    'molhos de tomate',      3, 10.00, '🍅',  30),
  ('Milho',              'Cachorro-quente', '2 latas/sachês de milho',           2, 'lata/sachê de milho','latas/sachês de milho', 3, 12.00, '🌽',  40),
  ('Batata palha',       'Cachorro-quente', '1 kg de batata palha',              1, 'kg de batata palha', 'kg de batata palha',    3, 30.00, '🥔',  50),
  ('Ketchup',            'Cachorro-quente', '1 ketchup grande',                  1, 'ketchup grande',     'ketchups grandes',      2, 15.00, '🥫',  60),
  ('Maionese',           'Cachorro-quente', '1 maionese grande',                 1, 'maionese grande',    'maioneses grandes',     2, 15.00, '🫙',  70),
  ('Mostarda',           'Cachorro-quente', '1 mostarda grande',                 1, 'mostarda grande',    'mostardas grandes',     2, 12.00, '🧴',  80),
  ('Milho para pipoca',  'Pipoca',          '1 kg de milho para pipoca',         1, 'kg de milho',        'kg de milho',           5, 12.00, '🍿', 110),
  ('Balas',              'Doces',           '100 balas',                       100, 'bala',               'balas',                 5, 20.00, '🍬', 210),
  ('Pirulitos',          'Doces',           '30 pirulitos',                     30, 'pirulito',           'pirulitos',             4, 20.00, '🍭', 220),
  ('Chocolates',         'Doces',           '30 chocolates pequenos/Bis',       30, 'chocolate',          'chocolates',            4, 30.00, '🍫', 230),
  ('Mini bolinhos / cupcakes', 'Doces',     '25 mini bolinhos/cupcakes',        25, 'unidade',            'unidades',              4, 40.00, '🧁', 240),
  ('Refrigerante',       'Bebidas',         '3 refrigerantes de 2 litros',       3, 'refrigerante de 2 L','refrigerantes de 2 L',  5, 30.00, '🥤', 310),
  ('Suco',               'Bebidas',         '2 sucos de 2 litros',               2, 'suco de 2 L',        'sucos de 2 L',          5, 20.00, '🧃', 320),
  ('Água',               'Bebidas',         '1 fardo de água',                   1, 'fardo de água',      'fardos de água',        2, 25.00, '💧', 330),
  ('Copos descartáveis', 'Descartáveis',    '50 copos descartáveis',            50, 'copo',               'copos',                 4, 10.00, '🥛', 410),
  ('Guardanapos',        'Descartáveis',    '50 guardanapos',                   50, 'guardanapo',         'guardanapos',           4,  8.00, '🧻', 420),
  ('Sacos de lixo',      'Descartáveis',    '5 sacos de lixo grandes',           5, 'saco de lixo',       'sacos de lixo',         2, 15.00, '🗑️', 430)
) as seed(name, category, unit_description, unit_amount, unit_singular, unit_plural, total_units, estimated_price, icon, sort_order)
where not exists (select 1 from public.products);
