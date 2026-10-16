"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANOS_UI, formatDateShort, matchPlanIndex } from "@/lib/planos-ui";

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

const REASONS = [
  ["caro", "Está caro para mim agora"],
  ["pausa", "Chocolate demais, não estou dando conta"],
  ["gosto", "Não gostei das barras"],
  ["viagem", "Vou viajar ou mudar de endereço"],
  ["outro", "Outro motivo"],
] as const;

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function mesDaProxima(iso: string | null | undefined) {
  if (!iso) {
    const n = new Date();
    n.setMonth(n.getMonth() + 1);
    return MESES[n.getMonth()];
  }
  const m = Number(iso.slice(5, 7)) - 1;
  return MESES[m] ?? "próximo mês";
}

export function PortalPlano({
  assinatura,
  email,
  onFlash,
  onWhatsApp,
}: {
  assinatura: Assinatura;
  email: string;
  onFlash: (msg: string) => void;
  onWhatsApp: (msg: string) => void;
}) {
  const router = useRouter();
  const planIdx = matchPlanIndex(assinatura?.plano_slug || assinatura?.plano);
  const cur = PLANOS_UI[planIdx];
  const [pick, setPick] = useState<number | null>(null);
  const [cancelStep, setCancelStep] = useState(0);
  const [reason, setReason] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cancelled = assinatura?.status === "cancelled" || !!assinatura?.cancelamento_solicitado_em;
  const paused = assinatura?.status === "paused";
  const ativa = !!assinatura && assinatura.status === "active" && !cancelled;
  const statusLabel = cancelled ? "Cancelada" : paused ? `Pausada até ${formatDateShort(assinatura?.pausada_ate)}` : ativa ? "Ativa" : "Inativa";
  const statusBg = ativa ? "#2E6B45" : "#5E4B46";
  const nextCharge = ativa || paused ? formatDateShort(assinatura?.proxima_cobranca || assinatura?.pausada_ate) : "nenhuma";
  const mesPular = mesDaProxima(assinatura?.proxima_cobranca);
  const canSwap = pick !== null && pick !== planIdx && !!assinatura && !cancelled && !paused;

  async function acao(body: object, whatsappFallback?: string) {
    setSaving(true);
    try {
      const r = await fetch("/api/portal/assinatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        onFlash(j.error || "Não foi possível concluir.");
        if (j.whatsapp && whatsappFallback) onWhatsApp(whatsappFallback);
        return false;
      }
      onFlash(j.message || "Pronto.");
      setPick(null);
      setCancelStep(0);
      setReason(null);
      router.refresh();
      return true;
    } finally {
      setSaving(false);
    }
  }

  const h1: React.CSSProperties = {
    margin: 0,
    fontWeight: 900,
    fontVariationSettings: "'wdth' 62",
    fontSize: "clamp(44px, 5vw, 64px)",
    lineHeight: 0.9,
    textTransform: "uppercase",
  };

  // Sem assinatura ativa (ou cancelada): mostra os planos e deixa comprar
  if ((!assinatura || cancelled) && cancelStep === 0) {
    const selIdx = pick ?? 1;
    const sel = PLANOS_UI[selIdx];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <h1 style={h1}>Plano e assinatura</h1>
        <div style={{ background: "#261714", color: "#F6F3F1", padding: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ alignSelf: "flex-start", background: "#5E4B46", color: "#F6F3F1", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 8px" }}>
            Sem plano ativo
          </span>
          <b style={{ fontWeight: 800, fontVariationSettings: "'wdth' 75", fontSize: 34, lineHeight: 1, textTransform: "uppercase" }}>Escolha seu plano</b>
          <span style={{ fontSize: 15, color: "#CDBFBA" }}>Preço de fundador travado até outubro de 2027. Frete incluso.</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ margin: 0, fontWeight: 800, fontVariationSettings: "'wdth' 75", fontSize: 24, textTransform: "uppercase" }}>Planos</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 4 }}>
            {PLANOS_UI.map((p, i) => {
              const on = selIdx === i;
              return (
                <button
                  key={p.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPick(i)}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    boxSizing: "border-box",
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    background: on ? "#B3202F" : "#F6F3F1",
                    color: on ? "#F6F3F1" : "#261714",
                    outline: "2px solid #261714",
                    outlineOffset: -2,
                  }}
                >
                  <span style={{ fontWeight: 800, fontVariationSettings: "'wdth' 75", fontSize: 20, textTransform: "uppercase", lineHeight: 1 }}>{p.name}</span>
                  <b style={{ fontWeight: 900, fontVariationSettings: "'wdth' 62", fontSize: 36, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{p.price}</b>
                  <span style={{ fontSize: 14, lineHeight: 1.4 }}>{p.what}</span>
                </button>
              );
            })}
          </div>
          <a
            href={`/assinatura?plano=${encodeURIComponent(sel.slug)}&checkout=1`}
            style={{
              all: "unset",
              cursor: "pointer",
              alignSelf: "flex-start",
              boxSizing: "border-box",
              height: 48,
              padding: "0 20px",
              background: "#B3202F",
              color: "#F6F3F1",
              fontWeight: 700,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Assinar {sel.name} · {sel.price}/mês <span>→</span>
          </a>
        </div>

        {cancelled && (
          <button
            type="button"
            disabled={saving}
            onClick={() => acao({ acao: "reativar" })}
            style={{ all: "unset", cursor: "pointer", alignSelf: "flex-start", fontSize: 15, color: "#5E4B46", textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            Ou tentar reativar a assinatura anterior
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <h1 style={h1}>Plano e assinatura</h1>

      {cancelStep === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {/* Resumo do plano — igual ao print */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "#261714", color: "#F6F3F1", padding: 24, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ alignSelf: "flex-start", background: statusBg, color: "#F6F3F1", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 8px" }}>
                  {statusLabel}
                </span>
                <b style={{ fontWeight: 800, fontVariationSettings: "'wdth' 75", fontSize: 34, lineHeight: 1, textTransform: "uppercase" }}>{cur.name}</b>
                <span style={{ fontSize: 15, color: "#CDBFBA" }}>{cur.what}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 15 }}>
                  <b style={{ fontWeight: 900, fontVariationSettings: "'wdth' 62", fontSize: 44, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{cur.price}</b> /mês
                </span>
                <span style={{ fontSize: 13, color: "#CDBFBA" }}>Próxima cobrança: {nextCharge}</span>
              </div>
            </div>
            <span style={{ fontSize: 14, lineHeight: 1.5, color: "#5E4B46" }}>
              Preço de fundador travado até outubro de 2027. Mudanças feitas até o dia 20 valem para a caixa do mês seguinte.
            </span>
          </div>

          {/* Trocar de plano — 3 cards como no print */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ margin: 0, fontWeight: 800, fontVariationSettings: "'wdth' 75", fontSize: 24, textTransform: "uppercase" }}>Trocar de plano</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 4 }}>
              {PLANOS_UI.map((p, i) => {
                const sel = (pick ?? planIdx) === i;
                return (
                  <button
                    key={p.slug}
                    type="button"
                    aria-pressed={sel}
                    onClick={() => setPick(i)}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      boxSizing: "border-box",
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      background: sel ? "#B3202F" : "#F6F3F1",
                      color: sel ? "#F6F3F1" : "#261714",
                      outline: "2px solid #261714",
                      outlineOffset: -2,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", minHeight: 22 }}>
                      <span style={{ fontWeight: 800, fontVariationSettings: "'wdth' 75", fontSize: 20, textTransform: "uppercase", lineHeight: 1 }}>{p.name}</span>
                      {i === planIdx && (
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Atual</span>
                      )}
                    </div>
                    <b style={{ fontWeight: 900, fontVariationSettings: "'wdth' 62", fontSize: 36, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{p.price}</b>
                    <span style={{ fontSize: 14, lineHeight: 1.4 }}>{p.what}</span>
                  </button>
                );
              })}
            </div>
            {canSwap && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  acao(
                    { acao: "trocar_plano", planoSlug: PLANOS_UI[pick!].slug },
                    `Oi Nibbs! Quero mudar do plano ${cur.name} para ${PLANOS_UI[pick!].name}. E-mail: ${email}.`,
                  )
                }
                style={{
                  all: "unset",
                  cursor: "pointer",
                  alignSelf: "flex-start",
                  boxSizing: "border-box",
                  height: 48,
                  padding: "0 20px",
                  background: "#B3202F",
                  color: "#F6F3F1",
                  fontWeight: 700,
                  fontSize: 15,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Mudar para {PLANOS_UI[pick!].name} · {PLANOS_UI[pick!].price}/mês <span>→</span>
              </button>
            )}
          </div>

          {/* Pular / Pausar — igual ao print */}
          <div style={{ display: "flex", flexDirection: "column", borderTop: "2px solid #261714" }}>
            {ativa && (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "18px 0", borderBottom: "1px solid #DDD3CE" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 320px" }}>
                    <b style={{ fontSize: 17 }}>Pular a próxima caixa</b>
                    <span style={{ fontSize: 14, lineHeight: 1.45, color: "#5E4B46" }}>
                      Sem cobrança naquele mês. A assinatura continua normalmente depois.
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => acao({ acao: "pular" })}
                    style={{ all: "unset", cursor: "pointer", boxSizing: "border-box", height: 44, padding: "0 18px", border: "2px solid #261714", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", background: "#F6F3F1" }}
                  >
                    Pular {mesPular}
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "18px 0", borderBottom: "1px solid #DDD3CE" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 320px" }}>
                    <b style={{ fontSize: 17 }}>Pausar por até 3 meses</b>
                    <span style={{ fontSize: 14, lineHeight: 1.45, color: "#5E4B46" }}>
                      Sem caixas e sem cobranças. O preço de fundador continua travado.
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => acao({ acao: "pausar" })}
                    style={{ all: "unset", cursor: "pointer", boxSizing: "border-box", height: 44, padding: "0 18px", border: "2px solid #261714", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", background: "#F6F3F1" }}
                  >
                    Pausar
                  </button>
                </div>
              </>
            )}
            {paused && (
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "18px 0", borderBottom: "1px solid #DDD3CE" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 320px" }}>
                  <b style={{ fontSize: 17 }}>Assinatura pausada</b>
                  <span style={{ fontSize: 14, lineHeight: 1.45, color: "#5E4B46" }}>
                    Volta sozinha em {formatDateShort(assinatura.pausada_ate)}, ou antes se você quiser.
                  </span>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => acao({ acao: "reativar" })}
                  style={{ all: "unset", cursor: "pointer", boxSizing: "border-box", height: 44, padding: "0 18px", border: "2px solid #261714", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", background: "#F6F3F1" }}
                >
                  Retomar agora
                </button>
              </div>
            )}
          </div>

          {ativa && (
            <button
              type="button"
              onClick={() => setCancelStep(1)}
              style={{ all: "unset", cursor: "pointer", alignSelf: "flex-start", fontSize: 15, color: "#5E4B46", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              Cancelar assinatura
            </button>
          )}
        </div>
      )}

      {cancelStep === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 560 }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B3202F" }}>Cancelamento · 1 de 2</span>
          <h2 style={{ margin: 0, fontWeight: 800, fontVariationSettings: "'wdth' 75", fontSize: 30, lineHeight: 1, textTransform: "uppercase" }}>Por que você quer cancelar?</h2>
          <div role="radiogroup" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {REASONS.map(([k, t]) => {
              const on = reason === t;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setReason(t)}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    boxSizing: "border-box",
                    minHeight: 48,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    fontSize: 16,
                    background: on ? "#B3202F" : "#F6F3F1",
                    color: on ? "#F6F3F1" : "#261714",
                    outline: "2px solid #261714",
                    outlineOffset: -2,
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button
              type="button"
              disabled={!reason}
              onClick={() => reason && setCancelStep(2)}
              style={{ all: "unset", cursor: reason ? "pointer" : "default", boxSizing: "border-box", height: 48, padding: "0 20px", background: "#261714", color: "#F6F3F1", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", opacity: reason ? 1 : 0.4 }}
            >
              Continuar
            </button>
            <button type="button" onClick={() => setCancelStep(0)} style={{ all: "unset", cursor: "pointer", boxSizing: "border-box", height: 48, padding: "0 20px", border: "2px solid #261714", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center" }}>
              Voltar
            </button>
          </div>
        </div>
      )}

      {cancelStep === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 560 }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B3202F" }}>Cancelamento · 2 de 2</span>
          {reason === "Está caro para mim agora" && (
            <div style={{ background: "#B3202F", color: "#F6F3F1", padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
              <b style={{ fontWeight: 900, fontVariationSettings: "'wdth' 62", fontSize: 36, lineHeight: 0.95, textTransform: "uppercase" }}>Que tal o plano Entrada?</b>
              <span style={{ fontSize: 15, lineHeight: 1.5 }}>2 barras por R$ 99/mês, mantendo o preço de fundador.</span>
              <button type="button" disabled={saving} onClick={() => acao({ acao: "trocar_plano", planoSlug: "entrada" })} style={{ all: "unset", cursor: "pointer", alignSelf: "flex-start", boxSizing: "border-box", height: 48, padding: "0 20px", marginTop: 6, background: "#F6F3F1", color: "#261714", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                Trocar para Entrada <span>→</span>
              </button>
            </div>
          )}
          {(reason === "Chocolate demais, não estou dando conta" || reason === "Vou viajar ou mudar de endereço") && (
            <div style={{ background: "#B3202F", color: "#F6F3F1", padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
              <b style={{ fontWeight: 900, fontVariationSettings: "'wdth' 62", fontSize: 36, lineHeight: 0.95, textTransform: "uppercase" }}>Pause por até 3 meses</b>
              <span style={{ fontSize: 15, lineHeight: 1.5 }}>Sem cobrança e sem caixa. Volta na data combinada, ou antes se você quiser.</span>
              <button type="button" disabled={saving} onClick={() => acao({ acao: "pausar" })} style={{ all: "unset", cursor: "pointer", alignSelf: "flex-start", boxSizing: "border-box", height: 48, padding: "0 20px", marginTop: 6, background: "#F6F3F1", color: "#261714", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                Pausar <span>→</span>
              </button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 15, lineHeight: 1.55 }}>
            <b style={{ fontSize: 17 }}>Se cancelar agora</b>
            <span>Não haverá novas cobranças. Sem multa. Você pode voltar quando quiser, mas perde o preço de fundador.</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button type="button" disabled={saving || !reason} onClick={() => acao({ acao: "cancelar", motivo: reason })} style={{ all: "unset", cursor: "pointer", boxSizing: "border-box", height: 48, padding: "0 20px", border: "2px solid #261714", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center" }}>
              Cancelar assinatura
            </button>
            <button type="button" onClick={() => setCancelStep(0)} style={{ all: "unset", cursor: "pointer", boxSizing: "border-box", height: 48, padding: "0 20px", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", textDecoration: "underline", textUnderlineOffset: 3 }}>
              Manter assinatura
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
