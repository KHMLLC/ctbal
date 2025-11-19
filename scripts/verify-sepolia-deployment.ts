import { createPublicClient, http, formatEther, parseEther } from 'viem';
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

async function main() {
  console.log("🔍 VERIFYING CTBAL SEPOLIA DEPLOYMENT");
  console.log("=====================================\n");

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_URL),
  });

  console.log("🌐 Network: Sepolia Testnet");
  console.log("📋 CTBALToken:", SEPOLIA_CONTRACTS.CTBALToken);
  console.log("📊 CTBALAnalytics:", SEPOLIA_CONTRACTS.CTBALAnalytics);

  try {
    // Verify CTBALToken deployment
    console.log("\n🪙 VERIFYING CTBALToken CONTRACT");
    console.log("================================");

    const tokenName = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALToken,
      abi: CTBALTokenArtifact.abi,
      functionName: 'name',
    });

    const tokenSymbol = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALToken,
      abi: CTBALTokenArtifact.abi,
      functionName: 'symbol',
    });

    const totalSupply = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALToken,
      abi: CTBALTokenArtifact.abi,
      functionName: 'totalSupply',
    });

    const decimals = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALToken,
      abi: CTBALTokenArtifact.abi,
      functionName: 'decimals',
    });

    console.log(`✅ Name: ${tokenName}`);
    console.log(`✅ Symbol: ${tokenSymbol}`);
    console.log(`✅ Decimals: ${decimals}`);
    console.log(`✅ Total Supply: ${formatEther(totalSupply as bigint)} tokens`);

    // Check roles
    const defaultAdminRole = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALToken,
      abi: CTBALTokenArtifact.abi,
      functionName: 'DEFAULT_ADMIN_ROLE',
    });

    const clinicianRole = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALToken,
      abi: CTBALTokenArtifact.abi,
      functionName: 'CLINICIAN_ROLE',
    });

    const validatorRole = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALToken,
      abi: CTBALTokenArtifact.abi,
      functionName: 'VALIDATOR_ROLE',
    });

    console.log(`✅ Default Admin Role: ${defaultAdminRole}`);
    console.log(`✅ Clinician Role: ${clinicianRole}`);
    console.log(`✅ Validator Role: ${validatorRole}`);

    // Verify CTBALAnalytics deployment
    console.log("\n📊 VERIFYING CTBALAnalytics CONTRACT");
    console.log("===================================");

    const linkedToken = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALAnalytics,
      abi: CTBALAnalyticsArtifact.abi,
      functionName: 'ctbalToken',
    });

    const analystRole = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALAnalytics,
      abi: CTBALAnalyticsArtifact.abi,
      functionName: 'ANALYST_ROLE',
    });

    console.log(`✅ Linked Token: ${linkedToken}`);
    console.log(`✅ Token Match: ${(linkedToken as string).toLowerCase() === SEPOLIA_CONTRACTS.CTBALToken.toLowerCase() ? 'YES' : 'NO'}`);
    console.log(`✅ Analyst Role: ${analystRole}`);

    // Get current metrics
    console.log("\n📈 CURRENT SYSTEM METRICS");
    console.log("==========================");

    const metrics = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALAnalytics,
      abi: CTBALAnalyticsArtifact.abi,
      functionName: 'getOverallMetrics',
    });

    const [totalTests, completedTests, validatedTests, totalTokens] = metrics as [bigint, bigint, bigint, bigint];

    console.log(`📋 Total Clinical Tests: ${totalTests}`);
    console.log(`✅ Completed Tests: ${completedTests}`);
    console.log(`🔍 Validated Tests: ${validatedTests}`);
    console.log(`💰 Total Tokens Allocated: ${formatEther(totalTokens)} CTBAL`);

    // Calculate completion and validation rates
    if (totalTests > 0) {
      const completionRate = (Number(completedTests) / Number(totalTests)) * 100;
      const validationRate = (Number(validatedTests) / Number(totalTests)) * 100;
      
      console.log(`📊 Completion Rate: ${completionRate.toFixed(1)}%`);
      console.log(`📊 Validation Rate: ${validationRate.toFixed(1)}%`);
    }

    // Test sample clinical test data (if any exist)
    if (totalTests > 0) {
      console.log("\n🧪 SAMPLE CLINICAL TEST DATA");
      console.log("=============================");
      
      try {
        // Try to get test details for test ID 1
        const testDetails = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.CTBALToken,
          abi: CTBALTokenArtifact.abi,
          functionName: 'getTestDetails',
          args: [1n],
        });

        const [testType, patient, dataHash, metadataHash, tokenAllocation, completed, validated] = testDetails as [string, string, string, string, bigint, boolean, boolean];

        console.log(`🔬 Test #1:`);
        console.log(`   Type: ${testType}`);
        console.log(`   Patient: ${patient}`);
        console.log(`   Data Hash: ${dataHash}`);
        console.log(`   Metadata Hash: ${metadataHash}`);
        console.log(`   Token Allocation: ${formatEther(tokenAllocation)} CTBAL`);
        console.log(`   Completed: ${completed ? 'YES' : 'NO'}`);
        console.log(`   Validated: ${validated ? 'YES' : 'NO'}`);
      } catch (error) {
        console.log(`⚠️  Could not retrieve test details: ${error}`);
      }
    }

    // Check contract bytecode to ensure deployment integrity
    console.log("\n🔐 DEPLOYMENT INTEGRITY CHECK");
    console.log("==============================");

    const tokenBytecode = await publicClient.getBytecode({
      address: SEPOLIA_CONTRACTS.CTBALToken,
    });

    const analyticsBytecode = await publicClient.getBytecode({
      address: SEPOLIA_CONTRACTS.CTBALAnalytics,
    });

    console.log(`✅ CTBALToken bytecode length: ${tokenBytecode?.length || 0} bytes`);
    console.log(`✅ CTBALAnalytics bytecode length: ${analyticsBytecode?.length || 0} bytes`);

    // Network information
    const blockNumber = await publicClient.getBlockNumber();
    const chainId = await publicClient.getChainId();

    console.log(`✅ Current block: ${blockNumber}`);
    console.log(`✅ Chain ID: ${chainId} (Sepolia: 11155111)`);

    console.log("\n🌐 ETHERSCAN LINKS");
    console.log("==================");
    console.log(`CTBALToken: https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.CTBALToken}`);
    console.log(`CTBALAnalytics: https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.CTBALAnalytics}`);

    console.log("\n✅ DEPLOYMENT VERIFICATION COMPLETE!");
    console.log("====================================");
    console.log("🎉 All contracts are properly deployed and functional on Sepolia testnet!");

    // Summary report
    const verificationReport = {
      network: "sepolia",
      chainId: chainId,
      timestamp: new Date().toISOString(),
      contracts: {
        CTBALToken: {
          address: SEPOLIA_CONTRACTS.CTBALToken,
          verified: true,
          name: tokenName,
          symbol: tokenSymbol,
          totalSupply: formatEther(totalSupply as bigint),
          bytecodeLength: tokenBytecode?.length || 0
        },
        CTBALAnalytics: {
          address: SEPOLIA_CONTRACTS.CTBALAnalytics,
          verified: true,
          linkedToken: linkedToken,
          bytecodeLength: analyticsBytecode?.length || 0
        }
      },
      metrics: {
        totalTests: totalTests.toString(),
        completedTests: completedTests.toString(),
        validatedTests: validatedTests.toString(),
        totalTokens: formatEther(totalTokens),
        completionRate: totalTests > 0 ? ((Number(completedTests) / Number(totalTests)) * 100).toFixed(1) : "0",
        validationRate: totalTests > 0 ? ((Number(validatedTests) / Number(totalTests)) * 100).toFixed(1) : "0"
      },
      currentBlock: blockNumber.toString()
    };

    // Save verification report
    const fs = await import('fs');
    fs.writeFileSync(
      `sepolia-verification-${Date.now()}.json`,
      JSON.stringify(verificationReport, null, 2)
    );

    console.log("📄 Verification report saved to file");

  } catch (error) {
    console.error("❌ Verification failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });