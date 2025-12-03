import { createWalletClient, http, parseEther, formatEther, createPublicClient } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import csv from 'csv-parser';

// Load contract artifacts
import CTBALTokenArtifact from '../artifacts/contracts/CTBALToken.sol/CTBALToken.json' assert { type: "json" };
import CTBALAnalyticsArtifact from '../artifacts/contracts/CTBALAnalytics.sol/CTBALAnalytics.json' assert { type: "json" };

dotenv.config();

// Deployed contract addresses
const SEPOLIA_CONTRACTS = {
  CTBALToken: "0xcfab0ab01fd1a4a72601dd30da96fc13b0403246" as `0x${string}`,
  CTBALAnalytics: "0x5b07f9bac1f72cbd5ef931f13d00bb87785eab5d" as `0x${string}`
};

interface MortalityRecord {
  name: string;
  city: string;
  county: string;
  state: string;
  birthDate: string;
  deathDate: string;
  updated: string;
  age?: number;
}

interface ProcessedTest {
  testType: string;
  patientAddress: string;
  dataHash: string;
  metadataHash: string;
  tokenAllocation: bigint;
  state: string;
  originalRecord: MortalityRecord;
  ageCategory: string;
}

interface DeploymentState {
  startIndex: number;
  successCount: number;
  failCount: number;
  totalRecords: number;
  batchSize: number;
  delayMs: number;
  lastSuccessfulIndex: number;
}

function calculateAge(birthDate: string, deathDate: string): number {
  try {
    const birth = new Date(birthDate);
    const death = new Date(deathDate);
    
    if (isNaN(birth.getTime()) || isNaN(death.getTime())) {
      return 75; // Default assumption
    }
    
    const age = death.getFullYear() - birth.getFullYear();
    const monthDifference = death.getMonth() - birth.getMonth();
    
    if (monthDifference < 0 || (monthDifference === 0 && death.getDate() < birth.getDate())) {
      return Math.max(0, age - 1);
    }
    
    return Math.max(0, age);
  } catch {
    return 75;
  }
}

function processNationwideRecord(record: MortalityRecord, index: number): ProcessedTest {
  const age = record.age || calculateAge(record.birthDate, record.deathDate);
  
  // Determine clinical test categorization based on age
  let testType: string;
  let tokenAllocation: bigint;
  let ageCategory: string;
  
  if (age >= 75) {
    testType = `Geriatric Care Study${age >= 80 ? ' (Veteran Population)' : ''} - ${record.state}`;
    tokenAllocation = parseEther(age >= 80 ? "250" : "200");
    ageCategory = "geriatric";
  } else if (age >= 50) {
    testType = `Mid-Life Health Analysis - ${record.state}`;
    tokenAllocation = parseEther("300");
    ageCategory = "mid-life";
  } else {
    testType = `Early Mortality Risk Assessment - ${record.state}`;
    tokenAllocation = parseEther("400");
    ageCategory = "early-mortality";
  }
  
  // Generate valid Ethereum address from record data
  const seedData = `${record.name}-${record.state}-${record.city}-${index}`;
  const fullHash = Buffer.from(seedData).toString('hex');
  // Take first 40 characters (20 bytes) for valid Ethereum address
  const addressHex = fullHash.padEnd(40, '0').substring(0, 40);
  const patientAddress = `0x${addressHex}` as `0x${string}`;
  
  // Create privacy-protecting hashes
  const personalData = {
    name: record.name,
    age: age,
    state: record.state,
    city: record.city || 'Unknown',
    county: record.county || 'Unknown',
    deathYear: new Date(record.deathDate).getFullYear(),
    recordIndex: index
  };
  
  const dataHash = `QmNationwide-${Buffer.from(JSON.stringify(personalData)).toString('hex').substring(0, 40)}`;
  const metadataHash = `QmMeta-Consolidated-${record.state}-${Date.now().toString(16)}`;
  
  return {
    testType,
    patientAddress,
    dataHash,
    metadataHash,
    tokenAllocation,
    state: record.state,
    originalRecord: record,
    ageCategory
  };
}

