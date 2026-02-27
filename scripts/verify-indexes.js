/**
 * Index Verification and Application Script
 *
 * This script verifies which indexes from lib/db/indexes.ts are applied
 * and can apply missing indexes using DatabaseIndexer.
 *
 * Usage:
 *   node scripts/verify-indexes.js
 *
 * Requires DATABASE_URL environment variable to be set.
 */

import { neon } from '@neondatabase/serverless';
import { db } from '../lib/db/index.js';
import { DatabaseIndexer } from '../lib/db/indexes.js';

// Index definitions from lib/db/indexes.ts
const RECOMMENDED_INDEXES = [
  'idx_projects_owner_status_created',
  'idx_blueprints_project_created_version',
  'idx_transactions_user_amount_created',
  'idx_projects_owner_created',
  'idx_blueprints_project_version',
  'idx_transactions_user_created',
  'idx_blueprints_id',
  'idx_projects_id',
  'idx_users_clerk_id',
  'idx_blueprints_project_created',
  'idx_transactions_stripe_payment',
];

const ADVANCED_INDEXES = [
  'idx_projects_owner_status_created',
  'idx_blueprints_project_created_version',
  'idx_transactions_user_amount_created',
  'idx_composite_user_metrics',
];

async function main() {
  console.log('🔍 Database Index Verification Script');
  console.log('====================================\n');

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable not set');
    console.log("   Set it with: export DATABASE_URL='postgresql://...'");
    process.exit(1);
  }

  try {
    // Get current indexes from database
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
    `;

    const existingIndexes = new Set(result.map(row => row.indexname));

    console.log(`📊 Found ${existingIndexes.size} indexes in database\n`);

    // Check RECOMMENDED_INDEXES
    console.log('📋 RECOMMENDED_INDEXES Status:');
    console.log('-----------------------------');
    let missingRecommended = [];
    for (const indexName of RECOMMENDED_INDEXES) {
      if (existingIndexes.has(indexName)) {
        console.log(`   ✅ ${indexName}`);
      } else {
        console.log(`   ❌ ${indexName} - MISSING`);
        missingRecommended.push(indexName);
      }
    }

    // Check ADVANCED_INDEXES
    console.log('\n📋 ADVANCED_INDEXES Status:');
    console.log('--------------------------');
    let missingAdvanced = [];
    for (const indexName of ADVANCED_INDEXES) {
      if (existingIndexes.has(indexName)) {
        console.log(`   ✅ ${indexName}`);
      } else {
        console.log(`   ❌ ${indexName} - MISSING`);
        missingAdvanced.push(indexName);
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log('-----------');
    const totalMissing = missingRecommended.length + missingAdvanced.length;
    if (totalMissing === 0) {
      console.log('   ✅ All indexes are applied!');
    } else {
      console.log(`   ⚠️  ${totalMissing} indexes missing`);

      if (process.argv.includes('--apply')) {
        console.log('\n🚀 Applying missing indexes...');

        try {
          await DatabaseIndexer.createAllIndexes();
          console.log('✅ Indexes applied successfully');
        } catch (error) {
          console.error('❌ Failed to apply indexes:', error.message);
        }
      } else {
        console.log('\n   To apply missing indexes, run with --apply flag:');
        console.log('   node scripts/verify-indexes.js --apply');
      }
    }

    // Check RLS status
    console.log('\n🔒 Row Level Security Status:');
    console.log('-----------------------------');
    const rlsResult = await sql`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND rowsecurity = true
    `;

    if (rlsResult.length > 0) {
      console.log(`   ✅ RLS enabled on ${rlsResult.length} tables`);
      for (const row of rlsResult) {
        console.log(`      - ${row.tablename}`);
      }
    } else {
      console.log('   ❌ RLS not enabled on any tables');
      console.log('   Run migration 0018_enable_rls.sql to enable RLS');
    }

    // Check subscriptionUsage unique constraint
    console.log('\n📋 subscription_usage unique constraint:');
    console.log('------------------------------------------');
    const uniqueResult = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'subscription_usage'
      AND indexdef LIKE '%UNIQUE%'
    `;

    if (uniqueResult.length > 0) {
      console.log('   ✅ Unique constraint found:');
      for (const row of uniqueResult) {
        console.log(`      - ${row.indexname}`);
      }
    } else {
      console.log('   ❌ Unique constraint not found');
    }
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

main();
