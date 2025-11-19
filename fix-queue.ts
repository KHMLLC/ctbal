#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

interface OldQueueItem {
  filename: string;
  state: string;
  timestamp: string;
  status: string;
}

interface NewQueueItem {
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

function migrateQueue() {
  const oldQueuePath = path.join(process.cwd(), 'csv-queue', 'queue-status.json');
  
  if (!fs.existsSync(oldQueuePath)) {
    console.log('No queue file found');
    return;
  }

  const oldData: OldQueueItem[] = JSON.parse(fs.readFileSync(oldQueuePath, 'utf-8'));
  const newData: NewQueueItem[] = [];

  for (const item of oldData) {
    const newItem: NewQueueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      filename: item.filename,
      category: 'MORTALITY_DATA',
      subcategory: item.filename.includes('us_recent_deaths') ? 'RECENT_DEATHS' : 'STATE_DEATHS',
      filePath: path.join(process.cwd(), 'csv-queue', item.filename),
      timestamp: item.timestamp,
      status: item.status.toUpperCase() as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
      metadata: {
        state: item.state === 'Unknown' ? undefined : item.state,
        source: 'FIND_A_GRAVE'
      }
    };
    newData.push(newItem);
  }

  // Backup the old file
  fs.writeFileSync(oldQueuePath + '.backup', JSON.stringify(oldData, null, 2));
  
  // Write the new structure
  fs.writeFileSync(oldQueuePath, JSON.stringify(newData, null, 2));
  
  console.log(`✅ Migrated ${newData.length} queue items`);
  console.log('📁 Backup saved as queue-status.json.backup');
}

migrateQueue();