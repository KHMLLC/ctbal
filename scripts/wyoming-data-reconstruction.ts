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

async function reconstructWyomingData() {
  console.log("🔍 RECONSTRUCTING WYOMING BLOCKCHAIN DATA");
  console.log("==========================================");
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_URL),
  });

  try {
    // Get ClinicalTestCreated events to find all tests
    console.log("📡 Fetching ClinicalTestCreated events from blockchain...");
    
    const events = await publicClient.getContractEvents({
      address: SEPOLIA_CONTRACTS.CTBALToken,
      abi: CTBALTokenArtifact.abi,
      eventName: 'ClinicalTestCreated',
      fromBlock: 'earliest',
      toBlock: 'latest'
    });

    console.log(`📊 Total Clinical Test Events Found: ${events.length}`);

    // Reconstruct each test record
    const wyomingTests = [];
    
    for (const event of events) {
      const testId = (event as any).args?.testId;
      if (!testId) continue;
      
      try {
        // Get test details from blockchain
        const testDetails = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.CTBALToken,
          abi: CTBALTokenArtifact.abi,
          functionName: 'getClinicalTest',
          args: [BigInt(testId)],
        }) as any[];

        // Parse the returned tuple
        const [testType, patient, dataHash, metadataHash, tokenAllocation, isValidated, timestamp] = testDetails;

        // Decode the original data from hash patterns
        const originalData = decodeDataFromHash(dataHash as string, metadataHash as string, testType as string);

        const testRecord = {
          testId: Number(testId),
          testType: testType as string,
          patient: patient as string,
          dataHash: dataHash as string,
          metadataHash: metadataHash as string,
          tokenAllocation: formatEther(tokenAllocation as bigint),
          isValidated: isValidated as boolean,
          timestamp: new Date(Number(timestamp as bigint) * 1000).toISOString(),
          reconstructedData: originalData
        };

        // Filter for Wyoming data (based on test type and data patterns)
        if (testRecord.testType.includes('Wyoming') || testRecord.dataHash.includes('Wyoming')) {
          wyomingTests.push(testRecord);
        }

      } catch (error: any) {
        console.log(`⚠️  Could not retrieve test ${testId}: ${error?.message || 'Unknown error'}`);
      }
    }

    console.log(`\n🏔️  WYOMING DATA FOUND: ${wyomingTests.length} records`);
    console.log("=" .repeat(60));

    // Display each Wyoming record
    wyomingTests.forEach((test, index) => {
      console.log(`\n📋 Record ${index + 1} (Test ID: ${test.testId})`);
      console.log(`   Test Type: ${test.testType}`);
      console.log(`   Patient Address: ${test.patient}`);
      console.log(`   Token Allocation: ${test.tokenAllocation} CTBAL`);
      console.log(`   Validated: ${test.isValidated ? '✅ Yes' : '❌ No'}`);
      console.log(`   Timestamp: ${test.timestamp}`);
      console.log(`   Data Hash: ${test.dataHash}`);
      console.log(`   Metadata Hash: ${test.metadataHash}`);
      
      if (test.reconstructedData) {
        console.log(`   📊 Reconstructed Original Data:`);
        Object.entries(test.reconstructedData).forEach(([key, value]) => {
          console.log(`      ${key}: ${value}`);
        });
      }
    });

    // Calculate Wyoming statistics
    const totalWyomingTokens = wyomingTests.reduce((sum, test) => sum + parseFloat(test.tokenAllocation), 0);
    const avgTokensPerTest = totalWyomingTokens / wyomingTests.length;
    
    console.log(`\n💰 WYOMING STATISTICS`);
    console.log("=".repeat(30));
    console.log(`Total Records: ${wyomingTests.length}`);
    console.log(`Total Tokens Allocated: ${totalWyomingTokens.toFixed(2)} CTBAL`);
    console.log(`Average Tokens per Test: ${avgTokensPerTest.toFixed(2)} CTBAL`);
    console.log(`Validation Rate: ${(wyomingTests.filter(t => t.isValidated).length / wyomingTests.length * 100).toFixed(1)}%`);

    // Show test type breakdown
    const testTypeBreakdown = wyomingTests.reduce((acc: Record<string, number>, test) => {
      acc[test.testType] = (acc[test.testType] || 0) + 1;
      return acc;
    }, {});

    console.log(`\n🧪 TEST TYPE BREAKDOWN`);
    console.log("=".repeat(30));
    Object.entries(testTypeBreakdown).forEach(([type, count]) => {
      console.log(`${type}: ${count} records`);
    });

    return wyomingTests;

  } catch (error) {
    console.error("❌ Error reconstructing Wyoming data:", error);
    return [];
  }
}

