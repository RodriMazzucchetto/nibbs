import type { NextConfig } from "next";
import { HEADERS_LANDING } from "./lib/seguranca";

const nextConfig: NextConfig = {
  // As rotas das landings leem o HTML do disco com readFileSync
  outputFileTracingIncludes: {
    "/routes/assinatura": ["./public/designs/b2c/index.html"],
  },
  async headers() {
    return [
      {
        source: "/designs/:path*",
        headers: Object.entries(HEADERS_LANDING).map(([key, value]) => ({ key, value })),
      },
    ];
  },
};

export default nextConfig;
