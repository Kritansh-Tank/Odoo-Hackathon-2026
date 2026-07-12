import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Three.js packages
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],

  // Experimental features
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

export default nextConfig;
