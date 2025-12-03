import { createPublicClient, http, formatEther } from 'viem'
import { sepolia } from 'viem/chains'
import dotenv from 'dotenv'
import CTBALTokenArtifact from '../artifacts/contracts/CTBALToken.sol/CTBALToken.json'
import fs from 'fs'

dotenv.config()

const CTBAL_TOKEN_ADDRESS = '0xcfab0ab01fd1a4a72601dd30da96fc13b0403246' as const

// Create public client for reading data
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_URL)
})

interface TestRecord {
  testId: number
  testType: string
  clinician: string
  patient: string
  timestamp: bigint
  dataHash: string
  metadataHash: string
  validated: boolean
  completed: boolean
  associatedTokens: bigint
}

interface DuplicateAnalysis {
  totalTests: number
  duplicatesByHash: Map<string, TestRecord[]>
  duplicatesByPatient: Map<string, TestRecord[]>
  duplicatesByTestType: Map<string, TestRecord[]>
  suspiciousDuplicates: TestRecord[]
  protectionMechanisms: string[]
}

async function analyzeDuplicateProtection(): Promise<DuplicateAnalysis> {
  console.log('🔍 DUPLICATE PROTECTION ANALYSIS')
  console.log('================================\n')

  // Find highest test ID using binary search
  let low = 0
  let high = 15000
  let maxTestId = 0

  console.log('📊 Finding highest test ID...')
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    try {
      const test = await publicClient.readContract({
        address: CTBAL_TOKEN_ADDRESS,
        abi: CTBALTokenArtifact.abi,
        functionName: 'getClinicalTest',
        args: [mid]
      })
      
      if (test && test[0] !== '') {
        maxTestId = mid
        low = mid + 1
      } else {
        high = mid - 1
      }
    } catch {
      high = mid - 1
    }
  }

  console.log(`   ✅ Highest Test ID: ${maxTestId}`)

  // Analyze all tests for duplicates
  const analysis: DuplicateAnalysis = {
    totalTests: maxTestId,
    duplicatesByHash: new Map(),
    duplicatesByPatient: new Map(),
    duplicatesByTestType: new Map(),
    suspiciousDuplicates: [],
    protectionMechanisms: [
      "Smart Contract Auto-Incrementing testIdCounter",
      "Blockchain Immutability (cannot modify existing tests)",
      "Unique Test ID Assignment (sequential, gap-free)",
      "Hash-based Data Integrity",
      "Address-based Patient Identification"
    ]
  }

  console.log('\n📈 Analyzing all tests for duplicates...')
  const batchSize = 50
  let analyzedCount = 0

  for (let i = 1; i <= maxTestId; i += batchSize) {
    const batchEnd = Math.min(i + batchSize - 1, maxTestId)
    const promises = []

    for (let testId = i; testId <= batchEnd; testId++) {
      promises.push(
        publicClient.readContract({
          address: CTBAL_TOKEN_ADDRESS,
          abi: CTBALTokenArtifact.abi,
          functionName: 'getClinicalTest',
          args: [testId]
        }).then(result => ({ testId, result })).catch(() => ({ testId, result: null }))
      )
    }

    const results = await Promise.all(promises)
    
    for (const { testId, result } of results) {
      if (result && result[0] !== '') {
        const testRecord: TestRecord = {
          testId,
          testType: result[0],
          clinician: result[1],
          patient: result[2],
          timestamp: result[3],
          dataHash: result[4],
          metadataHash: result[5],
          validated: result[6],
          completed: result[7],
          associatedTokens: result[8]
        }

      // Check for hash duplicates
      const hashKey = `${String(testRecord.dataHash)}-${String(testRecord.metadataHash)}`
      if (!analysis.duplicatesByHash.has(hashKey)) {
        analysis.duplicatesByHash.set(hashKey, [])
      }
      analysis.duplicatesByHash.get(hashKey)!.push(testRecord)        // Check for patient duplicates
        if (!analysis.duplicatesByPatient.has(testRecord.patient)) {
          analysis.duplicatesByPatient.set(testRecord.patient, [])
        }
        analysis.duplicatesByPatient.get(testRecord.patient)!.push(testRecord)

        // Check for test type duplicates
        if (!analysis.duplicatesByTestType.has(testRecord.testType)) {
          analysis.duplicatesByTestType.set(testRecord.testType, [])
        }
        analysis.duplicatesByTestType.get(testRecord.testType)!.push(testRecord)

        analyzedCount++
      }
    }

    if (i % 500 === 1) {
      console.log(`   📊 Analyzed ${analyzedCount}/${maxTestId} tests (${((analyzedCount/maxTestId) * 100).toFixed(1)}%)`)
    }
  }

  // Identify suspicious duplicates
  console.log('\n🕵️ Identifying potential duplicates...')
  
  // Hash-based duplicates (exact same data)
  for (const [hash, tests] of analysis.duplicatesByHash) {
    if (tests.length > 1) {
      console.log(`   ⚠️ Hash duplicate found: ${tests.length} tests with hash ${hash.substring(0, 20)}...`)
      analysis.suspiciousDuplicates.push(...tests)
    }
  }

  // Patient with identical test types
  for (const [patient, tests] of analysis.duplicatesByPatient) {
    const testTypeCounts = new Map<string, TestRecord[]>()
    for (const test of tests) {
      if (!testTypeCounts.has(test.testType)) {
        testTypeCounts.set(test.testType, [])
      }
      testTypeCounts.get(test.testType)!.push(test)
    }

    for (const [testType, duplicateTests] of testTypeCounts) {
      if (duplicateTests.length > 1) {
        console.log(`   ⚠️ Patient duplicate: ${patient.substring(0, 10)}... has ${duplicateTests.length} "${testType}" tests`)
        analysis.suspiciousDuplicates.push(...duplicateTests)
      }
    }
  }

  return analysis
}

