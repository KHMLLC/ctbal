import { createPublicClient, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load contract artifacts
import CTBALTokenArtifact from '../artifacts/contracts/CTBALToken.sol/CTBALToken.json' assert { type: "json" };
import CTBALAnalyticsArtifact from '../artifacts/contracts/CTBALAnalytics.sol/CTBALAnalytics.json' assert { type: "json" };

dotenv.config();

// Deployed contract addresses
const SEPOLIA_CONTRACTS = {
  CTBALToken: "0xcfab0ab01fd1a4a72601dd30da96fc13b0403246" as `0x${string}`,
  CTBALAnalytics: "0x5b07f9bac1f72cbd5ef931f13d00bb87785eab5d" as `0x${string}`
};

interface ClinicalTest {
  id: number;
  testType: string;
  clinician: string;
  patient: string;
  timestamp: number;
  dataHash: string;
  metadataHash: string;
  validated: boolean;
  completed: boolean;
  tokenAllocation: string;
  approvalCount: number;
  state: string;
  ageCategory: string;
  estimatedAge: number;
  originalName?: string;
  originalLocation?: string;
}

// State abbreviation to full name mapping
const STATE_MAPPING = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  'DC': 'District of Columbia'
};

function extractStateFromDataHash(dataHash: string): string {
  try {
    // Remove IPFS prefix if present
    let encoded = dataHash.replace(/^Qm[A-Za-z0-9-_]*/, '');
    
    if (encoded) {
      try {
        // Try hex decoding
        const decoded = Buffer.from(encoded, 'hex').toString('utf8');
        
        // Check for state names or abbreviations in decoded content
        for (const [abbrev, fullName] of Object.entries(STATE_MAPPING)) {
          if (decoded.toLowerCase().includes(fullName.toLowerCase()) || 
              decoded.toLowerCase().includes(abbrev.toLowerCase())) {
            return fullName;
          }
        }
        
        // Look for JSON structure with location field
        if (decoded.includes('"location":') || decoded.includes('"state":')) {
          const locationMatch = decoded.match(/"(?:location|state)":"([^"]+)"/);
          if (locationMatch) {
            const location = locationMatch[1];
            for (const [abbrev, fullName] of Object.entries(STATE_MAPPING)) {
              if (location.toLowerCase().includes(fullName.toLowerCase()) || 
                  location.toLowerCase().includes(abbrev.toLowerCase())) {
                return fullName;
              }
            }
          }
        }
      } catch (error) {
        // Try base64 decoding as fallback
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        for (const [abbrev, fullName] of Object.entries(STATE_MAPPING)) {
          if (decoded.toLowerCase().includes(fullName.toLowerCase()) || 
              decoded.toLowerCase().includes(abbrev.toLowerCase())) {
            return fullName;
          }
        }
      }
    }
  } catch (error) {
    // Silent fail
  }
  return 'Unknown';
}

function extractNameFromDataHash(dataHash: string): string {
  try {
    // Remove IPFS prefix if present
    let encoded = dataHash.replace(/^Qm[A-Za-z0-9-_]*/, '');
    
    if (encoded) {
      try {
        const decoded = Buffer.from(encoded, 'hex').toString('utf8');
        // Look for JSON structure with name field
        if (decoded.includes('"name":')) {
          const nameMatch = decoded.match(/"name":"([^"]+)"/);
          if (nameMatch) {
            return nameMatch[1];
          }
        }
        return decoded.substring(0, 30).replace(/[^\w\s]/g, ''); // Clean sample
      } catch (error) {
        return 'Encoded Data';
      }
    }
  } catch (error) {
    // Silent fail
  }
  return 'Unknown';
}

