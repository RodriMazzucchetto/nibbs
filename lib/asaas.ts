const ASAAS_API_KEY = (process.env.ASAAS_API_KEY ?? "").trim();

// Chaves de produção começam com $aact_prod_, as de sandbox com $aact_hmlg_
export const ASAAS_IS_PRODUCTION = ASAAS_API_KEY.startsWith("$aact_prod_");

const ASAAS_BASE_URL = ASAAS_IS_PRODUCTION
  ? "https://api.asaas.com/v3"
  : "https://sandbox.asaas.com/api/v3";

// Qualquer sequência longa de dígitos (cartão) some de mensagens de erro e logs
export function redact(text: string) {
  return text.replace(/\d[\d .-]{11,}\d/g, "[removido]");
}

export class AsaasError extends Error {
  constructor(
    public status: number,
    public descriptions: string[],
  ) {
    super(redact(`Asaas API error ${status}: ${descriptions.join(" | ")}`));
  }
}

async function asaasFetch(path: string, options: RequestInit = {}) {
  if (!ASAAS_API_KEY) throw new Error("ASAAS_API_KEY não configurada");

  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "nibbs",
      access_token: ASAAS_API_KEY,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const descriptions: string[] = Array.isArray(body?.errors)
      ? body.errors.map((e: { description?: string }) => redact(e.description ?? "")).filter(Boolean)
      : [];
    throw new AsaasError(res.status, descriptions);
  }

  return res.json();
}

export type AsaasCliente = {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone: string;
  postalCode: string;
  address: string;
  addressNumber: string;
  complement?: string;
  province: string;
};

export type AsaasCartao = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export type AsaasTitular = {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone: string;
  mobilePhone: string;
};

type Pagamento = { id: string; status: string; invoiceUrl?: string };

export async function upsertAsaasCustomer(data: AsaasCliente): Promise<{ id: string }> {
  const found = await asaasFetch(`/customers?cpfCnpj=${encodeURIComponent(data.cpfCnpj)}&limit=1`);
  const existing = found?.data?.[0];
  if (existing?.id) {
    return asaasFetch(`/customers/${existing.id}`, { method: "POST", body: JSON.stringify(data) });
  }
  return asaasFetch("/customers", { method: "POST", body: JSON.stringify(data) });
}

export async function getAsaasCustomer(id: string): Promise<{ name?: string; email?: string }> {
  return asaasFetch(`/customers/${id}`);
}

export async function createAsaasSubscription(data: {
  customer: string;
  billingType: "CREDIT_CARD" | "PIX";
  value: number;
  nextDueDate: string;
  cycle: "MONTHLY";
  description: string;
  externalReference: string;
  creditCard?: AsaasCartao;
  creditCardHolderInfo?: AsaasTitular;
  remoteIp?: string;
}): Promise<{ id: string }> {
  return asaasFetch("/subscriptions", { method: "POST", body: JSON.stringify(data) });
}

export type AsaasSubscription = {
  id: string;
  status?: "ACTIVE" | "INACTIVE" | string;
  value?: number;
  nextDueDate?: string;
  cycle?: string;
  description?: string;
  externalReference?: string;
  billingType?: string;
  creditCard?: { creditCardNumber?: string; creditCardBrand?: string };
};

export async function getAsaasSubscription(id: string): Promise<AsaasSubscription> {
  return asaasFetch(`/subscriptions/${id}`);
}

export async function updateAsaasSubscription(
  id: string,
  data: {
    value?: number;
    nextDueDate?: string;
    cycle?: "MONTHLY";
    description?: string;
    externalReference?: string;
    status?: "ACTIVE" | "INACTIVE";
    updatePendingPayments?: boolean;
  },
): Promise<AsaasSubscription> {
  return asaasFetch(`/subscriptions/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function listAsaasSubscriptionPayments(
  subscriptionId: string,
  limit = 12,
): Promise<Array<{ id: string; status: string; value: number; dueDate: string; invoiceUrl?: string; description?: string }>> {
  const list = await asaasFetch(`/subscriptions/${subscriptionId}/payments?limit=${limit}`);
  return list?.data ?? [];
}

export async function deleteAsaasSubscription(id: string) {
  return asaasFetch(`/subscriptions/${id}`, { method: "DELETE" });
}

export async function getFirstSubscriptionPayment(subscriptionId: string): Promise<Pagamento | undefined> {
  const list = await asaasFetch(`/subscriptions/${subscriptionId}/payments?limit=1`);
  return list?.data?.[0];
}

export async function createAsaasPayment(data: {
  customer: string;
  billingType: "CREDIT_CARD" | "PIX";
  value: number;
  dueDate: string;
  description: string;
  externalReference: string;
  creditCard?: AsaasCartao;
  creditCardHolderInfo?: AsaasTitular;
  remoteIp?: string;
}): Promise<Pagamento> {
  return asaasFetch("/payments", { method: "POST", body: JSON.stringify(data) });
}

export async function getAsaasPayment(id: string): Promise<Pagamento> {
  return asaasFetch(`/payments/${id}`);
}

export async function getAsaasPixQrCode(paymentId: string): Promise<{ encodedImage: string; payload: string }> {
  return asaasFetch(`/payments/${paymentId}/pixQrCode`);
}

export async function getAsaasPaymentLink(id: string): Promise<{ externalReference?: string }> {
  return asaasFetch(`/paymentLinks/${id}`);
}
