import { createWalletClient, createPublicClient, http, parseEther, formatEther } from "viem";
import { hardhat } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import * as fs from "fs";

// Import CSV parsing from the original script
import { parseCsvFile, mapCsvRecordToClinicalTest } from "./batch-csv-import";

async function directViemDeployment() {
  console.log("📊 CTBAL DIRECT VIEM DEPLOYMENT");
  console.log("================================\n");

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
  const clinicalTests = csvRecords.slice(0, 10); // Just first 10 for testing
  const mappedTests = clinicalTests.map((record, index) => 
    mapCsvRecordToClinicalTest(record, index)
  );
  
  const totalTokens = mappedTests.reduce((sum, test) => sum + test.tokenAllocation, 0n);
  console.log(`💰 Total tokens needed (first 10 tests): ${formatEther(totalTokens)} CTBAL`);

  // Setup Viem clients directly
  console.log("🚀 Setting up Viem clients...");
  
  // Use first Hardhat account
  const account = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  
  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http("http://127.0.0.1:8545")
  });
  
  const walletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http("http://127.0.0.1:8545")
  });
  
  console.log(`✅ Connected to network: ${hardhat.name}`);
  console.log(`✅ Using account: ${account.address}`);
  
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Account balance: ${formatEther(balance)} ETH`);
  
  console.log("\n✅ VIEM CONNECTION SUCCESSFUL!");
  console.log("===============================");
  console.log("🎯 Next step: Deploy contracts using direct Viem calls");
  console.log(`📊 Ready to process ${csvRecords.length} total records`);
}

directViemDeployment().catch(console.error);