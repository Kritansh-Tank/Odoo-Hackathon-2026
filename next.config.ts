import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── Output ────────────────────────────────────────────────
  // "standalone" bundles only the required files — ideal for Vercel / Docker
  output: "standalone",

  // ─── Three.js packages need explicit transpilation ─────────
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],

  // ─── Image optimisation ────────────────────────────────────
  images: {
    remotePatterns: [
      {
        // Supabase Storage public bucket (vehicle documents, avatars)
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // ─── Experimental ─────────────────────────────────────────
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // ─── Security headers (also in vercel.json — belt-and-suspenders) ─
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
