import { NextRequest, NextResponse } from "next/server";

/** B2B arquivado em /archive/b2b — sem acesso público. */
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/", request.url), 308);
}
