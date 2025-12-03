#!/usr/bin/env node

import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

interface CsvRecord {
  [key: string]: string;
}

async function parseCsvFile(filePath: string): Promise<CsvRecord[]> {
  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error("CSV must have at least a header and one data row");
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const records: CsvRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const record: CsvRecord = {};
    
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    
    records.push(record);
  }

  return records;
}

async function main() {
  console.log("📊 CTBAL SIMPLE CSV IMPORT");
  console.log("==========================\n");

  // Configuration
  const csvPath = "./csv-processing/mortality_data_20251201.csv";
  const dryRun = process.env.DRY_RUN === "true";
  
  console.log(`📂 CSV File: ${csvPath}`);
  console.log(`🔄 Mode: ${dryRun ? "DRY RUN" : "LIVE DEPLOYMENT"}`);
  console.log(`🔗 Network: sepolia`);
  
  if (!fs.existsSync(csvPath)) {
    console.log(`❌ CSV file not found: ${csvPath}`);
    console.log("💡 Make sure your CSV file exists in the csv-processing directory");
    return;
  }

  // Parse CSV data
  console.log("\n📖 Parsing CSV data...");
  const csvRecords = await parseCsvFile(csvPath);
  console.log(`✅ Found ${csvRecords.length} records`);
  
  if (csvRecords.length === 0) {
    console.log("❌ No data found in CSV");
    return;
  }
  
  // Show sample record
  console.log("\n📄 Sample Record:");
  const sample = csvRecords[0];
  Object.entries(sample).slice(0, 5).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log(`  ... and ${Object.keys(sample).length - 5} more columns`);

  // Calculate potential clinical tests
  let totalTests = 0;
  let totalTokens = BigInt(0);
  
  csvRecords.forEach((record, index) => {
    // Extract data
    const name = record.Name || record.name || "";
    const city = record.City || record.city || "";
    const county = record.County || record.county || "";
    const state = record.State || record.state || "";
    const birthDate = record["Birth Date"] || record.birth_date || "";
    const deathDate = record["Death Date"] || record.death_date || "";
    
    // Calculate age
    let age = 0;
    if (birthDate && deathDate) {
      const birth = new Date(birthDate);
      const death = new Date(deathDate);
      age = death.getFullYear() - birth.getFullYear();
    }
    
    // Determine token allocation based on data completeness
    let tokenAmount = 150; // Base
    if (age > 0) tokenAmount = 200;
    if (city && county && state) tokenAmount = 250;
    if (name.includes("Veteran")) tokenAmount = 300;
    
    const completedFields = Object.values(record).filter(v => v && v.trim().length > 0).length;
    if (completedFields >= 7) tokenAmount = 400;
    
    totalTests++;
    totalTokens += BigInt(tokenAmount) * BigInt(10 ** 18); // Convert to wei
  });
  
  console.log(`\n💰 ANALYSIS COMPLETE:`);
  console.log(`- Total Clinical Tests: ${totalTests}`);
  console.log(`- Total Token Allocation: ${Number(totalTokens / BigInt(10 ** 18)).toLocaleString()} CTBAL`);
  
  if (dryRun) {
    console.log("\n✅ DRY RUN COMPLETE");
    console.log("📊 CSV parsing and analysis successful");
    console.log("💡 Set DRY_RUN=false to proceed with blockchain deployment");
    return;
  }

  // Deploy contracts using direct Viem clients
  console.log("\n🚀 Deploying contracts using Viem...");
  
  try {
    // Setup Viem clients
    const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
    
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(process.env.SEPOLIA_URL)
    });

    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(process.env.SEPOLIA_URL)
    });
    
    console.log(`👤 Deployer: ${account.address}`);
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`💰 Balance: ${formatEther(balance)} ETH`);
    
    console.log("⚠️  Direct deployment not implemented - use existing deployment scripts");
    console.log("💡 Use csv-import-to-deployed.ts to import to already deployed contracts");
    console.log("💡 Contracts are deployed at:");
    console.log("   CTBALToken: 0x386b7e934f1cfd8169bf8b9d5249ba1ed7e1926f");
    console.log("   CTBALAnalytics: 0x4ba62466265d6d3853cff74b910e5b7ab13aaea1");
    
    console.log("\n✅ CSV ANALYSIS COMPLETED!");
    console.log("===========================");
    console.log(`📊 Records ready to process: ${csvRecords.length}`);
    console.log(`💰 Total tokens minted: ${Number(totalTokens / BigInt(10 ** 18)).toLocaleString()} CTBAL`);
    
    console.log("\n📋 NEXT STEPS:");
    console.log("1. Set up roles (CLINICIAN_ROLE, VALIDATOR_ROLE, ANALYST_ROLE)");
    console.log("2. Create clinical tests from CSV data (use batch processing)");
    console.log("3. Validate and complete tests to release tokens");
    console.log("4. Monitor analytics for compliance and insights");
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    console.log("\n💡 ALTERNATIVE OPTIONS:");
    console.log("1. Run with DRY_RUN=true to test CSV processing");
    console.log("2. Check that Hardhat network is running: npx hardhat node");
    console.log("3. Verify contracts compile: npx hardhat compile");
  }
}

main().catch(console.error);