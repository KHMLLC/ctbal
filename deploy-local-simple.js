import hre from "hardhat";

async function main() {
    console.log("🚀 DEPLOYING CTBAL SYSTEM TO LOCALHOST");
    console.log("=======================================\n");

    // Get signers (accounts)
    const [deployer] = await hre.ethers.getSigners();
    console.log("🔐 Deploying with account:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("💰 Account balance:", hre.ethers.utils.formatEther(balance), "ETH\n");

    // Deploy CTBALToken
    console.log("📄 Deploying CTBALToken...");
    const CTBALToken = await hre.ethers.getContractFactory("CTBALToken");
    const ctbalToken = await CTBALToken.deploy(
        "Clinical Test Blockchain Token",
        "CTBAL", 
        hre.ethers.utils.parseEther("1000000")
    );
    await ctbalToken.deployed();
    console.log("✅ CTBALToken deployed to:", ctbalToken.address);

    // Deploy CTBALAnalytics
    console.log("\n📊 Deploying CTBALAnalytics...");
    const CTBALAnalytics = await hre.ethers.getContractFactory("CTBALAnalytics");
    const ctbalAnalytics = await CTBALAnalytics.deploy(ctbalToken.address);
    await ctbalAnalytics.deployed();
    console.log("✅ CTBALAnalytics deployed to:", ctbalAnalytics.address);

    console.log("\n📋 DEPLOYMENT SUMMARY");
    console.log("=====================");
    console.log("Network:          localhost");
    console.log("CTBALToken:      ", ctbalToken.address);
    console.log("CTBALAnalytics:  ", ctbalAnalytics.address);
    console.log("Deployer:        ", deployer.address);
    
    console.log("\n🎉 LOCAL DEPLOYMENT SUCCESSFUL! 🚀");
    console.log("Your contracts are now running on the local Hardhat network!");
    console.log("You can interact with them using the contract addresses above.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });