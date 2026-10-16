"use client";

import { formatDateBR, formatDateShort, matchPlanIndex, PLANOS_UI } from "@/lib/planos-ui";

type Invoice = {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  invoiceUrl?: string;
  description?: string;
};

export function PortalPagamento({
  nome,
  email,
  plano,
  proximaCobranca,
  ativa,
  invoices,
  onWhatsApp,
}: {
  nome: string;
  email: string;
  plano: string | null;
  proximaCobranca: string | null;
  ativa: boolean;
  invoices: Invoice[];
  onWhatsApp: (msg: string) => void;
}) {
  const cur = PLANOS_UI[matchPlanIndex(plano)];
  const h1: React.CSSProperties = {
    margin: 0,
    fontWeight: 900,
    fontVariationSettings: "'wdth' 62",
    fontSize: "clamp(44px, 5vw, 64px)",
    lineHeight: 0.9,
    textTransform: "uppercase",
  };

  const pagos = invoices.filter((i) => ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(i.status));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <h1 style={h1}>Pagamento</h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "stretch" }}>
        <div style={{ boxSizing: "border-box", width: 300, maxWidth: "100%", aspectRatio: "1.6", background: "#261714", color: "#F6F3F1", padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em" }}>CARTÃO</span>
          <span style={{ fontSize: 22, letterSpacing: "0.12em", fontVariantNumeric: "tabular-nums" }}>•••• •••• •••• ••••</span>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#CDBFBA" }}>
            <span>{nome.toUpperCase()}</span>
            <span>••/••</span>
          </div>
        </div>
        <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5E4B46" }}>Próxima cobrança</span>
          <b style={{ fontSize: 22 }}>
            {ativa && proximaCobranca ? `${formatDateBR(proximaCobranca)} · ${cur.price}` : "Nenhuma cobrança agendada"}
          </b>
          <button
            type="button"
            onClick={() => onWhatsApp(`Oi Nibbs! Quero trocar o cartão da assinatura. E-mail: ${email}.`)}
            style={{ all: "unset", cursor: "pointer", alignSelf: "flex-start", boxSizing: "border-box", height: 44, padding: "0 18px", border: "2px solid #261714", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center" }}
          >
            Trocar cartão
          </button>
          <span style={{ fontSize: 13, color: "#5E4B46", lineHeight: 1.45 }}>
            Cartão fica só no Asaas. A troca é feita com a gente no WhatsApp — sem digitar número aqui.
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 style={{ margin: 0, fontWeight: 800, fontVariationSettings: "'wdth' 75", fontSize: 24, textTransform: "uppercase" }}>Histórico de cobranças</h2>
        <div style={{ display: "flex", flexDirection: "column", borderTop: "2px solid #261714" }}>
          {pagos.length === 0 ? (
            <div style={{ padding: "14px 0", fontSize: 15, color: "#5E4B46" }}>Nenhuma cobrança registrada ainda.</div>
          ) : (
            pagos.map((i) => (
              <div
                key={i.id}
                style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "4px 16px", padding: "14px 0", borderBottom: "1px solid #DDD3CE", fontSize: 15 }}
              >
                <b>{i.description || `Assinatura ${cur.name}`}</b>
                <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                  R$ {Number(i.value).toFixed(0)}
                </span>
                <span style={{ color: "#5E4B46", fontSize: 14 }}>
                  {formatDateBR(i.dueDate)} · Pago
                </span>
                {i.invoiceUrl ? (
                  <a href={i.invoiceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 14, textAlign: "right" }}>
                    Recibo
                  </a>
                ) : (
                  <span style={{ fontSize: 14, textAlign: "right", color: "#5E4B46" }}>—</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
