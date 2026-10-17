// As landings rodam o template com new Function e estilos inline, por isso unsafe-inline/unsafe-eval.
// O que protege o cartão aqui é connect-src/form-action: a página só fala com o próprio site e o ViaCEP.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.i.posthog.com https://us.i.posthog.com https://app.posthog.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.i.posthog.com https://us.i.posthog.com https://app.posthog.com",
  "connect-src 'self' https://viacep.com.br https://*.i.posthog.com https://us.i.posthog.com https://app.posthog.com",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

export const HEADERS_LANDING: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
