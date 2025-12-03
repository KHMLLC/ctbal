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
    // DataHash format: "QmScr4g3-{base64_encoded_data}"
    if (dataHash.startsWith('QmScr4g3-')) {
      const encoded = dataHash.substring(8);
      // Try to decode the base64-like data to find state information
      try {
        const decoded = Buffer.from(encoded, 'hex').toString('utf8');
        console.log(`Decoded hash sample: ${decoded.substring(0, 50)}...`);
        
        // Look for state patterns in decoded data
        for (const [abbrev, fullName] of Object.entries(STATE_MAPPING)) {
          if (decoded.includes(fullName) || decoded.includes(abbrev)) {
            return fullName;
          }
        }
      } catch (decodeError) {
        // If decode fails, try pattern matching on the hex data
        for (const [abbrev, fullName] of Object.entries(STATE_MAPPING)) {
          const stateHex = Buffer.from(fullName, 'utf8').toString('hex');
          const abbrevHex = Buffer.from(abbrev, 'utf8').toString('hex');
          if (encoded.includes(stateHex) || encoded.includes(abbrevHex)) {
            return fullName;
          }
        }
      }
    }
  } catch (error) {
    console.log(`State extraction error for hash ${dataHash}: ${error}`);
  }
  return 'Unknown';
}

