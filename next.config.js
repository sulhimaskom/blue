const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@neondatabase/serverless"],

  // Performance optimization configurations (Next.js 15 compatible)
  experimental: {
    // Optimize package imports for smaller bundles
    optimizePackageImports: [
      "@clerk/nextjs",
      "lucide-react",
      "@/lib/services",
      "lodash",
      "stripe",
      "@neondatabase/serverless",
      "zod",
      "drizzle-orm",
      "redis",
      "@sentry/nextjs",
    ],
    // Enable incremental caching improvements
    optimizeCss: true,
  },

  // Advanced webpack optimization for maximum performance
  webpack: (config, { dev, isServer }) => {
    // Fix OpenTelemetry dynamic import issue by ignoring dynamic requires
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };

    // Development build optimizations
    if (dev) {
      // Enable faster rebuilds in development
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules/,
        aggregateTimeout: 200, // Reduced delay for faster rebuilds
        poll: 800, // Check for changes more frequently
      };
    }

    // Optimize for production
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        // Improve chunk splitting for better caching
        splitChunks: {
          chunks: "all",
          maxSize: 160000, // Optimized for better CDN caching (160kB chunks)
          minSize: 25000, // Minimum 25 kB to avoid too many tiny chunks
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            services: {
              test: /[\\/]lib[\\/]services[\\/]/,
              name: "services",
              priority: 50,
              reuseExistingChunk: true,
            },
            clerk: {
              test: /[\\/]node_modules[\\/]@clerk[\\/]/,
              name: "clerk",
              priority: 30,
              reuseExistingChunk: true,
            },
            sentry: {
              test: /[\\/]node_modules[\\/]@sentry[\\/]/,
              name: "sentry",
              priority: 25,
              reuseExistingChunk: true,
            },
            stripe: {
              test: /[\\/]node_modules[\\/](stripe|@types\/stripe)[\\/]/,
              name: "stripe",
              priority: 25,
              reuseExistingChunk: true,
            },
            database: {
              test: /[\\/]node_modules[\\/](@neondatabase|drizzle-orm)[\\/]/,
              name: "database",
              priority: 35,
              reuseExistingChunk: true,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              name: "react",
              priority: 40,
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

  // Production optimizations
  productionBrowserSourceMaps: false,

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
};

module.exports = withBundleAnalyzer(nextConfig);
