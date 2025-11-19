import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load contract artifacts
import CTBALTokenArtifact from '../artifacts/contracts/CTBALToken.sol/CTBALToken.json' assert { type: "json" };
import CTBALAnalyticsArtifact from '../artifacts/contracts/CTBALAnalytics.sol/CTBALAnalytics.json' assert { type: "json" };

dotenv.config();

async function main() {
  console.log("🚀 DEPLOYING CTBAL TO SEPOLIA TESTNET (Direct Viem)");
  console.log("===================================================\n");

  // Setup wallet and clients
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(process.env.SEPOLIA_URL),
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_URL),
  });

  console.log("👤 Deployer:", account.address);
  
  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("💰 Balance:", formatEther(balance), "ETH");

  if (balance < parseEther("0.01")) {
    console.log("⚠️  WARNING: Low balance. Consider getting more Sepolia ETH from faucets");
  }

  try {
    // Deploy CTBALToken
    console.log("\n📋 Deploying CTBALToken...");
    
    const tokenHash = await walletClient.deployContract({
      abi: CTBALTokenArtifact.abi,
      bytecode: CTBALTokenArtifact.bytecode as `0x${string}`,
      args: [
        "Clinical Test Blockchain Token", // name
        "CTBAL",                         // symbol
        parseEther("1000000")            // 1M initial supply
      ],
    });

    console.log("📝 Transaction hash:", tokenHash);
    
    const tokenReceipt = await publicClient.waitForTransactionReceipt({ hash: tokenHash });
    const tokenAddress = tokenReceipt.contractAddress!;
    
    console.log("✅ CTBALToken deployed to:", tokenAddress);

    // Deploy CTBALAnalytics
    console.log("\n📊 Deploying CTBALAnalytics...");
    
    const analyticsHash = await walletClient.deployContract({
      abi: CTBALAnalyticsArtifact.abi,
      bytecode: CTBALAnalyticsArtifact.bytecode as `0x${string}`,
      args: [tokenAddress],
    });

    console.log("📝 Transaction hash:", analyticsHash);
    
    const analyticsReceipt = await publicClient.waitForTransactionReceipt({ hash: analyticsHash });
    const analyticsAddress = analyticsReceipt.contractAddress!;
    
    console.log("✅ CTBALAnalytics deployed to:", analyticsAddress);

    // Verify deployments by reading contract data
    console.log("\n🔍 Verifying deployments...");
    
    // Read token info
    const name = await publicClient.readContract({
      address: tokenAddress,
      abi: CTBALTokenArtifact.abi,
      functionName: 'name',
    });
    
    const symbol = await publicClient.readContract({
      address: tokenAddress,
      abi: CTBALTokenArtifact.abi,
      functionName: 'symbol',
    });
    
    const totalSupply = await publicClient.readContract({
      address: tokenAddress,
      abi: CTBALTokenArtifact.abi,
      functionName: 'totalSupply',
    });

    console.log(`📋 Token Name: ${name}`);
    console.log(`📋 Token Symbol: ${symbol}`);
    console.log(`📋 Total Supply: ${formatEther(totalSupply as bigint)} tokens`);

    // Create deployment summary
    const deploymentInfo = {
      network: "sepolia",
      chainId: sepolia.id,
      timestamp: new Date().toISOString(),
      deployer: account.address,
      transactions: {
        token: tokenHash,
        analytics: analyticsHash
      },
      contracts: {
        CTBALToken: {
          address: tokenAddress,
          name: name,
          symbol: symbol,
          totalSupply: (totalSupply as bigint).toString(),
        },
        CTBALAnalytics: {
          address: analyticsAddress
        }
      },
      gasUsed: {
        token: tokenReceipt.gasUsed.toString(),
        analytics: analyticsReceipt.gasUsed.toString()
      }
    };

    console.log("\n🎯 DEPLOYMENT SUMMARY");
    console.log("====================");
    console.log(`Network: Sepolia (Chain ID: ${sepolia.id})`);
    console.log(`CTBALToken: ${tokenAddress}`);
    console.log(`CTBALAnalytics: ${analyticsAddress}`);
    console.log(`Deployer: ${account.address}`);
    console.log(`Gas Used: ${tokenReceipt.gasUsed} + ${analyticsReceipt.gasUsed}`);

    // Save to file
    const deploymentFile = `sepolia-deployment-${Date.now()}.json`;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n📄 Deployment info saved to: ${deploymentFile}`);

    console.log("\n🔍 ETHERSCAN VERIFICATION");
    console.log("=========================");
    console.log("To verify contracts on Etherscan, run:");
    console.log(`npx hardhat verify --network sepolia ${tokenAddress} "Clinical Test Blockchain Token" "CTBAL" "${parseEther("1000000")}"`);
    console.log(`npx hardhat verify --network sepolia ${analyticsAddress} ${tokenAddress}`);

    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log(`View on Etherscan: https://sepolia.etherscan.io/address/${tokenAddress}`);
    console.log("Ready for CSV import!");

    return deploymentInfo;

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