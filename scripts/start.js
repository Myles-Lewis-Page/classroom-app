// Start script: runs migrations, optionally seeds, then starts the server.
// Written in JS instead of a shell script so it isn't sensitive to line-ending
// issues (CRLF vs LF) that can happen when a .sh file is edited/saved on Windows.

const { execSync } = require("child_process");

function run(command) {
  console.log(`> ${command}`);
  execSync(command, { stdio: "inherit" });
}

console.log("Running database migrations...");
run("npx prisma migrate deploy");

if (process.env.SEED_ON_BOOT === "true") {
  console.log("SEED_ON_BOOT is set — running seed script...");
  run("npm run seed");
  console.log("Seed complete.");
}

if (process.env.MERGE_CLASSROOMS_PRIMARY && process.env.MERGE_CLASSROOMS_SECONDARY) {
  console.log("MERGE_CLASSROOMS_PRIMARY/SECONDARY are set — running classroom merge...");
  run("npm run merge-classrooms");
  console.log("Classroom merge step finished.");
}

if (process.env.RESET_PASSWORD_EMAIL) {
  console.log("RESET_PASSWORD_EMAIL is set — running password reset...");
  run("npm run reset-password");
  console.log("Password reset step finished.");
}

run("npm run start");
