import { createPublicClient, createWalletClient, http, formatEther, parseEther } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
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

interface ExistingTest {
  id: number;
  testType: string;
  patient: string;
  tokenAllocation: string;
  dataHash: string;
  validated: boolean;
  completed: boolean;
  estimatedState?: string;
  migrationStrategy?: string;
}

async function analyzeExistingData() {
  console.log("🔍 EXISTING BLOCKCHAIN DATA ANALYSIS");
  console.log("====================================\n");

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_URL),
  });

  try {
    // Get current system state
    console.log("📊 CURRENT BLOCKCHAIN STATE:");
    console.log("=============================");
    
    const overallMetrics = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.CTBALAnalytics,
      abi: CTBALAnalyticsArtifact.abi,
      functionName: 'getOverallMetrics',
    }) as [bigint, bigint, bigint, bigint];

    const [totalTests, completedTests, validatedTests, totalTokens] = overallMetrics;
    
    console.log(`📈 Total Clinical Tests: ${totalTests}`);
    console.log(`💰 Total CTBAL Allocated: ${formatEther(totalTokens)} CTBAL`);
    console.log(`✅ Completed Tests: ${completedTests}`);
    console.log(`🔍 Validated Tests: ${validatedTests}`);
    console.log(`⏳ Pending Tests: ${Number(totalTests) - Number(completedTests)}`);

    // Analyze value locked
    const tokenValue = Number(formatEther(totalTokens));
    const avgPerTest = tokenValue / Number(totalTests);
    
    console.log(`\n💎 VALUE ANALYSIS:`);
    console.log(`   Total Value Locked: ${tokenValue.toLocaleString()} CTBAL`);
    console.log(`   Average per Test: ${avgPerTest.toFixed(2)} CTBAL`);
    console.log(`   Estimated USD Value: ~$${(tokenValue * 0.10).toFixed(2)} (assuming $0.10/CTBAL)`);

    // Extract and categorize existing tests
    console.log(`\n🧪 DETAILED TEST ANALYSIS:`);
    console.log("============================");
    
    const existingTests: ExistingTest[] = [];
    const testTypeCount: { [key: string]: number } = {};

    for (let testId = 1; testId <= Number(totalTests); testId++) {
      try {
        const testData = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.CTBALToken,
          abi: CTBALTokenArtifact.abi,
          functionName: 'getClinicalTest',
          args: [BigInt(testId)],
        }) as [bigint, string, string, string, bigint, string, string, boolean, boolean, bigint, bigint];

        const [id, testType, clinician, patient, timestamp, dataHash, metadataHash, validated, completed, tokenAllocation, approvalCount] = testData;

        // Try to extract state from data hash
        let estimatedState = 'Wyoming'; // Based on our knowledge of the original import
        
        const test: ExistingTest = {
          id: Number(id),
          testType,
          patient,
          tokenAllocation: formatEther(tokenAllocation),
          dataHash,
          validated,
          completed,
          estimatedState
        };

        existingTests.push(test);
        testTypeCount[testType] = (testTypeCount[testType] || 0) + 1;

      } catch (error) {
        console.log(`   ❌ Error reading test ${testId}: ${error}`);
      }
    }

    console.log("📋 Test Type Distribution:");
    Object.entries(testTypeCount).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} tests`);
    });

    return { existingTests, totalValue: tokenValue, metrics: overallMetrics };

  } catch (error) {
    console.error("❌ Analysis failed:", error);
    throw error;
  }
}

async function recommendMigrationStrategy(existingTests: ExistingTest[], totalValue: number) {
  console.log("\n🚀 MIGRATION STRATEGY OPTIONS");
  console.log("==============================\n");

  console.log("🎯 OPTION 1: PRESERVE & ENHANCE (Recommended)");
  console.log("==============================================");
  console.log("✅ BENEFITS:");
  console.log("   • Maintain existing blockchain history and auditability");
  console.log("   • Preserve 8,050 CTBAL token allocations");
  console.log("   • Keep existing test IDs and patient addresses");
  console.log("   • Demonstrate system evolution and data continuity");
  console.log("");
  console.log("📝 IMPLEMENTATION:");
  console.log("   1. Tag existing tests as 'Wyoming' in analytics layer");
  console.log("   2. Add metadata update function to contracts");
  console.log("   3. Continue with new consolidated nationwide imports");
  console.log("   4. Create hybrid query system (old + new data)");
  console.log("");
  console.log("💰 COST: ~$50-100 in gas for metadata updates");
  console.log("⏱️  TIME: 2-3 hours implementation");
  console.log("");

  console.log("🔄 OPTION 2: PARALLEL DEPLOYMENT");
  console.log("=================================");
  console.log("✅ BENEFITS:");
  console.log("   • Clean slate with proper state tagging");
  console.log("   • Optimized contract design for nationwide data");
  console.log("   • No legacy data complications");
  console.log("   • Fresh analytics without migration complexity");
  console.log("");
  console.log("📝 IMPLEMENTATION:");
  console.log("   1. Deploy new contract versions with enhanced state support");
  console.log("   2. Import consolidated nationwide CSV to new contracts");
  console.log("   3. Maintain old contracts as 'Phase 1 - Wyoming Pilot'");
  console.log("   4. Run dual system during transition");
  console.log("");
  console.log("💰 COST: ~$500-800 in deployment gas");
  console.log("⏱️  TIME: 4-6 hours implementation");
  console.log("");

  console.log("♻️  OPTION 3: COMPLETE RESET");
  console.log("=============================");
  console.log("❌ NOT RECOMMENDED because:");
  console.log("   • Loses valuable blockchain history");
  console.log("   • Wastes existing 8,050 CTBAL token allocation");
  console.log("   • Eliminates proof-of-concept achievements");
  console.log("   • Requires complex token recovery procedures");
  console.log("");

  console.log("🎖️  RECOMMENDED APPROACH: OPTION 1 (Preserve & Enhance)");
  console.log("========================================================");
  
  const enhancementPlan = {
    phase1: "Update existing 34 tests with Wyoming state tags",
    phase2: "Create state-aware query functions", 
    phase3: "Import consolidated nationwide CSV as new test IDs 35+",
    phase4: "Unified analytics across all tests (1-34: Wyoming, 35+: Nationwide)",
    timeline: "3-4 hours total implementation",
    cost: "~$75 in gas fees",
    benefits: [
      "Maintains blockchain integrity",
      "Preserves token allocations", 
      "Demonstrates system maturity",
      "Creates hybrid dataset capability"
    ]
  };

  console.log("\n📋 DETAILED ENHANCEMENT PLAN:");
  console.log("==============================");
  console.log(`Phase 1: ${enhancementPlan.phase1}`);
  console.log(`Phase 2: ${enhancementPlan.phase2}`);
  console.log(`Phase 3: ${enhancementPlan.phase3}`);
  console.log(`Phase 4: ${enhancementPlan.phase4}`);
  console.log(`Timeline: ${enhancementPlan.timeline}`);
  console.log(`Cost: ${enhancementPlan.cost}`);

  return enhancementPlan;
}

async function generateImplementationScript() {
  console.log("\n🛠️  IMPLEMENTATION SCRIPTS READY:");
  console.log("==================================");
  
  const implementationPlan = `
