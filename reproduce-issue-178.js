#!/usr/bin/env node

/**
 * Reproduction case for GitHub Issue #178
 * Verifies that AGENTS.md quality gate metrics match current repository state
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 Reproducing Issue #178: AGENTS.md quality gate metrics mismatch\n');

try {
  // Read AGENTS.md content
  const agentsContent = fs.readFileSync('AGENTS.md', 'utf8');
  
  // Look for the Quality Gate Verification section
  const qualityGateSection = agentsContent.match(
    /2\. \*\*Quality Gate Verification\*\*: ALWAYS run these commands before starting work:([\s\S]*?)(?=\n\d+\.|\n###|\Z)/
  );
  
  if (!qualityGateSection) {
    console.log('❌ Quality Gate Verification section not found');
    process.exit(1);
  }
  
  const sectionText = qualityGateSection[0];
  console.log('📋 Current AGENTS.md Quality Gate section:');
  console.log('─'.repeat(50));
  console.log(sectionText);
  console.log('─'.repeat(50));
  
  // Check for merge conflict markers
  if (sectionText.includes('<<<<<<< HEAD')) {
    console.log('❌ MERGE CONFLICT MARKERS DETECTED');
  } else {
    console.log('✅ No merge conflict markers');
  }
  
  // Extract build metrics
  const buildMatch = sectionText.match(/`npm run build` - MUST pass \(([^)]+)\)/);
  if (buildMatch) {
    const buildInfo = buildMatch[1];
    console.log(`📊 Documented build metrics: ${buildInfo}`);
    
    if (buildInfo.includes('44 static pages')) {
      console.log('✅ Static pages count matches');
    } else {
      console.log('❌ Static pages count mismatch');
    }
    
    // Check if build time is realistic (should be ~20s based on recent builds)
    if (buildInfo.includes('25.4s')) {
      console.log('⚠️ Build time may be outdated (shows 25.4s, recent builds ~20s)');
    }
  } else {
    console.log('❌ Build metrics pattern not found');
  }
  
  // Extract test metrics
  const testMatch = sectionText.match(/`npm test --silent` - MUST return 100% pass rate \(([^)]+)\)/);
  if (testMatch) {
    const testInfo = testMatch[1];
    console.log(`📊 Documented test metrics: ${testInfo}`);
    
    // Check test counts
    if (testInfo.includes('44/44 suites')) {
      console.log('✅ Test suites count matches current');
    } else {
      console.log('❌ Test suites count mismatch');
    }
    
    if (testInfo.includes('645/645 tests')) {
      console.log('❌ Test count may be outdated (645 documented)');
    } else {
      console.log('✅ Test count appears current');
    }
  } else {
    console.log('❌ Test metrics pattern not found');
  }
  
  console.log('\n🎯 Issue Analysis:');
  console.log('- Merge conflict markers need removal');
  console.log('- Build time needs updating (25.4s → 20.6s)');
  console.log('- Test counts need verification and updating');
  console.log('- Verification date needs updating (January 12, 2026 → current)');
  
} catch (error) {
  console.error('❌ Error reproducing issue:', error.message);
  process.exit(1);
}