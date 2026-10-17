import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function apexRedirect(request: NextRequest, path = "/") {
  const host = request.headers.get("host") ?? "";
  // Em local/preview mantém o host; em produção tira subdomínio (business./assine.)
  const apex = host.replace(/^(business|assine)\./i, "");
  const url = new URL(path, `${request.nextUrl.protocol}//${apex}`);
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url, 308);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Renova sessão Auth (cookies) em todas as páginas
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );
  await supabase.auth.getUser();

  const hostname = request.headers.get("host") ?? "";
  const url = request.nextUrl.clone();

  // B2B arquivado: sem acesso público
  if (hostname.startsWith("business.")) {
    return apexRedirect(request, "/");
  }
  if (url.pathname === "/business" || url.pathname.startsWith("/business/")) {
    return NextResponse.redirect(new URL("/", request.url), 308);
  }

  // Subdomínio antigo da assinatura → domínio principal
  if (hostname.startsWith("assine.")) {
    const path = url.pathname === "/" ? "/" : url.pathname;
    return apexRedirect(request, path);
  }

  // Domínio / URL principal → landing B2C
  if (url.pathname === "/" || url.pathname === "/assinatura" || url.pathname.startsWith("/assinatura/")) {
    const rest =
      url.pathname === "/" || url.pathname === "/assinatura"
        ? ""
        : url.pathname.slice("/assinatura".length);
    url.pathname = `/routes/assinatura${rest}`;
    return NextResponse.rewrite(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|designs/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
