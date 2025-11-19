import { expect } from "chai";
import { viem } from "hardhat";
import { parseEther, keccak256, toHex } from "viem";

describe("CTBALToken", function () {
  it("Should deploy and have correct name and symbol", async function () {
    const ctbalToken = await viem.deployContract("CTBALToken", [
      "Clinical Testing Blockchain Analytical Ledger",
      "CTBAL", 
      1000000n
    ]);

    expect(await ctbalToken.read.name()).to.equal("Clinical Testing Blockchain Analytical Ledger");
    expect(await ctbalToken.read.symbol()).to.equal("CTBAL");
  });

  it("Should assign total supply to deployer", async function () {
    const [owner] = await viem.getWalletClients();
    
    const ctbalToken = await viem.deployContract("CTBALToken", [
      "Clinical Testing Blockchain Analytical Ledger",
      "CTBAL",
      1000000n
    ]);

    const ownerBalance = await ctbalToken.read.balanceOf([owner.account.address]);
    const totalSupply = await ctbalToken.read.totalSupply();

    expect(ownerBalance).to.equal(totalSupply);
  });

  it("Should grant admin role to deployer", async function () {
    const [owner] = await viem.getWalletClients();
    
    const ctbalToken = await viem.deployContract("CTBALToken", [
      "Clinical Testing Blockchain Analytical Ledger",
      "CTBAL",
      1000000n
    ]);

    const CLINICAL_ADMIN_ROLE = keccak256(toHex("CLINICAL_ADMIN_ROLE"));
    const hasRole = await ctbalToken.read.hasRole([CLINICAL_ADMIN_ROLE, owner.account.address]);
    
    expect(hasRole).to.be.true;
  });

  it("Should allow creating clinical tests by clinicians", async function () {
    const [owner, clinician, patient] = await viem.getWalletClients();
    
    const ctbalToken = await viem.deployContract("CTBALToken", [
      "Clinical Testing Blockchain Analytical Ledger", 
      "CTBAL",
      1000000n
    ]);

    // Grant clinician role
    const CLINICIAN_ROLE = keccak256(toHex("CLINICIAN_ROLE"));
    await ctbalToken.write.grantRole([CLINICIAN_ROLE, clinician.account.address]);
    
    // Transfer tokens to clinician
    await ctbalToken.write.transfer([clinician.account.address, parseEther("1000")]);

    // Create clinical test
    const clinicianContract = await viem.getContractAt("CTBALToken", ctbalToken.address, {
      client: { wallet: clinician }
    });

    await clinicianContract.write.createClinicalTest([
      "Blood Test",
      patient.account.address,
      "QmTest123",
      "QmMeta456", 
      parseEther("100")
    ]);

    // Verify test was created
    const testDetails = await ctbalToken.read.getClinicalTest([1n]);
    expect(testDetails[1]).to.equal("Blood Test"); // testType
    expect(testDetails[2]).to.equal(clinician.account.address); // clinician
    expect(testDetails[3]).to.equal(patient.account.address); // patient
  });

  it("Should allow validators to validate tests", async function () {
    const [owner, clinician, patient, validator] = await viem.getWalletClients();
    
    const ctbalToken = await viem.deployContract("CTBALToken", [
      "Clinical Testing Blockchain Analytical Ledger",
      "CTBAL",
      1000000n
    ]);

    // Grant roles
    const CLINICIAN_ROLE = keccak256(toHex("CLINICIAN_ROLE"));
    const VALIDATOR_ROLE = keccak256(toHex("VALIDATOR_ROLE"));
    await ctbalToken.write.grantRole([CLINICIAN_ROLE, clinician.account.address]);
    await ctbalToken.write.grantRole([VALIDATOR_ROLE, validator.account.address]);
    
    // Transfer tokens and create test
    await ctbalToken.write.transfer([clinician.account.address, parseEther("1000")]);
    
    const clinicianContract = await viem.getContractAt("CTBALToken", ctbalToken.address, {
      client: { wallet: clinician }
    });

    await clinicianContract.write.createClinicalTest([
      "Blood Test",
      patient.account.address,
      "QmTest123", 
      "QmMeta456",
      parseEther("100")
    ]);

    // Validate test
    const validatorContract = await viem.getContractAt("CTBALToken", ctbalToken.address, {
      client: { wallet: validator }
    });
    
    await validatorContract.write.validateClinicalTest([1n]);

    // Check validation
    const testDetails = await ctbalToken.read.getClinicalTest([1n]);
    expect(testDetails[7]).to.be.true; // validated
  });

  it("Should complete tests and transfer tokens to patient", async function () {
    const [owner, clinician, patient, validator] = await viem.getWalletClients();
    
    const ctbalToken = await viem.deployContract("CTBALToken", [
      "Clinical Testing Blockchain Analytical Ledger",
      "CTBAL", 
      1000000n
    ]);

    // Setup roles and tokens
    const CLINICIAN_ROLE = keccak256(toHex("CLINICIAN_ROLE"));
    const VALIDATOR_ROLE = keccak256(toHex("VALIDATOR_ROLE"));
    await ctbalToken.write.grantRole([CLINICIAN_ROLE, clinician.account.address]);
    await ctbalToken.write.grantRole([VALIDATOR_ROLE, validator.account.address]);
    await ctbalToken.write.transfer([clinician.account.address, parseEther("1000")]);

    // Create and validate test
    const clinicianContract = await viem.getContractAt("CTBALToken", ctbalToken.address, {
      client: { wallet: clinician }
    });
    const validatorContract = await viem.getContractAt("CTBALToken", ctbalToken.address, {
      client: { wallet: validator }
    });

    await clinicianContract.write.createClinicalTest([
      "Blood Test",
      patient.account.address,
      "QmTest123",
      "QmMeta456",
      parseEther("100")
    ]);
    
    await validatorContract.write.validateClinicalTest([1n]);

    // Check initial patient balance
    const initialBalance = await ctbalToken.read.balanceOf([patient.account.address]);

    // Complete test
    await clinicianContract.write.completeClinicalTest([1n]);

    // Verify tokens transferred
    const finalBalance = await ctbalToken.read.balanceOf([patient.account.address]);
    expect(finalBalance - initialBalance).to.equal(parseEther("100"));

    // Verify test completion
    const testDetails = await ctbalToken.read.getClinicalTest([1n]);
    expect(testDetails[8]).to.be.true; // completed
  });
});