import { createWalletClient, createPublicClient, http, parseEther, formatEther, keccak256, toHex } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';

// Load contract artifacts  
import CTBALTokenArtifact from '../artifacts/contracts/CTBALToken.sol/CTBALToken.json' assert { type: "json" };
import CTBALAnalyticsArtifact from '../artifacts/contracts/CTBALAnalytics.sol/CTBALAnalytics.json' assert { type: "json" };

// Already deployed contract addresses
const TOKEN_ADDRESS = "0x386b7e934f1cfd8169bf8b9d5249ba1ed7e1926f";
const ANALYTICS_ADDRESS = "0x4ba62466265d6d3853cff74b910e5b7ab13aaea1";

interface CsvRecord {
  [key: string]: string;
}

interface ClinicalTestMapping {
  testType: string;
  patientId: string; 
  dataHash: string;
  metadataHash: string;
  tokenAllocation: bigint;
}

async function parseCsvFile(filePath: string): Promise<CsvRecord[]> {
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
}

function mapCsvRecordToClinicalTest(record: CsvRecord, index: number): ClinicalTestMapping {
  // Extract demographics
  const name = record.Name || record.name || "";
  const city = record.City || record.city || "";
  const county = record.County || record.county || "";
  const state = record.State || record.state || "";
  const birthDate = record["Birth Date"] || record.birth_date || "";
  const deathDate = record["Death Date"] || record.death_date || "";
  
  // Calculate age
  let age = 0;
  if (birthDate && deathDate) {
    const birth = new Date(birthDate);
    const death = new Date(deathDate);
    age = death.getFullYear() - birth.getFullYear();
  }

  // Create clinical test type
  let testType = "Demographic Health Study";
  if (age > 0) {
    if (age < 50) {
      testType = `Early Mortality Study - Age ${age} - ${county}, ${state}`;
    } else if (age >= 50 && age < 75) {
      testType = `Mid-Life Health Study - Age ${age} - ${county}, ${state}`;
    } else {
      testType = `Geriatric Health Study - Age ${age} - ${county}, ${state}`;
    }
  }
  
  // Geographic focus
  if (county && state) {
    testType += ` [${county} County Epidemiological Survey]`;
  }
  
  // Veteran status
  if (name.includes("Veteran")) {
    testType = `Veteran Health Study - Age ${age} - ${county}, ${state}`;
  }

  // Generate patient ID (blockchain-safe format)
  const patientId = `${state.toLowerCase().replace(/[^a-z]/g, '')}_${county.toLowerCase().replace(/[^a-z]/g, '')}_${String(index + 1).padStart(4, '0')}`;
  
  // Create data hash
  const demographicData = {
    name: name.replace(/[^a-zA-Z\s]/g, ''),
    location: `${city}, ${county}, ${state}`,
    birthYear: birthDate ? new Date(birthDate).getFullYear() : null,
    deathYear: deathDate ? new Date(deathDate).getFullYear() : null,
    age: age,
    isVeteran: name.includes("Veteran")
  };
  
  const dataHash = keccak256(toHex(JSON.stringify(demographicData)));
  
  // Create metadata hash
  const metadata = {
    sourceFile: "us_recent_deaths",
    importTimestamp: new Date().toISOString(),
    recordIndex: index,
    dataCompleteness: Object.values(record).filter(v => v && v.trim().length > 0).length,
    geographicScope: `${county} County, ${state}`,
    demographicCategory: age < 50 ? "early_mortality" : age < 75 ? "mid_life" : "geriatric"
  };
  const metadataHash = keccak256(toHex(JSON.stringify(metadata)));
  
  // Calculate token allocation based on data quality
  let tokenAllocation = parseEther("150"); // Base
  if (age > 0) tokenAllocation = parseEther("200");
  if (city && county && state) tokenAllocation = parseEther("250");
  if (name.includes("Veteran")) tokenAllocation = parseEther("300");
  
  const completedFields = Object.values(record).filter(v => v && v.trim().length > 0).length;
  if (completedFields >= 7) tokenAllocation = parseEther("400");

  return {
    testType,
    patientId,
    dataHash,
    metadataHash,
    tokenAllocation
  };
}

