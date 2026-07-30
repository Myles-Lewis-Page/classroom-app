// Start script: runs migrations, optionally seeds, then starts the server.
// Written in JS instead of a shell script so it isn't sensitive to line-ending
// issues (CRLF vs LF) that can happen when a .sh file is edited/saved on Windows.

const { execSync } = require("child_process");

function run(command) {
  console.log(`> ${command}`);
  execSync(command, { stdio: "inherit" });
}

console.log("Running database migrations...");

// Self-serve fix for a migration that got marked "failed" in the DB's
// _prisma_migrations table (e.g. it errored partway through, or - as
// happened once - a stray non-SQL line ended up in the migration file).
// `migrate deploy` refuses to run anything else until that's cleared.
// Set RESOLVE_FAILED_MIGRATION to the migration's folder name, redeploy,
// then unset it - same one-shot pattern as SEED_ON_BOOT below.
if (process.env.RESOLVE_FAILED_MIGRATION) {
  console.log(`RESOLVE_FAILED_MIGRATION is set — marking "${process.env.RESOLVE_FAILED_MIGRATION}" as rolled back...`);
  run(`npx prisma migrate resolve --rolled-back "${process.env.RESOLVE_FAILED_MIGRATION}"`);
  console.log("Failed migration cleared.");
}

run("npx prisma migrate deploy");

if (process.env.SEED_ON_BOOT === "true") {
  console.log("SEED_ON_BOOT is set — running seed script...");
  run("npm run seed");
  console.log("Seed complete.");
}

if (process.env.RESET_PASSWORD_EMAIL) {
  console.log("RESET_PASSWORD_EMAIL is set — running password reset...");
  run("npm run reset-password");
  console.log("Password reset step finished.");
}

run("npm run start");
