import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Prisma must stay external to the server bundle so its engine binary resolves at runtime.
  serverExternalPackages: ["@prisma/client", "prisma"],
  images: {
    // Logo is served via Supabase signed URLs (§12.1). No other remote images in V1.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
