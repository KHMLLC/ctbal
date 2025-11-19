import * as fs from "fs";
import * as path from "path";

interface CsvRecord {
  [key: string]: string;
}

function parseCsvFile(filePath: string): CsvRecord[] {
  try {
    console.log(`📖 Reading CSV file: ${filePath}`);
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error("CSV must have at least a header and one data row");
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log(`📋 Found columns: ${headers.join(', ')}`);
    
    const records: CsvRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const record: CsvRecord = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      
      records.push(record);
    }

    console.log(`✅ Parsed ${records.length} records`);
    return records;
  } catch (error) {
    console.error(`❌ Failed to parse CSV: ${error}`);
    throw error;
  }
}

function analyzeMortalityData(records: CsvRecord[]) {
  console.log("\n📊 MORTALITY DATA ANALYSIS");
  console.log("==========================");
  
  const ageGroups = { "0-49": 0, "50-74": 0, "75+": 0, "Unknown": 0 };
  const counties: Record<string, number> = {};
  const veterans = records.filter(r => r.Name.includes("Veteran")).length;
  
  records.forEach(record => {
    const birthDate = record["Birth Date"];
    const deathDate = record["Death Date"];
    const county = record.County;
    
    // Calculate age
    if (birthDate && deathDate) {
      const birth = new Date(birthDate);
      const death = new Date(deathDate);
      const age = death.getFullYear() - birth.getFullYear();
      
      if (age < 50) ageGroups["0-49"]++;
      else if (age < 75) ageGroups["50-74"]++;
      else ageGroups["75+"]++;
    } else {
      ageGroups["Unknown"]++;
    }
    
    // Count by county
    if (county) {
      counties[county] = (counties[county] || 0) + 1;
    }
  });
  
  console.log("\n👥 Age Distribution:");
  Object.entries(ageGroups).forEach(([range, count]) => {
    console.log(`  ${range}: ${count} deaths`);
  });
  
  console.log("\n🏥 Geographic Distribution (Top 5):");
  const topCounties = Object.entries(counties)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  topCounties.forEach(([county, count]) => {
    console.log(`  ${county}: ${count} deaths`);
  });
  
  console.log(`\n🎖️  Veterans: ${veterans} records (${((veterans/records.length)*100).toFixed(1)}%)`);
  
  return {
    totalRecords: records.length,
    ageGroups,
    topCounties,
    veteranCount: veterans
  };
}

async function main() {
  console.log("📊 SCRAPE-A-GRAVE CSV ANALYSIS FOR CTBAL");
  console.log("=========================================\n");

  const CSV_FILE_PATH = "./us_recent_deaths.csv";
  
  try {
    // Check if file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      console.log(`❌ CSV file not found: ${CSV_FILE_PATH}`);
      return;
    }
    
    // Parse the CSV
    const records = parseCsvFile(CSV_FILE_PATH);
    
    // Show sample record
    if (records.length > 0) {
      console.log("\n📄 SAMPLE RECORD:");
      const sample = records[0];
      Object.entries(sample).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    }
    
    // Analyze the data
    const analysis = analyzeMortalityData(records);
    
    console.log("\n🎯 CLINICAL TEST MAPPING PREVIEW:");
    console.log("=================================");
    
    // Show how first few records would be mapped to clinical tests
    records.slice(0, 3).forEach((record, index) => {
      const name = record.Name || "";
      const county = record.County || "";
      const state = record.State || "";
      const birthDate = record["Birth Date"] || "";
      const deathDate = record["Death Date"] || "";
      
      let age = 0;
      if (birthDate && deathDate) {
        const birth = new Date(birthDate);
        const death = new Date(deathDate);
        age = death.getFullYear() - birth.getFullYear();
      }
      
      let testType = "Demographic Health Study";
      let tokenReward = 150;
      
      if (age < 50) {
        testType = `Early Mortality Study - Age ${age}`;
        tokenReward = 300;
      } else if (age >= 75) {
        testType = `Geriatric Health Study - Age ${age}`;
        tokenReward = 200;
      }
      
      if (name.includes("Veteran")) {
        testType = `Veteran Health Study - Age ${age}`;
        tokenReward = 300;
      }
      
      console.log(`\nTest ${index + 1}:`);
      console.log(`  Type: ${testType}`);
      console.log(`  Location: ${county}, ${state}`);
      console.log(`  Age: ${age} years`);
      console.log(`  Token Reward: ${tokenReward} CTBAL`);
      console.log(`  Veteran: ${name.includes("Veteran") ? "Yes" : "No"}`);
    });
    
    const totalTokens = records.length * 225; // Average reward estimate
    console.log(`\n💰 ESTIMATED TOTAL TOKENS: ${totalTokens.toLocaleString()} CTBAL`);
    console.log(`📈 CLINICAL RESEARCH VALUE: High (${records.length} epidemiological records)`);
    
    console.log("\n✅ CSV ANALYSIS COMPLETE!");
    console.log("Ready for blockchain import with 'npm run import:csv'");
    
  } catch (error) {
    console.error("❌ Analysis failed:", error);
  }
}

main().catch(console.error);