export const PLANOS_UI = [
  { slug: "entrada", name: "Entrada", price: "R$ 99", what: "2 barras de 80 g por mês." },
  { slug: "melhor-valor", name: "Melhor valor", price: "R$ 159", what: "3 barras de 80 g por mês." },
  { slug: "ultimate", name: "Ultimate", price: "R$ 219", what: "3 barras premium, caixa de presente anual e 15% off em avulsas." },
] as const;

export function matchPlanIndex(nomeOrSlug: string | undefined | null) {
  const s = (nomeOrSlug || "").toLowerCase();
  const bySlug = PLANOS_UI.findIndex((p) => p.slug === s);
  if (bySlug >= 0) return bySlug;
  const byName = PLANOS_UI.findIndex((p) => p.name.toLowerCase() === s);
  if (byName >= 0) return byName;
  if (s.includes("entrada")) return 0;
  if (s.includes("ultimate")) return 2;
  return 1;
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
