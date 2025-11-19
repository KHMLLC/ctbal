import hre from "hardhat";
import { parseEther, formatEther } from "viem";

async function main() {
  console.log("🚀 DEPLOYING CTBAL TO SEPOLIA TESTNET");
  console.log("=====================================\n");

  try {
    const [deployer] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    
    console.log("🌐 Network:", await publicClient.getChainId());
    console.log("👤 Deployer:", deployer.account.address);

    // Deploy CTBALToken
    console.log("\n📋 Deploying CTBALToken...");
    const ctbalToken = await hre.viem.deployContract("CTBALToken", [
      "Clinical Test Blockchain Token", // name
      "CTBAL",                         // symbol
      parseEther("1000000")            // 1M initial supply
    ]);

    console.log("✅ CTBALToken deployed to:", ctbalToken.address);

    // Deploy CTBALAnalytics
    console.log("\n📊 Deploying CTBALAnalytics...");
    const ctbalAnalytics = await hre.viem.deployContract("CTBALAnalytics", [
      ctbalToken.address
    ]);

    console.log("✅ CTBALAnalytics deployed to:", ctbalAnalytics.address);

    // Get token info
    const name = await ctbalToken.read.name();
    const symbol = await ctbalToken.read.symbol();
    const totalSupply = await ctbalToken.read.totalSupply();
    const decimals = await ctbalToken.read.decimals();

    console.log("\n🎯 DEPLOYMENT SUMMARY");
    console.log("===================");
    console.log(`Network: ${hre.network.name}`);
    console.log(`CTBALToken: ${ctbalToken.address}`);
    console.log(`CTBALAnalytics: ${ctbalAnalytics.address}`);
    console.log(`Token: ${name} (${symbol})`);
    console.log(`Supply: ${formatEther(totalSupply)} tokens`);
    console.log(`Decimals: ${decimals}`);

    // Save deployment info
    const deploymentInfo = {
      network: hre.network.name,
      timestamp: new Date().toISOString(),
      contracts: {
        CTBALToken: {
          address: ctbalToken.address,
          name: name,
          symbol: symbol,
          totalSupply: totalSupply.toString(),
          decimals: decimals
        },
        CTBALAnalytics: {
          address: ctbalAnalytics.address
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
      ctbalToken: ctbalToken.address,
      ctbalAnalytics: ctbalAnalytics.address
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