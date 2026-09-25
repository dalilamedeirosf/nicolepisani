# Culto Kids | CBVIDA RIO — Lista virtual de doações

Página pública: **`/culto-kids`** · Painel administrativo: **`/admin`**

O site existente da Dra. Nicole Pisani continua em `/`. A campanha foi criada em
rotas separadas para não alterar o site atual.

## O que o sistema faz

- Lista de itens por categoria, com cotas, valor estimado, progresso e "faltam X cotas".
- Duas formas de contribuir: **doar o produto** (reserva de cotas) ou **PIX** (valor da cota).
- PIX com chave, botão de copiar, **PIX copia e cola com o valor já preenchido** e **QR Code**.
- Upload opcional de comprovante (visível só no painel).
- PIX entra como **⏳ aguardando confirmação** — só o admin muda para **💠 PIX confirmado**.
- Reserva ≠ entrega: o admin confirma **📦 produto recebido**.
- **Nunca reserva mais cotas do que o necessário**: a checagem acontece no banco,
  com trava na linha do produto (`SELECT … FOR UPDATE`). Duas pessoas tentando a
  última cota ao mesmo tempo: a primeira reserva, a segunda vê
  "Essa cota acabou de ser preenchida ❤️".
- Contador regressivo; depois do prazo (ou se o admin encerrar), novas doações são
  bloqueadas **também no servidor**. O admin pode reabrir.
- Painel: resumo, gráficos, "🚨 itens que mais precisamos", gestão de doações e PIX
  (confirmar, recusar, editar, cancelar, reativar, contato por WhatsApp),
  edição/criação de itens e configurações da campanha.
- Mudança de preço vale só para novas contribuições; as antigas mantêm o valor registrado.
- Página pública nunca recebe telefone, comprovante ou dados administrativos.
  Apoiadores aparecem só pelo primeiro nome (pode ser desligado no painel).

## Colocar em produção

### 1. Banco de dados (Supabase)

Pode ser o Lovable Cloud ou um projeto Supabase próprio.

1. Abra o **SQL Editor** do Supabase.
2. Cole e rode o conteúdo de
   `supabase/migrations/20260925120000_culto_kids.sql`.
   Ele cria as tabelas, as funções de reserva e já cadastra a lista de itens,
   a data final (15/12/2026 às 23:59, horário de Brasília) e a chave PIX
   `+5521986422434`. Pode rodar mais de uma vez sem duplicar nada.

As tabelas ficam com RLS ativado e sem políticas: só o servidor (service role)
acessa. A chave pública do Supabase não consegue ler telefones nem comprovantes.

### 2. Variáveis de ambiente do servidor

| Variável | Para quê |
| --- | --- |
| `ADMIN_PASSWORD` | Senha do painel `/admin` (obrigatória) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (**segredo**, nunca use prefixo `VITE_`) |
| `ADMIN_SESSION_SECRET` | Opcional — segredo da sessão do admin |
| `VITE_SITE_URL` | Opcional — endereço público, para o preview do link no WhatsApp |

Sem `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` o sistema grava em
`.data/culto-kids.json`. Isso serve para desenvolvimento, **não** para
produção em Cloudflare Workers (não há disco persistente lá).

### 3. Antes de divulgar

1. Entre em `/admin` → **Configurações** e preencha o **nome do favorecido** do PIX
   e o **endereço de entrega**.
2. Faça um PIX de teste pelo QR Code / copia e cola e confira se cai na conta certa.
3. Confira preços e quantidades em **Produtos**.
4. Compartilhe o link `/culto-kids`.

## Desenvolvimento

```bash
bun install
ADMIN_PASSWORD=teste bun run dev
# http://localhost:8080/culto-kids  e  /admin
```

## Onde está o código

| Caminho | Conteúdo |
| --- | --- |
| `src/routes/culto-kids.tsx` | Página pública |
| `src/routes/admin.tsx` | Login e painel |
| `src/components/kids/` | Cards, modal de contribuição, contador, decoração |
| `src/components/admin/` | Resumo/gráficos, doações/PIX, produtos, configurações |
| `src/lib/campaign/types.ts` | Regras de negócio (progresso, status, formatação) |
| `src/lib/campaign/pix.ts` | Geração do PIX copia e cola (BR Code) |
| `src/lib/campaign/*.functions.ts` | Funções de servidor (públicas e admin) |
| `src/lib/campaign/store-*.server.ts` | Acesso ao banco (Supabase ou arquivo local) |
| `supabase/migrations/` | Esquema do banco e dados iniciais |
