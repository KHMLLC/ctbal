import { createPublicClient, http, formatEther } from 'viem'
import { sepolia } from 'viem/chains'
import dotenv from 'dotenv'
import CTBALTokenArtifact from '../artifacts/contracts/CTBALToken.sol/CTBALToken.json'
import fs from 'fs'
import path from 'path'

dotenv.config()

const CTBAL_TOKEN_ADDRESS = '0xcfab0ab01fd1a4a72601dd30da96fc13b0403246' as const

// Create public client for reading data
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_URL)
})

interface StateData {
  stateName: string
  testCount: number
  firstTestId: number
  lastTestId: number
  tokenAllocation: number
}

async function generateMondayReport() {
  console.log('🎯 MONDAY DEPLOYMENT REPORT')
  console.log('==========================\n')

  // Find actual highest test ID
  let low = 0
  let high = 15000
  let maxTestId = 0

  console.log('📊 Finding Actual Highest Test ID...')
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    try {
      const test = await publicClient.readContract({
        address: CTBAL_TOKEN_ADDRESS,
        abi: CTBALTokenArtifact.abi,
        functionName: 'getClinicalTest',
        args: [mid]
      })
      
      if (test && test[0] !== '') { // Test exists
        maxTestId = mid
        low = mid + 1
      } else {
        high = mid - 1
      }
    } catch {
      high = mid - 1
    }
  }

  console.log(`   ✅ Highest Test ID: ${maxTestId}\n`)

  // Sample tests to analyze state distribution
  console.log('🗺️ Analyzing State Distribution...')
  const stateMap = new Map<string, StateData>()
  const sampleSize = Math.min(maxTestId, 1000)
  const step = Math.max(1, Math.floor(maxTestId / sampleSize))

  let validTests = 0
  for (let i = 1; i <= maxTestId; i += step) {
    try {
      const test = await publicClient.readContract({
        address: CTBAL_TOKEN_ADDRESS,
        abi: CTBALTokenArtifact.abi,
        functionName: 'getClinicalTest',
        args: [i]
      })
      
      if (test && test[0] !== '') {
        validTests++
        const testType = test[0]
        const tokenAllocation = Number(formatEther(test[3]))
        
        // Extract state from test type
        const stateMatch = testType.match(/ - ([A-Z][a-zA-Z\s]+)$/)
        if (stateMatch) {
          const stateName = stateMatch[1].trim()
          const existing = stateMap.get(stateName) || {
            stateName,
            testCount: 0,
            firstTestId: i,
            lastTestId: i,
            tokenAllocation: 0
          }
          
          existing.testCount++
          existing.lastTestId = Math.max(existing.lastTestId, i)
          existing.firstTestId = Math.min(existing.firstTestId, i)
          existing.tokenAllocation += tokenAllocation
          
          stateMap.set(stateName, existing)
        }
      }
    } catch (error) {
      // Skip invalid tests
    }
  }

  const deployedStates = Array.from(stateMap.values()).sort((a, b) => a.stateName.localeCompare(b.stateName))
  
  console.log(`   ✅ Deployed States: ${deployedStates.length}`)
  console.log(`   📈 Sample Tests Analyzed: ${validTests}\n`)

  // Expected states list
  const expectedStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
    'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
    'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
    'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Puerto Rico', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming'
  ]

  const deployedStateNames = new Set(deployedStates.map(s => s.stateName))
  const missingStates = expectedStates.filter(state => !deployedStateNames.has(state))

  // Generate comprehensive report
  const report = `
# CTBAL NATIONWIDE DEPLOYMENT - MONDAY STATUS REPORT
Generated: ${new Date().toISOString()}

## EXECUTIVE SUMMARY
- **Highest Test ID**: ${maxTestId.toLocaleString()}
- **States Deployed**: ${deployedStates.length} of 52 expected (${((deployedStates.length / 52) * 100).toFixed(1)}%)
- **Deployment Status**: ${deployedStates.length === 52 ? '✅ COMPLETE' : '🔄 IN PROGRESS'}
- **Total Token Allocation**: ~${deployedStates.reduce((sum, s) => sum + s.tokenAllocation, 0).toLocaleString()} CTBAL

## DEPLOYED STATES BREAKDOWN
${deployedStates.map(state => 
  `### ${state.stateName}
- **Test Count**: ${state.testCount.toLocaleString()} (sampled)
- **Test ID Range**: ${state.firstTestId} - ${state.lastTestId}
- **Token Allocation**: ${state.tokenAllocation.toLocaleString()} CTBAL`
).join('\n\n')}

## MISSING STATES (${missingStates.length})
${missingStates.map(state => `- ${state}`).join('\n')}

## DEPLOYMENT PROGRESS ANALYSIS
${deployedStates.length < 52 ? `
### Next Steps Required:
1. **Resume Deployment**: Continue from test ID ${maxTestId + 1}
2. **Missing States**: Deploy remaining ${missingStates.length} states
3. **Rate Limiting**: Continue with current batch system (working well)
4. **Analytics Update**: Fix analytics contract issues preventing metrics updates

### Estimated Completion:
- **Remaining Records**: ~${9346 - maxTestId} clinical tests
- **Completion Time**: ~${Math.ceil((9346 - maxTestId) / 100)} batches (${Math.ceil((9346 - maxTestId) / 100 * 5)} minutes)
` : `
### ✅ DEPLOYMENT COMPLETE
All 52 US states and territories successfully deployed to blockchain.
`}

## TECHNICAL STATUS
- **Contract Address**: ${CTBAL_TOKEN_ADDRESS}
- **Network**: Sepolia Testnet
- **Rate Limiting**: Alchemy free tier (working with adaptive delays)
- **Analytics Status**: ⚠️ Update failures (needs investigation)

## MONDAY ACTION ITEMS
1. **Verify Final Count**: Confirm actual vs. reported deployment numbers
2. **Complete Missing States**: Deploy remaining ${missingStates.length} states if needed  
3. **Fix Analytics**: Investigate and resolve analytics contract update failures
4. **Production Planning**: Prepare for mainnet deployment once testing complete

---
*Report generated by CTBAL deployment verification system*
`

  // Save report to file
  const reportPath = path.join(process.cwd(), 'MONDAY_DEPLOYMENT_REPORT.md')
  fs.writeFileSync(reportPath, report)
  
  console.log('📋 MONDAY REPORT GENERATED')
  console.log('=========================')
  console.log(`✅ Deployed States: ${deployedStates.length}/52 (${((deployedStates.length / 52) * 100).toFixed(1)}%)`)
  console.log(`📊 Highest Test ID: ${maxTestId.toLocaleString()}`)
  console.log(`📄 Full Report: ${reportPath}`)
  console.log(`⚠️  Missing States: ${missingStates.length}`)
  
  if (missingStates.length > 0) {
    console.log('\n❌ DEPLOYMENT INCOMPLETE:')
    console.log(`   Still need: ${missingStates.slice(0, 10).join(', ')}${missingStates.length > 10 ? ` +${missingStates.length - 10} more` : ''}`)
  } else {
    console.log('\n🎉 DEPLOYMENT COMPLETE!')
    console.log('   All 52 states successfully deployed')
  }
}

generateMondayReport().catch(console.error)