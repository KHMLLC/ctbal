import hre from "hardhat";

async function main() {
    console.log("🚀 DEPLOYING CTBAL SYSTEM TO SEPOLIA TESTNET");
    console.log("=============================================\n");

    try {
        console.log("🔐 Deployer Account Configuration:");
        console.log("📍 Network: Sepolia testnet"); 
        console.log("🔗 RPC: Alchemy endpoint");
        console.log("💰 Balance: 0.151+ ETH (sufficient for deployment)\n");

        // Get wallet and public clients
        const [walletClient] = await hre.viem.getWalletClients();
        const publicClient = await hre.viem.getPublicClient();
        
        console.log(`📍 Deployer Address: ${walletClient.account.address}`);

        console.log("📄 STEP 1: Deploying CTBALToken...");
        
        // Deploy CTBALToken with constructor parameters
        const ctbalToken = await hre.viem.deployContract("CTBALToken", [
            "Clinical Test Blockchain Token", // name
            "CTBAL",                         // symbol  
            hre.viem.parseEther("1000000")   // initial supply (1M tokens)
        ]);

        console.log("✅ CTBALToken deployed successfully!");
        console.log(`   📄 Contract Address: ${ctbalToken.address}`);

        // Verify token deployment by reading contract
        const tokenName = await ctbalToken.read.name();
        const tokenSymbol = await ctbalToken.read.symbol(); 
        const totalSupply = await ctbalToken.read.totalSupply();

        console.log(`   🏷️  Token Name: ${tokenName}`);
        console.log(`   🔖 Token Symbol: ${tokenSymbol}`);
        console.log(`   📊 Total Supply: ${hre.viem.formatEther(totalSupply)} tokens`);

        console.log("\n📊 STEP 2: Deploying CTBALAnalytics...");
        
        // Deploy CTBALAnalytics with CTBALToken address
        const ctbalAnalytics = await hre.viem.deployContract("CTBALAnalytics", [
            ctbalToken.address
        ]);

        console.log("✅ CTBALAnalytics deployed successfully!");
        console.log(`   📄 Contract Address: ${ctbalAnalytics.address}`);

        // Verify analytics deployment
        const linkedToken = await ctbalAnalytics.read.ctbalToken();
        console.log(`   🔗 Linked Token: ${linkedToken}`);

        console.log("\n🔐 STEP 3: Setting up initial roles...");
        
        // Grant analyst role to deployer
        const ANALYST_ROLE = await ctbalAnalytics.read.ANALYST_ROLE();
        await ctbalAnalytics.write.grantRole([ANALYST_ROLE, walletClient.account.address]);
        console.log("✅ Analyst role granted to deployer");

        console.log("\n🧪 STEP 4: Testing deployment...");
        
        // Initialize analytics
        await ctbalAnalytics.write.updateMetrics([]);
        console.log("✅ Analytics system initialized");

        // Get initial metrics
        const metrics = await ctbalAnalytics.read.getOverallMetrics();
        console.log(`   📈 Total Tests: ${metrics[0]}`);
        console.log(`   💰 Tokens Allocated: ${hre.viem.formatEther(metrics[3])} CTBAL`);

        console.log("\n📋 ⭐ SEPOLIA DEPLOYMENT COMPLETE ⭐");
        console.log("===============================================");
        console.log(`🌍 Network: Ethereum Sepolia Testnet`);
        console.log(`💎 CTBALToken: ${ctbalToken.address}`);
        console.log(`📊 CTBALAnalytics: ${ctbalAnalytics.address}`);
        console.log(`👤 Deployer: ${walletClient.account.address}`);
        console.log(`⏰ Deployed: ${new Date().toISOString()}`);

        // Create deployment record
        const deploymentRecord = {
            network: "sepolia",
            chainId: 11155111,
            timestamp: new Date().toISOString(),
            deployer: walletClient.account.address,
            contracts: {
                CTBALToken: {
                    address: ctbalToken.address,
                    name: tokenName,
                    symbol: tokenSymbol,
                    totalSupply: hre.viem.formatEther(totalSupply)
                },
                CTBALAnalytics: {
                    address: ctbalAnalytics.address,
                    linkedToken: linkedToken
                }
            },
            etherscanUrls: {
                CTBALToken: `https://sepolia.etherscan.io/address/${ctbalToken.address}`,
                CTBALAnalytics: `https://sepolia.etherscan.io/address/${ctbalAnalytics.address}`
            }
        };

        // Save deployment info
        const fs = await import('fs');
        const filename = `sepolia-deployment-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(deploymentRecord, null, 2));
        console.log(`\n💾 Deployment record saved: ${filename}`);

        console.log("\n🔍 VIEW ON ETHERSCAN:");
        console.log("====================");
        console.log(`🔗 CTBALToken: https://sepolia.etherscan.io/address/${ctbalToken.address}`);
        console.log(`🔗 CTBALAnalytics: https://sepolia.etherscan.io/address/${ctbalAnalytics.address}`);

        console.log("\n📝 CONTRACT VERIFICATION:");
        console.log("=========================");
        console.log("Run these commands to verify on Etherscan:");
        console.log(`npx hardhat verify --network sepolia ${ctbalToken.address} "Clinical Test Blockchain Token" "CTBAL" "1000000000000000000000000"`);
        console.log(`npx hardhat verify --network sepolia ${ctbalAnalytics.address} ${ctbalToken.address}`);

        console.log("\n🎯 NEXT STEPS:");
        console.log("==============");
        console.log("✅ 1. Contracts successfully deployed to Sepolia");
        console.log("🔍 2. View and verify contracts on Etherscan");
        console.log("🧪 3. Test clinical workflows on testnet");
        console.log("📊 4. Monitor analytics and performance");
        console.log("🚀 5. Prepare for production Quorum deployment");

        console.log("\n🎉 🎉 🎉 SUCCESS! 🎉 🎉 🎉");
        console.log("Your CTBAL Clinical Test Blockchain is now LIVE on Sepolia!");

    } catch (error: any) {
        console.error("\n❌ 💥 DEPLOYMENT FAILED 💥");
        console.error("================================");
        console.error(`Error: ${error.message}`);
        
        if (error.shortMessage) {
            console.error(`Details: ${error.shortMessage}`);
        }
        
        if (error.cause) {
            console.error(`Cause: ${error.cause}`);
        }

        console.error("\n🔧 Troubleshooting:");
        console.error("- Check your Sepolia ETH balance");
        console.error("- Verify network connectivity"); 
        console.error("- Ensure contracts compile correctly");
        
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
});