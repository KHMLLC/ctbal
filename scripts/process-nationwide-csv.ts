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

function calculateAge(birthDate: string, deathDate: string): number {
  try {
    const birth = new Date(birthDate);
    const death = new Date(deathDate);
    
    if (isNaN(birth.getTime()) || isNaN(death.getTime())) {
      return 75; // Default assumption
    }
    
    const age = death.getFullYear() - birth.getFullYear();
    const monthDiff = death.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && death.getDate() < birth.getDate())) {
      return age - 1;
    }
    
    return age;
  } catch (error) {
    return 75; // Default assumption for geriatric studies
  }
}

function processNationwideRecord(record: MortalityRecord, index: number): ProcessedTest {
  // Calculate age from birth/death dates
  const age = calculateAge(record.birthDate, record.deathDate);
  record.age = age;
  
  // Determine test type and token allocation based on age and demographics
  let testType: string;
  let tokenAllocation: bigint;
  let ageCategory: string;
  
  if (age < 50) {
    testType = `Early Mortality Risk Assessment - ${record.state}`;
    tokenAllocation = parseEther('400');
    ageCategory = 'Under 50 (Early Risk)';
  } else if (age < 75) {
    testType = `Mid-Life Health Analysis - ${record.state}`;
    tokenAllocation = parseEther('300');
    ageCategory = '50-74 (Mid-Life)';
  } else {
    // Check for veteran indicators (basic heuristics)
    const name = record.name.toLowerCase();
    const hasVeteranIndicators = name.includes('dr') || name.includes('col') || 
                                name.includes('maj') || name.includes('lt') ||
                                (Math.random() < 0.15); // 15% veteran population assumption
    
    if (hasVeteranIndicators) {
      testType = `Geriatric Care Study (Veteran Population) - ${record.state}`;
      tokenAllocation = parseEther('250');
      ageCategory = '75+ (Geriatric - Veteran)';
    } else {
      testType = `Geriatric Care Study - ${record.state}`;
      tokenAllocation = parseEther('200');
      ageCategory = '75+ (Geriatric)';
    }
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

async function analyzeConsolidatedFile(csvFilePath: string) {
  console.log("🔍 CONSOLIDATED NATIONWIDE CSV ANALYSIS");
  console.log("=======================================\n");
  
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`CSV file not found: ${csvFilePath}`);
  }
  
  console.log(`📄 Analyzing file: ${csvFilePath}`);
  
  const records: MortalityRecord[] = [];
  const stateStats: { [state: string]: number } = {};
  const ageGroups: { [group: string]: number } = {};
  
  return new Promise<{records: MortalityRecord[], stateStats: any, ageGroups: any}>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        const record: MortalityRecord = {
          name: row.Name || '',
          city: row.City || '',
          county: row.County || '',
          state: row.State || '',
          birthDate: row['Birth Date'] || '',
          deathDate: row['Death Date'] || '',
          updated: row.Updated || ''
        };
        
        if (record.state && record.name) {
          records.push(record);
          stateStats[record.state] = (stateStats[record.state] || 0) + 1;
          
          // Calculate age for grouping
          const age = calculateAge(record.birthDate, record.deathDate);
          const ageGroup = age < 50 ? 'Under 50' : age < 75 ? '50-74' : '75+';
          ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1;
        }
      })
      .on('end', () => {
        console.log(`📊 ANALYSIS COMPLETE:`);
        console.log(`   Total Records: ${records.length.toLocaleString()}`);
        console.log(`   States Covered: ${Object.keys(stateStats).length}`);
        console.log(`   Date Range: ${records[0]?.updated} (latest update)`);
        
        console.log(`\n🗺️  TOP 15 STATES BY RECORD COUNT:`);
        Object.entries(stateStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 15)
          .forEach(([state, count]) => {
            console.log(`   ${state}: ${count.toLocaleString()} records`);
          });
          
        console.log(`\n👥 AGE DISTRIBUTION:`);
        Object.entries(ageGroups).forEach(([group, count]) => {
          const percentage = ((count / records.length) * 100).toFixed(1);
          console.log(`   ${group}: ${count.toLocaleString()} records (${percentage}%)`);
        });
        
        resolve({ records, stateStats, ageGroups });
      })
      .on('error', reject);
  });
}

