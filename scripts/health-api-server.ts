import express from 'express';
import cors from 'cors';
import { createWalletClient, createPublicClient, http, parseEther, getContract, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";
import * as fs from "fs";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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

// Contract ABI
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
  weight?: number;
  glucose?: number;
  insulin?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  steps?: number;
  sleepHours?: number;
  notes?: string;
  source: 'manual' | 'apple_health' | 'google_fit' | 'samsung_health' | 'other';
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// Helper functions (reused from submit-daily-health.ts)
function hashHealthData(data: HealthData): string {
  const dataString = JSON.stringify(data);
  return `health_data_${Buffer.from(dataString).toString('base64').slice(0, 32)}`;
}

function calculateTokenReward(data: HealthData): bigint {
  let reward = 50n; // Base reward for API submission
  
  // Bonus for complete data
  if (data.weight) reward += 25n;
  if (data.glucose && data.insulin !== undefined) reward += 50n;
  if (data.bloodPressureSystolic && data.bloodPressureDiastolic) reward += 25n;
  if (data.heartRate) reward += 25n;
  if (data.steps) reward += 15n;
  if (data.sleepHours) reward += 15n;
  if (data.notes && data.notes.length > 10) reward += 25n;
  
  return parseEther(reward.toString());
}

async function saveHealthDataLocally(data: HealthData): Promise<string> {
  const dataDir = './health_data_api';
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filename = `health_api_${data.date.replace(/\//g, '-')}.json`;
  const filepath = `${dataDir}/${filename}`;
  
  let existingData: HealthData[] = [];
  if (fs.existsSync(filepath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (error) {
      console.log("⚠️  Could not read existing data, creating new file");
    }
  }
  
  existingData.push(data);
  fs.writeFileSync(filepath, JSON.stringify(existingData, null, 2));
  
  return filepath;
}

async function submitToBlockchain(data: HealthData): Promise<string> {
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

  // Check and grant roles if needed
  const clinicianRole = await publicTokenContract.read.CLINICIAN_ROLE();
  const hasClinicianRole = await publicTokenContract.read.hasRole([clinicianRole, account.address]);
  
  if (!hasClinicianRole) {
    const adminRole = await publicTokenContract.read.DEFAULT_ADMIN_ROLE();
    const isAdmin = await publicTokenContract.read.hasRole([adminRole, account.address]);
    
    if (isAdmin) {
      const grantRoleHash = await tokenContract.write.grantRole([clinicianRole, account.address]);
      await publicClient.waitForTransactionReceipt({ hash: grantRoleHash });
    } else {
      throw new Error("Need CLINICIAN_ROLE or DEFAULT_ADMIN_ROLE to submit health data");
    }
  }

  // Check balance and mint tokens if needed
  const requiredTokens = calculateTokenReward(data);
  const balance = await publicTokenContract.read.balanceOf([account.address]);
  
  if (balance < requiredTokens) {
    const mintHash = await tokenContract.write.mint([account.address, requiredTokens]);
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
  }

  // Create data and metadata hashes
  const dataHash = hashHealthData(data);
  const metadata = {
    submissionType: "mobile_health_data",
    dataPoints: Object.keys(data).filter(k => k !== 'source' && data[k as keyof HealthData] !== undefined).length,
    timestamp: Date.now(),
    version: "1.0",
    source: data.source
  };
  const metadataHash = `metadata_${Buffer.from(JSON.stringify(metadata)).toString('base64').slice(0, 32)}`;

  // Submit to blockchain
  const testType = `Mobile Health Data - ${data.date} (${data.source})`;
  
  const hash = await tokenContract.write.createClinicalTest([
    testType,
    account.address,
    dataHash,
    metadataHash,
    requiredTokens
  ]);

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  const response: ApiResponse = {
    success: true,
    message: 'CTBAL Health API is running',
    data: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  };
  res.json(response);
});

// Submit health data
app.post('/api/health-data', async (req, res) => {
  try {
    const healthData: HealthData = {
      date: req.body.date || new Date().toLocaleDateString(),
      source: req.body.source || 'other',
      ...req.body
    };

    // Validate required data
    if (!healthData.date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required'
      });
    }

    // Save locally first
    const localPath = await saveHealthDataLocally(healthData);
    
    let txHash = null;
    const submitToChain = req.body.submitToBlockchain !== false; // Default to true

    if (submitToChain) {
      try {
        txHash = await submitToBlockchain(healthData);
      } catch (blockchainError: any) {
        console.error('Blockchain submission failed:', blockchainError.message);
        // Continue with local save only
      }
    }

    const reward = Number(calculateTokenReward(healthData)) / 1e18;
    
    const response: ApiResponse = {
      success: true,
      message: txHash ? 'Health data submitted successfully' : 'Health data saved locally (blockchain submission failed)',
      data: {
        localPath,
        txHash,
        etherscanUrl: txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : null,
        reward: reward,
        dataPoints: Object.keys(healthData).filter(k => k !== 'source' && healthData[k as keyof HealthData] !== undefined).length
      }
    };

    res.json(response);

  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get recent health data
app.get('/api/health-data', (req, res) => {
  try {
    const dataDir = './health_data_api';
    if (!fs.existsSync(dataDir)) {
      return res.json({
        success: true,
        message: 'No health data found',
        data: []
      });
    }

    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
    const allData: HealthData[] = [];

    files.forEach(file => {
      try {
        const data = JSON.parse(fs.readFileSync(`${dataDir}/${file}`, 'utf8'));
        allData.push(...(Array.isArray(data) ? data : [data]));
      } catch (error) {
        console.error(`Error reading ${file}:`, error);
      }
    });

    // Sort by date (newest first)
    allData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const limit = parseInt(req.query.limit as string) || 10;
    const limitedData = allData.slice(0, limit);

    res.json({
      success: true,
      message: `Retrieved ${limitedData.length} health records`,
      data: limitedData
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🏥 CTBAL Health API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Submit data: POST http://localhost:${PORT}/api/health-data`);
  console.log(`📋 Get data: GET http://localhost:${PORT}/api/health-data`);
});

// Keep server running unless explicitly stopped
console.log('\n💡 Server is running. Press Ctrl+C to stop.');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down CTBAL Health API Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down CTBAL Health API Server...');
  process.exit(0);
});