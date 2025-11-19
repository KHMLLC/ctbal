import { expect } from "chai";
import hre from "hardhat";

describe("CTBALAnalytics", function () {
  
  describe("Contract Compilation", function () {
    it("Should compile CTBALToken successfully", async function () {
      const tokenArtifact = await hre.artifacts.readArtifact("CTBALToken");
      expect(tokenArtifact.contractName).to.equal("CTBALToken");
    });

    it("Should compile CTBALAnalytics successfully", async function () {
      const analyticsArtifact = await hre.artifacts.readArtifact("CTBALAnalytics");
      expect(analyticsArtifact.contractName).to.equal("CTBALAnalytics");
    });
  });

  describe("Analytics Contract Structure", function () {
    it("Should have required analytics functions", async function () {
      const analyticsArtifact = await hre.artifacts.readArtifact("CTBALAnalytics");
      
      const functionNames = analyticsArtifact.abi
        .filter((item: any) => item.type === 'function')
        .map((item: any) => item.name);

      // Core analytics functions
      expect(functionNames).to.include('updateMetrics');
      expect(functionNames).to.include('getOverallMetrics');
      expect(functionNames).to.include('getValidationRate');
      expect(functionNames).to.include('getCompletionRate');
      
      // Performance tracking functions
      expect(functionNames).to.include('getClinicianPerformance');
      expect(functionNames).to.include('getPatientParticipation');
      expect(functionNames).to.include('getTestTypeMetrics');
      
      // Time series data
      expect(functionNames).to.include('getTimeSeriesData');
    });

    it("Should have proper access control functions", async function () {
      const analyticsArtifact = await hre.artifacts.readArtifact("CTBALAnalytics");
      
      const functionNames = analyticsArtifact.abi
        .filter((item: any) => item.type === 'function')
        .map((item: any) => item.name);

      // Access control functions from OpenZeppelin
      expect(functionNames).to.include('grantRole');
      expect(functionNames).to.include('revokeRole');
      expect(functionNames).to.include('hasRole');
    });
  });

  describe("Contract Integration", function () {
    it("Should reference CTBALToken correctly", async function () {
      const analyticsArtifact = await hre.artifacts.readArtifact("CTBALAnalytics");
      
      // Check constructor parameters
      const constructor = analyticsArtifact.abi.find((item: any) => item.type === 'constructor');
      expect(constructor).to.exist;
      expect(constructor.inputs).to.have.lengthOf(1);
      expect(constructor.inputs[0].name).to.equal('_ctbalToken');
      expect(constructor.inputs[0].type).to.equal('address');
    });
  });
});