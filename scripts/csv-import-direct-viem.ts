import { createWalletClient, createPublicClient, http, parseEther, formatEther, keccak256, toHex } from 'viem';
import { localhost } from 'viem/chains';
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

  // Generate patient ID
  const patientId = `${state.toLowerCase().replace(/\s+/g, '')}_${county.toLowerCase().replace(/\s+/g, '')}_${String(index + 1).padStart(4, '0')}`;
  
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
  
  // Calculate token allocation
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
  console.log("📊 CTBAL CSV IMPORT - Direct Viem Approach");
  console.log("==========================================\\n");

  // Configuration
  const csvPath = "./csv-processing/mortality_data_20251201.csv";
  const dryRun = process.env.DRY_RUN === "true";
  const batchSize = 5; // Small batch for testing
  
  console.log(`📂 CSV File: ${csvPath}`);
  console.log(`🔄 Mode: ${dryRun ? "DRY RUN" : "LIVE DEPLOYMENT"}`);
  
  if (!fs.existsSync(csvPath)) {
    console.log(`❌ CSV file not found: ${csvPath}`);
    return;
  }

  // Parse CSV
  console.log("\\n📖 Parsing CSV data...");
  const csvRecords = await parseCsvFile(csvPath);
  console.log(`✅ Found ${csvRecords.length} records`);
  
  // Map to clinical tests
  const clinicalTests = csvRecords.slice(0, batchSize).map((record, index) => 
    mapCsvRecordToClinicalTest(record, index)
  );
  
  const totalTokens = clinicalTests.reduce((sum, test) => sum + test.tokenAllocation, 0n);
  console.log(`💰 Processing ${clinicalTests.length} tests requiring ${formatEther(totalTokens)} CTBAL`);

  if (dryRun) {
    console.log("\\n🔍 DRY RUN - Sample clinical tests:");
    clinicalTests.slice(0, 2).forEach((test, i) => {
      console.log(`\\n  Test ${i + 1}:`);
      console.log(`    Type: ${test.testType}`);
      console.log(`    Patient: ${test.patientId}`);
      console.log(`    Reward: ${formatEther(test.tokenAllocation)} CTBAL`);
    });
    console.log("\\n✅ Dry run complete. Set DRY_RUN=false for live deployment.");
    return;
  }

  // Setup Viem clients for localhost
  const account = privateKeyToAccount('0x4b75f136a78db692534cba2f917bf85b62dcf74826e26dbbd0b2221fb0d93668'); // Ganache account #0
  
  const walletClient = createWalletClient({
    account,
    chain: localhost,
    transport: http('http://192.168.50.173:7545'),
  });

  const publicClient = createPublicClient({
    chain: localhost,
    transport: http('http://192.168.50.173:7545'),
  });

  console.log(`\\n👤 Deployer: ${account.address}`);
  
  try {
    // Check balance
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`💰 Balance: ${formatEther(balance)} ETH`);
    
    // Deploy CTBALToken
    console.log("\\n📜 Deploying CTBALToken...");
    const tokenHash = await walletClient.deployContract({
      abi: CTBALTokenArtifact.abi,
      bytecode: CTBALTokenArtifact.bytecode as `0x${string}`,
      args: ["Clinical Test Blockchain Token", "CTBAL", totalTokens * 10n] // Extra supply
    });
    
    const tokenReceipt = await publicClient.waitForTransactionReceipt({ hash: tokenHash });
    const tokenAddress = tokenReceipt.contractAddress!;
    console.log(`✅ CTBALToken deployed: ${tokenAddress}`);
    
    // Deploy CTBALAnalytics
    console.log("📊 Deploying CTBALAnalytics...");
    const analyticsHash = await walletClient.deployContract({
      abi: CTBALAnalyticsArtifact.abi,
      bytecode: CTBALAnalyticsArtifact.bytecode as `0x${string}`,
      args: [tokenAddress]
    });
    
    const analyticsReceipt = await publicClient.waitForTransactionReceipt({ hash: analyticsHash });
    const analyticsAddress = analyticsReceipt.contractAddress!;
    console.log(`✅ CTBALAnalytics deployed: ${analyticsAddress}`);
    
    console.log("\\n🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("=========================");
    console.log(`📜 CTBALToken: ${tokenAddress}`);
    console.log(`📊 CTBALAnalytics: ${analyticsAddress}`);
    console.log(`💰 Ready to process ${clinicalTests.length} clinical tests`);
    
    // TODO: Create clinical tests (would require setting up roles first)
    console.log("\\n📋 NEXT STEPS:");
    console.log("1. Set up CLINICIAN_ROLE for test creation");
    console.log("2. Create batch clinical tests from CSV data");
    console.log("3. Update analytics with new test data");
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
  }
}

main().catch(console.error);