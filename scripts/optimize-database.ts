#!/usr/bin/env tsx

/**
 * Database Performance Optimization Script
 *
 * This script applies all database performance optimizations:
 * 1. Creates recommended indexes
 * 2. Updates table statistics
 * 3. Analyzes current performance
 *
 * Usage: npx tsx scripts/optimize-database.ts
 */

import { DatabaseIndexer } from "../lib/db/indexes";
import { getDb, checkDbHealth } from "../lib/db";
import { logger } from "../lib/logger";

async function main() {
  try {
    console.log("🚀 Starting Database Performance Optimization...\n");

    // Check database health first
    console.log("📊 Checking database health...");
    const healthResult = await checkDbHealth();

    if (!healthResult.healthy) {
      console.error("❌ Database health check failed:", healthResult.error);
      process.exit(1);
    }

    console.log(
      `✅ Database is healthy (latency: ${healthResult.latency}ms)\n`,
    );

    // Create all recommended indexes
    console.log("🔧 Creating performance indexes...");
    await DatabaseIndexer.createAllIndexes();

    // Update table statistics for optimal query planning
    console.log("\n📈 Updating table statistics...");
    await DatabaseIndexer.updateTableStatistics();

    // Analyze current index usage
    console.log("\n🔍 Analyzing index usage...");
    const analysis = await DatabaseIndexer.analyzeIndexUsage();

    console.log(`\n📊 Current Index Status:`);
    console.log(`   • Total indexes: ${analysis.currentIndexes.length}`);
    console.log(
      `   • Missing recommended indexes: ${analysis.missingIndexes.length}`,
    );

    if (analysis.missingIndexes.length > 0) {
      console.log("\n⚠️  Missing Recommended Indexes:");
      analysis.missingIndexes.forEach((index) => {
        console.log(`   - ${index.name}: ${index.description}`);
      });
    }

    if (analysis.recommendations.length > 0) {
      console.log("\n💡 Recommendations:");
      analysis.recommendations.forEach((rec) => {
        console.log(`   • ${rec}`);
      });
    }

    // Get performance metrics if available
    console.log("\n📊 Performance Metrics...");
    const metrics = await DatabaseIndexer.getQueryPerformanceMetrics();

    if (metrics.slowQueries.length > 0) {
      console.log("\n⚠️  Slow Queries Found:");
      metrics.slowQueries.forEach((query, i) => {
        console.log(
          `   ${i + 1}. ${Math.round(query.meanTime)}ms avg - ${query.calls} calls`,
        );
      });
    }

    console.log("\n✅ Database optimization completed successfully!");
    console.log("\nNext steps:");
    console.log("   • Monitor query performance in production");
    console.log("   • Consider adding connection pooling monitoring");
    console.log("   • Schedule regular ANALYZE operations");
  } catch (error) {
    console.error("\n❌ Database optimization failed:", error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("\n💥 Unexpected error:", error);
    process.exit(1);
  });
}
