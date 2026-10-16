import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

  if (hostname.startsWith("business.")) {
    url.pathname = `/routes/business${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  if (hostname.startsWith("assine.")) {
    url.pathname = `/routes/assinatura${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(url);
  }

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

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|designs/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