async function queryBlockchainByState(targetState?: string) {
  console.log("🗺️  NATIONWIDE BLOCKCHAIN DATA - STATE-FILTERED QUERY (FIXED)");
  console.log("==============================================================\n");

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_URL),
  });

  try {
    // First get the ACTUAL total test count by finding the highest valid test ID
    console.log("📊 FINDING ACTUAL TEST COUNT FROM TOKEN CONTRACT:");
    console.log("==================================================");
    
    let actualTotalTests = 0n;
    let searchRange = 20000n; // Start with reasonable upper bound
    let foundCount = false;
    
    // Binary search approach to find the highest valid test ID
    console.log("🔍 Searching for highest test ID...");
    
    // First, try the analytics count as a starting point
    const overallMetrics = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALAnalytics,
      abi: CTBALAnalyticsArtifact.abi,
      functionName: 'getOverallMetrics',
    }) as [bigint, bigint, bigint, bigint];

    const [analyticsTestCount] = overallMetrics;
    console.log(`📈 Analytics shows: ${analyticsTestCount} tests`);
    
    // Start searching from analytics count and expand
    let testToTry = Math.max(Number(analyticsTestCount), 1000);
    
    while (!foundCount && testToTry < 25000) {
      try {
        await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.CTBALToken,
          abi: CTBALTokenArtifact.abi,
          functionName: 'getClinicalTest',
          args: [BigInt(testToTry)],
        });
        // If successful, this test exists, try higher
        actualTotalTests = BigInt(testToTry);
        testToTry += 1000;
        console.log(`✅ Test ${testToTry - 1000} exists, trying ${testToTry}...`);
      } catch (error) {
        // Failed, so the highest is somewhere between last successful and current
        if (actualTotalTests > 0n) {
          // Fine-tune the search
          for (let fine = Number(actualTotalTests) + 1; fine < testToTry; fine++) {
            try {
              await publicClient.readContract({
                address: SEPOLIA_CONTRACTS.CTBALToken,
                abi: CTBALTokenArtifact.abi,
                functionName: 'getClinicalTest',
                args: [BigInt(fine)],
              });
              actualTotalTests = BigInt(fine);
            } catch {
              break;
            }
          }
        } else {
          // No tests found at all, start from 1
          actualTotalTests = 0n;
        }
        foundCount = true;
      }
    }

    console.log(`🔢 ACTUAL Total Tests in Token Contract: ${actualTotalTests}`);

    // Get remaining analytics metrics for comparison
    const [, completedTests, validatedTests, totalTokens] = overallMetrics;
    
    console.log(`📈 Analytics Contract Shows: ${analyticsTestCount} tests`);
    console.log(`⚠️  Data Lag: ${Number(actualTotalTests) - Number(analyticsTestCount)} tests not in analytics`);
    console.log(`✅ Completed Tests: ${completedTests}`);
    console.log(`🔍 Validated Tests: ${validatedTests}`);
    console.log(`💰 Total National Allocation: ${formatEther(totalTokens)} CTBAL`);
    
    if (targetState) {
      console.log(`🎯 FILTERING FOR: ${targetState.toUpperCase()}`);
    } else {
      console.log(`🌎 EXTRACTING: All States`);
    }
    console.log("");

    // Extract all test data with state parsing using ACTUAL test count
    console.log("🔍 PARSING CONSOLIDATED NATIONAL DATASET (FULL DATA):");
    console.log("=====================================================");
    
    const allTests: ClinicalTest[] = [];
    const testsByState: { [key: string]: ClinicalTest[] } = {};
    const testsByType: { [key: string]: ClinicalTest[] } = {};
    let stateMatchCount = 0;
    let processedCount = 0;

    // Process ALL tests from token contract
    for (let testId = 1; testId <= Number(actualTotalTests); testId++) {
      try {
        const testData = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.CTBALToken,
          abi: CTBALTokenArtifact.abi,
          functionName: 'getClinicalTest',
          args: [BigInt(testId)],
        }) as [bigint, string, string, string, bigint, string, string, boolean, boolean, bigint, bigint];

        const [id, testType, clinician, patient, timestamp, dataHash, metadataHash, validated, completed, tokenAllocation, approvalCount] = testData;

        // Enhanced state extraction from blockchain data
        let extractedState = extractStateFromDataHash(dataHash);
        let originalName = extractNameFromDataHash(dataHash);
        
        // Backup state detection methods
        if (extractedState === 'Unknown') {
          // Check patient address patterns for state encoding
          const patientHex = patient.toLowerCase();
          if (patientHex.includes('000000000000000000000000000000000000')) {
            // Looks like generated address, try to infer from position or other data
            for (const [abbrev, fullName] of Object.entries(STATE_MAPPING)) {
              if (dataHash.toLowerCase().includes(fullName.toLowerCase()) || 
                  dataHash.toLowerCase().includes(abbrev.toLowerCase()) ||
                  testType.toLowerCase().includes(fullName.toLowerCase())) {
                extractedState = fullName;
                break;
              }
            }
          }
        }

        // Age category analysis
        let ageCategory = 'Unknown';
        let estimatedAge = 0;
        
        if (testType.includes('Geriatric')) {
          ageCategory = '75+ (Geriatric)';
          estimatedAge = 80;
        } else if (testType.includes('Mid-Life')) {
          ageCategory = '50-74 (Mid-Life)';
          estimatedAge = 60;
        } else if (testType.includes('Early Mortality') || testType.includes('Youth') || testType.includes('Young Adult')) {
          ageCategory = 'Under 50 (Early Risk)';
          estimatedAge = 40;
        } else if (testType.includes('Pediatric') || testType.includes('Child')) {
          ageCategory = 'Under 18 (Pediatric)';
          estimatedAge = 12;
        }

        const test: ClinicalTest = {
          id: Number(id),
          testType: testType,
          clinician: clinician,
          patient: patient,
          timestamp: Number(timestamp),
          dataHash: dataHash,
          metadataHash: metadataHash,
          validated: validated,
          completed: completed,
          tokenAllocation: formatEther(tokenAllocation),
          approvalCount: Number(approvalCount),
          state: extractedState,
          ageCategory: ageCategory,
          estimatedAge: estimatedAge,
          originalName: originalName
        };

        allTests.push(test);

        // Group by state
        if (!testsByState[extractedState]) {
          testsByState[extractedState] = [];
        }
        testsByState[extractedState].push(test);

        // Group by test type
        if (!testsByType[testType]) {
          testsByType[testType] = [];
        }
        testsByType[testType].push(test);

        if (extractedState !== 'Unknown') {
          stateMatchCount++;
        }

        processedCount++;
        
        // Progress indicator for large datasets
        if (processedCount % 1000 === 0 || processedCount === Number(actualTotalTests)) {
          console.log(`📋 Processed ${processedCount}/${actualTotalTests} tests...`);
        }

      } catch (error) {
        console.log(`⚠️ Error reading test ${testId}:`, error);
      }
    }

    console.log(`\n🏁 PROCESSING COMPLETE:`);
    console.log(`📊 Total Tests Processed: ${allTests.length}`);
    console.log(`🗺️ State Matches Found: ${stateMatchCount}`);
    console.log(`❓ Unknown States: ${allTests.length - stateMatchCount}`);

    // Filter by target state if specified
    let filteredTests: ClinicalTest[] = allTests;
    if (targetState) {
      const targetStateLower = targetState.toLowerCase();
      filteredTests = allTests.filter(test => {
        return test.state.toLowerCase().includes(targetStateLower) || 
               Object.entries(STATE_MAPPING).some(([abbrev, fullName]) => 
                 (abbrev.toLowerCase() === targetStateLower || fullName.toLowerCase() === targetStateLower) &&
                 test.state === fullName
               );
      });
    }

    // Results summary
    console.log(`\n📈 QUERY RESULTS SUMMARY:`);
    console.log(`========================`);
    console.log(`🎯 Target State: ${targetState ? targetState.toUpperCase() : 'ALL STATES'}`);
    console.log(`✅ Matching Tests: ${filteredTests.length}`);
    console.log(`📊 Total National Tests: ${allTests.length}`);

    // State breakdown
    console.log(`\n🗺️ STATE DISTRIBUTION:`);
    console.log(`======================`);
    Object.entries(testsByState)
      .sort(([,a], [,b]) => b.length - a.length)
      .forEach(([state, tests]) => {
        const percentage = ((tests.length / allTests.length) * 100).toFixed(1);
        console.log(`${state.padEnd(20)}: ${tests.length.toString().padStart(5)} tests (${percentage}%)`);
      });

    // Export results
    const exportData = {
      query: {
        timestamp: new Date().toISOString(),
        targetState: targetState || 'all',
        totalTestsFound: filteredTests.length,
        nationalTotal: allTests.length,
        actualTokenTests: Number(actualTotalTests),
        analyticsTests: Number(analyticsTestCount),
        dataLag: Number(actualTotalTests) - Number(analyticsTestCount)
      },
      contracts: SEPOLIA_CONTRACTS,
      tests: filteredTests,
      stateBreakdown: testsByState,
      typeBreakdown: testsByType
    };

    const filename = targetState ? `${targetState.toLowerCase()}-blockchain-data-full.json` : 'national-blockchain-data-full.json';
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    
    console.log(`\n💾 EXPORT COMPLETE:`);
    console.log(`==================`);
    console.log(`📁 File: ${filename}`);
    console.log(`📊 Records: ${filteredTests.length} tests`);
    console.log(`🔍 Data Source: Token Contract (COMPLETE DATASET)`);

    return exportData;

  } catch (error) {
    console.error('❌ Error querying blockchain:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const targetState = process.argv[2];
  
  if (targetState) {
    console.log(`🔍 Querying for state: ${targetState.toUpperCase()}`);
  } else {
    console.log(`🌎 Querying all states`);
  }

  try {
    await queryBlockchainByState(targetState);
    console.log('✅ Query completed successfully');
  } catch (error) {
    console.error('❌ Query failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);