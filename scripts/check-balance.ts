import hre from "hardhat";
import { formatEther } from "viem";

async function main() {
    // Get the deployer account address from config
    const accounts = hre.config.networks?.sepolia?.accounts as string[];
    if (!accounts || accounts.length === 0) {
        throw new Error("No accounts configured for Sepolia network");
    }
    
    // Get public client for balance checking
    const publicClient = await hre.viem.getPublicClient();
    
    // Create wallet client to get address
    const [walletClient] = await hre.viem.getWalletClients();
    const address = walletClient.account.address;
    
    console.log("🔍 Checking Sepolia ETH Balance...");
    console.log("📍 Wallet Address:", address);
    
    const balance = await publicClient.getBalance({ address });
    const balanceEth = formatEther(balance);
    
    console.log("💰 Current Balance:", balanceEth, "ETH");
    
    if (parseFloat(balanceEth) < 0.01) {
        console.log("\n⚠️  Low Balance Warning!");
        console.log("🚰 You need Sepolia ETH to deploy contracts.");
        console.log("🔗 Get free Sepolia ETH from these faucets:");
        console.log("   • https://sepoliafaucet.com/");
        console.log("   • https://faucets.chain.link/sepolia");
        console.log("   • https://www.alchemy.com/faucets/ethereum-sepolia");
        console.log(`   📧 Use your address: ${address}`);
    } else {
        console.log("✅ Sufficient balance for deployment!");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error checking balance:", error);
        process.exit(1);
    });