#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

console.log('🔍 Debug: Starting queue debug');

const queuePath = path.join(process.cwd(), 'csv-queue', 'queue-status.json');
console.log('📂 Debug: Queue path:', queuePath);

if (fs.existsSync(queuePath)) {
  console.log('✅ Debug: Queue file exists');
  const data = fs.readFileSync(queuePath, 'utf-8');
  console.log('📄 Debug: File size:', data.length);
  
  try {
    const parsed = JSON.parse(data);
    console.log('✅ Debug: JSON parsed successfully');
    console.log('📊 Debug: Items count:', parsed.length);
    console.log('🎯 Debug: First item:', parsed[0]);
  } catch (err) {
    console.error('❌ Debug: JSON parse error:', err);
  }
} else {
  console.log('❌ Debug: Queue file does not exist');
}

console.log('✨ Debug: Test completed');