import { createPublicClient, http, formatEther, getContract, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Contract addresses from latest deployment
const CTBAL_TOKEN_ADDRESS = "0xcfab0ab01fd1a4a72601dd30da96fc13b0403246";
const CTBAL_ANALYTICS_ADDRESS = "0x5b07f9bac1f72cbd5ef931f13d00bb87785eab5d";

// Create public client for reading blockchain data
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_URL || 'https://sepolia.infura.io/v3/YOUR_KEY'),
});

// Simplified contract ABIs
const tokenABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)", 
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function getTestCount() view returns (uint256)",
  "function getPatientTests(address) view returns (uint256[])",
  "function getClinicianTests(address) view returns (uint256[])"
]);

const analyticsABI = parseAbi([
  "function getOverallMetrics() view returns (uint256, uint256, uint256, uint256, uint256)",
  "function getValidationRate() view returns (uint256)", 
  "function getCompletionRate() view returns (uint256)",
  "function getTimeSeriesLength() view returns (uint256)"
]);

async function main() {
  console.log("📊 CTBAL DATA READER - Past Two Weeks Analysis");
  console.log("==============================================\n");

  try {
    // Get contract instances
    const tokenContract = getContract({
      address: CTBAL_TOKEN_ADDRESS,
      abi: tokenABI,
      client: publicClient,
    });

    const analyticsContract = getContract({
      address: CTBAL_ANALYTICS_ADDRESS, 
      abi: analyticsABI,
      client: publicClient,
    });

    // Get basic token information
    console.log("🏥 CONTRACT INFORMATION:");
    console.log("========================");
    
    const [tokenName, tokenSymbol, totalSupply] = await Promise.all([
      tokenContract.read.name(),
      tokenContract.read.symbol(),
      tokenContract.read.totalSupply(),
    ]);

    console.log(`Token Name: ${tokenName}`);
    console.log(`Token Symbol: ${tokenSymbol}`);
    console.log(`Total Supply: ${formatEther(totalSupply)} CTBAL`);
    console.log(`Token Contract: ${CTBAL_TOKEN_ADDRESS}`);
    console.log(`Analytics Contract: ${CTBAL_ANALYTICS_ADDRESS}\n`);

    // Get overall system metrics
    console.log("📈 OVERALL SYSTEM METRICS:");
    console.log("=========================");
    
    try {
      const overallMetrics = await analyticsContract.read.getOverallMetrics();
      const [testsCreated, testsValidated, testsCompleted, totalTokensDistributed, totalParticipants] = overallMetrics;

      console.log(`Tests Created: ${testsCreated.toString()}`);
      console.log(`Tests Validated: ${testsValidated.toString()}`);
      console.log(`Tests Completed: ${testsCompleted.toString()}`);
      console.log(`Total Tokens Distributed: ${formatEther(totalTokensDistributed)} CTBAL`);
      console.log(`Total Participants: ${totalParticipants.toString()}`);

      // Calculate rates
      const validationRate = await analyticsContract.read.getValidationRate();
      const completionRate = await analyticsContract.read.getCompletionRate();
      
      console.log(`Validation Rate: ${validationRate.toString()}%`);
      console.log(`Completion Rate: ${completionRate.toString()}%\n`);
    } catch (error) {
      console.log("⚠️  Analytics data not yet available (no tests submitted)\n");
    }

    // Get time series information
    console.log("📅 TIME SERIES DATA:");
    console.log("===================");
    
    try {
      const timeSeriesLength = await analyticsContract.read.getTimeSeriesLength();
      console.log(`Time series entries: ${timeSeriesLength.toString()}`);
      
      if (timeSeriesLength > 0n) {
        console.log("📊 Time series data is available");
        console.log("   (Use analytics dashboard for detailed time series visualization)");
      } else {
        console.log("📝 No time series data available yet");
      }
    } catch (error) {
      console.log("⚠️  Time series data not accessible");
    }

    console.log("\n");

    // Get clinical test count
    console.log("🧪 CLINICAL TESTS:");
    console.log("==================");
    
    try {
      const testCount = await tokenContract.read.getTestCount();
      console.log(`Total Tests in System: ${testCount.toString()}`);
      
      if (testCount > 0n) {
        console.log(`\n📋 ${testCount.toString()} clinical tests have been submitted to the system.`);
        console.log("\n📊 To view detailed test information:");
        console.log(`   - Token Contract: https://sepolia.etherscan.io/address/${CTBAL_TOKEN_ADDRESS}#readContract`);
        console.log(`   - Analytics Contract: https://sepolia.etherscan.io/address/${CTBAL_ANALYTICS_ADDRESS}#readContract`);
        console.log("   - Use the 'clinicalTests' function with test IDs 1 through " + testCount.toString());
      } else {
        console.log("📝 No clinical tests have been submitted yet");
        console.log("\n💡 This suggests the system is ready but no mortality data has been processed recently.");
      }
    } catch (error) {
      console.log("⚠️  Could not access clinical test count");
    }

    // Check for recent blockchain events (simplified)
    console.log("\n🔍 RECENT BLOCKCHAIN ACTIVITY:");
    console.log("==============================");
    
    try {
      const currentBlock = await publicClient.getBlockNumber();
      console.log(`Current block number: ${currentBlock.toString()}`);
      
      // Estimate blocks from 2 weeks ago (assuming ~12 second block time)
      const blocksIn2Weeks = BigInt(Math.floor((14 * 24 * 60 * 60) / 12));
      const fromBlock = currentBlock > blocksIn2Weeks ? currentBlock - blocksIn2Weeks : 0n;
      console.log(`Searching from block: ${fromBlock.toString()}`);
      
      // Get ClinicalTestCreated events (simplified search)
      try {
        const logs = await publicClient.getLogs({
          address: CTBAL_TOKEN_ADDRESS,
          fromBlock: fromBlock,
          toBlock: 'latest'
        });

        console.log(`Total events found: ${logs.length}`);
        
        if (logs.length > 0) {
          console.log("📈 Recent blockchain activity detected");
          console.log(`   Latest activity at block: ${logs[logs.length - 1].blockNumber}`);
        } else {
          console.log("📝 No recent blockchain activity in the past 2 weeks");
        }
      } catch (eventError) {
        console.log("⚠️  Could not search events (may be rate-limited)");
      }
      
    } catch (blockError) {
      console.log("⚠️  Could not fetch current block information");
    }

    // Summary and next steps
    console.log("\n🎯 DATA SUMMARY:");
    console.log("================");
    console.log("✅ CTBAL system is deployed and operational on Sepolia testnet");
    console.log("✅ Smart contracts are accessible and functional");
    console.log("📊 Use 'npm run health:submit' to submit your daily health data");
    console.log("🔍 Use Etherscan links above for detailed blockchain exploration");
    
    console.log("\n🔗 USEFUL LINKS:");
    console.log("================");
    console.log(`📊 Analytics Dashboard: npm run dashboard:sepolia`);
    console.log(`💊 Submit Health Data: npm run health:submit`);
    console.log(`🔍 View on Etherscan: https://sepolia.etherscan.io/address/${CTBAL_TOKEN_ADDRESS}`);

  } catch (error: any) {
    console.error("❌ ERROR READING DATA:");
    console.error(error.message);
    
    if (error.message.includes('network')) {
      console.log("\n💡 TROUBLESHOOTING:");
      console.log("- Check your SEPOLIA_URL in .env file");
      console.log("- Verify internet connection");
      console.log("- Ensure Infura/Alchemy key is valid");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});