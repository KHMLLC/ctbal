import { createWalletClient, createPublicClient, http, parseEther, formatEther, keccak256, toHex } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// Load contract artifacts  
import CTBALTokenArtifact from '../artifacts/contracts/CTBALToken.sol/CTBALToken.json' assert { type: "json" };
import CTBALAnalyticsArtifact from '../artifacts/contracts/CTBALAnalytics.sol/CTBALAnalytics.json' assert { type: "json" };

interface CsvRecord {
  [key: string]: string;
}

async function parseCsvFile(filePath: string): Promise<CsvRecord[]> {
  try {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error("CSV must have at least a header and one data row");
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const records: CsvRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const record: CsvRecord = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      
      records.push(record);
    }

    return records;
  } catch (error) {
    throw new Error(`Failed to parse CSV file: ${error}`);
  }
}

async function main() {
  console.log("📊 CTBAL BATCH CSV IMPORT - Viem Version");
  console.log("============================================\n");

  const csvPath = process.env.CSV_FILE_PATH || "./csv-processing/mortality_data_20251201.csv";
  const dryRun = process.env.DRY_RUN === "true";
  
  console.log(`📂 CSV File: ${csvPath}`);
  console.log(`🔄 Mode: ${dryRun ? "DRY RUN" : "LIVE DEPLOYMENT"}`);
  
  if (!fs.existsSync(csvPath)) {
    console.log("❌ CSV file not found");
    return;
  }

  // Parse CSV data
  console.log("📖 Parsing CSV data...");
  const csvRecords = await parseCsvFile(csvPath);
  console.log(`✅ Found ${csvRecords.length} records`);
  
  if (csvRecords.length === 0) {
    console.log("❌ No data found in CSV");
    return;
  }
  
  // Show sample record
  console.log("\n📄 Sample Record:");
  const sample = csvRecords[0];
  Object.entries(sample).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  if (dryRun) {
    console.log("\n✅ DRY RUN complete - CSV parsing successful");
    console.log(`📊 Ready to process ${csvRecords.length} mortality records`);
    console.log("💡 Set DRY_RUN=false to deploy contracts and create clinical tests");
    return;
  }

  // Deploy contracts using Viem
  console.log("\n🚀 Deploying contracts...");
  
  try {
    // Setup Viem clients
    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(process.env.SEPOLIA_URL)
    });

    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(process.env.SEPOLIA_URL)
    });
    
    console.log("👤 Deployer address:", account.address);
    const balance = await publicClient.getBalance({ address: account.address });
    console.log("💰 Deployer balance:", formatEther(balance), "ETH");
    
    if (balance < parseEther("0.1")) {
      throw new Error("Insufficient balance for deployment. Need at least 0.1 ETH for gas fees.");
    }
    
    // Deploy CTBALToken
    console.log("📜 Deploying CTBALToken contract...");
    const tokenHash = await walletClient.deployContract({
      abi: CTBALTokenArtifact.abi,
      bytecode: CTBALTokenArtifact.bytecode as `0x${string}`,
      args: [
        "Clinical Test Blockchain Token",
        "CTBAL", 
        parseEther("10000000") // 10M tokens
      ]
    });
    
    const tokenReceipt = await publicClient.waitForTransactionReceipt({ hash: tokenHash });
    const ctbalTokenAddress = tokenReceipt.contractAddress!;
    console.log(`✅ CTBALToken deployed at: ${ctbalTokenAddress}`);
    
    // Deploy CTBALAnalytics  
    console.log("📊 Deploying CTBALAnalytics contract...");
    const analyticsHash = await walletClient.deployContract({
      abi: CTBALAnalyticsArtifact.abi,
      bytecode: CTBALAnalyticsArtifact.bytecode as `0x${string}`,
      args: [ctbalTokenAddress]
    });
    
    const analyticsReceipt = await publicClient.waitForTransactionReceipt({ hash: analyticsHash });
    const ctbalAnalyticsAddress = analyticsReceipt.contractAddress!;
    console.log(`✅ CTBALAnalytics deployed at: ${ctbalAnalyticsAddress}`);
    
    // Create contract clients for interaction
    const ctbalTokenClient = {
      address: ctbalTokenAddress,
      abi: CTBALTokenArtifact.abi,
      publicClient,
      walletClient
    };
    
    // Setup roles for batch import
    console.log("\n⚙️ Setting up roles...");
    
    // Get CLINICIAN_ROLE constant
    const clinicianRole = await publicClient.readContract({
      address: ctbalTokenAddress,
      abi: CTBALTokenArtifact.abi,
      functionName: 'CLINICIAN_ROLE'
    });
    
    // Grant CLINICIAN_ROLE to deployer
    const grantRoleHash = await walletClient.writeContract({
      address: ctbalTokenAddress,
      abi: CTBALTokenArtifact.abi,
      functionName: 'grantRole',
      args: [clinicianRole, account.address]
    });
    await publicClient.waitForTransactionReceipt({ hash: grantRoleHash });
    console.log("✅ CLINICIAN_ROLE granted to deployer");
    
    // Process CSV records in batches
    const batchSize = 50; // Process 50 records at a time
    const totalBatches = Math.ceil(csvRecords.length / batchSize);
    let processedCount = 0;
    
    console.log(`\n📊 Processing ${csvRecords.length} records in ${totalBatches} batches of ${batchSize}...`);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, csvRecords.length);
      const batch = csvRecords.slice(start, end);
      
      console.log(`\n📦 Processing batch ${batchIndex + 1}/${totalBatches} (records ${start + 1}-${end})...`);
      
      for (const record of batch) {
        try {
          // Convert CSV record to clinical test
          const testType = `${record.cause_of_death || "General"} Clinical Assessment`;
          const patientId = walletClient.account.address; // Using deployer as patient for demo
          const dataHash = `0x${Buffer.from(JSON.stringify(record)).toString('hex').padStart(64, '0').slice(0, 64)}`;
          const metadataHash = `0x${Buffer.from(`${record.age || 0}-${record.sex || 'U'}-${record.state || 'Unknown'}`).toString('hex').padStart(64, '0').slice(0, 64)}`;
          
          // Calculate token allocation based on data completeness
          let tokenAllocation = parseEther("100"); // Base 100 tokens
          if (record.age && record.sex) tokenAllocation = parseEther("200");
          if (record.age && record.sex && record.cause_of_death) tokenAllocation = parseEther("300");
          if (record.age && record.sex && record.cause_of_death && record.state) tokenAllocation = parseEther("400");
          
          // Create clinical test
          const createTestHash = await walletClient.writeContract({
            address: ctbalTokenAddress,
            abi: CTBALTokenArtifact.abi,
            functionName: 'createClinicalTest',
            args: [testType, patientId, dataHash, metadataHash, tokenAllocation]
          });
          await publicClient.waitForTransactionReceipt({ hash: createTestHash });
          
          processedCount++;
          
          if (processedCount % 10 === 0) {
            console.log(`   ✅ Processed ${processedCount}/${csvRecords.length} records`);
          }
          
        } catch (error) {
          console.error(`   ❌ Failed to process record ${processedCount + 1}:`, error);
        }
      }
      
      // Small delay between batches to avoid overwhelming the network
      if (batchIndex < totalBatches - 1) {
        console.log("   ⏳ Waiting 2 seconds before next batch...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log("\n🎉 BATCH IMPORT COMPLETED!");
    console.log("========================================");
    console.log(`📜 CTBALToken: ${ctbalTokenAddress}`);
    console.log(`📊 CTBALAnalytics: ${ctbalAnalyticsAddress}`);
    console.log(`✅ Successfully processed: ${processedCount}/${csvRecords.length} records`);
    console.log(`💰 Total tokens allocated: ${formatEther(BigInt(processedCount) * parseEther("250"))}`); // Approximate average
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      network: "sepolia",
      ctbalToken: ctbalTokenAddress,
      ctbalAnalytics: ctbalAnalyticsAddress,
      recordsProcessed: processedCount,
      totalRecords: csvRecords.length,
      successRate: `${((processedCount / csvRecords.length) * 100).toFixed(2)}%`
    };
    
    const deploymentFile = `./deployment-${Date.now()}.json`;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`💾 Deployment info saved to: ${deploymentFile}`);
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    return;
  }
}

main().catch(console.error);