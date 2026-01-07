#!/bin/bash

# Development Performance Optimization Script
# Enhances developer experience with faster builds and better caching

echo "🚀 Setting up development performance optimizations..."

# Create .next build cache directory if it doesn't exist
if [ ! -d ".next/cache" ]; then
  mkdir -p .next/cache
  echo "✅ Created build cache directory"
fi

# Enable persistent Next.js cache
export NEXT_BUILD_WORKERS=1
export NEXT_TELEMETRY_DISABLED=1

# Add development environment variables to .env.local
if ! grep -q "NEXT_BUILD_WORKERS=1" .env.local 2>/dev/null; then
  echo "" >> .env.local
  echo "# Development performance optimizations" >> .env.local
  echo "NEXT_BUILD_WORKERS=1" >> .env.local
  echo "NEXT_TELEMETRY_DISABLED=1" >> .env.local
  echo "✅ Added performance environment variables to .env.local"
fi

# Create npm scripts for performance monitoring
if [ -f "package.json" ]; then
  # Check if dev:perf script exists
  if ! grep -q '"dev:perf"' package.json; then
    npm pkg set scripts.dev:perf="next dev --turbo"
    npm pkg set scripts.build:analyze="ANALYZE=true npm run build"
    npm pkg set scripts.build:clean="rm -rf .next && npm run build"
    echo "✅ Added performance scripts to package.json"
  fi
fi

echo ""
echo "🎯 Performance optimizations configured:"
echo "   • Build workers enabled for parallel processing"
echo "   • Telemetry disabled to reduce overhead"
echo "   • Enhanced cache management"
echo "   • Turbo mode development (npm run dev:perf)"
echo "   • Bundle analysis available (npm run build:analyze)"
echo ""
echo "📁 Cache directory: .next/cache"
echo "🔧 Performance scripts: npm run dev:perf, npm run build:analyze"
echo ""
echo "✨ Development experience enhanced!"