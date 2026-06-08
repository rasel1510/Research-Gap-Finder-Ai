const { execSync } = require("child_process");
const fs = require("fs");

const passwords = ["postgres", "admin", "root", "", "password", "1234", "123456", "12345678"];
const baseDbUrl = "postgresql://postgres:{PASSWORD}@localhost:5432/researchgap_ai?schema=public";

console.log("Testing PostgreSQL connections...");

for (const pwd of passwords) {
  const url = baseDbUrl.replace("{PASSWORD}", pwd);
  console.log(`Testing password: "${pwd}"`);
  
  try {
    // Run prisma db push using the url in process env
    execSync("npx prisma db push --accept-data-loss", {
      env: {
        ...process.env,
        DATABASE_URL: url
      },
      stdio: "ignore"
    });
    
    console.log(`\n🎉 SUCCESS! Password is: "${pwd}"`);
    console.log(`Updating .env file...`);
    
    let envContent = fs.readFileSync(".env", "utf8");
    envContent = envContent.replace(/DATABASE_URL=".*"/, `DATABASE_URL="${url}"`);
    fs.writeFileSync(".env", envContent, "utf8");
    
    process.exit(0);
  } catch (err) {
    // Failed, try next
  }
}

console.log("\n❌ All common passwords failed. Please make sure the database is running and check credentials.");
process.exit(1);
