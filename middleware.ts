import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const url = request.nextUrl.clone();

  // Em produção: roteia por subdomínio
  // Em dev: roteia por path (/business ou /assinatura)
  if (hostname.startsWith("business.")) {
    url.pathname = `/routes/business${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  if (hostname.startsWith("assine.")) {
    url.pathname = `/routes/assinatura${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Sem subdomínio próprio (localhost e *.vercel.app), as landings ficam em /assinatura e /business
  const semSubdominio =
    hostname.startsWith("localhost") ||
    hostname.startsWith("127.0.0.1") ||
    hostname.endsWith(".vercel.app");
  if (semSubdominio) {
    if (url.pathname === "/business" || url.pathname.startsWith("/business/")) {
      const rest = url.pathname === "/business" ? "" : url.pathname.slice("/business".length);
      url.pathname = `/routes/business${rest}`;
      return NextResponse.rewrite(url);
    }
    if (url.pathname === "/assinatura" || url.pathname.startsWith("/assinatura/")) {
      const rest = url.pathname === "/assinatura" ? "" : url.pathname.slice("/assinatura".length);
      url.pathname = `/routes/assinatura${rest}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
