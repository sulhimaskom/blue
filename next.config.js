/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@neondatabase/serverless"],

  // Performance optimization configurations
  experimental: {
    // Optimize bundle splitting for better caching
    optimizePackageImports: ["@clerk/nextjs", "lucide-react"],
  },

  // Bundle analysis optimization
  webpack: (config, { dev, isServer }) => {
    // Optimize for production
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };
    }

    return config;
  },

  // Compression and caching
  compress: true,

  poweredByHeader: false,
};

module.exports = nextConfig;