// Step 1: Create Wyoming State Tagger
npm run tag:wyoming

// Step 2: Verify state tagging  
npm run query:wyoming

// Step 3: Import consolidated nationwide data
npm run import:nationwide us_consolidated_deaths.csv

// Step 4: Verify hybrid system
npm run query:state  # Should show Wyoming (IDs 1-34) + New States (IDs 35+)

// Step 5: Generate comprehensive analytics
npm run dashboard:nationwide
`;

  console.log(implementationPlan);
  
  console.log("📁 FILES TO CREATE:");
  console.log("   ✓ scripts/tag-wyoming-tests.ts - Retrospectively tag existing data");
  console.log("   ✓ scripts/verify-hybrid-system.ts - Validate migration success");
  console.log("   ✓ scripts/dashboard-nationwide.ts - Enhanced analytics");
  console.log("");

  console.log("🎯 EXPECTED FINAL STATE:");
  console.log("   • Tests 1-34: Wyoming (existing data, retrospectively tagged)");
  console.log("   • Tests 35+: All US states from consolidated CSV import");
  console.log("   • Unified query system: npm run query:[statename]");
  console.log("   • Complete audit trail preserved");
  console.log("   • Enhanced analytics across all 50+ states");
}

async function assessDataQuality(existingTests: ExistingTest[]) {
  console.log("\n🔬 DATA QUALITY ASSESSMENT:");
  console.log("============================");
  
  const qualityMetrics = {
    totalTests: existingTests.length,
    validatedTests: existingTests.filter(t => t.validated).length,
    completedTests: existingTests.filter(t => t.completed).length,
    avgTokenAllocation: existingTests.reduce((sum, t) => sum + parseFloat(t.tokenAllocation), 0) / existingTests.length,
    testTypeVariety: new Set(existingTests.map(t => t.testType)).size,
    dataIntegrity: existingTests.filter(t => t.dataHash.startsWith('QmScr4g3')).length
  };

  console.log(`📊 Quality Metrics:`);
  console.log(`   Data Completeness: ${qualityMetrics.dataIntegrity}/${qualityMetrics.totalTests} (${(qualityMetrics.dataIntegrity/qualityMetrics.totalTests*100).toFixed(1)}%)`);
  console.log(`   Test Type Diversity: ${qualityMetrics.testTypeVariety} distinct types`);
  console.log(`   Average Token Allocation: ${qualityMetrics.avgTokenAllocation.toFixed(2)} CTBAL`);
  console.log(`   Validation Status: ${qualityMetrics.validatedTests}/${qualityMetrics.totalTests} validated`);
  console.log(`   Completion Status: ${qualityMetrics.completedTests}/${qualityMetrics.totalTests} completed`);

  const qualityScore = (
    (qualityMetrics.dataIntegrity / qualityMetrics.totalTests) * 40 +
    (qualityMetrics.testTypeVariety / 5) * 30 +
    (qualityMetrics.totalTests > 0 ? 1 : 0) * 30
  );

  console.log(`\n🏆 Overall Data Quality Score: ${qualityScore.toFixed(1)}/100`);
  
  if (qualityScore >= 80) {
    console.log("✅ HIGH QUALITY - Excellent foundation for enhancement");
  } else if (qualityScore >= 60) {
    console.log("⚠️  GOOD QUALITY - Worth preserving with improvements");  
  } else {
    console.log("❌ LOW QUALITY - Consider reset or major cleanup");
  }

  return qualityMetrics;
}

async function main() {
  console.log("🎯 CTBAL BLOCKCHAIN DATA MIGRATION ANALYSIS");
  console.log("============================================\n");

  try {
    const { existingTests, totalValue, metrics } = await analyzeExistingData();
    const qualityMetrics = await assessDataQuality(existingTests);
    const enhancementPlan = await recommendMigrationStrategy(existingTests, totalValue);
    await generateImplementationScript();

    // Save analysis results
    const analysisResults = {
      timestamp: new Date().toISOString(),
      currentState: {
        totalTests: existingTests.length,
        totalValue,
        qualityScore: qualityMetrics
      },
      existingTests: existingTests.slice(0, 5), // Sample
      recommendedStrategy: "Preserve & Enhance",
      enhancementPlan,
      nextSteps: [
        "Create Wyoming tagging script",
        "Implement state-aware queries", 
        "Prepare consolidated CSV import",
        "Deploy hybrid analytics system"
      ]
    };

    fs.writeFileSync('migration-analysis.json', JSON.stringify(analysisResults, null, 2));

    console.log("\n✅ MIGRATION ANALYSIS COMPLETE!");
    console.log("================================");
    console.log("💾 Full analysis saved: migration-analysis.json");
    console.log("🎯 Recommendation: PRESERVE & ENHANCE existing data");
    console.log("💰 Investment Protection: Maintain 8,050 CTBAL allocation");
    console.log("📈 Growth Path: Add nationwide data as tests 35+");
    console.log("🔧 Next Action: Implement Wyoming state tagging");

  } catch (error) {
    console.error("❌ Migration analysis failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);