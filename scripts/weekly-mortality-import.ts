import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

/**
 * Weekly Mortality Data Import Automation
 * Finds the latest mortality data file and imports it automatically
 */

interface FileInfo {
  name: string;
  path: string;
  date: Date;
  dateString: string;
}

function findLatestMortalityFile(): FileInfo | null {
  const scrapeDir = path.join("..", "scrape-a-grave", "processed_csvs");
  
  if (!fs.existsSync(scrapeDir)) {
    console.log(`❌ Directory not found: ${path.resolve(scrapeDir)}`);
    return null;
  }

  // Get all mortality data files
  const files = fs.readdirSync(scrapeDir)
    .filter(file => file.startsWith('mortality_data_') && file.endsWith('.csv'))
    .map(file => {
      // Extract date from filename: mortality_data_YYYYMMDD.csv
      const dateMatch = file.match(/mortality_data_(\d{8})\.csv/);
      if (!dateMatch) return null;
      
      const dateString = dateMatch[1];
      const year = parseInt(dateString.substring(0, 4));
      const month = parseInt(dateString.substring(4, 6)) - 1; // Month is 0-based
      const day = parseInt(dateString.substring(6, 8));
      
      return {
        name: file,
        path: path.join(scrapeDir, file),
        date: new Date(year, month, day),
        dateString
      };
    })
    .filter((file): file is FileInfo => file !== null)
    .sort((a, b) => b.date.getTime() - a.date.getTime()); // Latest first

  return files.length > 0 ? files[0] : null;
}

function getFileStats(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const recordCount = lines.length - 1; // Subtract header
    
    // Check for Delaware records
    const delawareCount = lines.slice(1).filter(line => 
      line.toLowerCase().includes('delaware')
    ).length;
    
    return { recordCount, delawareCount };
  } catch (error) {
    return { recordCount: 0, delawareCount: 0 };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const autoMode = args.includes('--auto') || args.includes('-a');
  
  console.log("📅 WEEKLY MORTALITY DATA IMPORT");
  console.log("===============================\n");

  // Find latest file
  const latestFile = findLatestMortalityFile();
  
  if (!latestFile) {
    console.log("❌ No mortality data files found in scrape-a-grave/processed_csvs/");
    console.log("\n💡 Expected files like: mortality_data_20251222.csv");
    return;
  }

  console.log(`🎯 Latest file found: ${latestFile.name}`);
  console.log(`📅 File date: ${latestFile.date.toLocaleDateString()}`);
  
  // Get file statistics
  const stats = getFileStats(latestFile.path);
  console.log(`📊 Total records: ${stats.recordCount}`);
  console.log(`🏛️ Delaware records: ${stats.delawareCount}`);
  console.log(`📁 File path: ${latestFile.path}\n`);

  // Check if it's Delaware-only data
  if (stats.delawareCount === stats.recordCount && stats.recordCount > 0) {
    console.log("✅ File appears to contain Delaware-only data");
  } else if (stats.delawareCount > 0) {
    console.log(`⚠️ File contains mixed data (${stats.delawareCount} Delaware out of ${stats.recordCount} total)`);
  } else {
    console.log("❌ No Delaware records found in file");
    if (!autoMode) {
      console.log("Continue anyway? This will import non-Delaware data.");
    }
  }

  // Auto-confirmation or prompt user
  if (!autoMode) {
    console.log(`\n🤔 Import ${latestFile.name} with ${stats.recordCount} records?`);
    console.log("Press Enter to continue, or Ctrl+C to cancel...");
    
    // Wait for user input
    await new Promise<void>(async (resolve) => {
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('', () => {
        rl.close();
        resolve();
      });
    });
  }

  // Execute import
  console.log(`\n🚀 Starting import of ${latestFile.name}...\n`);
  
  try {
    // Run the mortality import script
    const importCommand = `npm run import:mortality "${latestFile.name}"`;
    console.log(`Executing: ${importCommand}\n`);
    
    execSync(importCommand, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log(`\n✅ Weekly import completed successfully!`);
    console.log(`📊 Imported: ${stats.recordCount} records from ${latestFile.name}`);
    
    // Log to file for tracking
    const logEntry = {
      timestamp: new Date().toISOString(),
      fileName: latestFile.name,
      fileDate: latestFile.dateString,
      recordCount: stats.recordCount,
      delawareCount: stats.delawareCount,
      success: true
    };
    
    const logFile = "weekly-import-log.json";
    let logs = [];
    if (fs.existsSync(logFile)) {
      logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    }
    logs.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    
    console.log(`📝 Import logged to ${logFile}`);
    
  } catch (error) {
    console.error(`❌ Import failed:`, error);
    process.exit(1);
  }
}

// Run if this is the main module
main().catch(console.error);