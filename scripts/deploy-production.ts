import hre from "hardhat";
import { parseEther, formatEther } from "viem";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const networkName = hre.network.name || "localhost";
  console.log(`🚀 DEPLOYING CTBAL SYSTEM TO: ${networkName.toUpperCase()}`);
  console.log("================================================\n");

  // Deployment configuration
  const config = {
    tokenName: process.env.TOKEN_NAME || "Clinical Test Blockchain Token",
    tokenSymbol: process.env.TOKEN_SYMBOL || "CTBAL", 
    initialSupply: process.env.INITIAL_SUPPLY || "1000000",
    verbose: process.env.VERBOSE_DEPLOYMENT === "true"
  };

  console.log("📋 DEPLOYMENT CONFIGURATION:");
  console.log("============================");
  console.log(`Network:        ${networkName}`);
  console.log(`Token Name:     ${config.tokenName}`);
  console.log(`Token Symbol:   ${config.tokenSymbol}`);
  console.log(`Initial Supply: ${config.initialSupply} tokens`);

  try {
    // Get deployer account
    console.log("\n🔐 DEPLOYER ACCOUNT:");
    console.log("====================");
    const [walletClient] = await hre.viem.getWalletClients();
    const deployerAddress = walletClient.account.address;
    console.log(`Address: ${deployerAddress}`);
    
    // Check balance
    const publicClient = await hre.viem.getPublicClient();
    const balance = await publicClient.getBalance({ 
      address: deployerAddress 
    });
    console.log(`Balance: ${formatEther(balance)} ETH`);

    // Network-specific validation
    if (networkName === "sepolia") {
      if (balance < parseEther("0.1")) {
        console.log("⚠️  WARNING: Low balance. Get Sepolia ETH from:");
        console.log("   - https://sepoliafaucet.com");
        console.log("   - https://faucet.sepolia.dev");
      }
    } else if (networkName === "quorum") {
      console.log("✅ Quorum network - zero gas cost transactions");
    }

    console.log("\n📄 STEP 1: DEPLOYING CTBALToken");
    console.log("===============================");
    
    const ctbalToken = await hre.viem.deployContract("CTBALToken", [
      config.tokenName,
      config.tokenSymbol,
      parseEther(config.initialSupply)
    ]);

    console.log(`✅ CTBALToken deployed to: ${ctbalToken.address}`);
    
    // Verify token deployment
    const tokenName = await ctbalToken.read.name();
    const tokenSymbol = await ctbalToken.read.symbol();
    const totalSupply = await ctbalToken.read.totalSupply();
    
    console.log(`   Name: ${tokenName}`);
    console.log(`   Symbol: ${tokenSymbol}`);
    console.log(`   Total Supply: ${formatEther(totalSupply)} ${tokenSymbol}`);

    console.log("\n📊 STEP 2: DEPLOYING CTBALAnalytics");
    console.log("===================================");
    
    const ctbalAnalytics = await hre.viem.deployContract("CTBALAnalytics", [
      ctbalToken.address
    ]);

    console.log(`✅ CTBALAnalytics deployed to: ${ctbalAnalytics.address}`);
    
    // Verify analytics deployment
    const linkedToken = await ctbalAnalytics.read.ctbalToken();
    console.log(`   Linked Token: ${linkedToken}`);

    console.log("\n🔐 STEP 3: SETTING UP ROLES");
    console.log("============================");
    
    // Get role constants
    const ANALYST_ROLE = await ctbalAnalytics.read.ANALYST_ROLE();
    
    // Grant analyst role to deployer for initial setup
    await ctbalAnalytics.write.grantRole([ANALYST_ROLE, deployerAddress]);
    console.log("✅ Analyst role granted to deployer");

    console.log("\n🧪 STEP 4: TESTING DEPLOYMENT");
    console.log("==============================");
    
    // Test analytics update
    await ctbalAnalytics.write.updateMetrics([]);
    console.log("✅ Analytics system initialized");
    
    // Get initial metrics
    const metrics = await ctbalAnalytics.read.getOverallMetrics();
    console.log(`   Total Tests: ${metrics[0]}`);
    console.log(`   Tokens Allocated: ${formatEther(metrics[3])} CTBAL`);

    console.log("\n📋 DEPLOYMENT SUMMARY");
    console.log("=====================");
    console.log(`Network:           ${networkName}`);
    console.log(`CTBALToken:        ${ctbalToken.address}`);
    console.log(`CTBALAnalytics:    ${ctbalAnalytics.address}`);
    console.log(`Deployer:          ${deployerAddress}`);
    console.log(`Gas Used:          ${networkName === 'quorum' ? '0 (free)' : 'Variable'}`);
    console.log(`Deployment Time:   ${new Date().toISOString()}`);

    // Create deployment info file
    const deploymentInfo = {
      network: networkName,
      timestamp: new Date().toISOString(),
      contracts: {
        CTBALToken: ctbalToken.address,
        CTBALAnalytics: ctbalAnalytics.address
      },
      deployer: deployerAddress,
      configuration: config,
      verification: {
        tokenName: await ctbalToken.read.name(),
        tokenSymbol: await ctbalToken.read.symbol(),
        totalSupply: formatEther(await ctbalToken.read.totalSupply()),
        analyticsLinked: await ctbalAnalytics.read.ctbalToken()
      }
    };

    console.log("\n💾 SAVING DEPLOYMENT INFO");
    console.log("==========================");
    const fs = await import('fs');
    fs.writeFileSync(
      `deployment-${networkName}-${Date.now()}.json`,
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("✅ Deployment info saved to file");

    if (networkName === "sepolia") {
      console.log("\n🔍 ETHERSCAN VERIFICATION");
      console.log("=========================");
      console.log("To verify contracts on Etherscan, run:");
      console.log(`npx hardhat verify --network sepolia ${ctbalToken.address} "${config.tokenName}" "${config.tokenSymbol}" "${parseEther(config.initialSupply)}"`);
      console.log(`npx hardhat verify --network sepolia ${ctbalAnalytics.address} ${ctbalToken.address}`);
    }

    console.log("\n🎯 NEXT STEPS");
    console.log("=============");
    if (networkName === "sepolia") {
      console.log("✅ Testnet deployment complete!");
      console.log("1. Test clinical test creation and completion");
      console.log("2. Validate analytics functionality");
      console.log("3. Prepare for Quorum production deployment");
    } else if (networkName === "quorum") {
      console.log("✅ Production deployment complete!");
      console.log("1. Set up hospital consortium access");
      console.log("2. Configure monitoring and alerting");
      console.log("3. Train staff on blockchain workflow");
    } else {
      console.log("✅ Local deployment complete!");
      console.log("1. Run comprehensive tests");
      console.log("2. Deploy to testnet when ready");
    }

    console.log("\n🎉 DEPLOYMENT SUCCESSFUL! 🚀");

  } catch (error: any) {
    console.error("❌ DEPLOYMENT FAILED:");
    console.error(error.message);
    if (error.cause) {
      console.error("Cause:", error.cause);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});