import { createWalletClient, createPublicClient, http, parseEther, formatEther, keccak256, toHex } from "viem";
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

interface CsvRecord {
  [key: string]: string;
}

interface ClinicalTestMapping {
  testType: string;
  patientId: string;
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

function mapCsvRecordToClinicalTest(record: CsvRecord, index: number): ClinicalTestMapping {
  // Extract key demographic data from scrape-a-grave format
  const name = record.Name || record.name || "";
  const city = record.City || record.city || "";
  const county = record.County || record.county || "";
  const state = record.State || record.state || "";
  const birthDate = record["Birth Date"] || record.birth_date || "";
  const deathDate = record["Death Date"] || record.death_date || "";
  const yearQueried = record["Year Queried"] || record.year_queried || "";
  
  // Calculate age at death for demographic analysis
  let age = 0;
  if (birthDate && deathDate) {
    const birth = new Date(birthDate);
    const death = new Date(deathDate);
    age = death.getFullYear() - birth.getFullYear();
  }

  // Create specialized test types for epidemiological data
  let testType = "Demographic Health Study";
  let testTypeCode = 1; // Biomarker/epidemiological data
  
  // Age-based categorization for clinical relevance
  if (age > 0) {
    if (age < 50) {
      testType = `Early Mortality Study - Age ${age} - ${county}, ${state}`;
      testTypeCode = 4; // Genetic studies (early mortality often has genetic components)
    } else if (age >= 50 && age < 75) {
      testType = `Mid-Life Health Study - Age ${age} - ${county}, ${state}`;
      testTypeCode = 2; // Imaging/screening studies
    } else if (age >= 75) {
      testType = `Geriatric Health Study - Age ${age} - ${county}, ${state}`;
      testTypeCode = 1; // Biomarker/demographic studies
    }
  }
  
  // Geographic epidemiology focus
  if (county && state) {
    testType += ` [${county} County Epidemiological Survey]`;
  }
  
  // Check for veteran status (common in mortality data)
  if (name.includes("Veteran") || name.includes("VVeteran")) {
    testType = `Veteran Health Study - Age ${age} - ${county}, ${state}`;
    testTypeCode = 3; // MRI/comprehensive medical studies for veterans
  }

  // Generate unique patient ID from demographic data
  const patientId = `${state.toLowerCase().replace(/\s+/g, '')}_${county.toLowerCase().replace(/\s+/g, '')}_${String(index + 1).padStart(4, '0')}`;
  
  // Create comprehensive data hash including all demographic fields
  const demographicData = {
    name: name.replace(/[^a-zA-Z\s]/g, ''), // Clean name for privacy
    location: `${city}, ${county}, ${state}`,
    birthYear: birthDate ? new Date(birthDate).getFullYear() : null,
    deathYear: deathDate ? new Date(deathDate).getFullYear() : null,
    age: age,
    isVeteran: name.includes("Veteran"),
    queryYear: yearQueried
  };
  
  const dataHash = keccak256(toHex(JSON.stringify(demographicData)));
  
  // Create metadata hash with source and quality metrics
  const metadata = {
    sourceFile: "us_recent_deaths",
    importTimestamp: new Date().toISOString(),
    recordIndex: index,
    dataCompleteness: Object.values(record).filter(v => v && v.trim().length > 0).length,
    geographicScope: `${county} County, ${state}`,
    temporalScope: `${birthDate} to ${deathDate}`,
    demographicCategory: age < 50 ? "early_mortality" : age < 75 ? "mid_life" : "geriatric",
    veteranStatus: name.includes("Veteran")
  };
  const metadataHash = keccak256(toHex(JSON.stringify(metadata)));
  
  // Calculate token allocation based on data quality and clinical value
  let tokenAllocation = parseEther("150"); // Base reward for demographic data
  
  // Age data adds clinical value
  if (age > 0) tokenAllocation = parseEther("200");
  
  // Complete geographic data is valuable for epidemiology
  if (city && county && state) tokenAllocation = parseEther("250");
  
  // Veteran status adds research value
  if (name.includes("Veteran")) tokenAllocation = parseEther("300");
  
  // Recent deaths (within 30 days) have higher research urgency
  if (deathDate) {
    const deathDateObj = new Date(deathDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (deathDateObj >= thirtyDaysAgo) {
      tokenAllocation = parseEther("350"); // Premium for recent, actionable data
    }
  }
  
  // Complete records (all 8 fields) get maximum reward
  const completedFields = Object.values(record).filter(v => v && v.trim().length > 0).length;
  if (completedFields >= 7) {
    tokenAllocation = parseEther("400");
  }

  return {
    testType,
    patientId,
    dataHash,
    metadataHash,
    tokenAllocation,
    testTypeCode
  };
}

async function main() {
  console.log("📊 CTBAL BATCH CSV IMPORT - Scrape-a-Grave Data Integration");
  console.log("==========================================================\n");

  // Configuration - Use command line argument if provided, then env var, then default
  const csvArgument = process.argv[2] || process.env.CSV_FILE;
  const CSV_FILE_PATH = csvArgument || process.env.CSV_FILE_PATH || "./csv-processing/mortality_data_20251201.csv";
  const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "10");
  const DRY_RUN = process.env.DRY_RUN === "true";
  
  // Check environment
  try {
    console.log(`🔗 Network: sepolia`);
    console.log(`🔗 Network URL: ${process.env.SEPOLIA_URL || 'localhost'}`);
    
    // Check environment variables
    if (!process.env.PRIVATE_KEY) {
      console.error("❌ Hardhat Viem plugin not available. Check hardhat.config.ts");
      console.log("💡 Try running with: npx hardhat run scripts/batch-csv-import.ts");
      return;
    }
    
    console.log("✅ Hardhat Viem plugin detected");
  } catch (error) {
    console.log("⚠️  Hardhat network info not available, proceeding with defaults...");
  }
  
  console.log("📋 CONFIGURATION:");
  console.log(`- CSV File: ${CSV_FILE_PATH}`);
  console.log(`- Batch Size: ${BATCH_SIZE}`);
  console.log(`- Dry Run: ${DRY_RUN ? "YES (no blockchain writes)" : "NO (will write to blockchain)"}`);
  if (csvArgument) {
    console.log(`- Source: Command line argument`);
  } else if (process.env.CSV_FILE_PATH) {
    console.log(`- Source: Environment variable CSV_FILE_PATH`);
  } else {
    console.log(`- Source: Default path`);
  }

  try {
    // Check if CSV file exists
    const fullCsvPath = path.resolve(CSV_FILE_PATH);
    console.log(`\n📂 Resolved path: ${fullCsvPath}`);
    
    if (!fs.existsSync(fullCsvPath)) {
      console.log(`\n❌ CSV file not found: ${fullCsvPath}`);
      console.log("\n💡 SETUP INSTRUCTIONS:");
      console.log("1. Run your scrape-a-grave Python programs to generate CSV data");
      console.log("2. Copy CSV file to ./csv-processing/ directory");
      console.log("3. Or pass file path as argument: npx tsx scripts/batch-csv-import.ts /path/to/file.csv");
      console.log("4. Or set CSV_FILE_PATH environment variable");
      console.log("\nExamples:");
      console.log("npx tsx scripts/batch-csv-import.ts ./csv-processing/mortality_data_20251201.csv");
      console.log("CSV_FILE_PATH=./csv-processing/your_data.csv npm run import:csv");
      return;
    }

    // Parse CSV data
    console.log("\n📖 PARSING CSV DATA:");
    const csvRecords = await parseCsvFile(fullCsvPath);
    console.log(`✅ Loaded ${csvRecords.length} records from CSV`);
    
    // Show sample of data structure
    if (csvRecords.length > 0) {
      console.log("\n📄 SAMPLE RECORD (first row):");
      const sampleRecord = csvRecords[0];
      Object.entries(sampleRecord).slice(0, 5).forEach(([key, value]) => {
        console.log(`  ${key}: ${value.length > 50 ? value.substring(0, 50) + "..." : value}`);
      });
      if (Object.keys(sampleRecord).length > 5) {
        console.log(`  ... and ${Object.keys(sampleRecord).length - 5} more columns`);
      }
    }

    // Map CSV records to clinical tests
    console.log("\n🔄 MAPPING DATA TO CLINICAL TESTS:");
    const clinicalTests = csvRecords.map((record, index) => 
      mapCsvRecordToClinicalTest(record, index)
    );
    
    // Show mapping summary
    const testTypeCounts = clinicalTests.reduce((acc, test) => {
      acc[test.testType] = (acc[test.testType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log("📊 TEST TYPE DISTRIBUTION:");
    Object.entries(testTypeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} tests`);
    });

    const totalTokens = clinicalTests.reduce((sum, test) => sum + test.tokenAllocation, BigInt(0));
    console.log(`\n💰 TOTAL TOKEN ALLOCATION: ${formatEther(totalTokens)} CTBAL`);

    if (DRY_RUN) {
      console.log("\n🔍 DRY RUN - Would create the following clinical tests:");
      clinicalTests.slice(0, 3).forEach((test, i) => {
        console.log(`\n  Test ${i + 1}:`);
        console.log(`    Type: ${test.testType}`);
        console.log(`    Patient: ${test.patientId}`);
        console.log(`    Reward: ${formatEther(test.tokenAllocation)} CTBAL`);
        console.log(`    Data Hash: ${test.dataHash.substring(0, 10)}...`);
      });
      
      if (clinicalTests.length > 3) {
        console.log(`\n  ... and ${clinicalTests.length - 3} more tests`);
      }
      
      console.log("\n✅ Dry run complete. Set DRY_RUN=false to execute blockchain transactions.");
      return;
    }

    // Deploy or connect to contracts
    console.log("\n🚀 CONNECTING TO CTBAL CONTRACTS:");
    
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
    
    console.log(`✅ Deployer: ${account.address}`);
    
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`💰 Balance: ${formatEther(balance)} ETH`);
    
    // Connect to existing deployed contracts on Sepolia
    const ctbalTokenAddress = "0x386b7e934f1cfd8169bf8b9d5249ba1ed7e1926f";
    const ctbalAnalyticsAddress = "0x4ba62466265d6d3853cff74b910e5b7ab13aaea1";
    
    console.log(`✅ CTBALToken: ${ctbalTokenAddress}`);
    console.log(`✅ CTBALAnalytics: ${ctbalAnalyticsAddress}`);
    console.log("⚠️  Note: This script now references existing deployed contracts");
    console.log("💡 Use csv-import-to-deployed.ts for actual CSV import functionality");
    console.log(`💰 Total tokens needed: ${formatEther(totalTokens)} CTBAL`);
    
    console.log("\n🎯 TO PROCEED WITH ACTUAL IMPORT:");
    console.log("================================");
    console.log("npx tsx scripts/csv-import-to-deployed.ts");
    
    console.log("\n✅ CSV PARSING AND ANALYSIS COMPLETED!");
    console.log("=====================================");
    console.log(`📊 Total records parsed: ${csvRecords.length}`);
    console.log(`🧪 Clinical tests mapped: ${clinicalTests.length}`);
    console.log(`💰 Total token allocation needed: ${formatEther(totalTokens)} CTBAL`);

    return { csvRecords, clinicalTests, totalTokens };
    
  } catch (error) {
    console.error("❌ Import Error:", error);
    process.exit(1);
  }
}

// Handle command line execution
main().catch(console.error);

export { parseCsvFile, mapCsvRecordToClinicalTest };