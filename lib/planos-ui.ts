export const PLANOS_UI = [
  {
    slug: "fundador-sempre",
    name: "Sempre Chocolate",
    price: "R$ 159",
    what: "3 barras de 80 g + cupons exclusivos negociados com os produtores pra você recomprar direto com eles.",
    best: true,
  },
  {
    slug: "fundador-simples",
    name: "Fundador simples",
    price: "R$ 99",
    what: "2 barras de 80 g todo mês na sua casa.",
    best: false,
  },
] as const;

export function matchPlanIndex(nomeOrSlug: string | undefined | null) {
  const s = (nomeOrSlug || "").toLowerCase();
  const bySlug = PLANOS_UI.findIndex((p) => p.slug === s);
  if (bySlug >= 0) return bySlug;
  const byName = PLANOS_UI.findIndex((p) => p.name.toLowerCase() === s);
  if (byName >= 0) return byName;
  if (s.includes("simples") || s.includes("entrada")) return 1;
  if (s.includes("sempre") || s.includes("melhor") || s.includes("ultimate")) return 0;
  return 0;
}

export function formatDateBR(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const mi = Number(m) - 1;
  return `${Number(d)} ${meses[mi] ?? m} ${y}`;
}

export function formatDateShort(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${Number(d)} ${meses[Number(m) - 1] ?? m}`;
}
