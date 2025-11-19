import { createWalletClient, http, publicActions } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

async function validateSetup() {
  console.log("🔍 SEPOLIA DEPLOYMENT SETUP VALIDATION");
  console.log("======================================\n");

  try {
    // Check environment variables
    console.log("📋 ENVIRONMENT CONFIGURATION:");
    console.log("=============================");
    
    const sepoliaUrl = process.env.SEPOLIA_URL || process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const etherscanKey = process.env.ETHERSCAN_API_KEY;

    console.log(`✅ Sepolia RPC URL: ${sepoliaUrl ? '✅ Configured' : '❌ Missing'}`);
    console.log(`✅ Private Key: ${privateKey ? '✅ Configured' : '❌ Missing'}`);
    console.log(`✅ Etherscan API: ${etherscanKey ? '✅ Configured' : '⚠️ Optional - for verification'}`);

    if (!sepoliaUrl) {
      console.log("\n❌ MISSING: SEPOLIA_URL");
      console.log("📝 Get from: https://infura.io or https://alchemy.com");
      console.log("💡 Format: https://sepolia.infura.io/v3/YOUR_PROJECT_ID");
      return false;
    }

    if (!privateKey) {
      console.log("\n❌ MISSING: PRIVATE_KEY");
      console.log("📝 Export from MetaMask: Account Details > Export Private Key");
      console.log("⚠️ SECURITY: Never share or commit this key!");
      return false;
    }

    // Test network connection
    console.log("\n🌐 NETWORK CONNECTION TEST:");
    console.log("===========================");
    
    try {
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const client = createWalletClient({
        account,
        chain: sepolia,
        transport: http(sepoliaUrl)
      }).extend(publicActions);

      console.log(`📍 Wallet Address: ${account.address}`);
      
      // Check balance
      const balance = await client.getBalance({ address: account.address });
      const balanceEth = Number(balance) / 1e18;
      
      console.log(`💰 Sepolia Balance: ${balanceEth.toFixed(6)} ETH`);
      
      if (balanceEth < 0.01) {
        console.log("\n⚠️ LOW BALANCE WARNING:");
        console.log("💡 You need at least 0.01 ETH for deployment");
        console.log("🪙 Get Sepolia ETH from faucets:");
        console.log("   • https://sepoliafaucet.com");
        console.log("   • https://faucets.chain.link/sepolia");
        console.log(`   • Send to: ${account.address}`);
        return false;
      }

      // Test RPC connection
      const blockNumber = await client.getBlockNumber();
      console.log(`🔗 Connected to Sepolia - Latest Block: ${blockNumber}`);
      
      console.log("\n✅ SETUP VALIDATION COMPLETE!");
      console.log("=============================");
      console.log("🚀 Ready for deployment!");
      return true;
      
    } catch (networkError: any) {
      console.log("❌ NETWORK CONNECTION FAILED:");
      if (networkError.message.includes('Invalid private key')) {
        console.log("🔐 Issue: Invalid private key format");
        console.log("💡 Ensure private key starts with '0x' and is 64 characters");
      } else if (networkError.message.includes('fetch')) {
        console.log("🌐 Issue: RPC URL connection failed");
        console.log("💡 Verify your Infura/Alchemy URL is correct");
      } else {
        console.log(`💥 Error: ${networkError.message}`);
      }
      return false;
    }

  } catch (error: any) {
    console.error("❌ SETUP VALIDATION FAILED:");
    console.error(error.message);
    return false;
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateSetup().then(success => {
    if (success) {
      console.log("\n🎯 NEXT STEP:");
      console.log("=============");
      console.log("npm run deploy:sepolia");
    } else {
      console.log("\n🔧 CONFIGURE YOUR .env FILE:");
      console.log("============================");
      console.log("Edit the .env file with your credentials and run this check again.");
    }
  });
}

export { validateSetup };