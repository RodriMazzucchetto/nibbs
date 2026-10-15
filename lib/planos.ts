export type Plano = {
  slug: string;
  nome: string;
  valor: number;
  tipo: "assinatura" | "presente";
};

export const PLANOS: Record<string, Plano> = {
  entrada: { slug: "entrada", nome: "Entrada", valor: 99, tipo: "assinatura" },
  "melhor-valor": { slug: "melhor-valor", nome: "Melhor valor", valor: 159, tipo: "assinatura" },
  ultimate: { slug: "ultimate", nome: "Ultimate", valor: 219, tipo: "assinatura" },
  "presente-3m": { slug: "presente-3m", nome: "Presente 3 meses", valor: 477, tipo: "presente" },
  "presente-6m": { slug: "presente-6m", nome: "Presente 6 meses", valor: 954, tipo: "presente" },
};
