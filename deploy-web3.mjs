import { Web3 } from 'web3';
import fs from 'fs';

// Contract ABIs and bytecode (we'll read from artifacts)
const CONTRACTS_DIR = './artifacts/contracts';

async function deployContract(web3, abi, bytecode, constructorArgs = [], deployerAccount) {
    const contract = new web3.eth.Contract(abi);
    
    const deployTx = contract.deploy({
        data: bytecode,
        arguments: constructorArgs
    });

    const gas = await deployTx.estimateGas({ from: deployerAccount });
    console.log(`   Estimated gas: ${gas}`);

    const gasPrice = await web3.eth.getGasPrice();
    const gasLimit = Math.floor(Number(gas) * 1.2).toString(); // Convert BigInt to string
    
    const deployedContract = await deployTx.send({
        from: deployerAccount,
        gas: gasLimit,
        gasPrice: gasPrice.toString() // Ensure gasPrice is string
    });

    return deployedContract;
}

async function main() {
    console.log("🚀 DEPLOYING CTBAL TO SEPOLIA TESTNET");
    console.log("====================================");

    // Connect to Sepolia via Alchemy
    const web3 = new Web3('https://eth-sepolia.g.alchemy.com/v2/Obg1H5HR5WDAfLN25kIOT');
    
    // Add account from private key
    const privateKey = '0x61b5ffcf05041098f09d6b39c9b54e559615c2c59a73f68790dd5ae68f397be7';
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    console.log("👤 Deployer:", account.address);

    // Check balance
    const balance = await web3.eth.getBalance(account.address);
    console.log("💰 Balance:", web3.utils.fromWei(balance, 'ether'), "ETH");

    try {
        // Read contract artifacts
        console.log("\n📄 Reading contract artifacts...");
        
        const ctbalTokenArtifact = JSON.parse(
            fs.readFileSync(`${CONTRACTS_DIR}/CTBALToken.sol/CTBALToken.json`, 'utf8')
        );
        const ctbalAnalyticsArtifact = JSON.parse(
            fs.readFileSync(`${CONTRACTS_DIR}/CTBALAnalytics.sol/CTBALAnalytics.json`, 'utf8')
        );

        console.log("✅ Contract artifacts loaded");

        // Deploy CTBALToken
        console.log("\n📄 STEP 1: Deploying CTBALToken...");
        
        const initialSupply = web3.utils.toWei('1000000', 'ether'); // 1M tokens
        const ctbalToken = await deployContract(
            web3,
            ctbalTokenArtifact.abi,
            ctbalTokenArtifact.bytecode,
            ["Clinical Test Blockchain Token", "CTBAL", initialSupply],
            account.address
        );

        console.log("✅ CTBALToken deployed successfully!");
        console.log("   Contract address:", ctbalToken.options.address);

        // Deploy CTBALAnalytics
        console.log("\n📊 STEP 2: Deploying CTBALAnalytics...");
        
        const ctbalAnalytics = await deployContract(
            web3,
            ctbalAnalyticsArtifact.abi,
            ctbalAnalyticsArtifact.bytecode,
            [ctbalToken.options.address],
            account.address
        );

        console.log("✅ CTBALAnalytics deployed successfully!");
        console.log("   Contract address:", ctbalAnalytics.options.address);

        console.log("\n🧪 STEP 3: Verifying deployments...");
        
        // Test CTBALToken
        const name = await ctbalToken.methods.name().call();
        const symbol = await ctbalToken.methods.symbol().call();
        const totalSupply = await ctbalToken.methods.totalSupply().call();
        
        console.log(`   Token name: ${name}`);
        console.log(`   Token symbol: ${symbol}`);
        console.log(`   Total supply: ${web3.utils.fromWei(totalSupply, 'ether')} ${symbol}`);

        // Test CTBALAnalytics
        const linkedToken = await ctbalAnalytics.methods.ctbalToken().call();
        console.log(`   Analytics linked token: ${linkedToken}`);

        console.log("\n🎉 🎉 SEPOLIA DEPLOYMENT COMPLETE! 🎉 🎉");
        console.log("==========================================");
        console.log("Network:           Ethereum Sepolia Testnet");
        console.log("CTBALToken:       ", ctbalToken.options.address);
        console.log("CTBALAnalytics:   ", ctbalAnalytics.options.address);
        console.log("Deployer:         ", account.address);
        console.log("Timestamp:        ", new Date().toISOString());

        console.log("\n🔗 VIEW ON ETHERSCAN:");
        console.log("CTBALToken:       https://sepolia.etherscan.io/address/" + ctbalToken.options.address);
        console.log("CTBALAnalytics:   https://sepolia.etherscan.io/address/" + ctbalAnalytics.options.address);

        // Create deployment summary
        const deployment = {
            network: "sepolia",
            chainId: 11155111,
            timestamp: new Date().toISOString(),
            deployer: account.address,
            contracts: {
                CTBALToken: {
                    address: ctbalToken.options.address,
                    name: name,
                    symbol: symbol,
                    totalSupply: web3.utils.fromWei(totalSupply, 'ether')
                },
                CTBALAnalytics: {
                    address: ctbalAnalytics.options.address,
                    linkedToken: linkedToken
                }
            },
            etherscan: {
                CTBALToken: `https://sepolia.etherscan.io/address/${ctbalToken.options.address}`,
                CTBALAnalytics: `https://sepolia.etherscan.io/address/${ctbalAnalytics.options.address}`
            }
        };

        // Save deployment info
        const filename = `sepolia-deployment-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(deployment, null, 2));
        console.log("\n💾 Deployment info saved to:", filename);

        console.log("\n🎯 SUCCESS! Your CTBAL Clinical Test Blockchain is now live on Sepolia!");
        console.log("You can view and interact with your contracts using the Etherscan URLs above.");

    } catch (error) {
        console.error("\n❌ Deployment failed:", error.message);
        throw error;
    }
}

main()
    .then(() => {
        console.log("\n🚀 Deployment completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 Fatal error:", error);
        process.exit(1);
    });