async function main() {
  console.log("🎯 CTBAL CSV IMPORT TO DEPLOYED SEPOLIA CONTRACTS");
  console.log("================================================\\n");

  // Configuration
  const csvPath = "./csv-processing/mortality_data_20251201.csv";
  const dryRun = process.env.DRY_RUN === "true";
  const maxBatch = parseInt(process.env.MAX_BATCH || "100");
  
  console.log(`📂 CSV File: ${csvPath}`);
  console.log(`🌐 Network: Sepolia Testnet`);
  console.log(`📜 Token Contract: ${TOKEN_ADDRESS}`);
  console.log(`📊 Analytics Contract: ${ANALYTICS_ADDRESS}`);
  console.log(`🔄 Mode: ${dryRun ? "DRY RUN" : "LIVE DEPLOYMENT"}`);
  console.log(`📊 Max Batch: ${maxBatch} records`);
  
  if (!fs.existsSync(csvPath)) {
    console.log(`❌ CSV file not found: ${csvPath}`);
    return;
  }

  // Parse CSV
  console.log("\\n📖 Parsing CSV data...");
  const csvRecords = await parseCsvFile(csvPath);
  console.log(`✅ Found ${csvRecords.length.toLocaleString()} total records`);
  
  // Limit batch size
  const batchRecords = csvRecords.slice(0, maxBatch);
  console.log(`🎯 Processing ${batchRecords.length} records in this batch`);
  
  // Map to clinical tests
  const clinicalTests = batchRecords.map((record, index) => 
    mapCsvRecordToClinicalTest(record, index)
  );
  
  const totalTokens = clinicalTests.reduce((sum, test) => sum + test.tokenAllocation, 0n);
  console.log(`💰 Total rewards: ${formatEther(totalTokens)} CTBAL`);

  if (dryRun) {
    console.log("\\n🔍 DRY RUN - Sample clinical tests:");
    clinicalTests.slice(0, 3).forEach((test, i) => {
      console.log(`\\n  Test ${i + 1}:`);
      console.log(`    Type: ${test.testType}`);
      console.log(`    Patient: ${test.patientId}`);
      console.log(`    Reward: ${formatEther(test.tokenAllocation)} CTBAL`);
      console.log(`    Data Hash: ${test.dataHash.slice(0, 10)}...`);
    });
    console.log("\\n✅ Dry run complete. Set DRY_RUN=false for live deployment.");
    return;
  }

  // Check environment variables
  if (!process.env.SEPOLIA_URL || !process.env.PRIVATE_KEY) {
    console.log("❌ Missing required environment variables:");
    console.log("   Set SEPOLIA_URL (Infura/Alchemy endpoint)");
    console.log("   Set PRIVATE_KEY (your wallet private key)");
    return;
  }

  // Setup Viem clients for Sepolia
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(process.env.SEPOLIA_URL),
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_URL),
  });

  console.log(`\\n👤 Deployer: ${account.address}`);
  
  try {
    // Check balance
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`💰 Sepolia ETH Balance: ${formatEther(balance)} ETH`);
    
    // Setup roles
    console.log("\\n🔐 Setting up CLINICIAN_ROLE...");
    
    const CLINICIAN_ROLE = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: CTBALTokenArtifact.abi,
      functionName: 'CLINICIAN_ROLE'
    });
    
    const hasRole = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: CTBALTokenArtifact.abi,
      functionName: 'hasRole',
      args: [CLINICIAN_ROLE, account.address]
    });
    
    if (!hasRole) {
      console.log("🔐 Granting CLINICIAN_ROLE...");
      const roleHash = await walletClient.writeContract({
        address: TOKEN_ADDRESS,
        abi: CTBALTokenArtifact.abi,
        functionName: 'grantRole',
        args: [CLINICIAN_ROLE, account.address]
      });
      await publicClient.waitForTransactionReceipt({ hash: roleHash });
      console.log("✅ CLINICIAN_ROLE granted");
    } else {
      console.log("✅ CLINICIAN_ROLE already granted");
    }
    
    // Create clinical tests in small batches
    const batchSize = 10; // Small batches for Sepolia stability
    let totalSuccess = 0;
    let totalFailed = 0;
    
    console.log(`\\n📦 Processing ${Math.ceil(clinicalTests.length / batchSize)} batches of up to ${batchSize} tests each...`);
    
    for (let i = 0; i < clinicalTests.length; i += batchSize) {
      const batch = clinicalTests.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(clinicalTests.length / batchSize);
      
      console.log(`\\n🔄 Batch ${batchNum}/${totalBatches} (${batch.length} tests)`);
      
      for (let j = 0; j < batch.length; j++) {
        const test = batch[j];
        
        try {
          // Generate a deterministic patient address based on patientId
          const patientAddress = `0x${keccak256(toHex(test.patientId)).slice(2, 42)}`;
          
          console.log(`  📋 Creating test ${i + j + 1}/${clinicalTests.length}: ${test.testType.substring(0, 50)}...`);
          
          const tx = await walletClient.writeContract({
            address: TOKEN_ADDRESS,
            abi: CTBALTokenArtifact.abi,
            functionName: 'createClinicalTest',
            args: [
              test.testType,
              patientAddress,
              test.dataHash,
              test.metadataHash,
              test.tokenAllocation
            ]
          });
          
          await publicClient.waitForTransactionReceipt({ hash: tx });
          totalSuccess++;
          
          console.log(`  ✅ Success - Patient: ${test.patientId} - ${formatEther(test.tokenAllocation)} CTBAL`);
          
        } catch (error: any) {
          totalFailed++;
          console.log(`  ❌ Failed - ${error.shortMessage || error.message}`);
        }
        
        // Small delay between transactions
        if (j < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Longer pause between batches
      if (i + batchSize < clinicalTests.length) {
        console.log("  ⏳ Pausing before next batch...");
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Update analytics
    console.log("\\n🔄 Updating analytics...");
    try {
      const analyticsHash = await walletClient.writeContract({
        address: ANALYTICS_ADDRESS,
        abi: CTBALAnalyticsArtifact.abi,
        functionName: 'updateMetrics',
        args: []
      });
      await publicClient.waitForTransactionReceipt({ hash: analyticsHash });
      console.log("✅ Analytics updated successfully");
    } catch (error) {
      console.log("⚠️  Analytics update failed:", error);
    }
    
    console.log("\\n🏆 CSV IMPORT COMPLETE!");
    console.log("========================");
    console.log(`✅ Successfully imported: ${totalSuccess} tests`);
    console.log(`❌ Failed imports: ${totalFailed} tests`);
    console.log(`📊 Success rate: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%`);
    console.log(`💰 Total rewards distributed: ${formatEther(totalTokens)} CTBAL`);
    
    // Save import record
    const importRecord = {
      network: "sepolia",
      chainId: 11155111,
      timestamp: new Date().toISOString(),
      deployer: account.address,
      contracts: {
        CTBALToken: TOKEN_ADDRESS,
        CTBALAnalytics: ANALYTICS_ADDRESS
      },
      csvImport: {
        totalRecordsInCsv: csvRecords.length,
        processedRecords: clinicalTests.length,
        successfulImports: totalSuccess,
        failedImports: totalFailed,
        successRate: ((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1) + "%",
        totalTokensAllocated: formatEther(totalTokens)
      },
      etherscanUrls: {
        CTBALToken: `https://sepolia.etherscan.io/address/${TOKEN_ADDRESS}`,
        CTBALAnalytics: `https://sepolia.etherscan.io/address/${ANALYTICS_ADDRESS}`
      }
    };

    const filename = `sepolia-csv-import-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(importRecord, null, 2));
    console.log(`\\n💾 Import record saved: ${filename}`);

    console.log("\\n🔗 VIEW ON SEPOLIA ETHERSCAN:");
    console.log("==============================");
    console.log(`💎 Token Contract: https://sepolia.etherscan.io/address/${TOKEN_ADDRESS}`);
    console.log(`📊 Analytics Contract: https://sepolia.etherscan.io/address/${ANALYTICS_ADDRESS}`);
    
    console.log("\\n✨ SUCCESS! Your mortality data is now live on Ethereum Sepolia! ✨");
    
  } catch (error: any) {
    console.error("\\n❌ IMPORT FAILED:", error.message);
    
    if (error.shortMessage) {
      console.error(`Details: ${error.shortMessage}`);
    }
    
    console.error("\\n🔧 Troubleshooting:");
    console.error("- Check your Sepolia ETH balance");
    console.error("- Verify contracts are deployed correctly"); 
    console.error("- Ensure proper roles are set");
  }
}

main().catch(console.error);