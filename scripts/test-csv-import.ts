import * as fs from "fs";
import * as path from "path";

async function testCsvImport() {
  console.log("🔍 Testing CSV Import...");
  
  const csvPath = process.argv[2] || "./csv-processing/mortality_data_20251201.csv";
  const fullPath = path.resolve(csvPath);
  
  console.log(`📂 Looking for file: ${fullPath}`);
  
  if (!fs.existsSync(fullPath)) {
    console.log("❌ File not found!");
    return;
  }
  
  console.log("✅ File exists!");
  
  try {
    const csvContent = fs.readFileSync(fullPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    console.log(`📊 Found ${lines.length} lines (including header)`);
    console.log(`📋 Header: ${lines[0]}`);
    
    if (lines.length > 1) {
      console.log(`📄 First record: ${lines[1]}`);
    }
    
    console.log("✅ CSV parsing test complete!");
    
  } catch (error) {
    console.error("❌ Error reading CSV:", error);
  }
}

testCsvImport().catch(console.error);