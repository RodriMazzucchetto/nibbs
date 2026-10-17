import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendLeadNotification(lead: {
  nome: string;
  email: string;
  empresa?: string;
  telefone?: string;
  num_funcionarios?: string;
}) {
  await resend.emails.send({
    from: "Nibbs <noreply@nibbs.com>",
    to: "rodri.depaula@gmail.com",
    subject: `Novo lead B2B: ${lead.nome} - ${lead.empresa ?? ""}`,
    html: `
      <h2>Novo lead capturado</h2>
      <p><strong>Nome:</strong> ${lead.nome}</p>
      <p><strong>Email:</strong> ${lead.email}</p>
      <p><strong>Empresa:</strong> ${lead.empresa ?? "—"}</p>
      <p><strong>Telefone:</strong> ${lead.telefone ?? "—"}</p>
      <p><strong>Nº funcionários:</strong> ${lead.num_funcionarios ?? "—"}</p>
    `,
  });
}

export async function sendLeadConfirmation(lead: { nome: string; email: string }) {
  await resend.emails.send({
    from: "Nibbs <noreply@nibbs.com>",
    to: lead.email,
    subject: "Recebemos seu contato!",
    html: `
      <h2>Oi, ${lead.nome}!</h2>
      <p>Recebemos suas informações e entraremos em contato em breve para agendar uma conversa.</p>
      <p>Equipe Nibbs</p>
    `,
  });
}

export async function sendSubscriptionWelcome(customer: {
  nome: string;
  email: string;
  plano: string;
}) {
  await resend.emails.send({
    from: "Nibbs <noreply@nibbs.com>",
    to: customer.email,
    subject: "Bem-vindo ao clube Nibbs!",
    html: `
      <h2>Bem-vindo ao clube, ${customer.nome}!</h2>
      <p>Sua assinatura do plano <strong>${customer.plano}</strong> está ativa.</p>
      <p>Em breve você receberá mais detalhes sobre sua primeira entrega.</p>
      <p>Equipe Nibbs</p>
    `,
  });
}

export async function sendCupomPresente3m(opts: {
  nome: string;
  email: string;
  codigo: string;
}) {
  await resend.emails.send({
    from: "Nibbs <noreply@nibbs.com>",
    to: opts.email,
    subject: "Seu cupom de 10% na Nibbs",
    html: `
      <h2>Oi, ${opts.nome}!</h2>
      <p>Obrigado por presentear 3 meses de Nibbs. Como agradecimento, você ganhou <strong>10% de desconto</strong> pra assinar o seu próprio plano.</p>
      <p>Seu cupom: <strong style="font-size:20px;letter-spacing:0.06em">${opts.codigo}</strong></p>
      <p>Use no checkout da assinatura mensal. Vale uma vez.</p>
      <p>Equipe Nibbs</p>
    `,
  });
}
