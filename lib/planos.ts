export type Plano = {
  slug: string;
  nome: string;
  valor: number;
  tipo: "assinatura" | "presente";
  /** Meses cobertos no presente (pagamento único) */
  meses?: number;
};

const SEMPRE = 159;

export const PLANOS: Record<string, Plano> = {
  "fundador-sempre": {
    slug: "fundador-sempre",
    nome: "Fundador Sempre Chocolate",
    valor: SEMPRE,
    tipo: "assinatura",
  },
  "fundador-simples": {
    slug: "fundador-simples",
    nome: "Fundador simples",
    valor: 99,
    tipo: "assinatura",
  },
  // Aliases de planos antigos
  "melhor-valor": {
    slug: "melhor-valor",
    nome: "Fundador Sempre Chocolate",
    valor: SEMPRE,
    tipo: "assinatura",
  },
  entrada: { slug: "entrada", nome: "Fundador simples", valor: 99, tipo: "assinatura" },
  ultimate: {
    slug: "ultimate",
    nome: "Fundador Sempre Chocolate",
    valor: SEMPRE,
    tipo: "assinatura",
  },
  "presente-1m": {
    slug: "presente-1m",
    nome: "Presente 1 mês",
    valor: SEMPRE * 1,
    tipo: "presente",
    meses: 1,
  },
  "presente-2m": {
    slug: "presente-2m",
    nome: "Presente 2 meses",
    valor: SEMPRE * 2,
    tipo: "presente",
    meses: 2,
  },
  "presente-3m": {
    slug: "presente-3m",
    nome: "Presente 3 meses",
    valor: SEMPRE * 3,
    tipo: "presente",
    meses: 3,
  },
  // Alias legado
  "presente-6m": {
    slug: "presente-6m",
    nome: "Presente 6 meses",
    valor: SEMPRE * 6,
    tipo: "presente",
    meses: 6,
  },
};
