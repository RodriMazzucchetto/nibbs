const ASAAS_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";

const ASAAS_API_KEY = process.env.ASAAS_API_KEY!;

async function asaasFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Asaas API error ${res.status}: ${err}`);
  }

  return res.json();
}

export async function createAsaasCustomer(data: {
  name: string;
  email: string;
  cpfCnpj?: string;
}) {
  return asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createAsaasSubscription(data: {
  customer: string;         // customer id
  billingType: "CREDIT_CARD" | "PIX" | "BOLETO";
  value: number;
  nextDueDate: string;      // YYYY-MM-DD
  cycle: "MONTHLY" | "QUARTERLY" | "YEARLY";
  description: string;
  externalReference?: string; // plano slug
}) {
  return asaasFetch("/subscriptions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Link de pagamento hospedado (sem tocar em dados de cartão)
export async function createAsaasPaymentLink(data: {
  name: string;
  description?: string;
  value: number;
  billingType: "UNDEFINED" | "CREDIT_CARD" | "PIX" | "BOLETO";
  chargeType: "RECURRENT" | "INSTALLMENT" | "DETACHED";
  subscriptionCycle?: "MONTHLY" | "QUARTERLY" | "YEARLY";
  externalReference?: string;
}) {
  return asaasFetch("/paymentLinks", {
    method: "POST",
    body: JSON.stringify({ ...data, endDate: null }),
  });
}
