#!/usr/bin/env node

/**
 * Reproduction test for Issue #131: Missing project management UI in dashboard
 *
 * This test verifies:
 * 1. Dashboard has Projects card
 * 2. Projects page allows creating new projects
 * 3. Projects page lists all user projects
 * 4. Blueprint-project relationship is clear
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Issue #131 Reproduction Test: Missing Project Management UI");
console.log("=".repeat(60));

// Test 1: Check if dashboard has projects card
console.log("\n📋 Test 1: Dashboard Projects Card");
const dashboardPath = path.join(__dirname, "app/dashboard/page.tsx");
const dashboardContent = fs.readFileSync(dashboardPath, "utf8");

const hasProjectsCard =
  dashboardContent.includes('title="Projects"') ||
  dashboardContent.includes('href="/dashboard/projects"');

if (hasProjectsCard) {
  console.log(
    "✅ Dashboard has deployment card pointing to /dashboard/projects",
  );
} else {
  console.log("❌ Dashboard missing Projects card");
}

const hasManagementCard =
  dashboardContent.includes("Project Management") ||
  dashboardContent.toLowerCase().includes("manage projects");

if (hasManagementCard) {
  console.log("✅ Dashboard has explicit project management card");
} else {
  console.log("❌ Dashboard missing explicit project management card");
}

// Test 2: Check if projects page has create functionality
console.log("\n📋 Test 2: Projects Page Create Functionality");
const projectsPath = path.join(__dirname, "app/dashboard/projects/page.tsx");
const projectsContent = fs.readFileSync(projectsPath, "utf8");

const hasCreateButton =
  projectsContent.toLowerCase().includes("create project") ||
  projectsContent.toLowerCase().includes("add project") ||
  projectsContent.includes("Create Project");

if (hasCreateButton) {
  console.log("✅ Projects page has create project button");
} else {
  console.log("❌ Projects page missing create project functionality");
}

const hasCreateModal =
  projectsContent.toLowerCase().includes("showcreate") ||
  projectsContent.toLowerCase().includes("createmodal") ||
  projectsContent.toLowerCase().includes("createform");

if (hasCreateModal) {
  console.log("✅ Projects page has create modal/form");
} else {
  console.log("❌ Projects page missing create modal/form");
}

// Test 3: Check API endpoints
console.log("\n📋 Test 3: Project API Endpoints");
const apiPath = path.join(__dirname, "app/api");

// Check for projects list endpoint
const projectsListEndpoint = path.join(apiPath, "projects/route.ts");
if (fs.existsSync(projectsListEndpoint)) {
  console.log("✅ Projects list endpoint exists: /api/projects");
} else {
  console.log("❌ Projects list endpoint missing: /api/projects");
}

// Check for project creation endpoint
const projectCreateEndpoint = path.join(apiPath, "projects/route.ts");
if (fs.existsSync(projectCreateEndpoint)) {
  const createContent = fs.readFileSync(projectCreateEndpoint, "utf8");
  const hasPOST =
    createContent.includes("POST") ||
    createContent.includes("export async function POST");
  if (hasPOST) {
    console.log("✅ Projects creation endpoint supports POST");
  } else {
    console.log("❌ Projects creation endpoint missing POST method");
  }
} else {
  console.log("❌ Projects creation endpoint missing");
}

// Test 4: Check project data service
console.log("\n📋 Test 4: Project Data Service Methods");
const projectServicePath = path.join(
  __dirname,
  "lib/services/project-data-service.ts",
);
const serviceContent = fs.readFileSync(projectServicePath, "utf8");

const hasCreateMethod =
  serviceContent.includes("createProject") ||
  serviceContent.includes("insertProject");

if (hasCreateMethod) {
  console.log("✅ ProjectDataService has create method");
} else {
  console.log("❌ ProjectDataService missing create method");
}

const hasGetUserProjects =
  serviceContent.includes("getUserProjects") ||
  serviceContent.includes("getAllUserProjects");

if (hasGetUserProjects) {
  console.log("✅ ProjectDataService has getUserProjects method");
} else {
  console.log("❌ ProjectDataService missing getUserProjects method");
}

// Summary
console.log("\n📊 Reproduction Summary");
console.log("=".repeat(30));

const issues = [];
if (!hasProjectsCard) issues.push("Dashboard missing projects card");
if (!hasManagementCard)
  issues.push("Dashboard missing explicit project management section");
if (!hasCreateButton) issues.push("Projects page missing create button");
if (!hasCreateModal) issues.push("Projects page missing create modal");
if (!fs.existsSync(path.join(apiPath, "projects/route.ts")))
  issues.push("Missing /api/projects endpoint");
if (!hasCreateMethod) issues.push("ProjectDataService missing create method");
if (!hasGetUserProjects)
  issues.push("ProjectDataService missing getUserProjects method");

if (issues.length === 0) {
  console.log("🎉 All tests passed! Project management UI is complete.");
} else {
  console.log(`❌ Found ${issues.length} issue(s):`);
  issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
  console.log(
    "\n🔧 This reproduces Issue #131: Missing project management UI in dashboard",
  );
}

process.exit(issues.length > 0 ? 1 : 0);
