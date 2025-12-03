import { viem } from 'hardhat';
import * as fs from 'fs';
import * as csv from 'csv-parser';
import { formatEther, parseEther } from 'viem';

interface MortalityRecord {
  name: string;
  city: string;
  county: string;
  state: string;
  deathDate: string;
  birthDate: string;
  age: string;
  cause?: string;
}

interface ProcessedTestData {
  testType: string;
  patientAddress: `0x${string}`;
  state: string;
  county: string; 
  city: string;
  estimatedAge: number;
  ageCategory: string;
  patientCategory: string;
  tokenAllocation: bigint;
  dataHash: string;
  metadataHash: string;
}

function processRecord(record: MortalityRecord, index: number): ProcessedTestData {
  // Clean and standardize state names
  const cleanState = record.state.trim().toLowerCase();
  const stateMapping: { [key: string]: string } = {
    'de': 'Delaware', 'delaware': 'Delaware',
    'ca': 'California', 'california': 'California', 
    'ny': 'New York', 'new york': 'New York',
    'tx': 'Texas', 'texas': 'Texas',
    'fl': 'Florida', 'florida': 'Florida',
    // Add all state mappings...
  };
  
  const standardizedState = stateMapping[cleanState] || 
    record.state.charAt(0).toUpperCase() + record.state.slice(1).toLowerCase();
  
  // Determine age category
  const age = parseInt(record.age) || 75;
  let ageCategory: string;
  if (age < 18) ageCategory = 'Pediatric';
  else if (age < 50) ageCategory = 'Adult';
  else if (age < 75) ageCategory = 'Mid-Life';
  else ageCategory = 'Geriatric';
  
  // Determine test type based on age and other factors
  let testType: string;
  if (age >= 75) {
    testType = record.name.toLowerCase().includes('veteran') ? 
      'Geriatric Care Study (Veteran Population)' : 'Geriatric Care Study';
  } else if (age >= 50) {
    testType = 'Mid-Life Health Analysis';
  } else {
    testType = 'Early Mortality Risk Assessment';
  }
  
  // Patient category
  const patientCategory = record.name.toLowerCase().includes('veteran') ? 'Veteran' : 'Civilian';
  
  // Generate deterministic address based on record data
  const addressSeed = `${record.name}${record.state}${record.city}${index}`;
  const hash = require('crypto').createHash('sha256').update(addressSeed).digest('hex');
  const patientAddress = `0x${hash.substring(0, 40)}` as `0x${string}`;
  
  // Token allocation based on completeness and age category
  let tokenAllocation = parseEther('200'); // Base amount
  if (ageCategory === 'Geriatric') tokenAllocation = parseEther('250');
  if (ageCategory === 'Mid-Life') tokenAllocation = parseEther('300'); 
  if (ageCategory === 'Adult') tokenAllocation = parseEther('350');
  if (patientCategory === 'Veteran') tokenAllocation += parseEther('50');
  
  // Create structured data hash (no more encoding!)
  const structuredData = {
    name: record.name,
    location: {
      city: record.city,
      county: record.county,
      state: standardizedState
    },
    demographics: {
      age: age,
      category: ageCategory,
      patientType: patientCategory
    },
    testInfo: {
      type: testType,
      timestamp: Date.now(),
      source: 'consolidated-mortality-data'
    }
  };
  
  const dataHash = `QmStructured-${Buffer.from(JSON.stringify(structuredData)).toString('hex')}`;
  const metadataHash = `QmMeta-${standardizedState}-${Date.now().toString(16)}`;
  
  return {
    testType,
    patientAddress,
    state: standardizedState,
    county: record.county || 'Unknown County',
    city: record.city || 'Unknown City', 
    estimatedAge: age,
    ageCategory,
    patientCategory,
    tokenAllocation,
    dataHash,
    metadataHash
  };
}

