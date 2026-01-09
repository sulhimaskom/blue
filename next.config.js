const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [],

  // Streamlined experimental features for speed
  experimental: {
    // Keep only essential package optimizations
    optimizePackageImports: [
      "@clerk/nextjs",
      "lucide-react",
      "zod",
    ],
    // Disable expensive optimizations for speed
    optimizeCss: false,
    optimizeServerReact: true,
    workerThreads: false,
  },

  // Reduced externals for faster compilation
  serverExternalPackages: [
    "@clerk/backend",
    "@sentry/node",
  ],

  // Streamlined webpack for maximum speed
  webpack: (config, { dev, isServer }) => {
    // Streamlined module configuration
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };

    // Production optimizations
    if (!dev) {
      // Optimized parallelism
      config.parallelism = 2;
      
      // Disable build cache for consistent timing
      config.cache = false;

      // Streamlined optimization
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        moduleIds: "deterministic",
        // Simplified chunk splitting for speed
        splitChunks: {
          chunks: "all",
          maxSize: 500000, // 500KB chunks for balance
          minSize: 200000, // 200KB minimum
          maxInitialRequests: 3,
          maxAsyncRequests: 4,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              priority: 10,
              chunks: "all",
            },
            framework: {
              test: /[\\/](react|react-dom|scheduler)[\\/]/,
              name: "framework",
              priority: 20,
              chunks: "all",
            },
          },
        },
      };
    }

    // Development optimizations
    if (dev) {
      config.watchOptions = {
        ignored: /node_modules/,
        aggregateTimeout: 100,
        poll: 600,
      };
    }

    return config;
  },

  // Essential optimizations only
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // Simplified image optimization
  images: {
    formats: ["image/webp"],
    deviceSizes: [640, 1080, 1920],
    imageSizes: [32, 64, 128],
  },

  // Standalone output
  output: "standalone",

  // Stable build ID
  generateBuildId: async () => {
    return process.env.NODE_ENV === "production" 
      ? `prod-${Date.now()}` 
      : "dev";
  },
};

module.exports = withBundleAnalyzer(nextConfig);