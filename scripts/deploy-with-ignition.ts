import { parseEther, formatEther } from "viem";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

// Import the CSV parsing functions from the original script
import { parseCsvFile, mapCsvRecordToClinicalTest } from "./batch-csv-import";

const execAsync = promisify(exec);

async function deployWithIgnition() {
  console.log("📊 CTBAL BATCH CSV IMPORT - Using Ignition");
  console.log("==========================================\n");

  const csvPath = process.env.CSV_FILE_PATH || "./csv-processing/mortality_data_20251201.csv";
  
  console.log(`📂 CSV File: ${csvPath}`);
  
  if (!fs.existsSync(csvPath)) {
    console.log("❌ CSV file not found");
    return;
  }

  // Parse CSV data
  console.log("📖 Parsing CSV data...");
  const csvRecords = await parseCsvFile(csvPath);
  console.log(`✅ Found ${csvRecords.length} records`);
  
  // Map to clinical tests
  const clinicalTests = csvRecords.map((record, index) => 
    mapCsvRecordToClinicalTest(record, index)
  );
  
  const totalTokens = clinicalTests.reduce((sum, test) => sum + test.tokenAllocation, BigInt(0));
  console.log(`💰 Total tokens needed: ${formatEther(totalTokens)} CTBAL`);
  
  // Use Ignition CLI to deploy contracts
  console.log("🚀 Deploying contracts with Ignition CLI...");
  
  try {
    console.log("📜 Running: npx hardhat ignition deploy ignition/modules/CTBAL.ts");
    
    const { stdout, stderr } = await execAsync("npx hardhat ignition deploy ignition/modules/CTBAL.ts --network localhost");
    
    if (stderr && !stderr.includes("Warning")) {
      throw new Error(`Deployment stderr: ${stderr}`);
    }
    
    console.log("📋 Deployment Output:");
    console.log(stdout);
    
    // Try to parse deployment addresses from output
    const tokenMatch = stdout.match(/CTBALToken[^:]*:\s*([0-9x]+)/i);
    const analyticsMatch = stdout.match(/CTBALAnalytics[^:]*:\s*([0-9x]+)/i);
    
    if (tokenMatch && analyticsMatch) {
      console.log(`✅ CTBALToken deployed at: ${tokenMatch[1]}`);
      console.log(`✅ CTBALAnalytics deployed at: ${analyticsMatch[1]}`);
    }
    
    console.log("🎉 Ignition deployment successful!");
    console.log("💡 You can now use these contracts to create clinical tests");
    
  } catch (error) {
    console.error("❌ Ignition deployment failed:", error);
    console.log("💡 This appears to be a Hardhat Ignition configuration issue.");
    console.log("The ignition tasks are not properly registered despite the plugins being installed.");
    console.log("\n✅ Resolution: Use the working Viem deployment scripts instead:");
    console.log("1. npm run tsx scripts/batch-csv-import-viem.ts - Full deployment with CSV import");
    console.log("2. npm run tsx scripts/deploy-system.ts - Basic contract deployment");
    console.log("3. npm run tsx scripts/csv-import-to-deployed.ts - Use existing deployed contracts");
    console.log("\n🔧 To fix ignition: May require upgrading to Hardhat toolbox or different plugin versions");
  }
}

deployWithIgnition().catch(console.error);