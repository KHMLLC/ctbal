import hre from "hardhat";
import { parseEther, formatEther } from "viem";

async function main() {
  console.log("🚀 Deploying CTBAL Clinical Testing System...\n");

  // Get deployer info
  const publicClient = await hre.viem.getPublicClient();
  const [deployer] = await hre.viem.getWalletClients();
  console.log("Deploying from account:", deployer.account?.address);

  // Deploy CTBALToken
  console.log("\n📋 Deploying CTBALToken...");
  const ctbalToken = await hre.viem.deployContract("CTBALToken", [
    "Clinical Test Blockchain Token",
    "CTBAL",
    parseEther("1000000") // 1M tokens initial supply
  ]);
  console.log("✅ CTBALToken deployed to:", ctbalToken.address);

  // Deploy CTBALAnalytics
  console.log("\n📊 Deploying CTBALAnalytics...");
  const ctbalAnalytics = await hre.viem.deployContract("CTBALAnalytics", [
    ctbalToken.address
  ]);
  console.log("✅ CTBALAnalytics deployed to:", ctbalAnalytics.address);

  // Setup roles for demo
  console.log("\n🔐 Setting up demo roles...");
  
  // Create dummy addresses for roles
  const ANALYST_ROLE = await ctbalAnalytics.read.ANALYST_ROLE();
  await ctbalAnalytics.write.grantRole([ANALYST_ROLE, deployer.account.address]);
  console.log("✅ Analyst role granted to deployer");

  // Display contract information
  console.log("\n📋 Contract Information:");
  console.log("==========================================");
  console.log("CTBALToken Address:    ", ctbalToken.address);
  console.log("CTBALAnalytics Address:", ctbalAnalytics.address);
  
  const tokenName = await ctbalToken.read.name();
  const tokenSymbol = await ctbalToken.read.symbol();
  const totalSupply = await ctbalToken.read.totalSupply();
  
  console.log("\n🪙 Token Details:");
  console.log("Name:         ", tokenName);
  console.log("Symbol:       ", tokenSymbol);
  console.log("Total Supply: ", formatEther(totalSupply), "CTBAL");

  console.log("\n📊 Analytics Contract:");
  console.log("Token Address:", await ctbalAnalytics.read.ctbalToken());
  
  // Test analytics functions
  console.log("\n🧪 Testing Analytics Functions:");
  try {
    const metrics = await ctbalAnalytics.read.getOverallMetrics();
    console.log("Initial Metrics:");
    console.log("  Total Tests:           ", metrics[0].toString());
    console.log("  Validated Tests:       ", metrics[1].toString()); 
    console.log("  Completed Tests:       ", metrics[2].toString());
    console.log("  Total Tokens Allocated:", formatEther(metrics[3]), "CTBAL");
    console.log("  Total Tokens Released: ", formatEther(metrics[4]), "CTBAL");

    const validationRate = await ctbalAnalytics.read.getValidationRate();
    const completionRate = await ctbalAnalytics.read.getCompletionRate();
    console.log("  Validation Rate:       ", validationRate.toString(), "%");
    console.log("  Completion Rate:       ", completionRate.toString(), "%");

  } catch (error) {
    console.log("⚠️  Analytics functions need manual testing after some clinical tests are created");
  }

  console.log("\n🎯 Next Steps:");
  console.log("1. Create clinical tests using CTBALToken.createClinicalTest()");
  console.log("2. Update analytics using CTBALAnalytics.updateMetrics()");
  console.log("3. Query analytics data using the getter functions");
  console.log("4. Monitor time series data for trends and insights");

  console.log("\n✨ Deployment Complete! Your clinical testing blockchain is ready!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });