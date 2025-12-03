import { createPublicClient, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load contract artifacts
import CTBALTokenArtifact from '../artifacts/contracts/CTBALToken.sol/CTBALToken.json' assert { type: "json" };
import CTBALAnalyticsArtifact from '../artifacts/contracts/CTBALAnalytics.sol/CTBALAnalytics.json' assert { type: "json" };

dotenv.config();

// Deployed contract addresses
const SEPOLIA_CONTRACTS = {
  CTBALToken: "0xcfab0ab01fd1a4a72601dd30da96fc13b0403246" as `0x${string}`,
  CTBALAnalytics: "0x5b07f9bac1f72cbd5ef931f13d00bb87785eab5d" as `0x${string}`
};

interface ClinicalTest {
  id: number;
  testType: string;
  clinician: string;
  patient: string;
  timestamp: number;
  dataHash: string;
  metadataHash: string;
  validated: boolean;
  completed: boolean;
  tokenAllocation: string;
  approvalCount: number;
  state?: string;
  ageCategory?: string;
  estimatedAge?: number;
}

async function queryAllBlockchainContents() {
  console.log("🔍 COMPREHENSIVE BLOCKCHAIN CONTENT QUERY");
  console.log("==========================================\n");

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_URL),
  });

  try {
    // Get total number of tests
    console.log("📊 Getting Total Test Count...");
    const overallMetrics = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALAnalytics,
      abi: CTBALAnalyticsArtifact.abi,
      functionName: 'getOverallMetrics',
    }) as [bigint, bigint, bigint, bigint];

    const [totalTests, completedTests, validatedTests, totalTokens] = overallMetrics;
    console.log(`   Total Tests in Blockchain: ${totalTests}`);
    console.log(`   Completed Tests: ${completedTests}`);
    console.log(`   Validated Tests: ${validatedTests}`);
    console.log(`   Total Token Allocation: ${formatEther(totalTokens)} CTBAL\n`);

    // Query all individual tests
    console.log("🧪 EXTRACTING ALL CLINICAL TEST DATA:");
    console.log("=====================================");
    
    const allTests: ClinicalTest[] = [];
    const testsByState: { [key: string]: ClinicalTest[] } = {};
    const testsByType: { [key: string]: ClinicalTest[] } = {};

    for (let testId = 1; testId <= Number(totalTests); testId++) {
      try {
        const testData = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.CTBALToken,
          abi: CTBALTokenArtifact.abi,
          functionName: 'getClinicalTest',
          args: [BigInt(testId)],
        }) as [bigint, string, string, string, bigint, string, string, boolean, boolean, bigint, bigint];

        const [id, testType, clinician, patient, timestamp, dataHash, metadataHash, validated, completed, tokenAllocation, approvalCount] = testData;

        // Parse state from test type or data hash
        let state = 'Unknown';
        let ageCategory = 'Unknown';
        let estimatedAge = 0;

        // Extract state from test type (e.g., "Geriatric Care Study - Wyoming")
        if (testType.includes('Wyoming')) {
          state = 'Wyoming';
        } else if (testType.includes('Delaware')) {
          state = 'Delaware';
        } else if (testType.includes('California')) {
          state = 'California';
        } else if (testType.includes('Texas')) {
          state = 'Texas';
        }

        // Extract age category from test type
        if (testType.includes('Geriatric')) {
          ageCategory = '75+ (Geriatric)';
          estimatedAge = 80;
        } else if (testType.includes('Mid-Life')) {
          ageCategory = '50-74 (Mid-Life)';
          estimatedAge = 60;
        } else if (testType.includes('Early Mortality')) {
          ageCategory = 'Under 50 (Early Risk)';
          estimatedAge = 40;
        }

        const clinicalTest: ClinicalTest = {
          id: Number(id),
          testType,
          clinician,
          patient,
          timestamp: Number(timestamp),
          dataHash,
          metadataHash,
          validated,
          completed,
          tokenAllocation: formatEther(tokenAllocation),
          approvalCount: Number(approvalCount),
          state,
          ageCategory,
          estimatedAge
        };

        allTests.push(clinicalTest);

        // Group by state
        if (!testsByState[state]) testsByState[state] = [];
        testsByState[state].push(clinicalTest);

        // Group by type
        if (!testsByType[testType]) testsByType[testType] = [];
        testsByType[testType].push(clinicalTest);

        console.log(`   ✓ Test ${testId}: ${testType} (${state}) - ${clinicalTest.tokenAllocation} CTBAL`);

      } catch (error) {
        console.log(`   ❌ Test ${testId}: Error retrieving data - ${error}`);
      }
    }

    // Generate comprehensive analysis
    console.log("\n📈 DATA ANALYSIS BY STATE:");
    console.log("==========================");
    Object.entries(testsByState).forEach(([state, tests]) => {
      const totalTokens = tests.reduce((sum, test) => sum + parseFloat(test.tokenAllocation), 0);
      const avgTokens = totalTokens / tests.length;
      
      console.log(`🏛️  ${state}:`);
      console.log(`   Tests: ${tests.length}`);
      console.log(`   Total Tokens: ${totalTokens.toFixed(2)} CTBAL`);
      console.log(`   Average per Test: ${avgTokens.toFixed(2)} CTBAL`);
      console.log(`   Age Categories: ${[...new Set(tests.map(t => t.ageCategory))].join(', ')}`);
      console.log("");
    });

    console.log("🧪 DATA ANALYSIS BY TEST TYPE:");
    console.log("===============================");
    Object.entries(testsByType).forEach(([type, tests]) => {
      const totalTokens = tests.reduce((sum, test) => sum + parseFloat(test.tokenAllocation), 0);
      console.log(`📋 ${type}:`);
      console.log(`   Count: ${tests.length} tests`);
      console.log(`   Total Allocation: ${totalTokens.toFixed(2)} CTBAL`);
      console.log(`   States: ${[...new Set(tests.map(t => t.state))].join(', ')}`);
      console.log("");
    });

    // Check for Delaware data specifically
    console.log("🔎 DELAWARE DATA SEARCH:");
    console.log("=========================");
    const delawareTests = allTests.filter(test => 
      test.state === 'Delaware' || 
      test.testType.toLowerCase().includes('delaware') ||
      test.dataHash.toLowerCase().includes('delaware') ||
      test.patient.toLowerCase().includes('delaware')
    );

    if (delawareTests.length > 0) {
      console.log(`✅ Found ${delawareTests.length} Delaware-related tests:`);
      delawareTests.forEach(test => {
        console.log(`   📋 Test ${test.id}: ${test.testType}`);
        console.log(`      Patient: ${test.patient}`);
        console.log(`      Tokens: ${test.tokenAllocation} CTBAL`);
        console.log(`      Data Hash: ${test.dataHash}`);
        console.log(`      Timestamp: ${new Date(test.timestamp * 1000).toLocaleString()}`);
        console.log("");
      });
    } else {
      console.log("❌ No Delaware-specific data found in current blockchain state");
      console.log("   Current data appears to be primarily Wyoming-based");
    }

    // Save complete dataset to files
    console.log("💾 SAVING EXTRACTED DATA:");
    console.log("==========================");
    
    // Save as JSON
    const dataExport = {
      exportTimestamp: new Date().toISOString(),
      totalTests: allTests.length,
      totalTokenAllocation: allTests.reduce((sum, test) => sum + parseFloat(test.tokenAllocation), 0),
      contracts: SEPOLIA_CONTRACTS,
      stateBreakdown: testsByState,
      typeBreakdown: testsByType,
      allTests: allTests
    };

    fs.writeFileSync('blockchain-data-export.json', JSON.stringify(dataExport, null, 2));
    console.log("✅ Complete data exported to: blockchain-data-export.json");

    // Save as CSV
    const csvHeader = 'ID,TestType,State,AgeCategory,Patient,TokenAllocation,Validated,Completed,Timestamp,DataHash,MetadataHash\n';
    const csvRows = allTests.map(test => 
      `${test.id},"${test.testType}","${test.state}","${test.ageCategory}","${test.patient}","${test.tokenAllocation}",${test.validated},${test.completed},${test.timestamp},"${test.dataHash}","${test.metadataHash}"`
    ).join('\n');
    
    fs.writeFileSync('blockchain-data-export.csv', csvHeader + csvRows);
    console.log("✅ CSV export created: blockchain-data-export.csv");

    // Generate query commands for external tools
    console.log("\n🛠️  EXTERNAL QUERY METHODS:");
    console.log("============================");
    console.log("📱 Etherscan Direct Queries:");
    console.log(`   Contract: https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.CTBALToken}#readContract`);
    console.log(`   Function: getClinicalTest(uint256 testId)`);
    console.log(`   Test IDs: 1 through ${totalTests}`);
    console.log("");
    
    console.log("💻 Web3 JavaScript Query:");
    console.log(`   const contract = new web3.eth.Contract(abi, "${SEPOLIA_CONTRACTS.CTBALToken}");`);
    console.log(`   const test = await contract.methods.getClinicalTest(1).call();`);
    console.log("");
    
    console.log("🔧 Cast CLI Query (Foundry):");
    console.log(`   cast call ${SEPOLIA_CONTRACTS.CTBALToken} "getClinicalTest(uint256)" 1 --rpc-url $SEPOLIA_URL`);
    console.log("");

    return allTests;

  } catch (error) {
    console.error("❌ Query failed:", error);
    throw error;
  }
}

async function main() {
  console.log("🎯 BLOCKCHAIN CONTENT EXTRACTION TOOL");
  console.log("=====================================\n");
  
  const allTests = await queryAllBlockchainContents();
  
  console.log(`\n✅ EXTRACTION COMPLETE!`);
  console.log(`📊 Total Tests Extracted: ${allTests.length}`);
  console.log(`💾 Data Files Generated: blockchain-data-export.json, blockchain-data-export.csv`);
  console.log(`🔍 All blockchain contents are now available for analysis`);
  
  // Final Delaware-specific search
  const delawareCount = allTests.filter(t => t.state === 'Delaware').length;
  console.log(`🏛️  Delaware Data Found: ${delawareCount} tests`);
}

main().catch(console.error);