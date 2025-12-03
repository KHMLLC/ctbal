import { createWalletClient, createPublicClient, http, parseEther, getContract, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";

// Load environment variables
dotenv.config();

// Contract addresses
const CTBAL_TOKEN_ADDRESS = "0xcfab0ab01fd1a4a72601dd30da96fc13b0403246";
const CTBAL_ANALYTICS_ADDRESS = "0x5b07f9bac1f72cbd5ef931f13d00bb87785eab5d";

// Create clients
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_URL),
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(process.env.SEPOLIA_URL),
});

// Contract ABI for health data submission
const healthDataABI = parseAbi([
  "function createClinicalTest(string testType, address patient, string dataHash, string metadataHash, uint256 tokenAllocation) returns (uint256)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account)",
  "function CLINICIAN_ROLE() view returns (bytes32)",
  "function balanceOf(address) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)"
]);

interface HealthData {
  date: string;
  weight: number;
  glucose: number;
  insulin: number;
  notes?: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function hashHealthData(data: HealthData): string {
  // Simple hash simulation - in production, use proper IPFS or secure hashing
  const dataString = JSON.stringify(data);
  return `health_data_${Buffer.from(dataString).toString('base64').slice(0, 32)}`;
}

function calculateTokenReward(data: HealthData): bigint {
  // Base reward for daily submission
  let reward = 100n;
  
  // Bonus for complete data
  if (data.weight && data.glucose && data.insulin) reward += 50n;
  if (data.bloodPressureSystolic && data.bloodPressureDiastolic) reward += 25n;
  if (data.heartRate) reward += 25n;
  if (data.notes && data.notes.length > 10) reward += 25n;
  
  return parseEther(reward.toString());
}

async function saveHealthDataLocally(data: HealthData): Promise<string> {
  const dataDir = './health_data';
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filename = `health_data_${data.date.replace(/\\//g, '-')}.json`;
  const filepath = `${dataDir}/${filename}`;
  
  // Load existing data or create new file
  let existingData: HealthData[] = [];
  if (fs.existsSync(filepath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (error) {
      console.log("⚠️  Could not read existing data, creating new file");
    }
  }
  
  // Add new entry
  existingData.push(data);
  
  // Save updated data
  fs.writeFileSync(filepath, JSON.stringify(existingData, null, 2));
  console.log(`✅ Health data saved locally: ${filepath}`);
  
  return filepath;
}

async function submitHealthDataToBlockchain(data: HealthData): Promise<string> {
  try {
    const tokenContract = getContract({
      address: CTBAL_TOKEN_ADDRESS,
      abi: healthDataABI,
      client: walletClient,
    });

    const publicTokenContract = getContract({
      address: CTBAL_TOKEN_ADDRESS,
      abi: healthDataABI,
      client: publicClient,
    });

    // Check if user has CLINICIAN_ROLE
    const clinicianRole = await publicTokenContract.read.CLINICIAN_ROLE();
    const hasClinicianRole = await publicTokenContract.read.hasRole([clinicianRole, account.address]);
    
    if (!hasClinicianRole) {
      console.log("⚠️  Granting CLINICIAN_ROLE to submit health data...");
      
      // Check if user is admin
      const adminRole = await publicTokenContract.read.DEFAULT_ADMIN_ROLE();
      const isAdmin = await publicTokenContract.read.hasRole([adminRole, account.address]);
      
      if (isAdmin) {
        const grantRoleHash = await tokenContract.write.grantRole([clinicianRole, account.address]);
        await publicClient.waitForTransactionReceipt({ hash: grantRoleHash });
        console.log("✅ CLINICIAN_ROLE granted");
      } else {
        throw new Error("Need CLINICIAN_ROLE or DEFAULT_ADMIN_ROLE to submit health data");
      }
    }

    // Check token balance and mint if needed
    const balance = await publicTokenContract.read.balanceOf([account.address]);
    const requiredTokens = calculateTokenReward(data);
    
    if (balance < requiredTokens) {
      console.log(`💰 Minting ${(Number(requiredTokens) / 1e18).toFixed(0)} CTBAL tokens for rewards...`);
      const mintHash = await tokenContract.write.mint([account.address, requiredTokens]);
      await publicClient.waitForTransactionReceipt({ hash: mintHash });
      console.log("✅ Tokens minted for rewards");
    }

    // Create data hash and metadata
    const dataHash = hashHealthData(data);
    const metadata = {
      submissionType: "daily_health_data",
      dataPoints: Object.keys(data).length,
      timestamp: Date.now(),
      version: "1.0"
    };
    const metadataHash = `metadata_${Buffer.from(JSON.stringify(metadata)).toString('base64').slice(0, 32)}`;

    // Submit clinical test for health data
    console.log("📤 Submitting health data to blockchain...");
    const testType = `Daily Health Monitoring - ${data.date}`;
    
    const hash = await tokenContract.write.createClinicalTest([
      testType,
      account.address, // Patient is same as clinician for self-monitoring
      dataHash,
      metadataHash,
      requiredTokens
    ]);

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    console.log("✅ Health data submitted to blockchain!");
    console.log(`   Transaction: ${hash}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed}`);
    console.log(`   Reward: ${(Number(requiredTokens) / 1e18).toFixed(0)} CTBAL`);
    
    return hash;

  } catch (error: any) {
    console.error("❌ Blockchain submission failed:");
    console.error(error.message);
    throw error;
  }
}

async function collectHealthData(): Promise<HealthData> {
  console.log("📝 DAILY HEALTH DATA COLLECTION");
  console.log("===============================\n");
  
  const today = new Date().toLocaleDateString();
  console.log(`Date: ${today}\n`);
  
  // Collect required data
  const weightStr = await askQuestion("Enter your weight (lbs): ");
  const glucoseStr = await askQuestion("Enter glucose reading (mg/dL): ");
  const insulinStr = await askQuestion("Enter insulin dosage (units): ");
  
  // Collect optional data
  console.log("\n📊 Optional Additional Data:");
  const systolicStr = await askQuestion("Blood pressure systolic (mmHg) [optional]: ");
  const diastolicStr = await askQuestion("Blood pressure diastolic (mmHg) [optional]: ");
  const heartRateStr = await askQuestion("Heart rate (bpm) [optional]: ");
  const notes = await askQuestion("Notes about today's health [optional]: ");
  
  // Parse and validate data
  const weight = parseFloat(weightStr);
  const glucose = parseFloat(glucoseStr);
  const insulin = parseFloat(insulinStr);
  
  if (isNaN(weight) || isNaN(glucose) || isNaN(insulin)) {
    throw new Error("Weight, glucose, and insulin are required and must be numbers");
  }
  
  if (weight <= 0 || glucose <= 0 || insulin < 0) {
    throw new Error("Invalid health data values");
  }
  
  const healthData: HealthData = {
    date: today,
    weight,
    glucose,
    insulin,
  };
  
  // Add optional data if provided
  if (systolicStr) {
    const systolic = parseFloat(systolicStr);
    if (!isNaN(systolic) && systolic > 0) {
      healthData.bloodPressureSystolic = systolic;
    }
  }
  
  if (diastolicStr) {
    const diastolic = parseFloat(diastolicStr);
    if (!isNaN(diastolic) && diastolic > 0) {
      healthData.bloodPressureDiastolic = diastolic;
    }
  }
  
  if (heartRateStr) {
    const heartRate = parseFloat(heartRateStr);
    if (!isNaN(heartRate) && heartRate > 0) {
      healthData.heartRate = heartRate;
    }
  }
  
  if (notes) {
    healthData.notes = notes;
  }
  
  return healthData;
}

async function showDataSummary(data: HealthData) {
  console.log("\n📋 HEALTH DATA SUMMARY:");
  console.log("========================");
  console.log(`Date: ${data.date}`);
  console.log(`Weight: ${data.weight} lbs`);
  console.log(`Glucose: ${data.glucose} mg/dL`);
  console.log(`Insulin: ${data.insulin} units`);
  
  if (data.bloodPressureSystolic && data.bloodPressureDiastolic) {
    console.log(`Blood Pressure: ${data.bloodPressureSystolic}/${data.bloodPressureDiastolic} mmHg`);
  }
  
  if (data.heartRate) {
    console.log(`Heart Rate: ${data.heartRate} bpm`);
  }
  
  if (data.notes) {
    console.log(`Notes: ${data.notes}`);
  }
  
  const reward = Number(calculateTokenReward(data)) / 1e18;
  console.log(`\n💰 Estimated CTBAL Reward: ${reward.toFixed(0)} tokens`);
}

async function main() {
  console.log("🏥 CTBAL DAILY HEALTH DATA SUBMISSION");
  console.log("=====================================\n");
  
  try {
    // Collect health data from user
    const healthData = await collectHealthData();
    
    // Show summary
    await showDataSummary(healthData);
    
    // Confirm submission
    const confirmSubmit = await askQuestion("\nSubmit this data? (y/n): ");
    
    if (confirmSubmit.toLowerCase() !== 'y' && confirmSubmit.toLowerCase() !== 'yes') {
      console.log("❌ Submission cancelled");
      rl.close();
      return;
    }
    
    // Save locally first
    const localPath = await saveHealthDataLocally(healthData);
    
    // Ask about blockchain submission
    const submitToBlockchain = await askQuestion("Submit to blockchain? (y/n): ");
    
    if (submitToBlockchain.toLowerCase() === 'y' || submitToBlockchain.toLowerCase() === 'yes') {
      try {
        const txHash = await submitHealthDataToBlockchain(healthData);
        console.log("\n🎉 SUCCESS!");
        console.log(`✅ Data saved locally: ${localPath}`);
        console.log(`✅ Data submitted to blockchain: ${txHash}`);
        console.log(`✅ View on Etherscan: https://sepolia.etherscan.io/tx/${txHash}`);
      } catch (blockchainError) {
        console.log("\n⚠️  Blockchain submission failed, but data saved locally");
        console.log("You can retry blockchain submission later");
      }
    } else {
      console.log("\n✅ Data saved locally only");
      console.log("You can submit to blockchain later using the retry script");
    }
    
  } catch (error: any) {
    console.error("❌ ERROR:");
    console.error(error.message);
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log("\n\n👋 Goodbye!");
  rl.close();
  process.exit(0);
});

main().catch((error) => {
  console.error(error);
  rl.close();
  process.exit(1);
});