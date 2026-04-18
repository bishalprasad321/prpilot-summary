#!/usr/bin/env node

/**
 * Verification script to ensure all dependencies and setup are correct
 *
 * Usage: npm run verify
 * or: node scripts/verify.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const checks = [];
let passed = 0;
let failed = 0;

// Helper function to check if file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Helper function to check if directory exists
function dirExists(dirPath) {
  return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
}

function log(level, message) {
  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };
  console.log(`${icons[level]} ${message}`);
}

function check(name, fn) {
  try {
    fn();
    log("success", name);
    passed++;
  } catch (error) {
    log("error", `${name}: ${error.message}`);
    failed++;
  }
}

console.log("\n" + "=".repeat(70));
console.log("🔍 Verification Script");
console.log("=".repeat(70) + "\n");

// 1. Check Node version
check("Node.js version >= 20", () => {
  const version = process.version;
  const major = parseInt(version.slice(1).split(".")[0]);
  if (major < 20) throw new Error(`Found ${version}, need 20+`);
});

// 2. Check npm version
check("npm installed", () => {
  execSync("npm --version", { stdio: "pipe" });
});

// 3. Check package.json
check("package.json exists", () => {
  if (!fs.existsSync("package.json")) throw new Error("Not found");
});

// 4. Check dependencies installed
check("node_modules exists", () => {
  if (!fs.existsSync("node_modules")) throw new Error("Run npm install");
});

// 5. Check key dependencies
const keyDeps = ["@actions/core", "@octokit/rest", "typescript", "@vercel/ncc"];

keyDeps.forEach((dep) => {
  check(`Dependency: ${dep}`, () => {
    const depPath = path.join("node_modules", dep);
    if (!fs.existsSync(depPath)) throw new Error("Not installed");
  });
});

// 6. Check source files
const sourceFiles = [
  "src/index.ts",
  "src/github/github-client.ts",
  "src/diff/diff-processor.ts",
  "src/llm/llm-client.ts",
  "src/state/state-manager.ts",
  "src/utils/logger.ts",
  "src/utils/formatter.ts",
  "src/utils/types.ts",
];

sourceFiles.forEach((file) => {
  check(`Source file: ${file}`, () => {
    if (!fs.existsSync(file)) throw new Error("Not found");
  });
});

// 7. Check config files
const configFiles = [
  "tsconfig.json",
  "eslint.config.mjs",
  ".prettierrc",
  "action.yml",
];

configFiles.forEach((file) => {
  check(`Config file: ${file}`, () => {
    if (!fs.existsSync(file)) throw new Error("Not found");
  });
});

// 8. Try TypeScript compilation
check("TypeScript compiles", () => {
  try {
    execSync("npx tsc --noEmit", { stdio: "pipe" });
  } catch (error) {
    throw new Error("Type errors found");
  }
});

// 9. Check lib and dist artifacts exist
check("lib/index.js exists (TypeScript build output)", () => {
  if (!fs.existsSync("lib/index.js")) {
    throw new Error("Run: npm run build");
  }
});

check("dist/index.js exists (packaged action artifact)", () => {
  if (!fs.existsSync("dist/index.js")) {
    throw new Error("Run: npm run build");
  }
});

check(".github/workflows directory", () => {
  if (!fs.existsSync(".github/workflows")) throw new Error("Not found");
});

// Results
console.log("\n" + "=".repeat(70));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log("=".repeat(70) + "\n");

if (failed === 0) {
  log("success", "All checks passed! Ready to develop.");
  process.exit(0);
} else {
  log("error", `${failed} check(s) failed. See above for details.`);
  log("info", "Common fixes:");
  console.log("  1. Install dependencies: npm install");
  console.log("  2. Build project: npm run build");
  console.log("  3. Check Node version: node --version (need 20+)");
  process.exit(1);
}
