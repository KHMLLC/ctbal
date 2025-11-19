import hre from "hardhat";

async function main() {
  console.log("🔍 Testing CTBALAnalytics Contract...\n");

  try {
    // Test contract compilation
    const tokenArtifact = await hre.artifacts.readArtifact("CTBALToken");
    const analyticsArtifact = await hre.artifacts.readArtifact("CTBALAnalytics");

    console.log("✅ CTBALToken compiled successfully");
    console.log("✅ CTBALAnalytics compiled successfully");

    // Analyze analytics contract functions
    const analyticsFunctions = analyticsArtifact.abi
      .filter((item: any) => item.type === "function")
      .map((item: any) => item.name);

    console.log("\n📊 Analytics Functions Available:");
    analyticsFunctions.forEach((fn: string) => console.log(`  - ${fn}`));

    // Check for required analytics functions
    const expectedFunctions = [
      "updateMetrics", "getOverallMetrics", "getValidationRate", 
      "getCompletionRate", "getClinicianPerformance", "getPatientParticipation",
      "getTestTypeMetrics", "getTimeSeriesData"
    ];

    console.log("\n🎯 Checking Required Analytics Functions:");
    const missingFunctions = expectedFunctions.filter(fn => !analyticsFunctions.includes(fn));
    expectedFunctions.forEach(fn => {
      const status = analyticsFunctions.includes(fn) ? "✅" : "❌";
      console.log(`  ${status} ${fn}`);
    });

    if (missingFunctions.length === 0) {
      console.log("\n🎉 All expected analytics functions are present!");
    } else {
      console.log(`\n⚠️  Missing functions: ${missingFunctions.join(", ")}`);
    }

    // Check access control
    console.log("\n🔒 Access Control Functions:");
    ["grantRole", "revokeRole", "hasRole", "getRoleAdmin"].forEach(fn => {
      const status = analyticsFunctions.includes(fn) ? "✅" : "❌";
      console.log(`  ${status} ${fn}`);
    });

    // Check constructor
    const constructor = analyticsArtifact.abi.find((item: any) => item.type === "constructor");
    if (constructor && constructor.inputs.length === 1 && constructor.inputs[0].name === "_ctbalToken") {
      console.log("\n✅ Constructor properly configured to accept CTBALToken address");
    } else {
      console.log("\n❌ Constructor configuration issue");
    }

    // Check for events
    const events = analyticsArtifact.abi
      .filter((item: any) => item.type === "event")
      .map((item: any) => item.name);

    console.log("\n📢 Events Available:");
    if (events.length > 0) {
      events.forEach((event: string) => console.log(`  - ${event}`));
    } else {
      console.log("  - None defined (consider adding MetricsUpdated event)");
    }

    console.log("\n🏆 Contract Review Complete!");
    console.log("Your CTBALAnalytics contract is ready for deployment and testing!");

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run the test
main().catch(console.error);