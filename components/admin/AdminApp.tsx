"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthBrowserClient } from "@/lib/supabase/browser-auth";
import { NibbsLogo } from "@/components/NibbsLogo";

type Inicio = {
  titulo: string;
  mensagem: string;
  mes: string;
  regiao: string;
  status_caixa: string;
};

type Profile = { id: string; nome: string; email: string; celular: string | null; cidade: string | null; uf: string | null };
type Assinatura = {
  id: string;
  user_id: string | null;
  email: string;
  plano: string;
  status: string;
  cancelamento_solicitado_em: string | null;
  motivo_cancelamento: string | null;
  troca_plano_solicitada: string | null;
};
type Caixa = {
  id: string;
  user_id: string;
  mes: string;
  ano: number;
  regiao: string | null;
  status: string;
  codigo_rastreio: string | null;
};

export function AdminApp({
  inicio,
  profiles,
  assinaturas,
  caixas,
}: {
  inicio: Inicio;
  profiles: Profile[];
  assinaturas: Assinatura[];
  caixas: Caixa[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"conteudo" | "clientes">("conteudo");
  const [flash, setFlash] = useState("");
  const [form, setForm] = useState(inicio);
  const [saving, setSaving] = useState(false);
  const [rastreio, setRastreio] = useState<Record<string, { mes: string; ano: string; regiao: string; codigo: string; status: string }>>({});

  const porEmail = useMemo(() => {
    const map = new Map<string, Assinatura>();
    for (const a of assinaturas) {
      if (!map.has(a.email)) map.set(a.email, a);
    }
    return map;
  }, [assinaturas]);

  const caixasPorUser = useMemo(() => {
    const map = new Map<string, Caixa[]>();
    for (const c of caixas) {
      const list = map.get(c.user_id) ?? [];
      list.push(c);
      map.set(c.user_id, list);
    }
    return map;
  }, [caixas]);

  async function logout() {
    const supabase = createAuthBrowserClient();
    await supabase.auth.signOut();
    router.push("/entrar");
    router.refresh();
  }

  async function salvarConteudo(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/admin/conteudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setFlash(j.error || "Erro ao salvar");
        return;
      }
      setFlash("Conteúdo do início atualizado.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function draft(userId: string) {
    return (
      rastreio[userId] ?? {
        mes: form.mes || "novembro",
        ano: String(new Date().getFullYear()),
        regiao: form.regiao || "",
        codigo: "",
        status: "enviada",
      }
    );
  }

  async function salvarCaixa(userId: string) {
    const d = draft(userId);
    setSaving(true);
    try {
      const r = await fetch("/api/admin/caixas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          mes: d.mes,
          ano: Number(d.ano),
          regiao: d.regiao,
          codigo_rastreio: d.codigo,
          status: d.status,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setFlash(j.error || "Erro ao salvar caixa");
        return;
      }
      setFlash(`Rastreio salvo para o cliente.`);
      setRastreio((s) => ({ ...s, [userId]: { ...d, codigo: "" } }));
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="nb-portal" style={{ minHeight: "100vh", padding: "20px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <NibbsLogo variant="lockup" size={28} ink="#261714" accent="#B3202F" />
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Admin</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="/portal" className="nb-btn nb-btn-ghost" style={{ textDecoration: "none" }}>
              Portal
            </a>
            <button type="button" className="nb-btn nb-btn-ghost" onClick={logout}>
              Sair
            </button>
          </div>
        </header>

        <div style={{ display: "flex", gap: 8 }}>
          {(
            [
              ["conteudo", "Conteúdo do início"],
              ["clientes", "Clientes e rastreio"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "nb-btn" : "nb-btn nb-btn-ghost"}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {flash && <div className="nb-flash">{flash}</div>}

        {tab === "conteudo" && (
          <form onSubmit={salvarConteudo} style={{ display: "flex", flexDirection: "column", gap: 14, background: "#fff", border: "2px solid var(--ink)", padding: 20 }}>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
              Esse texto aparece na aba Início do portal de todos os assinantes.
            </p>
            {(
              [
                ["titulo", "Título"],
                ["mensagem", "Mensagem"],
                ["mes", "Mês em destaque"],
                ["regiao", "Região do mês"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="nb-label">
                {label}
                {k === "mensagem" ? (
                  <textarea
                    className="nb-input"
                    style={{ height: 96, padding: 12, resize: "vertical" }}
                    value={form[k]}
                    onChange={(e) => setForm((s) => ({ ...s, [k]: e.target.value }))}
                    required
                  />
                ) : (
                  <input className="nb-input" value={form[k]} onChange={(e) => setForm((s) => ({ ...s, [k]: e.target.value }))} required />
                )}
              </label>
            ))}
            <label className="nb-label">
              Status da caixa (timeline do início)
              <select
                className="nb-input"
                value={form.status_caixa}
                onChange={(e) => setForm((s) => ({ ...s, status_caixa: e.target.value }))}
              >
                <option value="pagamento">Pagamento confirmado</option>
                <option value="separando">Separando barras</option>
                <option value="enviada">Enviada</option>
                <option value="entregue">Entregue</option>
              </select>
            </label>
            <button type="submit" className="nb-btn" disabled={saving}>
              Salvar conteúdo <span>→</span>
            </button>
          </form>
        )}

        {tab === "clientes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {assinaturas.filter((a) => a.cancelamento_solicitado_em).length > 0 && (
              <div className="nb-alert">
                {assinaturas.filter((a) => a.cancelamento_solicitado_em).length} pedido(s) de cancelamento pendente(s) — resolva no Asaas e no WhatsApp.
              </div>
            )}
            {profiles.length === 0 && <p>Nenhum assinante cadastrado ainda.</p>}
            {profiles.map((p) => {
              const a = porEmail.get(p.email);
              const list = caixasPorUser.get(p.id) ?? [];
              const d = draft(p.id);
              return (
                <article key={p.id} style={{ border: "2px solid var(--ink)", background: "#fff", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <b style={{ fontSize: 18 }}>{p.nome}</b>
                      <div style={{ fontSize: 14, color: "var(--muted)" }}>
                        {p.email}
                        {p.celular ? ` · ${p.celular}` : ""}
                        {p.cidade ? ` · ${p.cidade}/${p.uf}` : ""}
                      </div>
                      <div style={{ marginTop: 6, fontWeight: 700 }}>
                        {a?.plano ?? "Sem assinatura"} · {a?.status ?? "—"}
                        {a?.cancelamento_solicitado_em ? " · CANCELAMENTO SOLICITADO" : ""}
                      </div>
                      {a?.motivo_cancelamento && <div style={{ fontSize: 13 }}>Motivo: {a.motivo_cancelamento}</div>}
                    </div>
                  </div>

                  {list.length > 0 && (
                    <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                      <b>Caixas</b>
                      {list.map((c) => (
                        <span key={c.id}>
                          {c.mes}/{c.ano}
                          {c.regiao ? ` · ${c.regiao}` : ""} · {c.status}
                          {c.codigo_rastreio ? ` · ${c.codigo_rastreio}` : ""}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
                    <label className="nb-label">
                      Mês
                      <input className="nb-input" value={d.mes} onChange={(e) => setRastreio((s) => ({ ...s, [p.id]: { ...d, mes: e.target.value } }))} />
                    </label>
                    <label className="nb-label">
                      Ano
                      <input className="nb-input" value={d.ano} onChange={(e) => setRastreio((s) => ({ ...s, [p.id]: { ...d, ano: e.target.value } }))} />
                    </label>
                    <label className="nb-label">
                      Região
                      <input className="nb-input" value={d.regiao} onChange={(e) => setRastreio((s) => ({ ...s, [p.id]: { ...d, regiao: e.target.value } }))} />
                    </label>
                    <label className="nb-label">
                      Status
                      <select className="nb-input" value={d.status} onChange={(e) => setRastreio((s) => ({ ...s, [p.id]: { ...d, status: e.target.value } }))}>
                        <option value="separando">Separando</option>
                        <option value="enviada">Enviada</option>
                        <option value="entregue">Entregue</option>
                      </select>
                    </label>
                    <label className="nb-label" style={{ gridColumn: "1 / -1" }}>
                      Código de rastreio
                      <input
                        className="nb-input"
                        value={d.codigo}
                        onChange={(e) => setRastreio((s) => ({ ...s, [p.id]: { ...d, codigo: e.target.value } }))}
                        placeholder="Ex.: Correios / Melhor Envio"
                      />
                    </label>
                  </div>
                  <button type="button" className="nb-btn" disabled={saving || !d.codigo.trim()} onClick={() => salvarCaixa(p.id)}>
                    Adicionar caixa / rastreio <span>→</span>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