function decodeDataFromHash(dataHash: string, metadataHash: string, testType: string) {
  // Decode patterns based on how data was originally encoded
  try {
    // Extract information from the hash patterns we used during encoding
    const hashParts = dataHash.split('-');
    
    if (hashParts.length >= 3 && hashParts[0] === 'QmState') {
      const state = hashParts[1];
      
      // Reconstruct age group from test type
      let ageGroup = 'Unknown';
      let riskCategory = 'Standard';
      
      if (testType.includes('Early Mortality Risk')) {
        ageGroup = 'Under 50';
      } else if (testType.includes('Mid-Life Health')) {
        ageGroup = '50-75';
      } else if (testType.includes('Geriatric Care')) {
        ageGroup = '75+';
      }
      
      if (testType.includes('High-Risk Region')) {
        riskCategory = 'High-Risk (Wyoming Bonus)';
      }

      return {
        state: state,
        ageGroup: ageGroup,
        riskCategory: riskCategory,
        dataSource: 'Wyoming Mortality Records',
        encodingMethod: 'CTBAL Clinical Test Mapping'
      };
    }

    return {
      note: 'Data encoded in blockchain hash - original CSV data not directly recoverable',
      dataHash: dataHash,
      metadataHash: metadataHash
    };

  } catch (error) {
    return {
      error: 'Could not decode hash',
      dataHash: dataHash
    };
  }
}

async function showOriginalWyomingMapping() {
  console.log(`\n🔄 HOW WYOMING DATA WAS MAPPED TO BLOCKCHAIN`);
  console.log("=".repeat(50));
  
  console.log(`📥 Original CSV Format:`);
  console.log(`   Name,City,County,State,Birth Date,Death Date`);
  console.log(`   John Doe,Cheyenne,Laramie,Wyoming,1950-03-15,2024-10-01`);
  
  console.log(`\n🔄 Transformation Process:`);
  console.log(`   1. Calculate Age: Death Date - Birth Date = Age at Death`);
  console.log(`   2. Categorize by Age:`);
  console.log(`      • Under 50 → Early Mortality Risk Assessment`);
  console.log(`      • 50-75 → Mid-Life Health Analysis`);
  console.log(`      • 75+ → Geriatric Care Study`);
  console.log(`   3. Apply Wyoming Bonus: +25 CTBAL (High-Risk State)`);
  console.log(`   4. Generate Unique Patient Address from state + index`);
  console.log(`   5. Create IPFS-style hashes for data/metadata`);
  
  console.log(`\n💰 Token Allocation Logic:`);
  console.log(`   • Base Amount: 50-100 CTBAL (age-dependent)`);
  console.log(`   • Wyoming Bonus: +25 CTBAL (high-risk region)`);
  console.log(`   • Final Range: 75-125 CTBAL per record`);
  
  console.log(`\n🔐 Privacy Protection:`);
  console.log(`   • Personal data (names) → Cryptographic hashes`);
  console.log(`   • Only statistical patterns stored on-chain`);
  console.log(`   • Original CSV data not recoverable from blockchain`);
}

async function main() {
  console.log("🏔️  WYOMING DATA BLOCKCHAIN RECONSTRUCTION");
  console.log("============================================\n");
  
  const wyomingData = await reconstructWyomingData();
  
  if (wyomingData.length > 0) {
    await showOriginalWyomingMapping();
    
    console.log(`\n✅ SUCCESS: Found ${wyomingData.length} Wyoming records on Sepolia blockchain`);
    console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.CTBALToken}`);
  } else {
    console.log(`❌ No Wyoming data found. This might indicate:`);
    console.log(`   • Data not yet submitted to blockchain`);
    console.log(`   • Different test naming convention used`);
    console.log(`   • Contract address incorrect`);
  }
}

main().catch(console.error);