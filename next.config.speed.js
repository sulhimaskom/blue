const withBundleAnalyzer = require("@next/bundle-analyzer")({
  disabled: true, // Always disabled for speed
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal transpilation for speed
  transpilePackages: [],

  // Essential experimental features only
  experimental: {
    // Minimal package optimization
    optimizePackageImports: ["lucide-react"],
    // Disable all expensive features
    optimizeCss: false,
    optimizeServerReact: false,
    workerThreads: false,
    // Disable build traces for speed
    incrementalCacheHandler: undefined,
    isrMemoryCacheSize: 0,
  },

  // Minimal externals
  serverExternalPackages: [],

  // Ultra-streamlined webpack with advanced optimizations
  webpack: (config, { dev }) => {
    // Basic module config
    config.module.exprContextCritical = false;

    // Production ultra-optimizations
    if (!dev) {
      // Enhanced parallelism for modern CPUs
      config.parallelism = 2;
      
      // Strategic cache configuration
      config.cache = {
        type: 'filesystem',
        maxGenerations: 1,
        maxAge: 86400000, // 24 hours
        buildDependencies: {
          config: [__filename],
        },
      };

      // Advanced optimization with strategic chunk splitting
      config.optimization = {
        // Essential optimizations
        usedExports: true,
        sideEffects: false,
        moduleIds: "deterministic",
        // Strategic chunk splitting for caching
        splitChunks: {
          chunks: "all",
          maxSize: 400000, // 400KB chunks
          minSize: 200000, // 200KB minimum  
          maxInitialRequests: 3,
          maxAsyncRequests: 4,
          cacheGroups: {
            // Framework chunk
            framework: {
              test: /[\\/](react|react-dom|scheduler)[\\/]/,
              name: "framework",
              priority: 20,
              chunks: "all",
            },
            // Vendor chunk
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors", 
              priority: 10,
              chunks: "all",
              exclude: /[\\/](react|react-dom|scheduler)[\\/]/,
            },
          },
        },
        // Minimize in production only
        minimize: process.env.NODE_ENV === "production",
      };

      // Remove expensive plugins
      config.plugins = config.plugins.filter(plugin => {
        return plugin.constructor.name !== "FaviconsWebpackPlugin";
      });

      // Enhanced resolve configuration
      config.resolve = {
        ...config.resolve,
        symlinks: false,
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      };

      // Reduced stats for speed
      config.stats = {
        preset: 'minimal',
        modules: false,
        children: false,
      };
    }

    return config;
  },

  // Essential settings only
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // Simplified images
  images: {
    formats: ["image/webp"],
    deviceSizes: [640, 1080],
    imageSizes: [32, 64],
    minimumCacheTTL: 0, // Disable caching for speed
  },

  // Standalone output
  output: "standalone",

  // Optimized build ID with caching
  generateBuildId: async () => {
    if (process.env.NODE_ENV === "production") {
      // Hourly granularity for cache optimization
      const hourTimestamp = Math.floor(Date.now() / (1000 * 60 * 60));
      return `speed-${hourTimestamp}`;
    }
    return "dev-speed";
  },

  // Disable build analytics
  onDemandEntries: {
    maxInactiveAge: 0,
    pagesBufferLength: 0,
  },

  // Speed optimizations
  swcMinify: true,
  
  // Disable expensive features
  trailingSlash: false,
  
  // Skip rewrites for speed
  async rewrites() {
    return [];
  },

  // Skip redirects for speed
  async redirects() {
    return [];
  },
};

module.exports = withBundleAnalyzer(nextConfig);