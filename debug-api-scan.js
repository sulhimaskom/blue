const { existsSync, readFileSync, readdirSync } = require("fs");
const { join } = require("path");

const API_DIR = join(process.cwd(), "app", "api");

console.log("API Directory:", API_DIR);
console.log("API Directory exists:", existsSync(API_DIR));

function scanDirectory(detailedPath, level = 0) {
  const indent = "  ".repeat(level);

  if (!existsSync(detailedPath)) {
    console.log(`${indent}Directory does not exist: ${detailedPath}`);
    return [];
  }

  console.log(`${indent}Scanning: ${detailedPath}`);
  const items = readdirSync(detailedPath);
  const routeFiles = [];

  for (const item of items) {
    const itemPath = join(detailedPath, item);
    const stat = require("fs").statSync(itemPath);

    if (stat.isDirectory()) {
      console.log(`${indent}  📁 ${item}/`);
      const subFiles = scanDirectory(itemPath, level + 1);
      routeFiles.push(...subFiles);
    } else if (item === "route.ts") {
      const relativePath = detailedPath
        .replace(API_DIR, "")
        .replace(/\\/g, "/");
      console.log(`${indent}  📄 ${item} -> ${relativePath}`);
      routeFiles.push(relativePath);
    }
  }

  return routeFiles;
}

const routeFiles = scanDirectory(API_DIR);
console.log(`\nFound ${routeFiles.length} route files:`);
routeFiles.forEach((file) => console.log(`  - ${file}`));
