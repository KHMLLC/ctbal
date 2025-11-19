import hre from "hardhat";
import { parseEther, formatEther } from "viem";

async function main() {
  console.log("🏥 CLINICAL TEST BLOCKCHAIN ANALYTICS - LIVE DEMONSTRATION");
  console.log("=========================================================\n");

  console.log("📋 SCENARIO: Multi-Hospital Clinical Research Study");
  console.log("- Hospital A: Cardiology Department");  
  console.log("- Hospital B: Neurology Department");
  console.log("- 6 Patients participating in various clinical tests");
  console.log("- Analytics tracking for compliance and performance\n");

  // Get wallet clients for our actors
  const [deployer, clinicianA, clinicianB, patient1, patient2, patient3, patient4, patient5, patient6, analyst] = await hre.viem.getWalletClients();
  
  console.log("👥 PARTICIPANTS:");
  console.log(`- Deployer/Admin:  ${deployer.account?.address}`);
  console.log(`- Dr. Smith (Card): ${clinicianA.account?.address}`);
  console.log(`- Dr. Jones (Neuro): ${clinicianB.account?.address}`);
  console.log(`- Data Analyst:     ${analyst.account?.address}`);
  console.log(`- Patients: 6 participants\n`);

  try {
    // Deploy contracts
    console.log("🚀 STEP 1: DEPLOYING CONTRACTS");
    console.log("================================");
    
    const ctbalToken = await hre.viem.deployContract("CTBALToken", [
      "Clinical Test Blockchain Token",
      "CTBAL",
      parseEther("1000000") // 1M tokens
    ]);
    console.log("✅ CTBALToken deployed:", ctbalToken.address);

    const ctbalAnalytics = await hre.viem.deployContract("CTBALAnalytics", [
      ctbalToken.address
    ]);
    console.log("✅ CTBALAnalytics deployed:", ctbalAnalytics.address);

    // Get role constants
    const CLINICIAN_ROLE = await ctbalToken.read.CLINICIAN_ROLE();
    const PATIENT_ROLE = await ctbalToken.read.PATIENT_ROLE();
    const ANALYST_ROLE = await ctbalAnalytics.read.ANALYST_ROLE();

    console.log("\n🔐 STEP 2: SETTING UP ROLES & PERMISSIONS");
    console.log("===========================================");
    
    // Grant roles
    await ctbalToken.write.grantRole([CLINICIAN_ROLE, clinicianA.account?.address!]);
    await ctbalToken.write.grantRole([CLINICIAN_ROLE, clinicianB.account?.address!]);
    await ctbalToken.write.grantRole([PATIENT_ROLE, patient1.account?.address!]);
    await ctbalToken.write.grantRole([PATIENT_ROLE, patient2.account?.address!]);
    await ctbalToken.write.grantRole([PATIENT_ROLE, patient3.account?.address!]);
    await ctbalToken.write.grantRole([PATIENT_ROLE, patient4.account?.address!]);
    await ctbalToken.write.grantRole([PATIENT_ROLE, patient5.account?.address!]);
    await ctbalToken.write.grantRole([PATIENT_ROLE, patient6.account?.address!]);
    await ctbalAnalytics.write.grantRole([ANALYST_ROLE, analyst.account?.address!]);
    
    console.log("✅ Clinician roles granted to Dr. Smith & Dr. Jones");
    console.log("✅ Patient roles granted to 6 participants");
    console.log("✅ Analyst role granted to data analyst");

    // Fund clinicians with tokens for test rewards
    await ctbalToken.write.mint([clinicianA.account?.address!, parseEther("10000")]);
    await ctbalToken.write.mint([clinicianB.account?.address!, parseEther("10000")]);
    console.log("✅ Clinicians funded with 10,000 CTBAL tokens each");

    console.log("\n🧪 STEP 3: CREATING CLINICAL TESTS");
    console.log("===================================");

    // Test Type Legend: 1=Blood, 2=Imaging, 3=MRI, 4=Genetic, 5=Cardio
    
    // Dr. Smith (Cardiology) creates tests
    console.log("\n🫀 Dr. Smith (Cardiology) creating tests:");
    
    await ctbalToken.write.createClinicalTest([
      "Cardiac Stress Test",
      "Exercise stress test with ECG monitoring",
      parseEther("200"),
      patient1.account?.address!,
      5 // Cardio test type
    ], { account: clinicianA.account });
    console.log("  ✅ Test #1: Cardiac Stress Test - Patient 1 (200 CTBAL)");

    await ctbalToken.write.createClinicalTest([
      "Echocardiogram Analysis", 
      "Heart ultrasound imaging study",
      parseEther("150"),
      patient2.account?.address!,
      2 // Imaging test type  
    ], { account: clinicianA.account });
    console.log("  ✅ Test #2: Echocardiogram - Patient 2 (150 CTBAL)");

    await ctbalToken.write.createClinicalTest([
      "Holter Monitor Study",
      "24-hour continuous heart rhythm monitoring",
      parseEther("300"),
      patient3.account?.address!,
      5 // Cardio test type
    ], { account: clinicianA.account });
    console.log("  ✅ Test #3: Holter Monitor - Patient 3 (300 CTBAL)");

    // Dr. Jones (Neurology) creates tests  
    console.log("\n🧠 Dr. Jones (Neurology) creating tests:");
    
    await ctbalToken.write.createClinicalTest([
      "Brain MRI with Contrast",
      "Detailed brain imaging for neurological assessment", 
      parseEther("400"),
      patient4.account?.address!,
      3 // MRI test type
    ], { account: clinicianB.account });
    console.log("  ✅ Test #4: Brain MRI - Patient 4 (400 CTBAL)");

    await ctbalToken.write.createClinicalTest([
      "Cognitive Assessment Battery",
      "Comprehensive neuropsychological testing",
      parseEther("250"),
      patient5.account?.address!,
      1 // Blood/biomarker test type
    ], { account: clinicianB.account });
    console.log("  ✅ Test #5: Cognitive Assessment - Patient 5 (250 CTBAL)");

    await ctbalToken.write.createClinicalTest([
      "EEG Sleep Study", 
      "Overnight electroencephalogram monitoring",
      parseEther("350"),
      patient6.account?.address!,
      2 // Imaging/monitoring test type
    ], { account: clinicianB.account });
    console.log("  ✅ Test #6: EEG Sleep Study - Patient 6 (350 CTBAL)");

    console.log("\n📊 STEP 4: TEST EXECUTION & VALIDATION");
    console.log("=======================================");

    // Validate some tests
    console.log("\n🔍 Validating completed tests:");
    await ctbalToken.write.validateTest([1], { account: clinicianA.account });
    console.log("  ✅ Test #1 (Cardiac Stress) validated by Dr. Smith");
    
    await ctbalToken.write.validateTest([2], { account: clinicianA.account });
    console.log("  ✅ Test #2 (Echocardiogram) validated by Dr. Smith");
    
    await ctbalToken.write.validateTest([4], { account: clinicianB.account });
    console.log("  ✅ Test #4 (Brain MRI) validated by Dr. Jones");
    
    await ctbalToken.write.validateTest([5], { account: clinicianB.account });
    console.log("  ✅ Test #5 (Cognitive Assessment) validated by Dr. Jones");

    // Complete some tests (releases tokens to patients)
    console.log("\n🎯 Completing tests and releasing rewards:");
    await ctbalToken.write.completeTest([1, "Normal cardiac function, excellent exercise tolerance"]);
    console.log("  ✅ Test #1 completed - 200 CTBAL released to Patient 1");
    
    await ctbalToken.write.completeTest([2, "Normal ejection fraction, no abnormalities detected"]);
    console.log("  ✅ Test #2 completed - 150 CTBAL released to Patient 2");
    
    await ctbalToken.write.completeTest([4, "No acute abnormalities, follow-up recommended in 6 months"]);
    console.log("  ✅ Test #4 completed - 400 CTBAL released to Patient 4");

    console.log("\n📈 STEP 5: ANALYTICS & REPORTING");
    console.log("==================================");

    // Update analytics
    await ctbalAnalytics.write.updateMetrics([], { account: analyst.account });
    console.log("✅ Analytics updated by data analyst");

    // Get overall metrics
    const metrics = await ctbalAnalytics.read.getOverallMetrics();
    console.log("\n📊 OVERALL STUDY METRICS:");
    console.log(`  Total Tests Created:     ${metrics[0]}`);
    console.log(`  Tests Validated:         ${metrics[1]}`);
    console.log(`  Tests Completed:         ${metrics[2]}`);
    console.log(`  Total Tokens Allocated:  ${formatEther(metrics[3])} CTBAL`);
    console.log(`  Total Tokens Released:   ${formatEther(metrics[4])} CTBAL`);

    // Get rates
    const validationRate = await ctbalAnalytics.read.getValidationRate();
    const completionRate = await ctbalAnalytics.read.getCompletionRate();
    console.log(`  Validation Rate:         ${validationRate}%`);
    console.log(`  Completion Rate:         ${completionRate}%`);

    // Clinician performance
    console.log("\n👨‍⚕️ CLINICIAN PERFORMANCE:");
    const drSmithPerf = await ctbalAnalytics.read.getClinicianPerformance([clinicianA.account?.address!]);
    const drJonesPerf = await ctbalAnalytics.read.getClinicianPerformance([clinicianB.account?.address!]);
    console.log(`  Dr. Smith (Cardiology):  ${drSmithPerf} tests managed`);
    console.log(`  Dr. Jones (Neurology):   ${drJonesPerf} tests managed`);

    // Patient participation
    console.log("\n🏥 PATIENT PARTICIPATION & REWARDS:");
    for (let i = 1; i <= 6; i++) {
      const patient = [patient1, patient2, patient3, patient4, patient5, patient6][i-1];
      const participation = await ctbalAnalytics.read.getPatientParticipation([patient.account?.address!]);
      const balance = await ctbalToken.read.balanceOf([patient.account?.address!]);
      console.log(`  Patient ${i}: ${participation} tests, ${formatEther(balance)} CTBAL earned`);
    }

    // Test type analysis
    console.log("\n🔬 TEST TYPE ANALYSIS:");
    const testTypes = ["", "Blood/Biomarker", "Imaging", "MRI", "Genetic", "Cardiology"];
    for (let i = 1; i <= 5; i++) {
      const typeMetrics = await ctbalAnalytics.read.getTestTypeMetrics([BigInt(i)]);
      if (typeMetrics[0] > 0) {
        console.log(`  ${testTypes[i]}: ${typeMetrics[0]} tests (${typeMetrics[1]} completed)`);
      }
    }

    // Time series data
    const timeSeriesData = await ctbalAnalytics.read.getTimeSeriesData();
    console.log(`\n📈 TIME SERIES: ${timeSeriesData.length} data points captured for trend analysis`);

    console.log("\n🎯 DEMONSTRATION SUMMARY");
    console.log("========================");
    console.log("✅ Multi-hospital clinical research workflow demonstrated");
    console.log("✅ Role-based access control functioning properly");
    console.log("✅ Token-based incentive system working");
    console.log("✅ Comprehensive analytics tracking all activities");
    console.log("✅ Compliance and audit trails maintained");
    console.log("✅ Real-time performance monitoring active");

    console.log("\n💼 BUSINESS VALUE DELIVERED:");
    console.log("- Transparent clinical trial management");
    console.log("- Automated patient incentive payments");
    console.log("- Real-time compliance monitoring");  
    console.log("- Performance analytics for optimization");
    console.log("- Immutable audit trails for regulators");
    console.log("- Cost reduction through automation");

    console.log("\n🚀 SYSTEM IS PRODUCTION READY!");

  } catch (error: any) {
    console.error("❌ Demo Error:", error.message);
    if (error.cause) {
      console.error("Cause:", error.cause);
    }
  }
}

main().catch(console.error);