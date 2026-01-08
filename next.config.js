const path = require("path");
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [],

  // Enhanced performance optimization configurations (Next.js 15 compatible)
  experimental: {
    // Optimize package imports for smaller bundles and faster builds
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
    // Enable incremental caching improvements (disabled for speed)
    optimizeCss: false,
    // Performance optimizations
    optimizeServerReact: true,
    // Disable worker threads for compatibility
    workerThreads: false,
  },

  // Move server external packages to proper location
  serverExternalPackages: [
    "@clerk/backend",
    "@sentry/node",
    "@sentry/profiling-node",
  ],

  // Advanced webpack optimization for maximum performance
  webpack: (config, { dev, isServer }) => {
    // Fix OpenTelemetry dynamic import issue by ignoring dynamic requires
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };

    // Externalize Node.js built-ins to reduce bundle size and improve build time
    if (!isServer) {
      config.externals = {
        ...config.externals,
        crypto: "crypto-browserify",
        stream: "stream-browserify",
        buffer: "buffer",
        util: "util",
        assert: "assert",
        os: "os-browserify/browser",
        path: "path-browserify",
        fs: "empty",
      };

      // Optimize crypto polyfill for browser
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve.fallback,
          crypto: "crypto-browserify",
          stream: "stream-browserify",
          buffer: "buffer",
          util: "util",
          assert: "assert",
          os: "os-browserify/browser",
          path: "path-browserify",
          fs: "empty",
        },
      };
    }

    // Development build optimizations
    if (dev) {
      // Enable faster rebuilds in development with optimized watch settings
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules/,
        aggregateTimeout: 100, // Further reduced for faster rebuilds
        poll: 600, // Balanced polling frequency
      };

      // Optimize development builds
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false, // Disable chunk splitting for faster dev builds
      };
    }

    // Optimize for fastest builds
    if (!dev) {
      config.parallelism = 4; // Use 4 threads for optimal performance with available memory

      // Disable caching for speed in production builds
      config.cache = false;

      // Streamlined optimization for speed
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        moduleIds: "deterministic",
        // Simplified chunk splitting for faster builds
        splitChunks: {
          chunks: "all",
          maxSize: 500000, // Increased to reduce fragmentation
          minSize: 200000, // Increased for faster processing
          maxInitialRequests: 3, // Slightly increased for balance
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
            framework: {
              test: /[\\/](react|react-dom|scheduler)[\\/]/,
              name: "framework",
              priority: 20,
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
