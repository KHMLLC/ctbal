const hre = require("hardhat");

async function main() {
  console.log("🚀 DEPLOYING CTBAL TO SEPOLIA TESTNET");
  console.log("====================================");
  
  console.log("📍 Network:", hre.network.name);
  console.log("💰 Deployer has 0.151+ Sepolia ETH\n");

  try {
    // Since we're using viem toolbox, let's try the viem approach
    const [walletClient] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    
    console.log("👤 Deployer:", walletClient.account.address);

    console.log("📄 Deploying CTBALToken...");
    const ctbalToken = await hre.viem.deployContract("CTBALToken", [
      "Clinical Test Blockchain Token",
      "CTBAL", 
      hre.viem.parseEther("1000000")
    ]);

    console.log("✅ CTBALToken deployed:", ctbalToken.address);

    console.log("📊 Deploying CTBALAnalytics...");
    const ctbalAnalytics = await hre.viem.deployContract("CTBALAnalytics", [
      ctbalToken.address
    ]);

    console.log("✅ CTBALAnalytics deployed:", ctbalAnalytics.address);

    console.log("\n🎉 SEPOLIA DEPLOYMENT SUCCESS!");
    console.log("==============================");
    console.log("CTBALToken:     ", ctbalToken.address);
    console.log("CTBALAnalytics: ", ctbalAnalytics.address);
    console.log("Network:        ", "Sepolia Testnet");
    console.log("\n🔗 View on Etherscan:");
    console.log("CTBALToken:     https://sepolia.etherscan.io/address/" + ctbalToken.address);
    console.log("CTBALAnalytics: https://sepolia.etherscan.io/address/" + ctbalAnalytics.address);

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    throw error;
  }
}

main()
  .then(() => {
    console.log("\n✅ Deployment script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });