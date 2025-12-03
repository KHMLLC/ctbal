#!/usr/bin/env npx tsx

/**
 * CTBAL Auto Queue Manager
 * Automatically detects and queues new CSV files from scrape-a-grave project
 * Prevents the manual process gap that caused missing files on Nov 24th
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface QueueItem {
  id: string;
  filePath: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  category: string;
  metadata?: {
    state?: string;
    recordCount?: number;
    dateProcessed?: string;
    fileSize?: number;
  };
  addedAt: string;
  processedAt?: string;
}

class AutoQueueManager {
  private csvSourcePath: string;
  private queueStatusFile: string;
  private queueManagerScript: string;

  constructor() {
    this.csvSourcePath = path.join('C:', 'Users', 'djman', 'OneDrive', 'Documents', 'GitHub', 'scrape-a-grave', 'processed_csvs');
    this.queueStatusFile = path.join(process.cwd(), 'csv-queue', 'queue-status.json');
    this.queueManagerScript = path.join(process.cwd(), 'scripts', 'csv-queue-manager.ts');
  }

  /**
   * Load existing queue status
   */
  private loadQueueStatus(): QueueItem[] {
    try {
      if (fs.existsSync(this.queueStatusFile)) {
        const data = fs.readFileSync(this.queueStatusFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('⚠️ Could not load existing queue status:', error);
    }
    return [];
  }

  /**
   * Get all CSV files from the source directory
   */
  private getAllCSVFiles(): string[] {
    try {
      if (!fs.existsSync(this.csvSourcePath)) {
        console.error(`❌ Source directory not found: ${this.csvSourcePath}`);
        return [];
      }

      const files = fs.readdirSync(this.csvSourcePath)
        .filter(file => file.endsWith('.csv'))
        .map(file => path.join(this.csvSourcePath, file));

      console.log(`📁 Found ${files.length} CSV files in source directory`);
      return files;
    } catch (error) {
      console.error('❌ Error reading CSV source directory:', error);
      return [];
    }
  }

  /**
   * Get files that are already in the queue
   */
  private getQueuedFiles(): Set<string> {
    const queueItems = this.loadQueueStatus();
    return new Set(queueItems.map(item => path.normalize(item.filePath)));
  }

  /**
   * Find new files that aren't in the queue yet
   */
  private findNewFiles(): string[] {
    const allFiles = this.getAllCSVFiles();
    const queuedFiles = this.getQueuedFiles();

    const newFiles = allFiles.filter(file => {
      const normalizedPath = path.normalize(file);
      return !queuedFiles.has(normalizedPath);
    });

    console.log(`🆕 Found ${newFiles.length} new files not in queue`);
    return newFiles;
  }

  /**
   * Extract metadata from filename for better categorization
   */
  private extractFileMetadata(filePath: string): { state?: string; date?: string; type?: string } {
    const fileName = path.basename(filePath);
    
    // Parse consolidated mortality data pattern: "mortality_data_20251124.csv"
    const consolidatedMatch = fileName.match(/^mortality_data_(\d{8})\.csv$/i);
    if (consolidatedMatch) {
      const [, dateStr] = consolidatedMatch;
      return {
        state: 'ALL_STATES',
        date: dateStr,
        type: 'daily consolidated mortality data'
      };
    }
    
    // Parse individual state pattern: "CA_20251124_134909_us_recent_deaths.csv"
    const stateMatch = fileName.match(/^([A-Z]{2})_(\d{8})_(\d{6})_(.+)\.csv$/);
    if (stateMatch) {
      const [, state, dateStr, timeStr, type] = stateMatch;
      return {
        state,
        date: dateStr,
        type: type.replace(/_/g, ' ')
      };
    }
    
    return {};
  }

  /**
   * Add a single file to the queue using the existing queue manager
   */
  private async addFileToQueue(filePath: string): Promise<boolean> {
    try {
      const metadata = this.extractFileMetadata(filePath);
      console.log(`   📍 Adding ${metadata.state || 'Unknown'} (${metadata.date || 'Unknown date'})`);
      
      const command = `npx tsx "${this.queueManagerScript}" add "${filePath}"`;
      execSync(command, { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      return true;
    } catch (error) {
      console.error(`   ❌ Failed to add ${path.basename(filePath)}:`, error);
      return false;
    }
  }

  /**
   * Auto-detect and queue all new files
   */
  public async autoQueue(): Promise<{ added: number; failed: number; skipped: number }> {
    console.log('🤖 CTBAL Auto Queue Manager Starting...\n');
    
    // Check if source directory exists
    if (!fs.existsSync(this.csvSourcePath)) {
      console.error(`❌ CSV source directory not found: ${this.csvSourcePath}`);
      console.log('💡 Make sure scrape-a-grave project has run and created CSV files');
      return { added: 0, failed: 0, skipped: 0 };
    }

    // Find new files
    const newFiles = this.findNewFiles();
    
    if (newFiles.length === 0) {
      console.log('✅ No new CSV files detected. Queue is up to date!');
      return { added: 0, failed: 0, skipped: newFiles.length };
    }

    console.log(`\n🔄 Processing ${newFiles.length} new files:\n`);

    let addedCount = 0;
    let failedCount = 0;

    // Process each new file
    for (const file of newFiles) {
      const metadata = this.extractFileMetadata(file);
      console.log(`🔄 Processing: ${metadata.state || path.basename(file)}`);
      
      const success = await this.addFileToQueue(file);
      if (success) {
        addedCount++;
        console.log(`   ✅ Successfully added`);
      } else {
        failedCount++;
        console.log(`   ❌ Failed to add`);
      }
    }

    console.log(`\n📊 Auto-Queue Results:`);
    console.log(`   ✅ Added: ${addedCount} files`);
    console.log(`   ❌ Failed: ${failedCount} files`);
    console.log(`   📁 Total CSV files: ${this.getAllCSVFiles().length}`);

    return { added: addedCount, failed: failedCount, skipped: 0 };
  }

  /**
   * Show queue status after auto-detection
   */
  public async showStatus(): Promise<void> {
    try {
      console.log('\n📊 Current Queue Status:');
      const command = `npx tsx "${this.queueManagerScript}" status`;
      const output = execSync(command, { 
        stdio: 'pipe',
        cwd: process.cwd(),
        encoding: 'utf8'
      });
      console.log(output);
    } catch (error) {
      console.error('❌ Could not retrieve queue status:', error);
    }
  }

  /**
   * Process all pending items in the queue
   */
  public async processAll(): Promise<void> {
    try {
      console.log('\n🚀 Processing all queued items...');
      const command = `npx tsx "${this.queueManagerScript}" process-all`;
      const output = execSync(command, { 
        stdio: 'pipe',
        cwd: process.cwd(),
        encoding: 'utf8'
      });
      console.log(output);
    } catch (error) {
      console.error('❌ Error processing queue:', error);
    }
  }
}

// CLI Interface
async function main() {
  const manager = new AutoQueueManager();
  const args = process.argv.slice(2);
  const command = args[0] || 'auto';

  switch (command) {
    case 'auto':
    case 'detect':
      const results = await manager.autoQueue();
      if (results.added > 0) {
        await manager.showStatus();
      }
      break;

    case 'status':
      await manager.showStatus();
      break;

    case 'full':
      // Full automation: detect + process
      console.log('🎯 Full Automation Mode: Detect → Queue → Process\n');
      const autoResults = await manager.autoQueue();
      if (autoResults.added > 0) {
        await manager.processAll();
        await manager.showStatus();
      }
      break;

    case 'help':
      console.log(`
🤖 CTBAL Auto Queue Manager

Usage:
  npm run auto-queue              # Auto-detect and queue new CSV files
  npm run auto-queue detect       # Same as above
  npm run auto-queue status       # Show current queue status
  npm run auto-queue full         # Auto-detect, queue, and process all files
  npm run auto-queue help         # Show this help

Examples:
  # Daily automation (recommended for next week):
  npm run auto-queue full

  # Just detect new files:
  npm run auto-queue detect

Purpose:
  Prevents the manual process gap that caused missing files.
  Automatically finds CSV files from scrape-a-grave that aren't in the CTBAL queue yet.
      `);
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Use "npm run auto-queue help" for usage information');
      process.exit(1);
  }
}

// Run if called directly (ES module compatible)
const isMain = process.argv[1] && process.argv[1].includes('auto-queue-manager');
if (isMain) {
  main().catch(error => {
    console.error('💥 Auto Queue Manager Error:', error);
    process.exit(1);
  });
}

export default AutoQueueManager;