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
          maxSize: 50000, // Reduced from 200000 to 50 kB for better granularity
          minSize: 10000, // Minimum 10 kB to avoid too many tiny chunks
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
  },

  // Output optimization
  output: "standalone",

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

module.exports = withBundleAnalyzer(nextConfig);