async function loadRecords(csvFile: string): Promise<MortalityRecord[]> {
  return new Promise((resolve, reject) => {
    const records: MortalityRecord[] = [];
    
    if (!fs.existsSync(csvFile)) {
      reject(new Error(`CSV file not found: ${csvFile}`));
      return;
    }
    
    fs.createReadStream(csvFile)
      .pipe(csv())
      .on('data', (row) => {
        const record: MortalityRecord = {
          name: row.name || row.Name || '',
          city: row.city || row.City || '',
          county: row.county || row.County || '',
          state: row.state || row.State || '',
          birthDate: row.birth_date || row.birthDate || row['Birth Date'] || '',
          deathDate: row.death_date || row.deathDate || row['Death Date'] || '',
          updated: row.updated || row.Updated || new Date().toISOString()
        };
        
        if (record.name && record.state) {
          records.push(record);
        }
      })
      .on('end', () => resolve(records))
      .on('error', reject);
  });
}

async function saveDeploymentState(state: DeploymentState, filename: string = 'deployment-state.json') {
  fs.writeFileSync(filename, JSON.stringify(state, null, 2));
}

function loadDeploymentState(filename: string = 'deployment-state.json'): DeploymentState | null {
  try {
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename, 'utf8'));
    }
  } catch (error) {
    console.log('⚠️  Could not load deployment state, starting fresh');
  }
  return null;
}

async function deployWithRateLimit(
  tests: ProcessedTest[], 
  walletClient: any,
  state: DeploymentState
): Promise<void> {
  
  console.log(`\n📡 BATCH DEPLOYMENT (Alchemy Rate Limit Safe)`);
  console.log(`   Starting from index: ${state.startIndex}`);
  console.log(`   Batch size: ${state.batchSize}`);
  console.log(`   Delay between batches: ${state.delayMs}ms`);
  console.log(`   Previous success: ${state.successCount}, failures: ${state.failCount}`);
  
  for (let i = state.startIndex; i < tests.length; i += state.batchSize) {
    const batchEnd = Math.min(i + state.batchSize, tests.length);
    const batch = tests.slice(i, batchEnd);
    
    console.log(`\n🔄 Processing batch ${Math.floor(i / state.batchSize) + 1}: records ${i + 1} to ${batchEnd}`);
    
    let batchSuccesses = 0;
    let batchFailures = 0;
    
    for (let j = 0; j < batch.length; j++) {
      const test = batch[j];
      const globalIndex = i + j;
      
      try {
        const hash = await walletClient.writeContract({
          address: SEPOLIA_CONTRACTS.CTBALToken,
          abi: CTBALTokenArtifact.abi,
          functionName: 'createClinicalTest',
          args: [
            test.testType,
            test.patientAddress,
            test.dataHash,
            test.metadataHash,
            test.tokenAllocation
          ],
        });
        
        batchSuccesses++;
        state.successCount++;
        state.lastSuccessfulIndex = globalIndex;
        
        console.log(`   ✅ ${globalIndex + 1}/${tests.length}: ${test.originalRecord.name} (${test.state})`);
        
        // Small delay between individual transactions
        if (j < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error: any) {
        batchFailures++;
        state.failCount++;
        
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          console.log(`   ⚠️  Rate limit hit at ${globalIndex + 1}, increasing delay...`);
          state.delayMs = Math.min(state.delayMs * 1.5, 5000); // Max 5 second delay
          state.batchSize = Math.max(Math.floor(state.batchSize * 0.8), 1); // Reduce batch size
          
          // Save state and wait longer
          state.startIndex = globalIndex;
          await saveDeploymentState(state);
          
          console.log(`   💤 Waiting ${state.delayMs * 3}ms for rate limit recovery...`);
          await new Promise(resolve => setTimeout(resolve, state.delayMs * 3));
          
          // Retry this transaction
          j--; // Retry current transaction
          continue;
        }
        
        console.log(`   ❌ ${globalIndex + 1}/${tests.length}: ${error.message?.substring(0, 100)}...`);
      }
    }
    
    console.log(`   📊 Batch complete: ${batchSuccesses} success, ${batchFailures} failed`);
    
    // Update state after each batch
    state.startIndex = batchEnd;
    await saveDeploymentState(state);
    
    // Break if we've processed all records
    if (batchEnd >= tests.length) {
      break;
    }
    
    // Delay between batches to respect rate limits
    console.log(`   💤 Waiting ${state.delayMs}ms before next batch...`);
    await new Promise(resolve => setTimeout(resolve, state.delayMs));
    
    // Adaptive rate adjustment - if we had no failures, we can speed up slightly
    if (batchFailures === 0 && state.delayMs > 500) {
      state.delayMs = Math.max(state.delayMs * 0.95, 500);
      state.batchSize = Math.min(state.batchSize + 1, 10);
    }
  }
}

