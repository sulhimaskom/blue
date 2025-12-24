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
import { getDb, checkDbHealth, getPoolStats } from "../lib/db";
import { logger } from "../lib/logger";
import { DatabasePerformanceMonitor } from "../lib/db/performance-monitor";

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

    // Enhanced performance monitoring
    console.log("\n⚡ Enhanced Performance Analysis...");
    const realTimeIndicators =
      await DatabasePerformanceMonitor.getRealTimePerformanceIndicators();

    console.log(
      `   • Connection Health: ${realTimeIndicators.connectionHealth ? "✅ Healthy" : "❌ Unhealthy"}`,
    );
    console.log(`   • Query Latency: ${realTimeIndicators.queryLatency}ms`);
    console.log(
      `   • Throughput: ${realTimeIndicators.throughput.toFixed(2)} queries/sec`,
    );
    console.log(`   • Error Rate: ${realTimeIndicators.errorRate.toFixed(1)}%`);

    // Connection pool statistics
    console.log("\n🔗 Connection Pool Analysis...");
    try {
      const poolStats = await getPoolStats();
      console.log(`   • Max Connections: ${poolStats.maxConnections}`);
      console.log(`   • Active Connections: ${poolStats.activeConnections}`);
      console.log(
        `   • Connection Utilization: ${poolStats.connectionUtilization}%`,
      );
      console.log(
        `   • Available Connections: ${poolStats.availableConnections}`,
      );
    } catch (error) {
      console.log(
        "   ⚠️  Pool stats unavailable:",
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    // Performance recommendations
    if (realTimeIndicators.recommendations.length > 0) {
      console.log("\n💡 Performance Recommendations:");
      realTimeIndicators.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    console.log("\n✅ Database optimization completed successfully!");
    console.log("\nNext steps:");
    console.log(
      "   • Monitor query performance in production with DatabasePerformanceMonitor",
    );
    console.log("   • Track connection pooling with `/api/metrics` endpoint");
    console.log("   • Schedule regular ANALYZE operations");
    console.log("   • Set up alerts for slow queries >500ms");
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
