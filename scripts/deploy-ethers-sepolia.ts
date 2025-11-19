import hre from "hardhat";
import { parseEther, formatEther } from "viem";

async function main() {
  console.log("🚀 DEPLOYING CTBAL TO SEPOLIA TESTNET");
  console.log("======================================\n");

  try {
    console.log("🌐 Network:", hre.network.name);

    // Check if we have artifacts
    const artifacts = hre.artifacts;
    console.log("📦 Loading contract artifacts...");

    // Use getContractFactory to deploy
    const CTBALToken = await hre.ethers.getContractFactory("CTBALToken");
    const CTBALAnalytics = await hre.ethers.getContractFactory("CTBALAnalytics");

    console.log("🔑 Deploying with account:", (await hre.ethers.getSigners())[0].address);

    // Deploy CTBALToken
    console.log("\n📋 Deploying CTBALToken...");
    const ctbalToken = await CTBALToken.deploy(
      "Clinical Test Blockchain Token", // name
      "CTBAL",                         // symbol
      parseEther("1000000")            // 1M initial supply
    );

    await ctbalToken.waitForDeployment();
    const tokenAddress = await ctbalToken.getAddress();
    console.log("✅ CTBALToken deployed to:", tokenAddress);

    // Deploy CTBALAnalytics
    console.log("\n📊 Deploying CTBALAnalytics...");
    const ctbalAnalytics = await CTBALAnalytics.deploy(tokenAddress);
    
    await ctbalAnalytics.waitForDeployment();
    const analyticsAddress = await ctbalAnalytics.getAddress();
    console.log("✅ CTBALAnalytics deployed to:", analyticsAddress);

    // Get token info
    const name = await ctbalToken.name();
    const symbol = await ctbalToken.symbol();
    const totalSupply = await ctbalToken.totalSupply();
    const decimals = await ctbalToken.decimals();

    console.log("\n🎯 DEPLOYMENT SUMMARY");
    console.log("===================");
    console.log(`Network: ${hre.network.name}`);
    console.log(`CTBALToken: ${tokenAddress}`);
    console.log(`CTBALAnalytics: ${analyticsAddress}`);
    console.log(`Token: ${name} (${symbol})`);
    console.log(`Supply: ${formatEther(totalSupply)} tokens`);
    console.log(`Decimals: ${decimals}`);

    // Save deployment info
    const deploymentInfo = {
      network: hre.network.name,
      timestamp: new Date().toISOString(),
      contracts: {
        CTBALToken: {
          address: tokenAddress,
          name: name,
          symbol: symbol,
          totalSupply: totalSupply.toString(),
          decimals: decimals
        },
        CTBALAnalytics: {
          address: analyticsAddress
        }
      }
    };

    // Write to file
    const fs = require('fs');
    const deploymentFile = `sepolia-deployment-${Date.now()}.json`;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n📄 Deployment info saved to: ${deploymentFile}`);

    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log("Ready for CSV import with: npm run import:csv --network sepolia");

    return {
      ctbalToken: tokenAddress,
      ctbalAnalytics: analyticsAddress
    };

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });