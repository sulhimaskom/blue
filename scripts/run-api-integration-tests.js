/**
 * API Integration Test Runner
 * 
 * Complementary integration testing for Next.js API routes
 * Runs alongside Jest to provide end-to-end API validation
 * Follows world-class testing architecture principles
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const TEST_RESULTS_DIR = join(process.cwd(), '.next', 'test-results');

export interface ApiTestResult {
  file: string;
  status: 'pass' | 'fail' | 'error';
  duration: number;
  error?: string;
  coverage: {
    endpoints: string[];
    methods: string[];
    statusCodes: number[];
  };
}

export interface IntegrationTestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  errors: number;
  duration: number;
  coverage: {
    totalEndpoints: number;
    testedEndpoints: string[];
    methodsCovered: Set<string>;
    statusCodesCovered: Set<number>;
  };
  recommendations?: string[];
}

export class ApiIntegrationTestRunner {
  private testFiles: string[] = [];
  private results: ApiTestResult[] = [];

  constructor() {
    this.ensureResultsDirectory();
  }

  private ensureResultsDirectory() {
    if (!existsSync(TEST_RESULTS_DIR)) {
      mkdirSync(TEST_RESULTS_DIR, { recursive: true });
    }
  }

  /**
   * Discover all API integration test files
   */
  private discoverTestFiles(): string[] {
    const apiTestDir = join(process.cwd(), '__tests__', 'api');
    
    try {
      const files = execSync(`find "${apiTestDir}" -name "*.test.ts"`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim().split('\n').filter(Boolean);
      
      return files;
    } catch (error) {
      console.warn('Could not discover API test files:', error);
      return [];
    }
  }

  /**
   * Create a Node.js integration test environment
   */
  private createIntegrationTestFile(testFile: string): string {
    const testContent = `
// API Integration Test Environment
// Generated for: ${testFile}

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3001; // Different port to avoid conflicts

const app = next({ dev, hostname, port, dir: './' });
const handle = app.getRequestHandler();

let server;

async function startTestServer() {
  try {
    await app.prepare();
    server = createServer(async (req, res) => {
      try {
        await handle(req, res);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    });

    server.listen(port, () => {
      console.log(\`Test server ready on http://\${hostname}:\${port}\`);
    });
  } catch (error) {
    console.error('Failed to start test server:', error);
    process.exit(1);
  }
}

async function stopTestServer() {
  if (server) {
    server.close(() => {
      console.log('Test server stopped');
      app.close();
    });
  }
}

// Start test server
startTestServer().then(() => {
  // Load and run the actual test
  require('${testFile.replace(/\\/g, '/\\\\')}');
});

// Cleanup on exit
process.on('exit', stopTestServer);
process.on('SIGINT', stopTestServer);
process.on('SIGTERM', stopTestServer);
`;

    const tempFile = join(TEST_RESULTS_DIR, `integration-${Date.now()}.js`);
    writeFileSync(tempFile, testContent);
    return tempFile;
  }

  /**
   * Run individual API integration test
   */
  private async runTest(testFile: string): Promise<ApiTestResult> {
    const startTime = Date.now();
    
    try {
      // Create integration test environment
      const integrationFile = this.createIntegrationTestFile(testFile);
      
      // Set test environment variables
      const env = {
        ...process.env,
        NODE_ENV: 'test',
        INTEGRATION_TEST: 'true',
        TEST_SERVER_URL: 'http://localhost:3001'
      };

      // Execute the test
      execSync(`node "${integrationFile}"`, {
        encoding: 'utf8',
        stdio: 'pipe',
        env,
        timeout: 30000 // 30 second timeout
      });

      const duration = Date.now() - startTime;
      
      return {
        file: testFile,
        status: 'pass',
        duration,
        coverage: {
          endpoints: [], // Would be extracted from test execution
          methods: [],
          statusCodes: []
        }
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        file: testFile,
        status: error.status === 1 ? 'fail' : 'error',
        duration,
        error: error.message,
        coverage: {
          endpoints: [],
          methods: [],
          statusCodes: []
        }
      };
    }
  }

  /**
   * Extract API endpoint coverage from test files
   */
  private extractCoverage(testFile: string): ApiTestResult['coverage'] {
    try {
      const content = require('fs').readFileSync(testFile, 'utf8');
      
      // Extract endpoint patterns
      const endpointMatches = content.match(/\\/api\\/[\\w\\-\\/[\\]]+/g) || [];
      const methodMatches = content.match(/\\b(GET|POST|PUT|DELETE|PATCH|HEAD)\\b/gi) || [];
      const statusMatches = content.match(/\\.toBe\\((\\d{3})\\)/g) || [];
      
      return {
        endpoints: [...new Set(endpointMatches)],
        methods: [...new Set(methodMatches.map(m => m.toUpperCase()))],
        statusCodes: [...new Set(statusMatches.map(s => parseInt(s.match(/\\d+/)?.[0] || '0')))]
      };
    } catch (error) {
      return {
        endpoints: [],
        methods: [],
        statusCodes: []
      };
    }
  }

  /**
   * Generate comprehensive test summary
   */
  private generateSummary(): IntegrationTestSummary {
    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const errors = this.results.filter(r => r.status === 'error').length;
    const duration = this.results.reduce((sum, r) => sum + r.duration, 0);

    // Aggregate coverage data
    const allEndpoints = new Set<string>();
    const allMethods = new Set<string>();
    const allStatusCodes = new Set<number>();

    this.results.forEach(result => {
      result.coverage.endpoints.forEach(ep => allEndpoints.add(ep));
      result.coverage.methods.forEach(m => allMethods.add(m));
      result.coverage.statusCodes.forEach(sc => allStatusCodes.add(sc));
    });

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (failed > 0) {
      recommendations.push(`${failed} test(s) failed - review error logs and fix failing assertions`);
    }
    
    if (errors > 0) {
      recommendations.push(`${errors} test(s) had errors - check for syntax errors or environment issues`);
    }
    
    if (!allMethods.has('DELETE')) {
      recommendations.push('Consider adding DELETE method tests for comprehensive coverage');
    }
    
    if (!allStatusCodes.has(401)) {
      recommendations.push('Consider adding authentication error tests (401 status codes)');
    }

    return {
      totalTests,
      passed,
      failed,
      errors,
      duration,
      coverage: {
        totalEndpoints: allEndpoints.size,
        testedEndpoints: Array.from(allEndpoints),
        methodsCovered: allMethods,
        statusCodesCovered: allStatusCodes
      },
      recommendations
    };
  }

  /**
   * Run all API integration tests
   */
  async runAllTests(): Promise<IntegrationTestSummary> {
    console.log('🚀 Starting API Integration Tests...\n');
    
    this.testFiles = this.discoverTestFiles();
    
    if (this.testFiles.length === 0) {
      console.log('⚠️  No API integration test files found');
      return this.generateSummary();
    }

    console.log(`📋 Found ${this.testFiles.length} API integration test files\n`);

    // Run tests in parallel with concurrency limit
    const concurrencyLimit = 5;
    const chunks = [];
    
    for (let i = 0; i < this.testFiles.length; i += concurrencyLimit) {
      chunks.push(this.testFiles.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map(testFile => this.runTest(testFile))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.results.push(result.value);
          
          const status = result.value.status === 'pass' ? '✅' : 
                        result.value.status === 'fail' ? '❌' : '💥';
          
          console.log(`${status} ${chunk[index].replace(process.cwd(), '.')} (${result.value.duration}ms)`);
          
          if (result.value.error) {
            console.log(`   Error: ${result.value.error.substring(0, 100)}...`);
          }
        } else {
          console.log(`💥 ${chunk[index].replace(process.cwd(), '.')} - Test execution failed`);
        }
      });
    }

    console.log('\n'); // Spacing before summary
    
    return this.generateSummary();
  }

  /**
   * Print detailed test results
   */
  printResults(summary: IntegrationTestSummary) {
    console.log('📊 API Integration Test Summary');
    console.log('=' .repeat(40));
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`💥 Errors: ${summary.errors}`);
    console.log(`⏱️  Duration: ${summary.duration}ms\n`);

    console.log('🎯 Coverage Analysis');
    console.log('-'.repeat(20));
    console.log(`API Endpoints Tested: ${summary.coverage.totalEndpoints}`);
    summary.coverage.testedEndpoints.forEach(endpoint => {
      console.log(`  • ${endpoint}`);
    });
    
    console.log(`\nHTTP Methods Covered: ${summary.coverage.methodsCovered.size}`);
    Array.from(summary.coverage.methodsCovered).forEach(method => {
      console.log(`  • ${method}`);
    });

    console.log(`\nStatus Codes Tested: ${summary.coverage.statusCodesCovered.size}`);
    Array.from(summary.coverage.statusCodesCovered).forEach(code => {
      console.log(`  • ${code}`);
    });

    if (summary.recommendations && summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations');
      console.log('-'.repeat(18));
      summary.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }

    console.log('\n'); // Final spacing
  }

  /**
   * Save test results for CI/CD integration
   */
  saveResults(summary: IntegrationTestSummary) {
    const resultsFile = join(TEST_RESULTS_DIR, `api-integration-${Date.now()}.json`);
    
    const reportData = {
      timestamp: new Date().toISOString(),
      summary,
      results: this.results,
      environment: process.env.NODE_ENV || 'test'
    };

    writeFileSync(resultsFile, JSON.stringify(reportData, null, 2));
    console.log(`💾 Detailed results saved to: ${resultsFile.replace(process.cwd(), '.')}`);
  }
}

// CLI interface when run directly
if (require.main === module) {
  const runner = new ApiIntegrationTestRunner();
  
  runner.runAllTests()
    .then(summary => {
      runner.printResults(summary);
      runner.saveResults(summary);
      
      // Exit with appropriate code for CI/CD
      process.exit(summary.failed + summary.errors > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Integration test runner failed:', error);
      process.exit(1);
    });
}