"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthBrowserClient } from "@/lib/supabase/browser-auth";
import { NibbsLogo } from "@/components/NibbsLogo";
import { PortalPlano } from "@/components/portal/PortalPlano";
import { PortalPagamento } from "@/components/portal/PortalPagamento";
import { PortalDados } from "@/components/portal/PortalDados";
import { PLANOS_UI, matchPlanIndex } from "@/lib/planos-ui";

type Profile = {
  id: string;
  nome: string;
  email: string;
  celular: string | null;
  cpf: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
};

type Assinatura = {
  id: string;
  plano: string;
  plano_slug?: string | null;
  status: string;
  proxima_cobranca?: string | null;
  pausada_ate?: string | null;
  caixa_pulada_ate?: string | null;
  cancelamento_solicitado_em: string | null;
  motivo_cancelamento: string | null;
} | null;

type Caixa = {
  id: string;
  mes: string;
  ano: number;
  regiao: string | null;
  status: string;
  codigo_rastreio: string | null;
  entregue_em: string | null;
};

type Inicio = {
  titulo: string;
  mensagem: string;
  mes: string;
  regiao: string;
  status_caixa: string;
};

type Invoice = {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  invoiceUrl?: string;
  description?: string;
};

const TABS = [
  { id: "inicio", label: "Início", group: "Clube" },
  { id: "caixas", label: "Minhas caixas", group: "Clube" },
  { id: "plano", label: "Plano e assinatura", group: "Gestão da conta" },
  { id: "pagamento", label: "Pagamento", group: "Gestão da conta" },
  { id: "dados", label: "Dados e entrega", group: "Gestão da conta" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STEPS = ["Pagamento confirmado", "Separando barras", "Enviada", "Entregue"] as const;
const STATUS_MAP: Record<string, number> = {
  pagamento: 0,
  separando: 1,
  enviada: 2,
  entregue: 3,
};

function wa(msg: string, phone: string | null) {
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

export function PortalApp({
  profile,
  assinatura,
  caixas,
  inicio,
  invoices,
  whatsapp,
  isAdmin,
}: {
  profile: Profile;
  assinatura: Assinatura;
  caixas: Caixa[];
  inicio: Inicio;
  invoices: Invoice[];
  whatsapp: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("inicio");
  const [flash, setFlash] = useState("");
  const [welcome, setWelcome] = useState(caixas.length === 0);
  const [w, setW] = useState(1280);

  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    onR();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const wide = w >= 860;
  const first = profile.nome.split(/\s+/)[0] || profile.nome;
  const planIdx = matchPlanIndex(assinatura?.plano_slug || assinatura?.plano);
  const cur = PLANOS_UI[planIdx];
  const cancelled = assinatura?.status === "cancelled" || !!assinatura?.cancelamento_solicitado_em;
  const paused = assinatura?.status === "paused";
  const ativa = !!assinatura && assinatura.status === "active" && !cancelled;
  const statusLabel = cancelled ? "Cancelada" : paused ? "Pausada" : ativa ? "Ativa" : "Sem assinatura";
  const stepIdx = STATUS_MAP[inicio.status_caixa] ?? (ativa ? 1 : 0);
  const endereco =
    [profile.rua, profile.numero].filter(Boolean).join(", ") +
    (profile.cidade ? ` · ${profile.cidade}` : "");

  const groups = useMemo(() => {
    const g: Record<string, (typeof TABS)[number][]> = {};
    for (const t of TABS) (g[t.group] ??= []).push(t);
    return Object.entries(g);
  }, []);

  function go(id: TabId) {
    setTab(id);
    setFlash("");
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }

  async function logout() {
    const supabase = createAuthBrowserClient();
    await supabase.auth.signOut();
    router.push("/entrar");
    router.refresh();
  }

  function openWa(msg: string) {
    const url = wa(msg, whatsapp);
    if (!url) {
      setFlash("WhatsApp ainda não configurado. Fale com a gente por e-mail.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const h1: React.CSSProperties = {
    margin: 0,
    fontWeight: 900,
    fontVariationSettings: "'wdth' 62",
    fontSize: "clamp(44px, 5vw, 64px)",
    lineHeight: 0.9,
    textTransform: "uppercase",
  };

  const navItem = (id: TabId, label: string) => {
    const on = tab === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => go(id)}
        aria-current={on ? "page" : undefined}
        style={{
          all: "unset",
          cursor: "pointer",
          boxSizing: "border-box",
          minHeight: 44,
          padding: "0 12px",
          display: "flex",
          alignItems: "center",
          fontSize: 15,
          fontWeight: 600,
          background: on ? "#F6F3F1" : "transparent",
          color: on ? "#261714" : "#F6F3F1",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className="nb-portal"
      style={{
        display: "flex",
        flexDirection: wide ? "row" : "column",
        minHeight: "100vh",
        background: "#F6F3F1",
        color: "#261714",
        fontFamily: '"Archivo", system-ui, sans-serif',
      }}
    >
      <aside
        style={{
          flex: "none",
          boxSizing: "border-box",
          width: wide ? 260 : "100%",
          background: "#261714",
          color: "#F6F3F1",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          position: "sticky",
          top: 0,
          height: wide ? "100vh" : "auto",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <NibbsLogo variant="lockup" size={26} ink="#F6F3F1" accent="#E0505C" />
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {isAdmin && (
              <a href="/admin" style={{ color: "#CDBFBA", fontSize: 13, fontWeight: 600 }}>
                Admin
              </a>
            )}
            {!wide && (
              <button type="button" onClick={logout} style={{ all: "unset", cursor: "pointer", fontSize: 14, textDecoration: "underline", textUnderlineOffset: 3, color: "#F6F3F1" }}>
                Sair
              </button>
            )}
          </div>
        </div>

        {wide ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "14px 0", borderTop: "1px solid #4A3530", borderBottom: "1px solid #4A3530" }}>
              <b style={{ fontSize: 16 }}>{profile.nome}</b>
              <span style={{ fontSize: 13, color: "#CDBFBA" }}>
                {assinatura?.plano ?? "Sem plano"} · {statusLabel}
              </span>
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
              {groups.map(([group, items]) => (
                <div key={group} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#CDBFBA", padding: "0 12px 6px" }}>
                    {group}
                  </span>
                  {items.map((it) => navItem(it.id, it.label))}
                </div>
              ))}
            </nav>
            <button type="button" onClick={logout} style={{ all: "unset", cursor: "pointer", boxSizing: "border-box", minHeight: 44, padding: "0 12px", display: "flex", alignItems: "center", fontSize: 15, color: "#CDBFBA" }}>
              Sair
            </button>
          </div>
        ) : (
          <nav style={{ display: "flex", gap: 4, overflowX: "auto", margin: "0 -20px -20px", padding: "0 20px 12px" }}>
            {TABS.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => go(it.id)}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  flex: "none",
                  boxSizing: "border-box",
                  height: 40,
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  fontSize: 14,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  background: tab === it.id ? "#F6F3F1" : "transparent",
                  color: tab === it.id ? "#261714" : "#F6F3F1",
                }}
              >
                {it.label}
              </button>
            ))}
          </nav>
        )}
      </aside>

      <main style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "40px clamp(20px, 4vw, 56px) 96px" }}>
        <div style={{ maxWidth: 860, display: "flex", flexDirection: "column", gap: 32 }}>
          {flash && (
            <div role="status" style={{ background: "#2E6B45", color: "#F6F3F1", padding: "14px 16px", fontSize: 15, fontWeight: 600, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
              <span>{flash}</span>
              <button type="button" onClick={() => setFlash("")} aria-label="Fechar" style={{ all: "unset", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>
                ×
              </button>
            </div>
          )}

          {tab === "inicio" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {welcome ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, alignSelf: "flex-start", padding: "8px 12px 8px 8px", background: "#E8F0EA", border: "1px solid #C5D9CB" }}>
                    <span aria-hidden style={{ width: 22, height: 22, borderRadius: "50%", background: "#2E6B45", color: "#F6F3F1", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flex: "none" }}>
                      ✓
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#2E6B45" }}>Pagamento aprovado · conta criada</span>
                  </div>
                  <h1 style={{ ...h1, color: "#261714", maxWidth: "14ch" }}>Oi, {first}</h1>
                  <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: "#261714", fontWeight: 600, maxWidth: "42ch" }}>Bem-vinda ao clube.</p>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "#5E4B46", maxWidth: "56ch" }}>
                    Sua assinatura já está ativa. Para entrar de novo, use o e-mail e a senha que você definiu no checkout.
                  </p>
                </div>
              ) : (
                <h1 style={h1}>Oi, {first}</h1>
              )}

              {!ativa && (
                <div style={{ outline: "2px solid #261714", outlineOffset: -2, padding: 16, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 15 }}>
                  <span>
                    Sua assinatura está <b>{statusLabel.toLowerCase()}</b>.
                  </span>
                  <button type="button" onClick={() => go("plano")} style={{ all: "unset", cursor: "pointer", boxSizing: "border-box", height: 44, padding: "0 18px", background: "#B3202F", color: "#F6F3F1", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center" }}>
                    Ver plano
                  </button>
                </div>
              )}

              <div style={{ background: "#FFFFFF", outline: "1px solid #DDD3CE", outlineOffset: -1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" }}>
                <div style={{ position: "relative", minHeight: 260, background: "#EDE7E3", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", color: "#5E4B46", fontSize: 14, lineHeight: 1.45 }}>
                  Caixa da região do mês, fechada, com o cartão da região por cima.
                </div>
                <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B3202F" }}>
                    {caixas.length === 0 ? "Sua primeira caixa" : "Próxima caixa"} · {inicio.mes}
                  </span>
                  <h2 style={{ margin: 0, fontWeight: 800, fontVariationSettings: "'wdth' 75", fontSize: "clamp(30px, 3vw, 40px)", lineHeight: 0.95, textTransform: "uppercase" }}>
                    {inicio.regiao}
                  </h2>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "#5E4B46" }}>
                    {cur.what} Do mesmo lugar, para provar lado a lado.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginTop: "auto" }}>
                    {STEPS.map((label, i) => (
                      <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ height: 6, background: i <= stepIdx ? "#B3202F" : "#DDD3CE" }} />
                        <span style={{ fontSize: 12, lineHeight: 1.3, fontWeight: i === stepIdx ? 700 : 400 }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: 13, color: "#5E4B46" }}>{inicio.mensagem}</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 4 }}>
                {[
                  { k: "Plano", v: assinatura ? `${cur.name} · ${cur.price}/mês` : "—", cta: "Gerenciar", go: () => go("plano") },
                  {
                    k: "Próxima cobrança",
                    v: ativa && assinatura?.proxima_cobranca ? assinatura.proxima_cobranca.split("-").reverse().join("/") : ativa ? "Asaas" : "Nenhuma",
                    cta: "Pagamento",
                    go: () => go("pagamento"),
                  },
                  { k: "Entrega", v: endereco.trim() || "Completar endereço", cta: "Alterar endereço", go: () => go("dados") },
                ].map((s) => (
                  <button
                    key={s.k}
                    type="button"
                    onClick={s.go}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      boxSizing: "border-box",
                      padding: 18,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      outline: "2px solid #261714",
                      outlineOffset: -2,
                      background: "#F6F3F1",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5E4B46" }}>{s.k}</span>
                    <b style={{ fontSize: 19, lineHeight: 1.25 }}>{s.v}</b>
                    <span style={{ fontSize: 14, textDecoration: "underline", textUnderlineOffset: 3 }}>{s.cta} →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "caixas" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <h1 style={h1}>Minhas caixas</h1>
              {caixas.length === 0 ? (
                <div style={{ background: "#EDE7E3", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
                  <b style={{ fontSize: 20 }}>Sua primeira caixa está a caminho.</b>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, maxWidth: "52ch" }}>
                    Quando ela for enviada, o código de rastreio aparece aqui. A gente também avisa por e-mail.
                  </p>
                </div>
              ) : (
                caixas.map((c) => (
                  <div key={c.id} style={{ background: "#FFFFFF", outline: "1px solid #DDD3CE", outlineOffset: -1, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B3202F" }}>
                          {c.mes} {c.ano}
                        </span>
                        <b style={{ fontWeight: 800, fontVariationSettings: "'wdth' 75", fontSize: 28, lineHeight: 1, textTransform: "uppercase" }}>{c.regiao || "—"}</b>
                      </div>
                      <span style={{ fontSize: 13, color: "#5E4B46", textTransform: "capitalize" }}>
                        {c.entregue_em ? `Entregue em ${c.entregue_em}` : c.status}
                      </span>
                    </div>
                    {c.codigo_rastreio ? <b style={{ fontSize: 16 }}>Rastreio: {c.codigo_rastreio}</b> : <span style={{ fontSize: 14, color: "#5E4B46" }}>Código de rastreio ainda não disponível</span>}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "plano" && (
            <PortalPlano assinatura={assinatura} email={profile.email} onFlash={setFlash} onWhatsApp={openWa} />
          )}

          {tab === "pagamento" && (
            <PortalPagamento
              nome={profile.nome}
              email={profile.email}
              plano={assinatura?.plano_slug || assinatura?.plano || null}
              proximaCobranca={assinatura?.proxima_cobranca || null}
              ativa={ativa}
              invoices={invoices}
              onWhatsApp={openWa}
            />
          )}

          {tab === "dados" && (
            <PortalDados
              profile={profile}
              onFlash={(m) => {
                setFlash(m);
                setWelcome(false);
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
