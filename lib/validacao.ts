export const soDigitos = (v: string) => v.replace(/\D/g, "");

export function cpfValido(valor: string) {
  const cpf = soDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
    const digito = ((soma * 10) % 11) % 10;
    if (digito !== Number(cpf[tamanho])) return false;
  }
  return true;
}

export function luhnValido(valor: string) {
  const n = soDigitos(valor);
  if (n.length < 13 || n.length > 19) return false;
  let soma = 0;
  for (let i = 0; i < n.length; i++) {
    let d = Number(n[n.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    soma += d;
  }
  return soma % 10 === 0;
}

// "MM/AA" ainda não vencido
export function validadeValida(valor: string) {
  const m = /^(\d{2})\/(\d{2})$/.exec(valor.trim());
  if (!m) return false;
  const mes = Number(m[1]);
  const ano = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return false;
  const agora = new Date();
  return ano > agora.getFullYear() || (ano === agora.getFullYear() && mes >= agora.getMonth() + 1);
}

// Data de hoje no fuso de São Paulo (YYYY-MM-DD), usada como vencimento
export function hojeSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
