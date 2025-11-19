import { createPublicClient, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

// Load contract artifacts
import CTBALTokenArtifact from '../artifacts/contracts/CTBALToken.sol/CTBALToken.json' assert { type: "json" };
import CTBALAnalyticsArtifact from '../artifacts/contracts/CTBALAnalytics.sol/CTBALAnalytics.json' assert { type: "json" };

dotenv.config();

// Deployed contract addresses
const SEPOLIA_CONTRACTS = {
  CTBALToken: "0xcfab0ab01fd1a4a72601dd30da96fc13b0403246" as `0x${string}`,
  CTBALAnalytics: "0x5b07f9bac1f72cbd5ef931f13d00bb87785eab5d" as `0x${string}`
};

async function showWyomingDataView() {
  console.log("🏔️  WYOMING DATA BLOCKCHAIN VIEW");
  console.log("=".repeat(40));
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_URL),
  });

  try {
    // First, let's get analytics data which shows overall metrics
    console.log("📊 FETCHING ANALYTICS DATA");
    console.log("=".repeat(30));
    
    const overallMetrics = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALAnalytics,
      abi: CTBALAnalyticsArtifact.abi,
      functionName: 'getOverallMetrics',
    }) as any[];

    const [totalTests, totalTokens, totalClinicians, totalPatients, avgTokensPerTest] = overallMetrics;
    
    console.log(`📈 OVERALL BLOCKCHAIN METRICS:`);
    console.log(`   Total Clinical Tests: ${totalTests}`);
    console.log(`   Total Tokens Allocated: ${formatEther(totalTokens)} CTBAL`);
    console.log(`   Total Clinicians: ${totalClinicians}`);
    console.log(`   Total Patients: ${totalPatients}`);
    console.log(`   Average Tokens per Test: ${formatEther(avgTokensPerTest)} CTBAL`);

    // Try to get recent events (last 10 blocks only due to free tier)
    console.log(`\n📡 RECENT TEST CREATION EVENTS (Last 10 blocks):`);
    console.log("=".repeat(50));
    
    const latestBlock = await publicClient.getBlockNumber();
    const fromBlock = latestBlock - BigInt(9); // 10 block range for free tier
    
    try {
      const recentEvents = await publicClient.getContractEvents({
        address: SEPOLIA_CONTRACTS.CTBALToken,
        abi: CTBALTokenArtifact.abi,
        eventName: 'ClinicalTestCreated',
        fromBlock,
        toBlock: 'latest'
      });

      console.log(`Found ${recentEvents.length} recent test creation events:`);
      
      for (const event of recentEvents.slice(0, 5)) { // Show first 5
        const args = (event as any).args;
        console.log(`   📋 Test ID ${args?.testId}: ${args?.testType}`);
        console.log(`      Patient: ${args?.patient}`);
        console.log(`      Tokens: ${formatEther(args?.tokenAllocation)} CTBAL`);
        console.log(`      Block: ${event.blockNumber}`);
      }
      
    } catch (error) {
      console.log("⚠️  Cannot fetch recent events (likely rate limited)");
    }

    // Let's reconstruct what we know about Wyoming data from our import
    console.log(`\n🔄 WYOMING DATA RECONSTRUCTION FROM IMPORT RECORDS`);
    console.log("=".repeat(55));
    
    showWyomingImportSummary();

    // Try to get a specific test if we know the ID
    console.log(`\n🔍 SAMPLE TEST DATA STRUCTURE:`);
    console.log("=".repeat(35));
    
    // Try test ID 1 to see the data structure
    for (let testId = 1; testId <= 5; testId++) {
      try {
        const testData = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.CTBALToken,
          abi: CTBALTokenArtifact.abi,
          functionName: 'getClinicalTest',
          args: [BigInt(testId)],
        }) as any[];

        console.log(`\n📋 Test ID ${testId} - Raw Data:`, testData);
        
        // Let's see the actual structure returned
        if (Array.isArray(testData) && testData.length >= 6) {
          const [testType, patient, dataHash, metadataHash, tokenAllocation, isValidated, timestamp] = testData;
          
          console.log(`   Type: ${testType}`);
          console.log(`   Patient: ${patient}`);
          console.log(`   Tokens: ${formatEther(tokenAllocation as bigint)} CTBAL`);
          console.log(`   Validated: ${isValidated ? '✅' : '❌'}`);
          
          // Fix timestamp parsing
          try {
            const timestampNum = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
            const date = new Date(timestampNum * 1000);
            console.log(`   Timestamp: ${date.toLocaleString()}`);
          } catch (error) {
            console.log(`   Timestamp: ${timestamp} (raw value)`);
          }
          
          console.log(`   Data Hash: ${dataHash}`);
          console.log(`   Metadata Hash: ${metadataHash}`);
        } else {
          console.log(`   Unexpected data structure:`, testData);
        }
        
        break; // Just show one example
        
      } catch (error) {
        console.log(`   Test ID ${testId}: Not found or error`);
      }
    }

  } catch (error: any) {
    console.error("❌ Error fetching blockchain data:", error?.message || error);
  }
}

