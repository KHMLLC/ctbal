import { createWalletClient, createPublicClient, http, parseEther, formatEther, keccak256, toHex } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';

// Load contract artifacts  
import CTBALTokenArtifact from '../artifacts/contracts/CTBALToken.sol/CTBALToken.json' assert { type: "json" };
import CTBALAnalyticsArtifact from '../artifacts/contracts/CTBALAnalytics.sol/CTBALAnalytics.json' assert { type: "json" };

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

async function createClinicalTestBatch(
  tokenContract: any,
  analyticsContract: any,
  walletClient: any,
  publicClient: any,
  tests: ClinicalTestMapping[]
) {
  console.log(`\\n🧪 Creating batch of ${tests.length} clinical tests...`);
  
  const CLINICIAN_ROLE = await tokenContract.read.CLINICIAN_ROLE();
  const hasRole = await tokenContract.read.hasRole([CLINICIAN_ROLE, walletClient.account.address]);
  
  if (!hasRole) {
    console.log("🔐 Granting CLINICIAN_ROLE to deployer...");
    await tokenContract.write.grantRole([CLINICIAN_ROLE, walletClient.account.address]);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for role assignment
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    
    try {
      console.log(`\\n  📋 Test ${i + 1}/${tests.length}: ${test.testType.substring(0, 50)}...`);
      
      // Generate a dummy patient address based on patientId
      const patientAddress = `0x${keccak256(toHex(test.patientId)).slice(2, 42)}`;
      
      const tx = await tokenContract.write.createClinicalTest([
        test.testType,
        patientAddress,
        test.dataHash,
        test.metadataHash,
        test.tokenAllocation
      ]);
      
      await publicClient.waitForTransactionReceipt({ hash: tx });
      successCount++;
      
      console.log(`  ✅ Created - Patient: ${test.patientId}`);
      console.log(`  💰 Reward: ${formatEther(test.tokenAllocation)} CTBAL`);
      
      // Small delay to avoid overwhelming the network
      if (i % 10 === 9) {
        console.log("  ⏳ Pausing for network stability...");
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error: any) {
      failCount++;
      console.log(`  ❌ Failed - ${error.shortMessage || error.message}`);
    }
  }

  console.log(`\\n📊 Batch Results: ${successCount} successful, ${failCount} failed`);
  
  // Update analytics after batch
  try {
    console.log("🔄 Updating analytics...");
    await analyticsContract.write.updateMetrics([]);
    console.log("✅ Analytics updated");
  } catch (error) {
    console.log("⚠️  Analytics update failed:", error);
  }
  
  return { successCount, failCount };
}

async function main() {
  console.log("🌍 CTBAL CSV IMPORT - SEPOLIA TESTNET DEPLOYMENT");
  console.log("================================================\\n");

  // Configuration
  const csvPath = "./csv-processing/mortality_data_20251201.csv";
  const dryRun = process.env.DRY_RUN === "true";
  const maxBatchSize = parseInt(process.env.MAX_BATCH || "100");
  
  console.log(`📂 CSV File: ${csvPath}`);
  console.log(`🌐 Network: Sepolia Testnet`);
  console.log(`🔄 Mode: ${dryRun ? "DRY RUN" : "LIVE DEPLOYMENT"}`);
  console.log(`📊 Max Batch: ${maxBatchSize} records`);
  
  if (!fs.existsSync(csvPath)) {
    console.log(`❌ CSV file not found: ${csvPath}`);
    return;
  }

  // Parse CSV
  console.log("\\n📖 Parsing CSV data...");
  const csvRecords = await parseCsvFile(csvPath);
  console.log(`✅ Found ${csvRecords.length.toLocaleString()} total records`);
  
  // Limit batch size for initial deployment
  const batchRecords = csvRecords.slice(0, maxBatchSize);
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
    
    if (balance < parseEther("0.05")) {
      console.log("⚠️  Low balance! You may need more Sepolia ETH for deployment.");
      console.log("🚰 Get Sepolia ETH from: https://sepoliafaucet.com/");
    }
    
    // Deploy CTBALToken
    console.log("\\n📜 Deploying CTBALToken...");
    const tokenHash = await walletClient.deployContract({
      abi: CTBALTokenArtifact.abi,
      bytecode: CTBALTokenArtifact.bytecode as `0x${string}`,
      args: [
        "Clinical Test Blockchain Token",
        "CTBAL", 
        totalTokens * 20n // Extra supply for all tests
      ]
    });
    
    const tokenReceipt = await publicClient.waitForTransactionReceipt({ hash: tokenHash });
    const tokenAddress = tokenReceipt.contractAddress!;
    console.log(`✅ CTBALToken deployed: ${tokenAddress}`);
    console.log(`🔗 Etherscan: https://sepolia.etherscan.io/address/${tokenAddress}`);
    
    // Deploy CTBALAnalytics
    console.log("\\n📊 Deploying CTBALAnalytics...");
    const analyticsHash = await walletClient.deployContract({
      abi: CTBALAnalyticsArtifact.abi,
      bytecode: CTBALAnalyticsArtifact.bytecode as `0x${string}`,
      args: [tokenAddress]
    });
    
    const analyticsReceipt = await publicClient.waitForTransactionReceipt({ hash: analyticsHash });
    const analyticsAddress = analyticsReceipt.contractAddress!;
    console.log(`✅ CTBALAnalytics deployed: ${analyticsAddress}`);
    console.log(`🔗 Etherscan: https://sepolia.etherscan.io/address/${analyticsAddress}`);
    
    // Create contract instances
    const tokenContract = {
      address: tokenAddress,
      abi: CTBALTokenArtifact.abi,
      read: {
        CLINICIAN_ROLE: () => publicClient.readContract({
          address: tokenAddress,
          abi: CTBALTokenArtifact.abi,
          functionName: 'CLINICIAN_ROLE'
        }),
        hasRole: (args: any[]) => publicClient.readContract({
          address: tokenAddress,
          abi: CTBALTokenArtifact.abi,
          functionName: 'hasRole',
          args
        })
      },
      write: {
        grantRole: (args: any[]) => walletClient.writeContract({
          address: tokenAddress,
          abi: CTBALTokenArtifact.abi,
          functionName: 'grantRole',
          args
        }),
        createClinicalTest: (args: any[]) => walletClient.writeContract({
          address: tokenAddress,
          abi: CTBALTokenArtifact.abi,
          functionName: 'createClinicalTest',
          args
        })
      }
    };

    const analyticsContract = {
      address: analyticsAddress,
      write: {
        updateMetrics: (args: any[]) => walletClient.writeContract({
          address: analyticsAddress,
          abi: CTBALAnalyticsArtifact.abi,
          functionName: 'updateMetrics',
          args
        })
      }
    };
    
    console.log("\\n🎉 CONTRACTS DEPLOYED SUCCESSFULLY!");
    console.log("===================================");
    console.log(`📜 CTBALToken: ${tokenAddress}`);
    console.log(`📊 CTBALAnalytics: ${analyticsAddress}`);
    console.log(`💰 Ready to import ${clinicalTests.length} clinical tests`);
    
    // Create clinical tests in batches
    const batchSize = 25; // Smaller batches for Sepolia
    const batches = [];
    
    for (let i = 0; i < clinicalTests.length; i += batchSize) {
      batches.push(clinicalTests.slice(i, i + batchSize));
    }
    
    console.log(`\\n📦 Processing ${batches.length} batches of up to ${batchSize} tests each...`);
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    for (let i = 0; i < batches.length; i++) {
      console.log(`\\n🔄 Batch ${i + 1}/${batches.length}`);
      const result = await createClinicalTestBatch(
        tokenContract,
        analyticsContract, 
        walletClient,
        publicClient,
        batches[i]
      );
      
      totalSuccess += result.successCount;
      totalFailed += result.failCount;
      
      // Longer pause between batches
      if (i < batches.length - 1) {
        console.log("⏳ Waiting before next batch...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log("\\n🏆 CSV IMPORT COMPLETE!");
    console.log("========================");
    console.log(`✅ Successfully imported: ${totalSuccess} tests`);
    console.log(`❌ Failed imports: ${totalFailed} tests`);
    console.log(`📊 Success rate: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%`);
    
    // Save deployment record
    const deploymentRecord = {
      network: "sepolia",
      chainId: 11155111,
      timestamp: new Date().toISOString(),
      deployer: account.address,
      csvImport: {
        totalRecords: csvRecords.length,
        processedRecords: clinicalTests.length,
        successfulImports: totalSuccess,
        failedImports: totalFailed,
        totalTokensAllocated: formatEther(totalTokens)
      },
      contracts: {
        CTBALToken: tokenAddress,
        CTBALAnalytics: analyticsAddress
      },
      etherscanUrls: {
        CTBALToken: `https://sepolia.etherscan.io/address/${tokenAddress}`,
        CTBALAnalytics: `https://sepolia.etherscan.io/address/${analyticsAddress}`
      }
    };

    const filename = `sepolia-csv-deployment-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentRecord, null, 2));
    console.log(`\\n💾 Deployment record saved: ${filename}`);

    console.log("\\n🔗 VIEW ON SEPOLIA ETHERSCAN:");
    console.log("==============================");
    console.log(`💎 Token Contract: https://sepolia.etherscan.io/address/${tokenAddress}`);
    console.log(`📊 Analytics Contract: https://sepolia.etherscan.io/address/${analyticsAddress}`);
    
    console.log("\\n✨ SUCCESS! Your mortality data is now on Ethereum Sepolia! ✨");
    
  } catch (error: any) {
    console.error("\\n❌ DEPLOYMENT FAILED:", error.message);
    
    if (error.shortMessage) {
      console.error(`Details: ${error.shortMessage}`);
    }
    
    console.error("\\n🔧 Troubleshooting:");
    console.error("- Check your Sepolia ETH balance");
    console.error("- Verify SEPOLIA_URL is correct"); 
    console.error("- Ensure PRIVATE_KEY is valid");
  }
}

main().catch(console.error);