async function deployEnhancedSystem() {
  console.log("🚀 DEPLOYING ENHANCED CTBAL SYSTEM WITH DIRECT DATA ACCESS");
  console.log("=========================================================\n");
  
  // Deploy enhanced token contract
  console.log("📦 Deploying CTBALTokenV2Enhanced with direct geographic access...");
  const tokenContract = await viem.deployContract("CTBALTokenV2Enhanced", []);
  console.log(`✅ CTBALTokenV2Enhanced deployed: ${tokenContract.address}`);
  
  // Grant roles
  const [deployer] = await viem.getWalletClients();
  console.log(`👤 Granting roles to deployer: ${deployer.account.address}`);
  
  await tokenContract.write.grantRole([
    await tokenContract.read.CLINICIAN_ROLE(),
    deployer.account.address
  ]);
  
  console.log("✅ Roles granted\n");
  
  // Load sample data
  const sampleData = [
    {
      name: "John Delaware Smith", 
      city: "Wilmington", 
      county: "New Castle", 
      state: "Delaware",
      deathDate: "2024-01-15",
      birthDate: "1945-03-22", 
      age: "78"
    },
    {
      name: "Maria California Rodriguez",
      city: "Los Angeles", 
      county: "Los Angeles", 
      state: "California",
      deathDate: "2024-02-10",
      birthDate: "1960-07-14",
      age: "63"
    },
    {
      name: "Robert Texas Johnson",
      city: "Houston",
      county: "Harris", 
      state: "Texas", 
      deathDate: "2024-03-05",
      birthDate: "1955-11-30",
      age: "68"
    }
  ];
  
  console.log("📊 Creating enhanced clinical tests with direct data access...");
  
  let successCount = 0;
  for (let i = 0; i < sampleData.length; i++) {
    const record = sampleData[i];
    const processedData = processRecord(record, i);
    
    try {
      console.log(`\n📋 Creating test ${i + 1}:`);
      console.log(`   Patient: ${processedData.patientAddress}`);
      console.log(`   State: ${processedData.state}`);
      console.log(`   County: ${processedData.county}`);
      console.log(`   City: ${processedData.city}`);
      console.log(`   Age: ${processedData.estimatedAge} (${processedData.ageCategory})`);
      console.log(`   Type: ${processedData.testType}`);
      console.log(`   Tokens: ${formatEther(processedData.tokenAllocation)} CTBAL`);
      
      await tokenContract.write.createClinicalTest([
        processedData.testType,
        processedData.patientAddress,
        processedData.state,
        processedData.county,
        processedData.city,
        processedData.estimatedAge,
        processedData.ageCategory,
        processedData.patientCategory,
        processedData.tokenAllocation,
        processedData.dataHash,
        processedData.metadataHash
      ]);
      
      successCount++;
      console.log(`   ✅ Test ${i + 1} created successfully`);
      
    } catch (error) {
      console.log(`   ❌ Failed to create test ${i + 1}:`, error);
    }
  }
  
  console.log(`\n🏁 DEPLOYMENT COMPLETE:`);
  console.log(`===============================`);
  console.log(`📦 Contract: ${tokenContract.address}`);
  console.log(`✅ Tests Created: ${successCount}/${sampleData.length}`);
  
  // Test direct queries
  console.log(`\n🔍 TESTING DIRECT DATA QUERIES:`);
  console.log(`===============================`);
  
  // Query by state
  const delawareTests = await tokenContract.read.getTestsByState(["Delaware"]);
  console.log(`🗺️ Delaware Tests: ${delawareTests.length}`);
  
  const californiaTests = await tokenContract.read.getTestsByState(["California"]);  
  console.log(`🗺️ California Tests: ${californiaTests.length}`);
  
  const texasTests = await tokenContract.read.getTestsByState(["Texas"]);
  console.log(`🗺️ Texas Tests: ${texasTests.length}`);
  
  // Query by age category
  const geriatricTests = await tokenContract.read.getTestsByAgeCategory(["Geriatric"]);
  console.log(`👴 Geriatric Tests: ${geriatricTests.length}`);
  
  const midLifeTests = await tokenContract.read.getTestsByAgeCategory(["Mid-Life"]);
  console.log(`🧔 Mid-Life Tests: ${midLifeTests.length}`);
  
  // Get total count  
  const totalTests = await tokenContract.read.getTotalTestCount();
  console.log(`📊 Total Tests: ${totalTests}`);
  
  // Export deployment info
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    contractAddress: tokenContract.address,
    version: "V2-Enhanced",
    features: [
      "Direct geographic data access",
      "Efficient state-based queries", 
      "Real-time statistics tracking",
      "Enhanced demographic indexing",
      "No hash decoding required"
    ],
    testsCreated: successCount,
    sampleQueries: {
      delawareTests: delawareTests.length,
      californiaTests: californiaTests.length, 
      texasTests: texasTests.length,
      geriatricTests: geriatricTests.length,
      midLifeTests: midLifeTests.length,
      totalTests: Number(totalTests)
    }
  };
  
  fs.writeFileSync('deployment-v2-enhanced.json', JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: deployment-v2-enhanced.json`);
  
  return tokenContract;
}

export default deployEnhancedSystem;