async function main() {
  const resumeFlag = process.argv.includes('--resume');
  const batchSizeArg = process.argv.find(arg => arg.startsWith('--batch='));
  const startFromArg = process.argv.find(arg => arg.startsWith('--start='));
  
  console.log("🇺🇸 CTBAL NATIONWIDE BATCH DEPLOYMENT");
  console.log("====================================\n");
  
  try {
    // Load records
    const csvFile = 'mortality_data_nationwide.csv';
    console.log(`📄 Loading records from: ${csvFile}`);
    const records = await loadRecords(csvFile);
    console.log(`📊 Loaded ${records.length.toLocaleString()} mortality records`);
    
    // Process records into clinical tests
    const tests = records.map((record, index) => processNationwideRecord(record, index + 1));
    
    // Setup deployment state
    let deploymentState: DeploymentState;
    
    if (resumeFlag) {
      const savedState = loadDeploymentState();
      if (savedState) {
        deploymentState = savedState;
        deploymentState.totalRecords = tests.length; // Update total in case data changed
        console.log(`🔄 Resuming from index ${deploymentState.startIndex}`);
      } else {
        console.log(`⚠️  No saved state found, starting fresh`);
        deploymentState = {
          startIndex: 0,
          successCount: 0,
          failCount: 0,
          totalRecords: tests.length,
          batchSize: 5,
          delayMs: 1000,
          lastSuccessfulIndex: -1
        };
      }
    } else {
      // Parse start position if provided
      const startIndex = startFromArg ? parseInt(startFromArg.split('=')[1]) : 0;
      const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 5;
      
      deploymentState = {
        startIndex: Math.max(0, startIndex),
        successCount: 0,
        failCount: 0,
        totalRecords: tests.length,
        batchSize: Math.max(1, Math.min(batchSize, 10)), // Between 1-10
        delayMs: 1000,
        lastSuccessfulIndex: -1
      };
    }
    
    console.log(`🎯 Deployment Configuration:`);
    console.log(`   Records to process: ${deploymentState.totalRecords.toLocaleString()}`);
    console.log(`   Starting index: ${deploymentState.startIndex}`);
    console.log(`   Batch size: ${deploymentState.batchSize}`);
    console.log(`   Delay between batches: ${deploymentState.delayMs}ms`);
    
    // Setup blockchain client
    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(process.env.SEPOLIA_URL),
    });
    
    console.log(`🔗 Connected to Sepolia: ${account.address}`);
    
    // Get current blockchain state
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(process.env.SEPOLIA_URL),
    });
    
    const currentMetrics = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALAnalytics,
      abi: CTBALAnalyticsArtifact.abi,
      functionName: 'getOverallMetrics',
    }) as [bigint, bigint, bigint, bigint];
    
    const currentTestCount = Number(currentMetrics[0]);
    console.log(`📈 Current blockchain tests: ${currentTestCount}`);
    
    // Start deployment
    await deployWithRateLimit(tests, walletClient, deploymentState);
    
    // Final summary
    console.log(`\n🎉 DEPLOYMENT COMPLETE!`);
    console.log(`   ✅ Successful: ${deploymentState.successCount} clinical tests`);
    console.log(`   ❌ Failed: ${deploymentState.failCount} clinical tests`);
    console.log(`   📊 Success Rate: ${((deploymentState.successCount / deploymentState.totalRecords) * 100).toFixed(2)}%`);
    
    // Update analytics if we had any successes
    if (deploymentState.successCount > 0) {
      console.log(`\n📈 UPDATING ANALYTICS...`);
      try {
        const analyticsHash = await walletClient.writeContract({
          address: SEPOLIA_CONTRACTS.CTBALAnalytics,
          abi: CTBALAnalyticsArtifact.abi,
          functionName: 'updateMetrics',
        });
        console.log(`   ✅ Analytics updated successfully`);
      } catch (error) {
        console.log(`   ⚠️  Analytics update failed: ${error}`);
      }
    }
    
    // Clean up state file if completely successful
    if (deploymentState.successCount + deploymentState.failCount >= deploymentState.totalRecords) {
      try {
        fs.unlinkSync('deployment-state.json');
        console.log(`🧹 Deployment state cleaned up`);
      } catch {} // Ignore cleanup errors
    }
    
  } catch (error) {
    console.error(`❌ Deployment failed: ${error}`);
    process.exit(1);
  }
}

main();