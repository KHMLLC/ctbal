import { Web3 } from 'web3';

async function checkBalance() {
    const web3 = new Web3('https://eth-sepolia.g.alchemy.com/v2/Obg1H5HR5WDAfLN25kIOT');
    const address = '0xdB8e11f53A9cd422c9854f438c9CfAB167c3019c';
    
    console.log('🔍 Checking Sepolia ETH Balance...');
    console.log('📍 Wallet Address:', address);
    
    try {
        const balance = await web3.eth.getBalance(address);
        const balanceEth = web3.utils.fromWei(balance, 'ether');
        
        console.log('💰 Current Balance:', balanceEth, 'ETH');
        
        if (parseFloat(balanceEth) < 0.01) {
            console.log('\n⚠️  Low Balance Warning!');
            console.log('🚰 You need Sepolia ETH to deploy contracts.');
            console.log('🔗 Get free Sepolia ETH from these faucets:');
            console.log('   • https://sepoliafaucet.com/');
            console.log('   • https://faucets.chain.link/sepolia');
            console.log('   • https://www.alchemy.com/faucets/ethereum-sepolia');
            console.log(`   📧 Use your address: ${address}`);
            console.log('\n📝 Steps to get Sepolia ETH:');
            console.log('   1. Visit one of the faucet URLs above');
            console.log('   2. Paste your address in the faucet');
            console.log('   3. Complete any required verification');
            console.log('   4. Wait for the ETH to arrive (usually 1-5 minutes)');
            console.log('   5. Run this script again to verify');
        } else {
            console.log('✅ Sufficient balance for deployment!');
            console.log('\n🚀 Ready to deploy! Run: npm run deploy:sepolia');
        }
    } catch (error) {
        console.error('❌ Error checking balance:', error.message);
    }
}

checkBalance();