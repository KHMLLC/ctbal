import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

// Load contract artifacts
import CTBALTokenArtifact from '../artifacts/contracts/CTBALToken.sol/CTBALToken.json' assert { type: "json" };

dotenv.config();

// Deployed contract addresses
const SEPOLIA_CONTRACTS = {
  CTBALToken: "0xcfab0ab01fd1a4a72601dd30da96fc13b0403246" as `0x${string}`,
  CTBALAnalytics: "0x5b07f9bac1f72cbd5ef931f13d00bb87785eab5d" as `0x${string}`
};

async function verifyDeployment() {
  console.log("🔍 DIRECT CONTRACT VERIFICATION");
  console.log("===============================\n");

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_URL),
  });

  try {
    // Try to find the highest test ID by binary search approach
    console.log("📊 Finding Highest Test ID (since no public counter)...");
    
    let maxTestId = 0;
    let searchLimit = 50000; // Start with a reasonable upper bound
    
    // Binary search to find the highest test ID
    let low = 1;
    let high = searchLimit;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      try {
        await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.CTBALToken,
          abi: CTBALTokenArtifact.abi,
          functionName: 'getClinicalTest',
          args: [BigInt(mid)],
        });
        // Test exists, search higher
        maxTestId = mid;
        low = mid + 1;
      } catch (error) {
        // Test doesn't exist, search lower
        high = mid - 1;
      }
    }
    
    console.log(`   Highest Test ID Found: ${maxTestId}`);

    // Get the last few test details
    console.log("\n🧪 Getting Latest Test Details:");
    
    const totalTests = maxTestId;
    const startFrom = Math.max(1, totalTests - 10);
    
    for (let i = startFrom; i <= totalTests; i++) {
      try {
        const test = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.CTBALToken,
          abi: CTBALTokenArtifact.abi,
          functionName: 'getClinicalTest',
          args: [BigInt(i)],
        }) as any[];
        
        console.log(`   Test ${i}: ${test[1]} (${test[6]} CTBAL tokens)`);
      } catch (error) {
        console.log(`   Test ${i}: Error reading test`);
      }
    }

    // Check some tests from the middle range
    console.log("\n🎯 Checking Some Middle-Range Tests:");
    const midRange = [1000, 5000, 9000];
    
    for (const testId of midRange) {
      if (testId <= totalTests) {
        try {
          const test = await publicClient.readContract({
            address: SEPOLIA_CONTRACTS.CTBALToken,
            abi: CTBALTokenArtifact.abi,
            functionName: 'getClinicalTest',
            args: [BigInt(testId)],
          }) as any[];
          
          console.log(`   Test ${testId}: ${test[1]} (${test[6]} CTBAL tokens)`);
        } catch (error) {
          console.log(`   Test ${testId}: Error reading test`);
        }
      }
    }

  } catch (error) {
    console.error("❌ Error verifying deployment:", error);
  }
}

verifyDeployment().catch(console.error);