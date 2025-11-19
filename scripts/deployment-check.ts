import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log("🔍 DEPLOYMENT STATUS CHECK");
  console.log("==========================\n");

  try {
    // Check for deployment files
    const currentDir = process.cwd();
    const deploymentFiles = fs.readdirSync(currentDir)
      .filter(file => file.startsWith('deployment-'))
      .sort()
      .reverse();

    if (deploymentFiles.length === 0) {
      console.log("❌ No deployment files found");
      console.log("\n💡 Available deployment commands:");
      console.log("   npm run deploy:local    - Deploy to local hardhat network");
      console.log("   npm run deploy:sepolia  - Deploy to Sepolia testnet");
      console.log("   npm run deploy:quorum   - Deploy to Quorum network");
      console.log("\n🚀 To deploy, first set up your environment:");
      console.log("   npm run setup:env       - Create .env file from template");
      return;
    }

    console.log("📋 FOUND DEPLOYMENTS:");
    console.log("=====================");
    
    for (const file of deploymentFiles) {
      try {
        const deploymentData = JSON.parse(fs.readFileSync(file, 'utf8'));
        const deployDate = new Date(deploymentData.timestamp);
        
        console.log(`\n📄 ${file}`);
        console.log(`   Network:     ${deploymentData.network}`);
        console.log(`   Date:        ${deployDate.toLocaleString()}`);
        console.log(`   Token:       ${deploymentData.contracts?.CTBALToken || 'N/A'}`);
        console.log(`   Analytics:   ${deploymentData.contracts?.CTBALAnalytics || 'N/A'}`);
        console.log(`   Deployer:    ${deploymentData.deployer || 'N/A'}`);
        
        if (deploymentData.verification) {
          console.log(`   Token Name:  ${deploymentData.verification.tokenName}`);
          console.log(`   Symbol:      ${deploymentData.verification.tokenSymbol}`);
          console.log(`   Supply:      ${deploymentData.verification.totalSupply}`);
        }
      } catch (parseError) {
        console.log(`   ❌ Error reading ${file}: Invalid JSON`);
      }
    }

    // Check environment setup
    console.log("\n🔧 ENVIRONMENT CHECK:");
    console.log("=====================");
    
    const envExists = fs.existsSync('.env');
    const envExampleExists = fs.existsSync('.env.example');
    
    console.log(`   .env file:         ${envExists ? '✅ Found' : '❌ Missing'}`);
    console.log(`   .env.example:      ${envExampleExists ? '✅ Found' : '❌ Missing'}`);
    
    if (!envExists && envExampleExists) {
      console.log("\n💡 Setup environment:");
      console.log("   npm run setup:env");
    }

    // Check contract compilation
    console.log("\n📄 CONTRACT CHECK:");
    console.log("==================");
    
    const artifactsDir = './artifacts/contracts';
    const contractsExist = fs.existsSync(artifactsDir);
    
    if (contractsExist) {
      const tokenArtifact = path.join(artifactsDir, 'CTBALToken.sol', 'CTBALToken.json');
      const analyticsArtifact = path.join(artifactsDir, 'CTBALAnalytics.sol', 'CTBALAnalytics.json');
      
      console.log(`   CTBALToken:    ${fs.existsSync(tokenArtifact) ? '✅ Compiled' : '❌ Missing'}`);
      console.log(`   CTBALAnalytics: ${fs.existsSync(analyticsArtifact) ? '✅ Compiled' : '❌ Missing'}`);
    } else {
      console.log("   ❌ No compiled contracts found");
      console.log("   💡 Run: npm run compile");
    }

    // Network status
    console.log("\n🌐 NETWORK CONFIGURATION:");
    console.log("=========================");
    
    const hardhatConfigExists = fs.existsSync('hardhat.config.ts');
    console.log(`   Config file:   ${hardhatConfigExists ? '✅ Found' : '❌ Missing'}`);
    
    if (hardhatConfigExists) {
      const configContent = fs.readFileSync('hardhat.config.ts', 'utf8');
      const hasSepoliaConfig = configContent.includes('sepolia');
      const hasQuorumConfig = configContent.includes('quorum');
      
      console.log(`   Sepolia setup: ${hasSepoliaConfig ? '✅ Configured' : '❌ Not configured'}`);
      console.log(`   Quorum setup:  ${hasQuorumConfig ? '✅ Configured' : '❌ Not configured'}`);
    }

    // Summary and next steps
    console.log("\n🎯 DEPLOYMENT STATUS SUMMARY:");
    console.log("=============================");
    
    if (deploymentFiles.length > 0) {
      const latestDeployment = JSON.parse(fs.readFileSync(deploymentFiles[0], 'utf8'));
      console.log(`✅ Latest deployment: ${latestDeployment.network} (${new Date(latestDeployment.timestamp).toLocaleDateString()})`);
      console.log("✅ System ready for use!");
      
      console.log("\n🚀 NEXT STEPS:");
      console.log("==============");
      console.log("1. Test clinical workflow with deployed contracts");
      console.log("2. Run analytics demos: npm run analytics");
      console.log("3. Monitor system performance");
      
      if (latestDeployment.network === 'sepolia') {
        console.log("4. Plan production Quorum deployment");
      }
    } else {
      console.log("⏳ No active deployments");
      console.log("\n🚀 TO GET STARTED:");
      console.log("==================");
      console.log("1. Setup environment: npm run setup:env");
      console.log("2. Edit .env with your credentials");
      console.log("3. Deploy to testnet: npm run deploy:sepolia");
    }

  } catch (error: any) {
    console.error("❌ CHECK FAILED:");
    console.error(error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});