import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

// Load contract artifacts
import CTBALTokenArtifact from '../artifacts/contracts/CTBALToken.sol/CTBALToken.json' assert { type: "json" };

dotenv.config();

const SEPOLIA_CONTRACTS = {
  CTBALToken: "0xcfab0ab01fd1a4a72601dd30da96fc13b0403246" as `0x${string}`,
};

async function analyzeStateProgress() {
  console.log("🌍 ANALYZING STATE DEPLOYMENT PROGRESS");
  console.log("======================================\n");

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_URL),
  });

  try {
    // Sample across the deployed range to see state distribution
    console.log("📊 Sampling State Distribution (every 100th test):");
    
    const stateCounts: { [key: string]: number } = {};
    const statesFound = new Set<string>();
    
    for (let testId = 35; testId <= 5450; testId += 100) {
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
          statesFound.add(state);
        }
      } catch (error) {
        // Skip failed tests
      }
    }
    
    const statesList = Array.from(statesFound).sort();
    console.log(`\n📍 States Deployed: ${statesList.length} states`);
    statesList.forEach(state => {
      console.log(`   ✅ ${state}`);
    });
    
    // Check boundary tests to see where each state starts/ends
    console.log("\n🔍 Checking State Boundaries:");
    
    const boundaryTests = [1, 34, 35, 870, 1271, 2000, 3000, 4000, 5000, 5450];
    
    for (const testId of boundaryTests) {
      try {
        const test = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.CTBALToken,
          abi: CTBALTokenArtifact.abi,
          functionName: 'getClinicalTest',
          args: [BigInt(testId)],
        }) as any[];
        
        const testType = test[1] as string;
        const stateMatch = testType.match(/- ([A-Za-z ]+)$/);
        const state = stateMatch ? stateMatch[1] : 'Unknown';
        console.log(`   Test ${testId}: ${state}`);
      } catch (error) {
        console.log(`   Test ${testId}: ERROR`);
      }
    }
    
    // Expected states list for comparison
    const expectedStates = [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", 
      "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia", 
      "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", 
      "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", 
      "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", 
      "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", 
      "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Puerto Rico", "Rhode Island", 
      "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", 
      "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
    ];
    
    console.log(`\n📋 Expected Total States: ${expectedStates.length}`);
    console.log(`📊 Actually Deployed: ${statesFound.size}`);
    console.log(`🎯 Completion Rate: ${((statesFound.size / expectedStates.length) * 100).toFixed(1)}%`);
    
    const missingStates = expectedStates.filter(state => !statesFound.has(state));
    if (missingStates.length > 0) {
      console.log(`\n❌ Missing States (${missingStates.length}):`);
      missingStates.forEach(state => console.log(`   • ${state}`));
    }

  } catch (error) {
    console.error("❌ Error analyzing state progress:", error);
  }
}

analyzeStateProgress().catch(console.error);