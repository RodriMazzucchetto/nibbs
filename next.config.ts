import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // As rotas das landings leem o HTML do disco com readFileSync
  outputFileTracingIncludes: {
    "/routes/assinatura": ["./public/designs/b2c/index.html"],
    "/routes/business": ["./public/designs/b2b/index.html"],
  },
};

export default nextConfig;
