import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { HEADERS_LANDING } from "@/lib/seguranca";

export async function GET() {
  let html = readFileSync(join(process.cwd(), "public/designs/b2b/index.html"), "utf-8");
  html = html.replace("<head>", '<head><base href="/designs/b2b/">');
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", ...HEADERS_LANDING },
  });
}