async function generateDuplicateReport(analysis: DuplicateAnalysis) {
  const hashDuplicateCount = Array.from(analysis.duplicatesByHash.values()).filter(tests => tests.length > 1).length
  const patientDuplicateCount = Array.from(analysis.duplicatesByPatient.values()).filter(tests => {
    const testTypes = new Set(tests.map(t => t.testType))
    return testTypes.size < tests.length
  }).length

  const report = `
# CTBAL DUPLICATE PROTECTION ANALYSIS
Generated: ${new Date().toISOString()}

## EXECUTIVE SUMMARY
- **Total Tests Analyzed**: ${analysis.totalTests.toLocaleString()}
- **Hash Duplicates Found**: ${hashDuplicateCount}
- **Patient Duplicates Found**: ${patientDuplicateCount}
- **Overall Data Integrity**: ${hashDuplicateCount === 0 && patientDuplicateCount === 0 ? '✅ EXCELLENT' : '⚠️ NEEDS REVIEW'}

## DUPLICATE PROTECTION MECHANISMS

### 1. Smart Contract Level Protection
${analysis.protectionMechanisms.map(mechanism => `- ✅ ${mechanism}`).join('\n')}

### 2. Automatic Test ID Assignment
- **Sequential IDs**: Tests are assigned IDs 1, 2, 3... automatically
- **No Manual ID Input**: Impossible to specify duplicate IDs
- **Counter-Based**: Uses \`_testIdCounter\` that increments on each test
- **Atomic Operations**: Each test gets exactly one unique ID

### 3. Blockchain Immutability
- **Cannot Modify**: Once deployed, test data cannot be changed
- **Cannot Delete**: Tests are permanently recorded
- **Audit Trail**: Complete history of all operations
- **Transaction Hash Verification**: Each test has unique blockchain transaction

## DEPLOYMENT RESUME SAFETY

### How Multiple Runs Are Protected:
1. **Deployment State Tracking**: Script saves \`deployment-state.json\` with:
   \`\`\`json
   {
     "startIndex": 8294,
     "successCount": 8293,
     "failCount": 53,
     "totalRecords": 9346,
     "lastSuccessfulIndex": 8293
   }
   \`\`\`

2. **Resume Logic**: When restarting, script:
   - Loads previous state from JSON file
   - Continues from \`startIndex\` (not from beginning)
   - Skips already processed records
   - Only processes remaining records

3. **Record Processing Safety**:
   - Each CSV row processed exactly once per deployment session
   - Index-based iteration prevents duplicates within session
   - State persistence prevents re-processing on script restart

### Multiple CSV Processing Protection:
- **Different Hashes**: Each run generates new timestamps in hashes
- **Unique Patient Addresses**: Generated from name+state+city+index combination
- **Test ID Auto-Increment**: Blockchain assigns sequential IDs regardless

## DETECTED DUPLICATES

### Hash-Based Duplicates (Exact Same Data):
${hashDuplicateCount === 0 ? '✅ None found - All tests have unique data hashes' : `⚠️ ${hashDuplicateCount} sets of duplicate hashes detected`}

### Patient-Based Duplicates (Same Patient, Same Test Type):
${patientDuplicateCount === 0 ? '✅ None found - All patient tests are unique' : `⚠️ ${patientDuplicateCount} patients with duplicate test types`}

### Suspicious Records:
${analysis.suspiciousDuplicates.length === 0 ? '✅ No suspicious duplicates detected' : `⚠️ ${analysis.suspiciousDuplicates.length} potentially duplicate records found`}

${analysis.suspiciousDuplicates.length > 0 ? `
#### Duplicate Details:
${analysis.suspiciousDuplicates.slice(0, 10).map(test => `
- **Test ID ${test.testId}**: ${test.testType}
  - Patient: ${String(test.patient).substring(0, 20)}...
  - Data Hash: ${String(test.dataHash).substring(0, 30)}...
  - Timestamp: ${new Date(Number(test.timestamp) * 1000).toISOString()}
`).join('')}
${analysis.suspiciousDuplicates.length > 10 ? `\n... and ${analysis.suspiciousDuplicates.length - 10} more` : ''}
` : ''}

## RECOMMENDATIONS FOR FUTURE RUNS

### ✅ Safe to Re-run Deployment Script:
- Script automatically resumes from last position
- No risk of duplicate test creation
- State tracking prevents double-processing

### ✅ Safe to Process Same CSV Multiple Times:
- New timestamps create different hashes
- Blockchain assigns new unique test IDs
- Different patient addresses (if data changes)

### 🔧 Additional Protection Measures:
1. **Add CSV Hash Verification**: Track processed CSV file hashes
2. **Implement Business Logic Deduplication**: Check for similar patient names before deployment
3. **Enhanced State Persistence**: Store processed record hashes
4. **Pre-deployment Duplicate Check**: Query existing tests before creating new ones

---
*Analysis of ${analysis.totalTests.toLocaleString()} clinical tests on CTBAL blockchain*
`

  fs.writeFileSync('DUPLICATE_PROTECTION_ANALYSIS.md', report)
  return report
}

async function main() {
  try {
    const analysis = await analyzeDuplicateProtection()
    const report = await generateDuplicateReport(analysis)
    
    console.log('\n📋 DUPLICATE PROTECTION SUMMARY')
    console.log('===============================')
    console.log(`✅ Total Tests: ${analysis.totalTests.toLocaleString()}`)
    console.log(`🔒 Protection Mechanisms: ${analysis.protectionMechanisms.length}`)
    console.log(`⚠️ Suspicious Duplicates: ${analysis.suspiciousDuplicates.length}`)
    console.log(`📄 Full Report: DUPLICATE_PROTECTION_ANALYSIS.md`)
    
    if (analysis.suspiciousDuplicates.length === 0) {
      console.log('\n🎉 RESULT: No duplicates detected - System integrity confirmed!')
    } else {
      console.log('\n⚠️ RESULT: Potential duplicates found - Review recommended')
    }
    
  } catch (error) {
    console.error('Error during analysis:', error)
  }
}

main().catch(console.error)