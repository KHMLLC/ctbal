import hre from "hardhat";

async function main() {
  console.log("🚀 DEPLOYING CTBAL TO SEPOLIA TESTNET");
  console.log("====================================");
  
  console.log("📍 Network:", hre.network.name);
  console.log("💰 Deployer has 0.151+ Sepolia ETH\n");

  try {
    console.log("🔧 Getting deployment clients...");
    
    // Get wallet and public clients for Viem
    const [walletClient] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    
    console.log("👤 Deployer address:", walletClient.account.address);

    // Check balance
    const balance = await publicClient.getBalance({
      address: walletClient.account.address
    });
    console.log("💰 Balance:", hre.viem.formatEther(balance), "ETH");

    console.log("\n📄 STEP 1: Deploying CTBALToken...");
    const ctbalToken = await hre.viem.deployContract("CTBALToken", [
      "Clinical Test Blockchain Token",
      "CTBAL", 
      hre.viem.parseEther("1000000")
    ]);

    console.log("✅ CTBALToken deployed successfully!");
    console.log("   Contract address:", ctbalToken.address);

    // Verify token deployment
    const tokenName = await ctbalToken.read.name();
    const tokenSymbol = await ctbalToken.read.symbol();
    console.log("   Token name:", tokenName);
    console.log("   Token symbol:", tokenSymbol);

    console.log("\n📊 STEP 2: Deploying CTBALAnalytics...");
    const ctbalAnalytics = await hre.viem.deployContract("CTBALAnalytics", [
      ctbalToken.address
    ]);

    console.log("✅ CTBALAnalytics deployed successfully!");
    console.log("   Contract address:", ctbalAnalytics.address);

    // Verify analytics deployment
    const linkedToken = await ctbalAnalytics.read.ctbalToken();
    console.log("   Linked token:", linkedToken);

    console.log("\n🎉 🎉 SEPOLIA DEPLOYMENT COMPLETE! 🎉 🎉");
    console.log("==========================================");
    console.log("Network:           Ethereum Sepolia Testnet");
    console.log("CTBALToken:       ", ctbalToken.address);
    console.log("CTBALAnalytics:   ", ctbalAnalytics.address);
    console.log("Deployer:         ", walletClient.account.address);
    console.log("Timestamp:        ", new Date().toISOString());

    console.log("\n🔗 VIEW ON ETHERSCAN:");
    console.log("CTBALToken:       https://sepolia.etherscan.io/address/" + ctbalToken.address);
    console.log("CTBALAnalytics:   https://sepolia.etherscan.io/address/" + ctbalAnalytics.address);

    // Create deployment summary
    const deployment = {
      network: "sepolia",
      timestamp: new Date().toISOString(),
      deployer: walletClient.account.address,
      contracts: {
        CTBALToken: ctbalToken.address,
        CTBALAnalytics: ctbalAnalytics.address
      },
      etherscan: {
        CTBALToken: `https://sepolia.etherscan.io/address/${ctbalToken.address}`,
        CTBALAnalytics: `https://sepolia.etherscan.io/address/${ctbalAnalytics.address}`
      }
    };

    // Save deployment info
    const fs = await import('fs');
    const filename = `sepolia-deployment-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(deployment, null, 2));
    console.log("\n💾 Deployment info saved to:", filename);

    console.log("\n🎯 NEXT STEPS:");
    console.log("1. ✅ View contracts on Etherscan using URLs above");
    console.log("2. 🧪 Test clinical workflows on testnet");
    console.log("3. 📊 Monitor contract analytics");
    console.log("4. 🔍 Verify contracts (optional):");
    console.log(`   npx hardhat verify --network sepolia ${ctbalToken.address} "Clinical Test Blockchain Token" "CTBAL" "1000000000000000000000000"`);
    console.log(`   npx hardhat verify --network sepolia ${ctbalAnalytics.address} ${ctbalToken.address}`);

  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    if (error.shortMessage) {
      console.error("Details:", error.shortMessage);
    }
    throw error;
  }
}

main()
  .then(() => {
    console.log("\n🚀 DEPLOYMENT SUCCESSFUL! Your CTBAL system is live on Sepolia!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Deployment script failed:", error);
    process.exit(1);
  });