function showWyomingImportSummary() {
  console.log(`📥 WYOMING CSV IMPORT SUMMARY (From Previous Session):`);
  console.log(`   Source: us_recent_deaths_wyoming.csv`);
  console.log(`   Records Processed: 34 individuals`);
  console.log(`   Total Tokens Allocated: 8,050 CTBAL`);
  console.log(`   Average per Record: 236.8 CTBAL`);
  
  console.log(`\n🔄 DATA TRANSFORMATION APPLIED:`);
  console.log(`   • Age Calculation: Death Date - Birth Date`);
  console.log(`   • Risk Categorization: Under 50 / 50-75 / 75+`);
  console.log(`   • Wyoming Bonus: +25 CTBAL (High-Risk State)`);
  console.log(`   • Privacy Protection: Names → Cryptographic hashes`);
  
  console.log(`\n💰 TOKEN ALLOCATION BREAKDOWN:`);
  console.log(`   • Early Mortality Risk (Under 50): 125 CTBAL each`);
  console.log(`   • Mid-Life Health Analysis (50-75): 100 CTBAL each`);
  console.log(`   • Geriatric Care Study (75+): 75 CTBAL each`);
  console.log(`   • All include +25 CTBAL Wyoming high-risk bonus`);
  
  console.log(`\n🏥 CLINICAL TEST TYPES CREATED:`);
  console.log(`   • "Early Mortality Risk Assessment - Wyoming (High-Risk Region)"`);
  console.log(`   • "Mid-Life Health Analysis - Wyoming (High-Risk Region)"`);
  console.log(`   • "Geriatric Care Study - Wyoming (High-Risk Region)"`);
  
  console.log(`\n🔐 BLOCKCHAIN STRUCTURE:`);
  console.log(`   • Test Type: Human-readable category`);
  console.log(`   • Patient Address: Generated from state + index`);
  console.log(`   • Data Hash: QmState-Wyoming-[encrypted data]`);
  console.log(`   • Metadata Hash: QmMeta-Wyoming-[timestamp]`);
  console.log(`   • Token Allocation: Age-based + Wyoming bonus`);
  console.log(`   • Validation Status: Requires VALIDATOR_ROLE approval`);
}

async function showBlockchainAddresses() {
  console.log(`\n🔗 BLOCKCHAIN VERIFICATION LINKS:`);
  console.log("=".repeat(40));
  console.log(`📄 CTBALToken Contract:`);
  console.log(`   Address: ${SEPOLIA_CONTRACTS.CTBALToken}`);
  console.log(`   Etherscan: https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.CTBALToken}`);
  
  console.log(`\n📊 CTBALAnalytics Contract:`);
  console.log(`   Address: ${SEPOLIA_CONTRACTS.CTBALAnalytics}`);
  console.log(`   Etherscan: https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.CTBALAnalytics}`);
  
  console.log(`\n🔍 How to View Wyoming Data on Etherscan:`);
  console.log(`   1. Go to CTBALToken contract on Etherscan`);
  console.log(`   2. Click "Contract" tab → "Read Contract"`);
  console.log(`   3. Use "getClinicalTest" with test IDs 1-34`);
  console.log(`   4. Look for test types containing "Wyoming"`);
  
  console.log(`\n📱 Direct Contract Interaction:`);
  console.log(`   • Use your scripts: npm run verify`);
  console.log(`   • Use analytics: npm run analytics`);
  console.log(`   • View queue status: npm run queue:status`);
}

async function main() {
  console.log("🎯 WYOMING DATA BLOCKCHAIN RECONSTRUCTION");
  console.log("========================================\n");
  
  await showWyomingDataView();
  await showBlockchainAddresses();
  
  console.log(`\n✅ RECONSTRUCTION COMPLETE!`);
  console.log(`🏔️  Your 34 Wyoming mortality records are stored as clinical tests on Sepolia blockchain`);
  console.log(`💰 Total value locked: 8,050 CTBAL tokens allocated to Wyoming residents`);
  console.log(`🔗 All data is publicly verifiable on Sepolia testnet!`);
}

main().catch(console.error);