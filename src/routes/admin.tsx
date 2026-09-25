import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ExternalLink, Loader2, Lock, LogOut, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Toaster } from "sonner";

import { DonationsPanel } from "@/components/admin/DonationsPanel";
import { Overview } from "@/components/admin/Overview";
import { ProductsPanel } from "@/components/admin/ProductsPanel";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { Btn, inputCls } from "@/components/admin/ui";
import {
  adminLogin,
  adminLogout,
  getAdminData,
  getAdminSession,
} from "@/lib/campaign/admin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel · Culto Kids | CBVIDA RIO" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800&display=swap",
      },
    ],
  }),
  loader: () => getAdminSession(),
  component: AdminPage,
});

function AdminPage() {
  const session = Route.useLoaderData();
  return (
    <div className="kids min-h-screen">
      <Toaster position="bottom-center" richColors />
      {!session.configured ? <NotConfigured /> : session.authenticated ? <Dashboard /> : <Login />}
    </div>
  );
}

function NotConfigured() {
  return (
    <main className="mx-auto max-w-md px-5 py-20 text-center">
      <Lock className="mx-auto h-10 w-10 text-kid-red" />
      <h1 className="mt-3 font-kid-display text-2xl font-extrabold">
        Painel ainda não configurado
      </h1>
      <p className="mt-2 text-kid-muted">
        Defina a variável de ambiente <code className="font-bold">ADMIN_PASSWORD</code> no servidor
        para liberar o acesso administrativo.
      </p>
    </main>
  );
}

function Login() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      const r = await adminLogin({ data: { password } });
      if (r.ok) await router.invalidate();
      else setError(r.message);
    } catch {
      setError("Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-kid-blue px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[2rem] bg-white p-7 shadow-2xl">
        <p className="text-center text-xs font-extrabold uppercase tracking-[0.25em] text-kid-muted">
          CBVIDA RIO
        </p>
        <h1 className="mt-1 text-center font-kid-display text-3xl font-extrabold uppercase">
          Culto Kids 🎉
        </h1>
        <p className="text-center font-semibold text-kid-muted">Painel administrativo</p>
        <label className="mt-6 block">
          <span className="mb-1 block text-sm font-extrabold">Senha</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(inputCls, "h-12")}
            autoFocus
          />
        </label>
        {error && <p className="mt-2 text-sm font-bold text-kid-red">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-kid-blue font-extrabold uppercase text-white disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}{" "}
          Entrar
        </button>
      </form>
    </main>
  );
}

const TABS = [
  { id: "overview", label: "📊 Resumo" },
  { id: "donations", label: "🎁 Doações" },
  { id: "pix", label: "💠 PIX" },
  { id: "products", label: "🧺 Produtos" },
  { id: "settings", label: "⚙️ Configurações" },
] as const;

type Tab = (typeof TABS)[number]["id"];

function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const query = useQuery({
    queryKey: ["culto-kids", "admin"],
    queryFn: () => getAdminData(),
    refetchInterval: 30_000,
    retry: (count, err) => !String(err).includes("UNAUTHORIZED") && count < 2,
  });

  if (query.error && String(query.error).includes("UNAUTHORIZED")) {
    void router.invalidate();
  }

  const refresh = () => void query.refetch();
  const pendingPix = query.data?.donations.filter((d) => d.status === "PIX_PENDING").length ?? 0;
  const reserved = query.data?.donations.filter((d) => d.status === "RESERVED").length ?? 0;

  async function logout() {
    await adminLogout();
    await router.invalidate();
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-kid-blue text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] opacity-80">
              CBVIDA RIO · Painel
            </p>
            <p className="truncate font-kid-display text-xl font-extrabold uppercase leading-tight">
              Culto Kids 🎉
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"
            aria-label="Atualizar"
          >
            <RefreshCw className={cn("h-5 w-5", query.isFetching && "animate-spin")} />
          </button>
          <Link
            to="/culto-kids"
            target="_blank"
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"
            aria-label="Ver página pública"
          >
            <ExternalLink className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={logout}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"
            aria-label="Sair"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative shrink-0 rounded-xl px-3.5 py-2 text-sm font-extrabold transition",
                tab === t.id ? "bg-white text-kid-ink" : "text-white/85 hover:bg-white/10",
              )}
            >
              {t.label}
              {t.id === "pix" && pendingPix > 0 && (
                <span className="ml-1.5 rounded-full bg-kid-red px-1.5 py-0.5 text-[11px] text-white">
                  {pendingPix}
                </span>
              )}
              {t.id === "donations" && reserved > 0 && (
                <span className="ml-1.5 rounded-full bg-kid-yellow px-1.5 py-0.5 text-[11px] text-kid-ink">
                  {reserved}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {query.isLoading && (
          <div className="grid h-64 place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-kid-blue" />
          </div>
        )}
        {query.error && !String(query.error).includes("UNAUTHORIZED") && (
          <div className="rounded-2xl bg-kid-red-soft p-4 font-bold">
            Não foi possível carregar os dados.{" "}
            <Btn tone="red" onClick={refresh}>
              Tentar novamente
            </Btn>
          </div>
        )}
        {query.data && (
          <>
            {tab === "overview" && <Overview data={query.data} />}
            {tab === "donations" && (
              <DonationsPanel key="all" data={query.data} onChanged={refresh} />
            )}
            {tab === "pix" && (
              <DonationsPanel key="pix" data={query.data} onChanged={refresh} pixOnly />
            )}
            {tab === "products" && <ProductsPanel data={query.data} onChanged={refresh} />}
            {tab === "settings" && (
              <SettingsPanel
                key={query.data.settings.campaignDeadline}
                data={query.data}
                onChanged={refresh}
              />
            )}
          </>
        )}
      </main>
    </>
  );
}