function extractNameFromDataHash(dataHash: string): string {
  try {
    if (dataHash.startsWith('QmScr4g3-')) {
      const encoded = dataHash.substring(8);
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
  console.log("🗺️  NATIONWIDE BLOCKCHAIN DATA - STATE-FILTERED QUERY");
  console.log("=====================================================\n");

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_URL),
  });

  try {
    // Get overall metrics first
    console.log("📊 CONSOLIDATED NATIONAL DATA OVERVIEW:");
    console.log("=======================================");
    
    const overallMetrics = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALAnalytics,
      abi: CTBALAnalyticsArtifact.abi,
      functionName: 'getOverallMetrics',
    }) as [bigint, bigint, bigint, bigint];

    const [totalTests, completedTests, validatedTests, totalTokens] = overallMetrics;
    
    console.log(`🇺🇸 National Clinical Tests: ${totalTests}`);
    console.log(`✅ Completed Tests: ${completedTests}`);
    console.log(`🔍 Validated Tests: ${validatedTests}`);
    console.log(`💰 Total National Allocation: ${formatEther(totalTokens)} CTBAL`);
    
    if (targetState) {
      console.log(`🎯 FILTERING FOR: ${targetState.toUpperCase()}`);
    } else {
      console.log(`🌎 EXTRACTING: All States`);
    }
    console.log("");

    // Extract all test data with state parsing
    console.log("🔍 PARSING CONSOLIDATED NATIONAL DATASET:");
    console.log("=========================================");
    
    const allTests: ClinicalTest[] = [];
    const testsByState: { [key: string]: ClinicalTest[] } = {};
    const testsByType: { [key: string]: ClinicalTest[] } = {};
    let stateMatchCount = 0;

    for (let testId = 1; testId <= Number(totalTests); testId++) {
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
        } else if (testType.includes('Early Mortality')) {
          ageCategory = 'Under 50 (Early Risk)';
          estimatedAge = 40;
        }

        const clinicalTest: ClinicalTest = {
          id: Number(id),
          testType,
          clinician,
          patient,
          timestamp: Number(timestamp),
          dataHash,
          metadataHash,
          validated,
          completed,
          tokenAllocation: formatEther(tokenAllocation),
          approvalCount: Number(approvalCount),
          state: extractedState,
          ageCategory,
          estimatedAge,
          originalName,
          originalLocation: extractedState !== 'Unknown' ? extractedState : undefined
        };

        // Filter by target state if specified
        if (!targetState || 
            extractedState.toLowerCase() === targetState.toLowerCase() ||
            extractedState.toLowerCase().includes(targetState.toLowerCase())) {
          allTests.push(clinicalTest);
          stateMatchCount++;
          
          console.log(`   ✓ Test ${testId}: ${testType} (${extractedState}) - ${clinicalTest.tokenAllocation} CTBAL`);
          
          if (originalName && originalName !== 'Unknown') {
            console.log(`     📝 Original: ${originalName}`);
          }
        } else if (!targetState) {
          allTests.push(clinicalTest);
        }

        // Group by state for analysis
        if (!testsByState[extractedState]) testsByState[extractedState] = [];
        testsByState[extractedState].push(clinicalTest);

        // Group by type
        if (!testsByType[testType]) testsByType[testType] = [];
        testsByType[testType].push(clinicalTest);

      } catch (error) {
        console.log(`   ❌ Test ${testId}: Error parsing - ${error}`);
      }
    }

    // Results summary
    console.log(`\n📊 STATE EXTRACTION RESULTS:`);
    console.log("============================");
    
    if (targetState) {
      console.log(`🎯 ${targetState.toUpperCase()} SPECIFIC RESULTS:`);
      console.log(`   Tests Found: ${stateMatchCount}`);
      console.log(`   Total Allocation: ${allTests.reduce((sum, test) => sum + parseFloat(test.tokenAllocation), 0).toFixed(2)} CTBAL`);
      
      if (stateMatchCount === 0) {
        console.log(`   ❌ No data found for ${targetState}`);
        console.log(`   🔍 Available states in current dataset:`);
        Object.keys(testsByState).forEach(state => {
          console.log(`      • ${state}: ${testsByState[state].length} tests`);
        });
      }
    } else {
      console.log("🗺️  NATIONAL STATE BREAKDOWN:");
      Object.entries(testsByState).forEach(([state, tests]) => {
        const totalTokens = tests.reduce((sum, test) => sum + parseFloat(test.tokenAllocation), 0);
        console.log(`   📍 ${state}: ${tests.length} tests, ${totalTokens.toFixed(2)} CTBAL`);
      });
    }

    // Export filtered data
    const exportData = {
      query: {
        timestamp: new Date().toISOString(),
        targetState: targetState || 'ALL_STATES',
        totalTestsFound: allTests.length,
        nationalTotal: Number(totalTests)
      },
      contracts: SEPOLIA_CONTRACTS,
      tests: allTests,
      stateBreakdown: testsByState,
      typeBreakdown: testsByType
    };

    const filename = targetState 
      ? `${targetState.toLowerCase()}-blockchain-data.json`
      : 'nationwide-blockchain-data.json';
    
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    console.log(`\n💾 State-filtered data exported: ${filename}`);

    return allTests;

  } catch (error) {
    console.error("❌ State query failed:", error);
    throw error;
  }
}

async function main() {
  const targetState = process.argv[2]; // Get state from command line argument
  
  console.log("🎯 CTBAL NATIONWIDE DATA - STATE QUERY TOOL");
  console.log("============================================\n");
  
  if (targetState) {
    console.log(`🎯 Querying for: ${targetState.toUpperCase()}`);
  } else {
    console.log("🌎 Querying all states in consolidated national dataset");
  }
  
  const results = await queryBlockchainByState(targetState);
  
  console.log(`\n✅ QUERY COMPLETE!`);
  console.log(`📊 Results: ${results.length} tests extracted`);
  console.log(`💾 Data source: Single consolidated national blockchain dataset`);
  console.log(`🗺️  State filtering: ${targetState ? `${targetState.toUpperCase()} only` : 'All 50+ states/territories'}`);
  
  console.log(`\n🔧 USAGE EXAMPLES:`);
  console.log(`   npm run query:state          # All states`);
  console.log(`   npm run query:state wyoming  # Wyoming only`);
  console.log(`   npm run query:state delaware # Delaware only`);
  console.log(`   npm run query:state california # California only`);
}

main().catch(console.error);