import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

// Load contract artifacts
import CTBALTokenArtifact from '../artifacts/contracts/CTBALToken.sol/CTBALToken.json' assert { type: "json" };

dotenv.config();

const SEPOLIA_CONTRACTS = {
  CTBALToken: "0xcfab0ab01fd1a4a72601dd30da96fc13b0403246" as `0x${string}`,
};

async function comprehensiveStatusCheck() {
  console.log("🔍 COMPREHENSIVE DEPLOYMENT STATUS CHECK");
  console.log("========================================\n");

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_URL),
  });

  try {
    // Check multiple high-value test IDs
    console.log("📊 Testing High-Value Test IDs:");
    const testIds = [5450, 6000, 7000, 8000, 9000, 9346, 9380, 10000];
    
    let maxFoundId = 0;
    let lastWorkingId = 0;
    
    for (const testId of testIds) {
      try {
        const test = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.CTBALToken,
          abi: CTBALTokenArtifact.abi,
          functionName: 'getClinicalTest',
          args: [BigInt(testId)],
        }) as any[];
        
        maxFoundId = Math.max(maxFoundId, testId);
        lastWorkingId = testId;
        console.log(`   ✅ Test ${testId}: ${test[1]} EXISTS`);
      } catch (error) {
        console.log(`   ❌ Test ${testId}: DOES NOT EXIST`);
      }
    }
    
    console.log(`\n🎯 Highest Confirmed Test ID: ${maxFoundId}`);
    
    // Binary search for exact highest ID
    if (maxFoundId > 0) {
      console.log("\n🔍 Binary Search for Exact Maximum:");
      
      let low = maxFoundId;
      let high = maxFoundId + 5000; // Search beyond our highest found
      let exactMax = maxFoundId;
      
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        try {
          await publicClient.readContract({
            address: SEPOLIA_CONTRACTS.CTBALToken,
            abi: CTBALTokenArtifact.abi,
            functionName: 'getClinicalTest',
            args: [BigInt(mid)],
          });
          // Test exists
          exactMax = mid;
          low = mid + 1;
        } catch (error) {
          // Test doesn't exist
          high = mid - 1;
        }
      }
      
      console.log(`   📊 Exact Maximum Test ID: ${exactMax}`);
      
      // Get details of the final tests
      console.log("\n🏁 Final Tests Details:");
      for (let i = Math.max(1, exactMax - 5); i <= exactMax; i++) {
        try {
          const test = await publicClient.readContract({
            address: SEPOLIA_CONTRACTS.CTBALToken,
            abi: CTBALTokenArtifact.abi,
            functionName: 'getClinicalTest',
            args: [BigInt(i)],
          }) as any[];
          
          console.log(`   Test ${i}: ${test[1]} (${test[9]} tokens)`);
        } catch (error) {
          console.log(`   Test ${i}: ERROR`);
        }
      }
    }

  } catch (error) {
    console.error("❌ Error in status check:", error);
  }
}

comprehensiveStatusCheck().catch(console.error);