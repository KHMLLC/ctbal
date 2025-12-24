import * as fs from "fs";
import * as path from "path";

/**
 * Quick check for available mortality files and system readiness
 */

function checkScrapeAGraveFiles() {
  const scrapeDir = path.join("..", "scrape-a-grave", "processed_csvs");
  
  console.log("📁 SCRAPE-A-GRAVE FILE CHECK");
  console.log("============================");
  
  if (!fs.existsSync(scrapeDir)) {
    console.log(`❌ Directory not found: ${path.resolve(scrapeDir)}`);
    return;
  }

  const files = fs.readdirSync(scrapeDir)
    .filter(file => file.startsWith('mortality_data_') && file.endsWith('.csv'))
    .sort()
    .reverse(); // Latest first

  if (files.length === 0) {
    console.log("❌ No mortality data files found");
    return;
  }

  console.log(`✅ Found ${files.length} mortality file(s):`);
  
  files.slice(0, 5).forEach((file, index) => { // Show latest 5
    const filePath = path.join(scrapeDir, file);
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const recordCount = lines.length - 1;
    
    // Extract date from filename
    const dateMatch = file.match(/mortality_data_(\d{8})\.csv/);
    const dateStr = dateMatch ? dateMatch[1] : 'unknown';
    const formattedDate = dateMatch 
      ? `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`
      : 'unknown';
    
    const marker = index === 0 ? '🎯 LATEST' : '  ';
    console.log(`${marker} ${file}`);
    console.log(`     Date: ${formattedDate} | Records: ${recordCount} | Size: ${(stats.size/1024).toFixed(1)}KB`);
  });

  if (files.length > 5) {
    console.log(`     ... and ${files.length - 5} older file(s)`);
  }
}

function checkSystemReadiness() {
  console.log("\n🔧 SYSTEM READINESS CHECK");
  console.log("========================");
  
  // Check .env file
  const envPath = ".env";
  if (fs.existsSync(envPath)) {
    console.log("✅ Environment file (.env) exists");
    
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const hasSepoliaUrl = envContent.includes('SEPOLIA_URL');
    const hasPrivateKey = envContent.includes('PRIVATE_KEY');
    
    console.log(`   SEPOLIA_URL: ${hasSepoliaUrl ? '✅' : '❌'}`);
    console.log(`   PRIVATE_KEY: ${hasPrivateKey ? '✅' : '❌'}`);
  } else {
    console.log("❌ Environment file (.env) missing");
    console.log("   Run: npm run setup:env");
  }
  
  // Check node_modules
  if (fs.existsSync("node_modules")) {
    console.log("✅ Node modules installed");
  } else {
    console.log("❌ Node modules missing - run: npm install");
  }
  
  // Check contracts compilation
  if (fs.existsSync("artifacts/contracts")) {
    console.log("✅ Contracts compiled");
  } else {
    console.log("❌ Contracts not compiled - run: npm run compile");
  }
}

function showQuickCommands() {
  console.log("\n⚡ QUICK COMMANDS FOR NEXT WEEK");
  console.log("==============================");
  console.log("📥 Import latest mortality file:");
  console.log("   npm run import:latest");
  console.log("");
  console.log("🔍 Interactive weekly import:");
  console.log("   npm run import:mortality:weekly");
  console.log("");
  console.log("📊 Check system status:");
  console.log("   npm run status");
  console.log("");
  console.log("📈 View dashboard:");
  console.log("   npm run dashboard:sepolia");
}

async function main() {
  console.log("🎯 MORTALITY DATA READINESS CHECK");
  console.log("=================================\n");
  
  checkScrapeAGraveFiles();
  checkSystemReadiness();
  showQuickCommands();
  
  console.log("\n🌟 Ready for weekly import! 🌟");
}

// Run if this is the main module
main().catch(console.error);