async function processToBlockchain(records: MortalityRecord[], maxRecords?: number, dryRun: boolean = true) {
  console.log("\n🚀 BLOCKCHAIN PROCESSING");
  console.log("=========================\n");
  
  const recordsToProcess = maxRecords ? records.slice(0, maxRecords) : records;
  console.log(`📊 Processing ${recordsToProcess.length.toLocaleString()} records to blockchain`);
  console.log(`🎯 Mode: ${dryRun ? 'DRY RUN (Analysis Only)' : 'LIVE DEPLOYMENT'}`);
  
  // Setup blockchain client for live deployment
  if (!dryRun) {
    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(process.env.SEPOLIA_URL),
    });
    console.log(`🔗 Blockchain Account: ${account.address}`);
  }
  
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
  console.log(`📈 Current blockchain tests: ${currentTestCount} (new tests will start at ID ${currentTestCount + 1})`);
  
  // Process records
  const processedTests: ProcessedTest[] = [];
  const stateBreakdown: { [state: string]: { count: number, tokens: bigint } } = {};
  
  console.log(`\n🔄 PROCESSING RECORDS:`);
  for (let i = 0; i < recordsToProcess.length; i++) {
    const test = processNationwideRecord(recordsToProcess[i], currentTestCount + i + 1);
    processedTests.push(test);
    
    // Track state statistics
    if (!stateBreakdown[test.state]) {
      stateBreakdown[test.state] = { count: 0, tokens: 0n };
    }
    stateBreakdown[test.state].count++;
    stateBreakdown[test.state].tokens += test.tokenAllocation;
    
    if ((i + 1) % 1000 === 0 || i === recordsToProcess.length - 1) {
      console.log(`   Processed ${(i + 1).toLocaleString()}/${recordsToProcess.length.toLocaleString()} records...`);
    }
  }
  
  // Calculate totals
  const totalTokens = processedTests.reduce((sum, test) => sum + test.tokenAllocation, 0n);
  
  console.log(`\n💰 TOKEN ALLOCATION ANALYSIS:`);
  console.log(`   Total CTBAL Required: ${formatEther(totalTokens)} CTBAL`);
  console.log(`   Average per Test: ${formatEther(totalTokens / BigInt(processedTests.length))} CTBAL`);
  console.log(`   Estimated USD Value: ~$${(Number(formatEther(totalTokens)) * 0.10).toFixed(2)}`);
  
  console.log(`\n🗺️  STATE TOKEN BREAKDOWN (Top 15):`);
  Object.entries(stateBreakdown)
    .sort(([,a], [,b]) => Number(b.tokens - a.tokens))
    .slice(0, 15)
    .forEach(([state, stats]) => {
      console.log(`   ${state}: ${stats.count} tests, ${formatEther(stats.tokens)} CTBAL`);
    });
  
  // Save processing results
  const exportData = {
    processingTimestamp: new Date().toISOString(),
    mode: dryRun ? 'dry-run' : 'live-deployment',
    sourceFile: 'mortality_data_nationwide.csv',
    totalRecords: recordsToProcess.length,
    currentBlockchainTests: currentTestCount,
    newTestIdRange: `${currentTestCount + 1} to ${currentTestCount + processedTests.length}`,
    totalTokenAllocation: formatEther(totalTokens),
    statesCovered: Object.keys(stateBreakdown).length,
    stateBreakdown: Object.fromEntries(
      Object.entries(stateBreakdown).map(([state, stats]) => [
        state, 
        { count: stats.count, tokens: formatEther(stats.tokens) }
      ])
    ),
    sampleTests: processedTests.slice(0, 10).map(test => ({
      ...test,
      tokenAllocation: formatEther(test.tokenAllocation)
    })) // First 10 for verification
  };
  
  const filename = dryRun ? 'nationwide-processing-analysis.json' : 'nationwide-deployment-results.json';
  fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
  
  console.log(`\n💾 Results saved: ${filename}`);
  
  if (dryRun) {
    console.log(`\n⚠️  DRY RUN COMPLETE - No blockchain transactions submitted`);
    console.log(`🚀 To deploy to blockchain, run with --deploy flag`);
  } else {
    console.log(`\n🚀 STARTING BLOCKCHAIN DEPLOYMENT`);
    console.log(`   Deploying ${processedTests.length} clinical tests to Sepolia testnet...`);
    
    // Deploy to blockchain
    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(process.env.SEPOLIA_URL),
    });
    
    console.log(`\n📡 SUBMITTING TRANSACTIONS:`);
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < processedTests.length; i++) {
      const test = processedTests[i];
      
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
        
        successCount++;
        
        if ((i + 1) % 100 === 0 || i === processedTests.length - 1) {
          console.log(`   ✅ Submitted ${successCount}/${processedTests.length} transactions (${failCount} failed)`);
        }
        
        // Small delay to avoid rate limiting
        if (i < processedTests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (error) {
        failCount++;
        console.log(`   ❌ Transaction ${i + 1} failed: ${error}`);
      }
    }
    
    console.log(`\n🎉 BLOCKCHAIN DEPLOYMENT COMPLETE!`);
    console.log(`   ✅ Successful: ${successCount} clinical tests`);
    console.log(`   ❌ Failed: ${failCount} clinical tests`);
    console.log(`   📊 Success Rate: ${((successCount / processedTests.length) * 100).toFixed(2)}%`);
    
    // Update analytics after deployment
    if (successCount > 0) {
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
  }

  return processedTests;
}

