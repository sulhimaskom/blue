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

  // Ultra-streamlined webpack
  webpack: (config, { dev }) => {
    // Basic module config
    config.module.exprContextCritical = false;

    // Production ultra-optimizations
    if (!dev) {
      // Single worker for reduced overhead
      config.parallelism = 1;
      
      // Completely disable cache
      config.cache = false;

      // Minimal optimization
      config.optimization = {
        // Only essential optimizations
        usedExports: true,
        sideEffects: false,
        // Skip complex chunk splitting
        splitChunks: false,
        // Disable minimization in development
        minimize: process.env.NODE_ENV === "production",
      };

      // Remove expensive plugins
      config.plugins = config.plugins.filter(plugin => {
        // Keep only essential plugins
        return plugin.constructor.name !== "FaviconsWebpackPlugin";
      });
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

  // Simple build ID
  generateBuildId: () => "build",

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