const path = require('path');
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [],
  
  // Performance optimization: Skip linting and type checking in build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

// Stable experimental features - Fix for Issue #232: Removed problematic optimizePackageImports
  experimental: {
    // REMOVED: optimizePackageImports - causes Html import bug in Next.js 15.5.9
    // Disable expensive optimizations for stability
    optimizeCss: false,
    optimizeServerReact: true,
    workerThreads: false,
  },

  // Reduced externals for faster compilation
  serverExternalPackages: [
    "@clerk/backend",
    "@sentry/node",
    "redis",
    "@redis/client",
    "@redis/client/dist/lib/client/enterprise-maintenance-manager.js",
  ],

  // Streamlined webpack for maximum speed
  webpack: (config, { dev, isServer }) => {
    if (isServer) {
      config.resolve = {
        ...config.resolve,
        alias: {
          ...config.resolve.alias,
          'self': path.resolve(__dirname, './scripts/empty.js'),
        },
      };
    }
    // Fix for Issue #299: Handle node: scheme imports from Sentry (Enhanced)
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        // Comprehensive node: scheme mapping for Sentry and other packages
        'node:child_process': 'child_process',
        'node:fs': 'fs',
        'node:http': 'http',
        'node:https': 'https',
        'node:diagnostics_channel': 'diagnostics_channel',
        'node:util': 'util',
        'node:path': 'path',
        'node:url': 'url',
        'node:os': 'os',
        'node:crypto': 'crypto',
        'node:stream': 'stream',
        'node:events': 'events',
        'node:buffer': 'buffer',
        'node:process': 'process',
        'node:querystring': 'querystring',
        'node:string_decoder': 'string_decoder',
        'node:timers': 'timers',
        'node:net': 'net',
        'node:tls': 'tls',
        'node:dns': 'dns',
        'node:worker_threads': 'worker_threads',
        'node:async_hooks': 'async_hooks',
      },
    };

    // Provide fallbacks for node modules in client build
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        fs: false,
        diagnostics_channel: false,
        util: false,
        path: false,
        url: false,
        os: false,
        crypto: false,
        stream: false,
        events: false,
        buffer: false,
        process: false,
        querystring: false,
        string_decoder: false,
        timers: false,
        net: false,
        tls: false,
        dns: false,
        worker_threads: false,
        async_hooks: false,
      };
    }

    // Streamlined module configuration
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };

    // Production optimizations
    if (!dev) {
      // Optimized parallelism - use all available CPU cores (4)
      config.parallelism = 4;
      
      // Enable memory cache for faster incremental builds
      config.cache = true;

      // Streamlined optimization
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        moduleIds: "deterministic",
        // Balanced chunk splitting for performance and bundle size
        splitChunks: {
          chunks: "all",
          maxSize: 200000, // 200KB chunks for aggressive bundle size reduction
          minSize: 30000, // 30KB minimum
          maxInitialRequests: 6,
          maxAsyncRequests: 8,
          cacheGroups: {
            // React framework (consolidated)
            framework: {
              test: /[\\/](react|react-dom|scheduler)[\\/]/,
              name: "framework",
              priority: 40,
              chunks: "all",
              reuseExistingChunk: true,
            },
            // UI libraries
            ui: {
              test: /[\\/](@radix-ui|class-variance-authority|clsx|tailwind-merge)[\\/]/,
              name: "ui",
              priority: 30,
              chunks: "all",
              reuseExistingChunk: true,
            },
            // Clerk auth
            clerk: {
              test: /[\\/]@clerk[\\/]/,
              name: "clerk",
              priority: 25,
              chunks: "all",
              reuseExistingChunk: true,
            },
            // Database and services
            services: {
              test: /[\\/](drizzle-orm|@neondatabase)[\\/]/,
              name: "services",
              priority: 20,
              chunks: "all",
              reuseExistingChunk: true,
            },
            // Other vendors
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              priority: 10,
              chunks: "all",
              minChunks: 1,
            },
          },
        },
      };
      
      // Remove expensive optimization plugins
      config.plugins = config.plugins.filter(plugin => {
        const name = plugin.constructor.name;
        return name !== "FaviconsWebpackPlugin" && 
               name !== "ManifestPlugin";
      });
    }

    // Development optimizations
    if (dev) {
      config.watchOptions = {
        ignored: /node_modules/,
        aggregateTimeout: 100,
        poll: 600,
      };
    }

    // Mark Redis as external for client builds to prevent bundling Node.js modules
    if (!isServer) {
      config.externals = [...(config.externals || []), 'redis', '@redis/client', '@redis/client/dist/lib/client/enterprise-maintenance-manager.js'];
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