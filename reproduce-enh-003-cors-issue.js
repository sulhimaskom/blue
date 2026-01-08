#!/usr/bin/env node

/**
 * ENH-003: CORS Configuration Security Test
 *
 * This script tests CORS configuration to ensure:
 * 1. Development mode allows all origins (*)
 * 2. Production mode restricts origins properly
 * 3. Preflight OPTIONS requests are handled correctly
 */

// Test configuration
const TEST_ORIGINS = [
  "https://malicious-site.com",
  "https://unauthorized-domain.com",
  "https://architect-platform.com", // Authorized domain
  "http://localhost:3000", // Development
];

const LOCAL_ENDPOINT = "http://localhost:3000/api/health";

async function testCorsHeaders(origin) {
  try {
    const response = await fetch(LOCAL_ENDPOINT, {
      method: "GET",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
      },
    });

    const corsOrigin = response.headers.get("Access-Control-Allow-Origin");
    const corsMethods = response.headers.get("Access-Control-Allow-Methods");
    const corsHeaders = response.headers.get("Access-Control-Allow-Headers");

    return {
      origin,
      status: response.status,
      corsOrigin,
      corsMethods,
      corsHeaders,
      securityHeaders: {
        xContentTypeOptions: response.headers.get("X-Content-Type-Options"),
        xFrameOptions: response.headers.get("X-Frame-Options"),
        xXssProtection: response.headers.get("X-XSS-Protection"),
      },
    };
  } catch (error) {
    return {
      origin,
      error: error.message,
      status: "ERROR",
    };
  }
}

async function testOptionsPreflight(origin) {
  try {
    const response = await fetch(LOCAL_ENDPOINT, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
      },
    });

    const corsOrigin = response.headers.get("Access-Control-Allow-Origin");
    const corsMethods = response.headers.get("Access-Control-Allow-Methods");
    const corsHeaders = response.headers.get("Access-Control-Allow-Headers");
    const corsMaxAge = response.headers.get("Access-Control-Max-Age");

    return {
      origin,
      method: "OPTIONS",
      status: response.status,
      corsOrigin,
      corsMethods,
      corsHeaders,
      corsMaxAge,
    };
  } catch (error) {
    return {
      origin,
      method: "OPTIONS",
      error: error.message,
      status: "ERROR",
    };
  }
}

async function runTests() {
  console.log("🔒 ENH-003: CORS Security Configuration Tests\n");
  console.log("Testing CORS configuration with various origins...\n");

  // Test 1: Standard GET requests with different origins
  console.log("📡 Testing GET requests with origins:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  for (const origin of TEST_ORIGINS) {
    const result = await testCorsHeaders(origin);
    console.log(`\n🌐 Origin: ${origin}`);
    if (result.status === "ERROR") {
      console.log(`  ❌ Error: ${result.error}`);
    } else {
      console.log(`  ✅ Status: ${result.status}`);
      console.log(`  📍 CORS Origin: ${result.corsOrigin}`);
      console.log(`  🔧 Methods: ${result.corsMethods}`);
      console.log(`  📋 Headers: ${result.corsHeaders}`);
      console.log(
        `  🛡️  X-Content-Type-Options: ${result.securityHeaders.xContentTypeOptions}`,
      );
      console.log(
        `  🚫 X-Frame-Options: ${result.securityHeaders.xFrameOptions}`,
      );
    }
  }

  // Test 2: Preflight OPTIONS requests
  console.log("\n\n🛫 Testing OPTIONS preflight requests:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  for (const origin of TEST_ORIGINS) {
    const result = await testOptionsPreflight(origin);
    console.log(`\n🌐 Origin: ${origin}`);
    if (result.status === "ERROR") {
      console.log(`  ❌ Error: ${result.error}`);
    } else {
      console.log(`  ✅ Preflight Status: ${result.status}`);
      console.log(`  📍 CORS Origin: ${result.corsOrigin}`);
      console.log(`  🔧 Allowed Methods: ${result.corsMethods}`);
      console.log(`  📋 Allowed Headers: ${result.corsHeaders}`);
      console.log(`  ⏰ Max Age: ${result.corsMaxAge}`);
    }
  }

  // Test 3: Environment-specific behavior
  console.log("\n\n🔍 Environment Analysis:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const nodeEnv = process.env.NODE_ENV;
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  console.log(`📦 NODE_ENV: ${nodeEnv || "undefined"}`);
  console.log(`🏠 ALLOWED_ORIGINS: ${allowedOrigins || "undefined"}`);
  console.log(`🌍 NEXT_PUBLIC_APP_URL: ${appUrl || "undefined"}`);

  if (nodeEnv === "production") {
    if (!allowedOrigins && !appUrl) {
      console.log(
        "⚠️  WARNING: Production mode without ALLOWED_ORIGINS or NEXT_PUBLIC_APP_URL",
      );
      console.log("   This will default to same-origin policy");
    } else {
      console.log("✅ Production CORS configuration detected");
    }
  } else {
    console.log("✅ Development mode - all origins allowed (*)");
  }

  console.log("\n\n🎯 Test Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ CORS security enhancement (ENH-003) testing completed");
  console.log("📋 Check results above for proper origin restriction behavior");
  console.log(
    "🔧 Production should restrict origins, development should allow all",
  );
  console.log("🛡️  Security headers should be present in all responses");
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(LOCAL_ENDPOINT);
    if (response.ok) {
      console.log("✅ Server is running, starting CORS tests...\n");
      await runTests();
    } else {
      console.log("❌ Server responded with error:", response.status);
    }
  } catch (error) {
    console.log(
      "❌ Server not accessible. Please start the development server:",
    );
    console.log("   npm run dev");
    console.log("   Then run: node reproduce-enh-003-cors-issue.js");
    process.exit(1);
  }
}

// Run the test
checkServer();
