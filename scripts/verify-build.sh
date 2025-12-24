#!/bin/bash
# Build Verification Script - Validates all quality gates pass
# This script ensures:
# 1. Clean build environment
# 2. Successful TypeScript compilation
# 3. Zero type errors
# 4. Passing lint checks

set -e  # Exit on any error

echo "🔍 Running build verification..."

# Clean any stale build artifacts
echo "🧹 Cleaning build artifacts..."
rm -rf .next

# Run production build
echo "🏗️  Running production build..."
npm run build

# Verify typecheck passes
echo "🔎 Running TypeScript typecheck..."
npm run typecheck

# Verify lint passes
echo "📋 Running lint checks..."
npm run lint

# Run tests
echo "🧪 Running test suite..."
npm run test

echo "✅ All quality gates passed successfully!"
echo "Build verification complete."