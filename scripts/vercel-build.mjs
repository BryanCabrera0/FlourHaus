import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

const MIGRATION_ID = "20260209000100_admin_owner_features";
const MIGRATION_FILE = resolve(
  process.cwd(),
  "prisma/migrations/20260209000100_admin_owner_features/migration.sql"
);

// Load local .env when present (Vercel-provided env vars remain authoritative).
loadDotenv();

function runCommand(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    env: process.env,
    encoding: "utf8",
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (!allowFailure && result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}

function getCombinedOutput(result) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function isAlreadyAppliedMessage(output) {
  return output.includes("P3008") || output.toLowerCase().includes("already recorded as applied");
}

function applyBaselineMigration() {
  if (!existsSync(MIGRATION_FILE)) {
    console.error(`Migration file not found: ${MIGRATION_FILE}`);
    process.exit(1);
  }

  console.log("Detected Prisma P3005. Applying baseline migration SQL...");
  runCommand("npx", ["prisma", "db", "execute", "--file", MIGRATION_FILE]);

  const resolveResult = runCommand(
    "npx",
    ["prisma", "migrate", "resolve", "--applied", MIGRATION_ID],
    { allowFailure: true }
  );
  if (resolveResult.status !== 0) {
    const output = getCombinedOutput(resolveResult);
    if (!isAlreadyAppliedMessage(output)) {
      process.exit(resolveResult.status ?? 1);
    }
  }
}

function runMigrationsWithFallback() {
  const deployResult = runCommand(
    "npx",
    ["prisma", "migrate", "deploy"],
    { allowFailure: true }
  );

  if (deployResult.status === 0) {
    return;
  }

  const output = getCombinedOutput(deployResult);
  if (!output.includes("P3005")) {
    process.exit(deployResult.status ?? 1);
  }

  applyBaselineMigration();
  runCommand("npx", ["prisma", "migrate", "deploy"]);
}

function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("Missing DATABASE_URL. Set it in Vercel Project Settings -> Environment Variables.");
    process.exit(1);
  }

  runCommand("npx", ["prisma", "generate"]);
  runMigrationsWithFallback();
  runCommand("npx", ["next", "build"]);
}

main();
