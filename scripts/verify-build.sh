#!/bin/bash
# Build Verification Script - Validates all quality gates pass
# 
# BUG-008 Prevention: This script prevents TypeScript build artifact issues
# by cleaning stale .next/types files that cause TS6053 errors during typecheck.
#
# This script ensures:
# 1. Clean build environment (prevents BUG-008)
# 2. Successful TypeScript compilation
# 3. Zero type errors
# 4. Passing lint checks

set -e  # Exit on any error

echo "🔍 Running build verification..."

# Clean any stale build artifacts (BUG-008 prevention)
echo "🧹 Cleaning build artifacts (BUG-008 prevention)..."
if [ -d ".next" ]; then
  echo "  Removing .next directory to prevent TS6053 errors..."
  rm -rf .next
  echo "  ✅ Build artifacts cleaned"
else
  echo "  ✅ No stale build artifacts found"
fi

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