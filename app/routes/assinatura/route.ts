import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  let html = readFileSync(join(process.cwd(), "public/designs/b2c/index.html"), "utf-8");
  html = html.replace("<head>", '<head><base href="/designs/b2c/">');
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
