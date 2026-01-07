/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@neondatabase/serverless"],

  // Performance optimization configurations
  experimental: {
    // Optimize bundle splitting for better caching
    optimizePackageImports: ["@clerk/nextjs", "lucide-react"],
  },

  // Advanced bundle analysis optimization with OpenTelemetry fix
  webpack: (config, { dev, isServer }) => {
    // Fix OpenTelemetry dynamic import issue by ignoring dynamic requires
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };

    // Optimize for production
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        // Improve chunk splitting for better caching
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
              priority: 10,
            },
            common: {
              name: "common",
              minChunks: 2,
              chunks: "all",
              priority: 5,
            },
          },
        },
      };
    }

    return config;
  },

  // Compression and caching
  compress: true,

  poweredByHeader: false,
};

module.exports = nextConfig;
