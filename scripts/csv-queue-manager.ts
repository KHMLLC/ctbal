import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

// Load environment variables
config();

interface QueueItem {
  id: string;
  filename: string;
  category: string;
  subcategory?: string;
  filePath: string;
  timestamp: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  metadata?: {
    recordCount?: number;
    state?: string;
    dateRange?: string;
    source?: string;
  };
}

interface FileTypeMapping {
  pattern: RegExp;
  category: string;
  subcategory?: string;
  priority: number;
  source?: string;
}

// Enhanced file type mappings for CTBAL mortality data
const FILE_TYPE_MAPPINGS: FileTypeMapping[] = [
  // Find-a-Grave mortality data patterns (highest priority)
  { 
    pattern: /us_recent_deaths.*\.csv$/i, 
    category: 'MORTALITY_DATA', 
    subcategory: 'RECENT_DEATHS',
    source: 'FIND_A_GRAVE',
    priority: 1 
  },
  { 
    pattern: /.*_deaths\.csv$/i, 
    category: 'MORTALITY_DATA', 
    subcategory: 'STATE_DEATHS',
    source: 'FIND_A_GRAVE',
    priority: 2 
  },
  { 
    pattern: /deaths_.*\.csv$/i, 
    category: 'MORTALITY_DATA', 
    subcategory: 'STATE_DEATHS',
    source: 'FIND_A_GRAVE',
    priority: 2 
  },
  { 
    pattern: /mortality_.*\.csv$/i, 
    category: 'MORTALITY_DATA', 
    subcategory: 'GENERAL_MORTALITY',
    source: 'EXTERNAL',
    priority: 3 
  },
  { 
    pattern: /.*obituar.*\.csv$/i, 
    category: 'MORTALITY_DATA', 
    subcategory: 'OBITUARIES',
    source: 'EXTERNAL',
    priority: 3 
  },
  
  // Clinical testing patterns
  { 
    pattern: /.*clinical.*test.*\.csv$/i, 
    category: 'CLINICAL_TEST', 
    subcategory: 'TEST_RESULTS',
    source: 'CLINICAL_LAB',
    priority: 10 
  },
  { 
    pattern: /.*lab.*result.*\.csv$/i, 
    category: 'CLINICAL_TEST', 
    subcategory: 'LAB_RESULTS',
    source: 'CLINICAL_LAB',
    priority: 11 
  },
  { 
    pattern: /.*test.*\.csv$/i, 
    category: 'CLINICAL_TEST', 
    subcategory: 'GENERAL_TESTS',
    source: 'CLINICAL_LAB',
    priority: 15 
  },
  
  // Patient data patterns
  { 
    pattern: /.*patient.*\.csv$/i, 
    category: 'PATIENT_DATA', 
    subcategory: 'DEMOGRAPHICS',
    source: 'CLINICAL_SYSTEM',
    priority: 20 
  },
  
  // Generic data patterns (lowest priority)
  { 
    pattern: /.*\.csv$/i, 
    category: 'GENERAL_DATA', 
    subcategory: 'UNCLASSIFIED',
    source: 'UNKNOWN',
    priority: 99 
  }
];

// State abbreviation mapping for metadata extraction
const STATE_MAPPINGS: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
};

class CTBALQueueManager {
  private queuePath: string;
  private queue: QueueItem[] = [];

  constructor() {
    this.queuePath = path.join(process.cwd(), 'csv-queue', 'queue-status.json');
    this.loadQueue();
  }

