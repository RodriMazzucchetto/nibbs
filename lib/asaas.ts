const ASAAS_API_KEY = (process.env.ASAAS_API_KEY ?? "").trim();

// Chaves de produção começam com $aact_prod_, as de sandbox com $aact_hmlg_
export const ASAAS_IS_PRODUCTION = ASAAS_API_KEY.startsWith("$aact_prod_");

const ASAAS_BASE_URL = ASAAS_IS_PRODUCTION
  ? "https://api.asaas.com/v3"
  : "https://sandbox.asaas.com/api/v3";

async function asaasFetch(path: string, options: RequestInit = {}) {
  if (!ASAAS_API_KEY) throw new Error("ASAAS_API_KEY não configurada");

  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "nibbs",
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

export async function getAsaasCustomer(id: string): Promise<{ name?: string; email?: string }> {
  return asaasFetch(`/customers/${id}`);
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
  dueDateLimitDays?: number;
  isAddressRequired?: boolean;
  externalReference?: string;
}) {
  return asaasFetch("/paymentLinks", {
    method: "POST",
    body: JSON.stringify({ ...data, endDate: null }),
  });
}

export async function getAsaasPaymentLink(id: string): Promise<{ externalReference?: string }> {
  return asaasFetch(`/paymentLinks/${id}`);
}
