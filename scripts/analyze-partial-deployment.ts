import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

// Load contract artifacts
import CTBALTokenArtifact from '../artifacts/contracts/CTBALToken.sol/CTBALToken.json' assert { type: "json" };

dotenv.config();

const SEPOLIA_CONTRACTS = {
  CTBALToken: "0xcfab0ab01fd1a4a72601dd30da96fc13b0403246" as `0x${string}`,
};

async function analyzePartialDeployment() {
  console.log("📊 ANALYZING PARTIAL DEPLOYMENT");
  console.log("===============================\n");

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_URL),
  });

  try {
    // Test various ranges to understand deployment progress
    console.log("🔍 Testing Deployment Ranges:");
    
    const testRanges = [
      { name: "Early Tests", start: 1, end: 100 },
      { name: "Original Wyoming", start: 1, end: 34 },
      { name: "Alabama Range", start: 35, end: 870 }, // Expected Alabama range from our analysis
      { name: "Mid Range", start: 1000, end: 1100 },
      { name: "Later Range", start: 3000, end: 3100 },
      { name: "End Range", start: 3550, end: 3580 },
      { name: "Expected End", start: 9300, end: 9380 }
    ];

    for (const range of testRanges) {
      console.log(`\n📋 ${range.name} (Tests ${range.start}-${range.end}):`);
      
      let existCount = 0;
      let sampleTests: any[] = [];
      
      for (let testId = range.start; testId <= range.end && sampleTests.length < 5; testId++) {
        try {
          const test = await publicClient.readContract({
            address: SEPOLIA_CONTRACTS.CTBALToken,
            abi: CTBALTokenArtifact.abi,
            functionName: 'getClinicalTest',
            args: [BigInt(testId)],
          }) as any[];
          
          existCount++;
          if (sampleTests.length < 3) {
            sampleTests.push({ id: testId, testType: test[1], tokens: test[9] });
          }
        } catch (error) {
          // Test doesn't exist, continue
          if (testId <= range.start + 10) {
            // Only break early if we're in the first 10 of the range
            break;
          }
        }
      }
      
      console.log(`   📊 Found ${existCount} tests in this range`);
      sampleTests.forEach(test => {
        console.log(`   ✓ Test ${test.id}: ${test.testType} (${test.tokens} tokens)`);
      });
    }

    // Analyze state distribution in the deployed data
    console.log("\n🌍 STATE DISTRIBUTION ANALYSIS:");
    
    const stateCounts: { [key: string]: number } = {};
    const sampleSize = 100; // Sample every 10th test to get distribution
    
    for (let testId = 35; testId <= 3574; testId += Math.floor(3540 / sampleSize)) {
      try {
        const test = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.CTBALToken,
          abi: CTBALTokenArtifact.abi,
          functionName: 'getClinicalTest',
          args: [BigInt(testId)],
        }) as any[];
        
        const testType = test[1] as string;
        const stateMatch = testType.match(/- ([A-Za-z ]+)$/);
        if (stateMatch) {
          const state = stateMatch[1];
          stateCounts[state] = (stateCounts[state] || 0) + 1;
        }
      } catch (error) {
        // Skip failed tests
      }
    }
    
    console.log("   📍 States found in deployment:");
    Object.entries(stateCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([state, count]) => {
        console.log(`   ${state}: ${count} samples`);
      });

  } catch (error) {
    console.error("❌ Error analyzing deployment:", error);
  }
}

analyzePartialDeployment().catch(console.error);