  private loadQueue(): void {
    try {
      if (fs.existsSync(this.queuePath)) {
        const data = fs.readFileSync(this.queuePath, 'utf-8');
        this.queue = JSON.parse(data);
      } else {
        // Create directory if it doesn't exist
        const dir = path.dirname(this.queuePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        this.queue = [];
      }
    } catch (error) {
      console.error('Error loading queue:', error);
      this.queue = [];
    }
  }

  private saveQueue(): void {
    try {
      fs.writeFileSync(this.queuePath, JSON.stringify(this.queue, null, 2));
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  private categorizeFile(filename: string): { category: string; subcategory?: string; source?: string } {
    // Sort mappings by priority (lowest number = highest priority)
    const sortedMappings = FILE_TYPE_MAPPINGS.sort((a, b) => a.priority - b.priority);
    
    for (const mapping of sortedMappings) {
      if (mapping.pattern.test(filename)) {
        return {
          category: mapping.category,
          subcategory: mapping.subcategory,
          source: mapping.source
        };
      }
    }
    
    return { 
      category: 'UNKNOWN', 
      subcategory: 'UNCLASSIFIED',
      source: 'UNKNOWN'
    };
  }

  private extractMetadata(filePath: string, filename: string): Promise<any> {
    return new Promise((resolve) => {
      const metadata: any = {};
      
      // Extract state from filename
      const stateMatch = filename.match(/([A-Z]{2})_\d+_/);
      if (stateMatch) {
        const stateAbbr = stateMatch[1];
        metadata.state = STATE_MAPPINGS[stateAbbr] || stateAbbr;
      }
      
      // Extract date from filename
      const dateMatch = filename.match(/(\d{8})/);
      if (dateMatch) {
        const dateStr = dateMatch[1];
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        metadata.dateRange = `${year}-${month}-${day}`;
      }
      
      // Count records in CSV (first 100 lines for performance)
      try {
        let recordCount = 0;
        const stream = fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', () => {
            recordCount++;
            if (recordCount >= 100) {
              stream.destroy(); // Stop reading after 100 records for performance
            }
          })
          .on('end', () => {
            metadata.recordCount = recordCount;
            resolve(metadata);
          })
          .on('error', () => {
            resolve(metadata);
          });
      } catch (error) {
        resolve(metadata);
      }
    });
  }

  async addToQueue(filePath: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const filename = path.basename(filePath);
      const { category, subcategory, source } = this.categorizeFile(filename);
      
      // Generate unique ID
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Check for existing file and replace if necessary
      const existingIndex = this.queue.findIndex(item => item.filename === filename);
      if (existingIndex !== -1) {
        console.log(`⚠️ Replacing existing ${category} file in queue`);
        this.queue.splice(existingIndex, 1);
      }

      // Extract metadata
      const metadata = await this.extractMetadata(filePath, filename);
      
      // Create queue item
      const queueItem: QueueItem = {
        id,
        filename,
        category,
        subcategory,
        filePath: path.resolve(filePath),
        timestamp: new Date().toISOString(),
        status: 'PENDING',
        metadata: {
          ...metadata,
          source
        }
      };

      this.queue.push(queueItem);
      this.saveQueue();

      // Enhanced logging with proper categorization
      const categoryDisplay = subcategory ? `${category}:${subcategory}` : category;
      console.log(`✅ Added ${filename} (${categoryDisplay}) to processing queue`);
      
      if (metadata.state) {
        console.log(`   📍 State: ${metadata.state}`);
      }
      if (metadata.recordCount) {
        console.log(`   📊 Records: ${metadata.recordCount}${metadata.recordCount >= 100 ? '+' : ''}`);
      }
      if (metadata.dateRange) {
        console.log(`   📅 Date: ${metadata.dateRange}`);
      }

    } catch (error) {
      console.error(`❌ Error adding file to queue: ${error}`);
      throw error;
    }
  }