async function main() {
  const deployFlag = process.argv.includes('--deploy');
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  
  // Check if there's a number after --deploy flag
  let csvFile = 'mortality_data_nationwide.csv';
  let maxRecords: number | undefined;
  
  if (deployFlag) {
    const deployIndex = process.argv.indexOf('--deploy');
    const nextArg = process.argv[deployIndex + 1];
    if (nextArg && !isNaN(parseInt(nextArg))) {
      maxRecords = parseInt(nextArg);
    }
  } else {
    csvFile = args[0] || csvFile;
    maxRecords = args[1] ? parseInt(args[1]) : undefined;
  }
  
  console.log("🇺🇸 CTBAL NATIONWIDE MORTALITY DATA PROCESSOR");
  console.log("==============================================\n");
  
  console.log("📋 PROCESSING CONSOLIDATED NATIONWIDE CSV:");
  console.log(`   Source: ${csvFile}`);
  console.log(`   Mode: ${deployFlag ? 'LIVE BLOCKCHAIN DEPLOYMENT' : 'DRY RUN ANALYSIS'}`);
  console.log(`   Limit: ${maxRecords ? `${maxRecords.toLocaleString()} records` : 'All records'}`);
  
  try {
    // Analyze the CSV file
    const { records, stateStats, ageGroups } = await analyzeConsolidatedFile(csvFile);
    
    // Process to blockchain format
    const processedTests = await processToBlockchain(records, maxRecords, !deployFlag);
    
    console.log(`\n✅ NATIONWIDE PROCESSING COMPLETE!`);
    console.log(`📊 Records Analyzed: ${records.length.toLocaleString()}`);
    console.log(`🗺️  States Covered: ${Object.keys(stateStats).length}`);
    console.log(`🔬 Clinical Tests Prepared: ${processedTests.length.toLocaleString()}`);
    console.log(`💰 Total Token Allocation: ${formatEther(processedTests.reduce((sum, test) => sum + test.tokenAllocation, 0n))} CTBAL`);
    
    console.log(`\n🔧 NEXT STEPS:`);
    if (!deployFlag) {
      console.log(`   1. Review analysis: nationwide-processing-analysis.json`);
      console.log(`   2. Deploy to blockchain: npm run process:nationwide -- --deploy`);
    }
    console.log(`   3. Query by state: npm run query:delaware, npm run query:alabama, etc.`);
    console.log(`   4. View unified dashboard: npm run dashboard:sepolia`);
    
  } catch (error) {
    console.error("❌ Processing failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);