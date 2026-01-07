const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@neondatabase/serverless"],

  // Performance optimization configurations
  experimental: {
    // Optimize bundle splitting for better caching
    optimizePackageImports: ["@clerk/nextjs", "lucide-react", "@/lib/services"],
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
          maxSize: 200000, // Reduced from 244000 for better granularity
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              priority: 10,
              reuseExistingChunk: true,
            },
            services: {
              test: /[\\/]lib[\\/]services[\\/]/,
              name: "services",
              priority: 40,
              reuseExistingChunk: true,
            },
            clerk: {
              test: /[\\/]node_modules[\\/]@clerk[\\/]/,
              name: "clerk",
              priority: 20,
              reuseExistingChunk: true,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              name: "react",
              priority: 30,
              reuseExistingChunk: true,
            },
            common: {
              name: "common",
              minChunks: 2,
              chunks: "all",
              priority: 5,
              reuseExistingChunk: true,
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

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Enable image optimization cache
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
  },

  // Output optimization
  output: "standalone",

  // Cache management for better performance
  generateBuildId: async () => {
    // Use a stable build ID for caching instead of hash-based
    if (process.env.NODE_ENV === "production") {
      return `prod-${Date.now()}`;
    }
    return "dev";
  },

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

module.exports = withBundleAnalyzer(nextConfig);
