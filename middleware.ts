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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