  listQueue(): void {
    console.log('\n📋 CTBAL Processing Queue:');
    console.log('================================');
    
    if (this.queue.length === 0) {
      console.log('Queue is empty');
      return;
    }

    // Group by category for better display
    const groupedQueue = this.queue.reduce((groups, item) => {
      const key = item.subcategory ? `${item.category}:${item.subcategory}` : item.category;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, QueueItem[]>);

    Object.entries(groupedQueue).forEach(([category, items]) => {
      console.log(`\n📂 ${category} (${items.length} files):`);
      items.forEach((item, index) => {
        const status = item.status === 'PENDING' ? '⏳' : 
                      item.status === 'PROCESSING' ? '🔄' : 
                      item.status === 'COMPLETED' ? '✅' : '❌';
        
        console.log(`   ${status} ${item.filename}`);
        if (item.metadata?.state) {
          console.log(`      State: ${item.metadata.state}`);
        }
        if (item.metadata?.recordCount) {
          console.log(`      Records: ${item.metadata.recordCount}${item.metadata.recordCount >= 100 ? '+' : ''}`);
        }
      });
    });
  }

  getQueueStatus(): void {
    const totalItems = this.queue.length;
    const pendingItems = this.queue.filter(item => item.status === 'PENDING').length;
    const processingItems = this.queue.filter(item => item.status === 'PROCESSING').length;
    const completedItems = this.queue.filter(item => item.status === 'COMPLETED').length;
    const failedItems = this.queue.filter(item => item.status === 'FAILED').length;

    console.log('\n📊 CTBAL Queue Status:');
    console.log('======================');
    console.log(`Total Items: ${totalItems}`);
    console.log(`Pending: ${pendingItems}`);
    console.log(`Processing: ${processingItems}`);
    console.log(`Completed: ${completedItems}`);
    console.log(`Failed: ${failedItems}`);

    // Show category breakdown
    const categoryBreakdown = this.queue.reduce((breakdown, item) => {
      const key = item.subcategory ? `${item.category}:${item.subcategory}` : item.category;
      breakdown[key] = (breakdown[key] || 0) + 1;
      return breakdown;
    }, {} as Record<string, number>);

    if (Object.keys(categoryBreakdown).length > 0) {
      console.log('\n📈 Category Breakdown:');
      Object.entries(categoryBreakdown).forEach(([category, count]) => {
        console.log(`   ${category}: ${count}`);
      });
    }
  }

  async processAll(): Promise<void> {
    const pendingItems = this.queue.filter(item => item.status === 'PENDING');
    
    if (pendingItems.length === 0) {
      console.log('📭 No pending items to process');
      return;
    }

    console.log(`🚀 Processing ${pendingItems.length} items from queue...`);
    
    for (const item of pendingItems) {
      try {
        console.log(`\n🔄 Processing: ${item.filename}`);
        
        // Update status to processing
        item.status = 'PROCESSING';
        this.saveQueue();
        
        // Process the CSV file using our batch import system
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        // Use the batch CSV import script to process this file
        const command = `npx tsx scripts/batch-csv-import.ts "${item.filePath}"`;
        console.log(`   Command: ${command}`);
        
        const { stdout, stderr } = await execAsync(command, {
          cwd: process.cwd(),
          env: process.env
        });
        
        if (stdout) {
          console.log('   ✅ Output:', stdout.trim());
        }
        
        if (stderr && !stderr.includes('dotenv')) {
          console.warn('   ⚠️ Warnings:', stderr.trim());
        }
        
        // Mark as completed
        item.status = 'COMPLETED';
        this.saveQueue();
        console.log(`   ✅ Completed: ${item.filename}`);
        
      } catch (error) {
        console.error(`   ❌ Failed to process ${item.filename}:`, error);
        
        // Mark as failed
        item.status = 'FAILED';
        this.saveQueue();
      }
    }
    
    console.log('\n🎉 Queue processing complete!');
    this.getQueueStatus();
  }

  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    console.log('✅ Queue cleared');
  }

  removeFromQueue(filename: string): void {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(item => item.filename !== filename);
    
    if (this.queue.length < initialLength) {
      this.saveQueue();
      console.log(`✅ Removed ${filename} from queue`);
    } else {
      console.log(`⚠️ File ${filename} not found in queue`);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const queueManager = new CTBALQueueManager();

  switch (command) {
    case 'add':
      if (args[1]) {
        await queueManager.addToQueue(args[1]);
      } else {
        console.error('❌ Please specify a file path');
        process.exit(1);
      }
      break;

    case 'list':
      queueManager.listQueue();
      break;

    case 'status':
      queueManager.getQueueStatus();
      break;

    case 'clear':
      queueManager.clearQueue();
      break;

    case 'remove':
      if (args[1]) {
        queueManager.removeFromQueue(args[1]);
      } else {
        console.error('❌ Please specify a filename');
        process.exit(1);
      }
      break;

    case 'process-all':
      await queueManager.processAll();
      break;

    default:
      console.log('CTBAL CSV Queue Manager');
      console.log('Usage:');
      console.log('  npm run queue:add <file_path>     - Add file to queue');
      console.log('  npm run queue:list                - List all queued files');
      console.log('  npm run queue:status              - Show queue status');
      console.log('  npm run queue:process-all         - Process all pending files');
      console.log('  npm run queue:clear               - Clear entire queue');
      console.log('  npm run queue:remove <filename>   - Remove specific file');
      break;
  }
}

// Run if called directly
const currentFile = process.argv[1];
const isMainModule = import.meta.url === `file:///${currentFile.replace(/\\/g, '/')}`
  || import.meta.url === `file://${currentFile.replace(/\\/g, '/')}`
  || import.meta.url.endsWith(currentFile.replace(/\\/g, '/'));

if (isMainModule) {
  main().catch(console.error);
}

export { CTBALQueueManager };