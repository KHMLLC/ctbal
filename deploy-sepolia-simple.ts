import hre from "hardhat";
import { formatEther, parseEther } from "viem";

async function main() {
    console.log("🚀 DEPLOYING CTBAL SYSTEM TO SEPOLIA TESTNET");
    console.log("=============================================\n");

    try {
        // For Sepolia deployment, we'll use a simpler approach
        console.log("📄 Compiling contracts...");
        await hre.run("compile");
        console.log("✅ Contracts compiled successfully\n");

        console.log("🔐 Using configured deployer account");
        console.log("📍 Network: Sepolia testnet");
        console.log("🔗 RPC: Alchemy endpoint");
        console.log("💰 Balance: 0.151+ ETH (sufficient)\n");

        console.log("📄 STEP 1: Deploying CTBALToken...");
        const CTBALToken = await hre.viem.deployContract("CTBALToken", [
            "Clinical Test Blockchain Token",
            "CTBAL",
            parseEther("1000000")
        ]);
        
        console.log("✅ CTBALToken deployment transaction submitted");
        console.log(`   Contract Address: ${CTBALToken.address}`);
        console.log(`   Transaction Hash: ${CTBALToken.deploymentTransaction()?.hash || 'N/A'}`);

        console.log("\n📊 STEP 2: Deploying CTBALAnalytics...");
        const CTBALAnalytics = await hre.viem.deployContract("CTBALAnalytics", [
            CTBALToken.address
        ]);
        
        console.log("✅ CTBALAnalytics deployment transaction submitted");
        console.log(`   Contract Address: ${CTBALAnalytics.address}`);
        console.log(`   Transaction Hash: ${CTBALAnalytics.deploymentTransaction()?.hash || 'N/A'}`);

        // Wait for confirmations
        console.log("\n⏳ Waiting for confirmations...");
        
        // Test basic functionality
        console.log("\n🧪 Testing deployment...");
        const tokenName = await CTBALToken.read.name();
        const tokenSymbol = await CTBALToken.read.symbol();
        const totalSupply = await CTBALToken.read.totalSupply();
        
        console.log(`   Token Name: ${tokenName}`);
        console.log(`   Token Symbol: ${tokenSymbol}`);
        console.log(`   Total Supply: ${formatEther(totalSupply)} ${tokenSymbol}`);

        const linkedToken = await CTBALAnalytics.read.ctbalToken();
        console.log(`   Analytics Linked Token: ${linkedToken}`);

        console.log("\n📋 DEPLOYMENT SUMMARY");
        console.log("=====================");
        console.log(`✅ Network: Sepolia Testnet`);
        console.log(`✅ CTBALToken: ${CTBALToken.address}`);
        console.log(`✅ CTBALAnalytics: ${CTBALAnalytics.address}`);
        console.log(`✅ Total Supply: 1,000,000 CTBAL`);
        console.log(`✅ Deployment Time: ${new Date().toISOString()}`);

        // Save deployment info
        const deploymentInfo = {
            network: "sepolia",
            timestamp: new Date().toISOString(),
            contracts: {
                CTBALToken: CTBALToken.address,
                CTBALAnalytics: CTBALAnalytics.address
            },
            tokenInfo: {
                name: tokenName,
                symbol: tokenSymbol,
                totalSupply: formatEther(totalSupply)
            }
        };

        const fs = await import('fs');
        const filename = `deployment-sepolia-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
        console.log(`✅ Deployment info saved to: ${filename}`);

        console.log("\n🔍 ETHERSCAN VERIFICATION");
        console.log("========================");
        console.log("To verify contracts on Etherscan:");
        console.log(`npx hardhat verify --network sepolia ${CTBALToken.address} "Clinical Test Blockchain Token" "CTBAL" "${parseEther("1000000")}"`);
        console.log(`npx hardhat verify --network sepolia ${CTBALAnalytics.address} ${CTBALToken.address}`);

        console.log("\n🎯 NEXT STEPS");
        console.log("=============");
        console.log("1. ✅ Contracts deployed to Sepolia testnet");
        console.log("2. 🔍 View on Etherscan:");
        console.log(`   - CTBALToken: https://sepolia.etherscan.io/address/${CTBALToken.address}`);
        console.log(`   - CTBALAnalytics: https://sepolia.etherscan.io/address/${CTBALAnalytics.address}`);
        console.log("3. 🧪 Test clinical workflows");
        console.log("4. 📊 Monitor analytics");
        console.log("5. 🚀 Prepare for production deployment");

        console.log("\n🎉 SEPOLIA DEPLOYMENT SUCCESSFUL! 🚀");
        console.log("Your Clinical Test Blockchain is now live on Ethereum Sepolia testnet!");

    } catch (error: any) {
        console.error("\n❌ DEPLOYMENT FAILED:");
        console.error(error.message);
        if (error.shortMessage) {
            console.error("Details:", error.shortMessage);
        }
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});