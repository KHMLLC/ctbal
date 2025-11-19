import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load contract artifacts
import CTBALTokenArtifact from '../artifacts/contracts/CTBALToken.sol/CTBALToken.json' assert { type: "json" };
import CTBALAnalyticsArtifact from '../artifacts/contracts/CTBALAnalytics.sol/CTBALAnalytics.json' assert { type: "json" };

dotenv.config();

// Deployed contract addresses from sepolia-deployment-1763253890506.json
const SEPOLIA_CONTRACTS = {
  CTBALToken: "0xcfab0ab01fd1a4a72601dd30da96fc13b0403246",
  CTBALAnalytics: "0x5b07f9bac1f72cbd5ef931f13d00bb87785eab5d"
};

interface CsvRecord {
  Name: string;
  City: string;
  County: string;
  State: string;
  'Birth Date': string;
  'Death Date': string;
}

function parseCSV(csvContent: string): CsvRecord[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const record: any = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    return record as CsvRecord;
  });
}

function mapCsvRecordToClinicalTest(record: CsvRecord, index: number) {
  // Calculate age at death
  const birthDate = new Date(record['Birth Date']);
  const deathDate = new Date(record['Death Date']);
  const ageAtDeath = deathDate.getFullYear() - birthDate.getFullYear();

  // Determine test type based on age and other factors
  let testType: string;
  let tokenAllocation: bigint;

  if (ageAtDeath < 50) {
    testType = "Early Mortality Risk Assessment";
    tokenAllocation = parseEther("400"); // Higher reward for rare cases
  } else if (ageAtDeath < 75) {
    testType = "Mid-Life Health Analysis";
    tokenAllocation = parseEther("300");
  } else {
    testType = "Geriatric Care Study";
    tokenAllocation = parseEther("200");
  }

  // Check for veteran status (common indicator in Wyoming data)
  if (record.Name.includes("Jr") || record.Name.includes("Sr") || 
      record.City.includes("Cheyenne") || record.County.includes("Laramie")) {
    testType += " (Veteran Population)";
    tokenAllocation = tokenAllocation + parseEther("50"); // Bonus for veteran data
  }

  // Generate synthetic patient address (using index for uniqueness)
  const patientAddress = `0x${(index + 1000000).toString(16).padStart(40, '0')}` as `0x${string}`;

  // Create data hash from record (simulating IPFS hash)
  const dataString = JSON.stringify({
    name: record.Name,
    location: `${record.City}, ${record.County}, ${record.State}`,
    birthDate: record['Birth Date'],
    deathDate: record['Death Date'],
    ageAtDeath,
    testType
  });
  
  const dataHash = `QmScr4g3-${Buffer.from(dataString).toString('hex').substring(0, 40)}`; // Simulated IPFS hash

  // Create metadata hash
  const metadataString = JSON.stringify({
    source: "scrape-a-grave",
    state: record.State,
    county: record.County,
    processingDate: new Date().toISOString(),
    qualityScore: Math.floor(Math.random() * 30) + 70 // 70-100 quality score
  });
  
  const metadataHash = `QmMeta-${Buffer.from(metadataString).toString('hex').substring(0, 40)}`;

  return {
    testType,
    patient: patientAddress,
    dataHash,
    metadataHash,
    tokenAllocation,
    originalRecord: record
  };
}

async function main() {
  console.log("🚀 IMPORTING WYOMING MORTALITY DATA TO SEPOLIA CTBAL");
  console.log("====================================================\n");

  // Setup wallet and clients
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

  console.log("👤 Deployer:", account.address);
  console.log("📋 CTBALToken:", SEPOLIA_CONTRACTS.CTBALToken);
  console.log("📊 CTBALAnalytics:", SEPOLIA_CONTRACTS.CTBALAnalytics);

  try {
    // Load CSV data
    const csvPath = 'us_recent_deaths.csv';
    console.log(`\n📂 Loading CSV file: ${csvPath}`);
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parseCSV(csvContent);
    
    console.log(`📊 Found ${records.length} mortality records to process`);

    // Check our token balance and role status
    const tokenBalance = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALToken,
      abi: CTBALTokenArtifact.abi,
      functionName: 'balanceOf',
      args: [account.address],
    });

    console.log(`💰 Current CTBAL Balance: ${formatEther(tokenBalance as bigint)} tokens`);

    // Check if we have CLINICIAN_ROLE
    const clinicianRole = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALToken,
      abi: CTBALTokenArtifact.abi,
      functionName: 'CLINICIAN_ROLE',
    });

    const hasClinicianRole = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALToken,
      abi: CTBALTokenArtifact.abi,
      functionName: 'hasRole',
      args: [clinicianRole, account.address],
    });

    console.log(`🩺 Has Clinician Role: ${hasClinicianRole}`);

    // Grant clinician role if we don't have it
    if (!hasClinicianRole) {
      console.log("\n🔑 Granting Clinician Role...");
      
      const grantHash = await walletClient.writeContract({
        address: SEPOLIA_CONTRACTS.CTBALToken,
        abi: CTBALTokenArtifact.abi,
        functionName: 'grantRole',
        args: [clinicianRole, account.address],
      });

      await publicClient.waitForTransactionReceipt({ hash: grantHash });
      console.log("✅ Clinician role granted!");
    }

    // Process each CSV record
    const tests = records.map(mapCsvRecordToClinicalTest);
    
    console.log(`\n🧪 Processing ${tests.length} clinical tests...`);
    console.log("=====================================");

    let successCount = 0;
    let totalTokensAllocated = BigInt(0);

    // Import tests in batches to avoid gas limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < tests.length; i += BATCH_SIZE) {
      const batch = tests.slice(i, i + BATCH_SIZE);
      
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tests.length / BATCH_SIZE)}`);
      
      for (const test of batch) {
        try {
          console.log(`   Creating test: ${test.testType}`);
          console.log(`   Patient: ${test.patient}`);
          console.log(`   Tokens: ${formatEther(test.tokenAllocation)} CTBAL`);
          
          const hash = await walletClient.writeContract({
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

          await publicClient.waitForTransactionReceipt({ hash });
          
          successCount++;
          totalTokensAllocated += test.tokenAllocation;
          console.log(`   ✅ Test created (tx: ${hash.substring(0, 10)}...)`);
          
        } catch (error) {
          console.log(`   ❌ Failed to create test: ${error}`);
        }
      }

      // Small delay between batches
      if (i + BATCH_SIZE < tests.length) {
        console.log("   ⏳ Waiting 2s before next batch...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Update analytics
    console.log("\n📊 Updating Analytics...");
    
    const updateHash = await walletClient.writeContract({
      address: SEPOLIA_CONTRACTS.CTBALAnalytics,
      abi: CTBALAnalyticsArtifact.abi,
      functionName: 'updateMetrics',
      args: [],
    });

    await publicClient.waitForTransactionReceipt({ hash: updateHash });
    console.log("✅ Analytics updated!");

    // Get final metrics
    const metrics = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALAnalytics,
      abi: CTBALAnalyticsArtifact.abi,
      functionName: 'getOverallMetrics',
    });

    console.log("\n🎯 IMPORT SUMMARY");
    console.log("=================");
    console.log(`Total Records Processed: ${records.length}`);
    console.log(`Successful Imports: ${successCount}`);
    console.log(`Failed Imports: ${records.length - successCount}`);
    console.log(`Tokens Allocated: ${formatEther(totalTokensAllocated)} CTBAL`);
    console.log(`Blockchain Total Tests: ${(metrics as any[])[0]}`);
    console.log(`Blockchain Total Tokens: ${formatEther((metrics as any[])[3] as bigint)} CTBAL`);

    // Save import summary
    const importSummary = {
      network: "sepolia",
      timestamp: new Date().toISOString(),
      source: "scrape-a-grave Wyoming mortality data",
      contracts: SEPOLIA_CONTRACTS,
      results: {
        totalRecords: records.length,
        successfulImports: successCount,
        failedImports: records.length - successCount,
        tokensAllocated: formatEther(totalTokensAllocated),
        blockchainMetrics: {
          totalTests: (metrics as any[])[0].toString(),
          totalTokens: formatEther((metrics as any[])[3] as bigint)
        }
      },
      sampleTests: tests.slice(0, 3).map(t => ({
        testType: t.testType,
        tokens: formatEther(t.tokenAllocation),
        originalName: t.originalRecord.Name
      }))
    };

    fs.writeFileSync(
      `wyoming-import-${Date.now()}.json`,
      JSON.stringify(importSummary, null, 2)
    );

    console.log("\n🎉 WYOMING MORTALITY DATA IMPORT COMPLETE!");
    console.log(`View contracts on Etherscan:`);
    console.log(`Token: https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.CTBALToken}`);
    console.log(`Analytics: https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.CTBALAnalytics}`);

  } catch (error) {
    console.error("❌ Import failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });