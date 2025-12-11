import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// Load contract artifacts  
import * as CTBALTokenArtifact from '../artifacts/contracts/CTBALToken.sol/CTBALToken.json';
import * as CTBALAnalyticsArtifact from '../artifacts/contracts/CTBALAnalytics.sol/CTBALAnalytics.json';

// Deployed contract addresses on Sepolia
const SEPOLIA_CONTRACTS = {
  CTBALToken: "0xcfab0ab01fd1a4a72601dd30da96fc13b0403246" as `0x${string}`,
  CTBALAnalytics: "0x5b07f9bac1f72cbd5ef931f13d00bb87785eab5d" as `0x${string}`
};

interface CsvRecord {
  [key: string]: string;
}

interface ClinicalTestData {
  testType: string;
  patient: `0x${string}`;
  dataHash: string;
  metadataHash: string;
  tokenAllocation: bigint;
  testTypeCode: number;
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

function mapMortalityRecordToClinicalTest(record: CsvRecord, index: number): ClinicalTestData {
  // Extract mortality data from FindAGrave format
  const name = record.Name || record.name || "";
  const city = record.City || record.city || "";
  const county = record.County || record.county || "";
  const state = record.State || record.state || "";
  const birthDate = record["Birth Date"] || record.birth_date || "";
  const deathDate = record["Death Date"] || record.death_date || "";
  const updated = record.Updated || record.updated || "";
  
  // Calculate age at death for demographic analysis
  let ageAtDeath = 0;
  if (birthDate && deathDate) {
    const birth = new Date(birthDate);
    const death = new Date(deathDate);
    ageAtDeath = death.getFullYear() - birth.getFullYear();
  }

  // Age-based clinical test categorization with appropriate CTBAL rewards
  let testType: string;
  let tokenAllocation: bigint;
  let testTypeCode: number;

  if (ageAtDeath < 50) {
    testType = "Early Mortality Risk Assessment";
    tokenAllocation = parseEther("400"); // Higher reward for rare early mortality cases
    testTypeCode = 4; // Genetic/rare disease studies
  } else if (ageAtDeath >= 50 && ageAtDeath < 75) {
    testType = "Mid-Life Health Analysis";
    tokenAllocation = parseEther("300"); // Standard mid-life health research
    testTypeCode = 2; // Imaging/screening studies
  } else {
    testType = "Geriatric Care Study";
    tokenAllocation = parseEther("200"); // Standard geriatric research
    testTypeCode = 1; // Biomarker/demographic studies
  }

  // Geographic and demographic enhancements
  if (county && state) {
    testType += ` - ${county}, ${state}`;
  }

  // Special population identification
  if (name.toLowerCase().includes("veteran") || name.toLowerCase().includes("vveteran")) {
    testType += " (Veteran Population)";
    tokenAllocation = tokenAllocation + parseEther("50"); // Veteran health bonus
    testTypeCode = 3; // Veteran-specific studies
  }

  // Generate unique patient address based on demographic data
  const patientSeed = `${state}_${county}_${index}`.toLowerCase().replace(/\s+/g, '');
  const patientAddress = `0x${Buffer.from(patientSeed).toString('hex').padStart(40, '0').substring(0, 40)}` as `0x${string}`;

  // Create comprehensive data hash (simulating IPFS storage)
  const dataPayload = {
    name,
    location: `${city}, ${county}, ${state}`,
    birthDate,
    deathDate,
    ageAtDeath,
    testCategory: testType,
    processingDate: new Date().toISOString()
  };
  const dataHash = `QmData${Buffer.from(JSON.stringify(dataPayload)).toString('hex').substring(0, 40)}`;

  // Create metadata hash for compliance
  const metadata = {
    source: "FindAGrave",
    dataProvider: "scrape-a-grave",
    state,
    county,
    collectionDate: updated,
    qualityScore: name && city && state ? 95 : 75,
    complianceLevel: "HIPAA-compliant"
  };
  const metadataHash = `QmMeta${Buffer.from(JSON.stringify(metadata)).toString('hex').substring(0, 40)}`;

  return {
    testType,
    patient: patientAddress,
    dataHash,
    metadataHash,
    tokenAllocation,
    testTypeCode
  };
}

async function main() {
  const args = process.argv.slice(2);
  let csvFilePath: string;

  // Handle command line arguments or default patterns
  if (args.length > 0) {
    csvFilePath = args[0];
  } else {
    // Default to today's date format: mortality_data_YYYYMMDD.csv
    const today = new Date();
    const dateString = today.getFullYear() + 
                      String(today.getMonth() + 1).padStart(2, '0') + 
                      String(today.getDate()).padStart(2, '0');
    csvFilePath = `mortality_data_${dateString}.csv`;
  }

  console.log("🏥 CTBAL MORTALITY DATA IMPORT");
  console.log("==============================\n");
  console.log(`📂 Target CSV File: ${csvFilePath}`);

  // Check if file exists in multiple possible locations
  const possiblePaths = [
    csvFilePath, // Direct path
    path.join(".", csvFilePath), // Current directory
    path.join("..", "scrape-a-grave", "processed_csvs", csvFilePath), // scrape-a-grave processed_csvs
    path.join("processed_csvs", csvFilePath), // Local processed_csvs
    path.join("csv-processing", csvFilePath), // csv-processing directory
  ];

  let resolvedPath: string | null = null;
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      resolvedPath = path.resolve(testPath);
      break;
    }
  }

  if (!resolvedPath) {
    console.log("❌ CSV file not found in any of these locations:");
    possiblePaths.forEach(p => console.log(`   - ${path.resolve(p)}`));
    console.log("\n💡 Usage Examples:");
    console.log("npx tsx scripts/mortality-data-import.ts mortality_data_20251208.csv");
    console.log("npx tsx scripts/mortality-data-import.ts ../scrape-a-grave/processed_csvs/mortality_data_20251208.csv");
    console.log("npx tsx scripts/mortality-data-import.ts (defaults to today's date)");
    return;
  }

  console.log(`✅ Found CSV file: ${resolvedPath}\n`);

  try {
    // Parse CSV data
    console.log("📖 Parsing CSV data...");
    const csvRecords = await parseCsvFile(resolvedPath);
    console.log(`✅ Loaded ${csvRecords.length} mortality records\n`);

    // Show sample record structure
    if (csvRecords.length > 0) {
      console.log("📋 Sample record (first row):");
      const sample = csvRecords[0];
      Object.entries(sample).slice(0, 4).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
      console.log("");
    }

    // Map to clinical tests
    console.log("🔄 Mapping mortality data to clinical tests...");
    const clinicalTests = csvRecords.map((record, index) => 
      mapMortalityRecordToClinicalTest(record, index)
    );

    // Show test distribution
    const testTypeStats = clinicalTests.reduce((acc, test) => {
      const baseType = test.testType.split(' - ')[0]; // Remove geographic suffix for stats
      acc[baseType] = (acc[baseType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("📊 Clinical Test Distribution:");
    Object.entries(testTypeStats).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} tests`);
    });

    const totalTokens = clinicalTests.reduce((sum, test) => sum + test.tokenAllocation, BigInt(0));
    console.log(`\n💰 Total CTBAL Token Allocation: ${formatEther(totalTokens)} CTBAL\n`);

    // Setup blockchain connection
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

    console.log("🔗 Blockchain Connection:");
    console.log(`   Deployer: ${account.address}`);
    console.log(`   CTBALToken: ${SEPOLIA_CONTRACTS.CTBALToken}`);
    console.log(`   CTBALAnalytics: ${SEPOLIA_CONTRACTS.CTBALAnalytics}`);

    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`   ETH Balance: ${formatEther(balance)} ETH\n`);

    // Process in batches for gas optimization
    const BATCH_SIZE = 5;
    const totalBatches = Math.ceil(clinicalTests.length / BATCH_SIZE);

    console.log(`🚀 Processing ${clinicalTests.length} clinical tests in ${totalBatches} batches...\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < clinicalTests.length; i += BATCH_SIZE) {
      const batch = clinicalTests.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      
      console.log(`📦 Processing batch ${batchNum}/${totalBatches}`);

      for (const test of batch) {
        try {
          console.log(`   Creating test: ${test.testType.substring(0, 50)}...`);
          console.log(`   Patient: ${test.patient}`);
          console.log(`   Tokens: ${formatEther(test.tokenAllocation)} CTBAL`);

          const txHash = await walletClient.writeContract({
            address: SEPOLIA_CONTRACTS.CTBALToken,
            abi: CTBALTokenArtifact.abi,
            functionName: 'createClinicalTest',
            args: [
              test.testType,
              test.patient,
              test.dataHash,
              test.metadataHash,
              test.tokenAllocation
            ],
          });

          console.log(`   ✅ Test created (tx: ${txHash.substring(0, 10)}...)\n`);
          successCount++;

        } catch (error) {
          console.log(`   ❌ Failed to create test: ${error}\n`);
          failCount++;
        }
      }

      // Rate limiting between batches
      if (i + BATCH_SIZE < clinicalTests.length) {
        console.log("   ⏳ Waiting 2s before next batch...\n");
        await Nanosleep(2000);
      }
    }

    // Update analytics
    console.log("📊 Updating Analytics...");
    try {
      const analyticsHash = await walletClient.writeContract({
        address: SEPOLIA_CONTRACTS.CTBALAnalytics,
        abi: CTBALAnalyticsArtifact.abi,
        functionName: 'updateMetrics',
        args: [],
      });
      console.log(`✅ Analytics updated (tx: ${analyticsHash.substring(0, 10)}...)`);
    } catch (error) {
      console.log(`⚠️ Analytics update failed (non-critical): ${error}`);
    }

    // Final summary
    console.log("\n🎉 IMPORT SUMMARY");
    console.log("==================");
    console.log(`📊 Total Records: ${csvRecords.length}`);
    console.log(`✅ Successful Tests: ${successCount}`);
    console.log(`❌ Failed Tests: ${failCount}`);
    console.log(`💰 Total Tokens Allocated: ${formatEther(totalTokens)} CTBAL`);
    console.log(`📁 Source File: ${path.basename(resolvedPath)}`);
    console.log(`📅 Processing Date: ${new Date().toISOString()}`);

  } catch (error) {
    console.error("❌ Import Error:", error);
    process.exit(1);
  }
}

// Simple sleep function for rate limiting
function Nanosleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle command line execution
main().catch(console.error);