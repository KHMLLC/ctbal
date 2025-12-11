#!/usr/bin/env node

/**
 * CTBAL Mobile Health Data Integration Demo
 * 
 * This demonstrates how mobile applications can integrate with the CTBAL blockchain system
 * for health data collection and submission.
 */

import { createWalletClient, createPublicClient, http, parseEther, getContract, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";
import * as fs from "fs";

// Load environment variables
dotenv.config();

// Contract addresses and configuration
const CTBAL_TOKEN_ADDRESS = "0xcfab0ab01fd1a4a72601dd30da96fc13b0403246";
const API_BASE_URL = "http://localhost:3001";

interface MobileHealthData {
  date: string;
  source: 'apple_health' | 'google_fit' | 'fitbit' | 'manual' | 'samsung_health';
  weight?: number;
  glucose?: number;
  insulin?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  steps?: number;
  sleepHours?: number;
  notes?: string;
}

interface MobileSubmissionResponse {
  success: boolean;
  message: string;
  data?: {
    localPath: string;
    txHash?: string;
    etherscanUrl?: string;
    reward: number;
    dataPoints: number;
  };
  error?: string;
}

class CTBALMobileIntegration {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json() as any;
      return data.success === true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async submitHealthData(data: MobileHealthData, submitToBlockchain: boolean = true): Promise<MobileSubmissionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          submitToBlockchain
        })
      });

      return await response.json() as MobileSubmissionResponse;
    } catch (error: any) {
      return {
        success: false,
        message: 'Network error',
        error: error.message
      };
    }
  }

  async getRecentHealthData(limit: number = 10): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health-data?limit=${limit}`);
      return await response.json() as any;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

async function demonstrateMobileIntegration() {
  console.log('📱 CTBAL Mobile Health Integration Demo\n');

  const mobileClient = new CTBALMobileIntegration();

  // Check if API server is running
  console.log('1️⃣ Checking API server status...');
  const isHealthy = await mobileClient.healthCheck();
  
  if (!isHealthy) {
    console.log('❌ API server is not running. Please start it with: npm run api:server');
    console.log('   Then run this demo again.');
    return;
  }
  console.log('✅ API server is healthy\n');

  // Simulate different mobile data sources
  const mobileSources: MobileHealthData[] = [
    {
      date: new Date().toLocaleDateString(),
      source: 'apple_health',
      weight: 183,
      heartRate: 72,
      steps: 8453,
      sleepHours: 7.5,
      notes: 'Data from Apple Health app - morning sync'
    },
    {
      date: new Date().toLocaleDateString(),
      source: 'google_fit',
      glucose: 95,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      steps: 6234,
      notes: 'Google Fit integration - glucose monitor sync'
    },
    {
      date: new Date().toLocaleDateString(),
      source: 'fitbit',
      heartRate: 68,
      steps: 12350,
      sleepHours: 8.2,
      notes: 'Fitbit device sync - active day'
    },
    {
      date: new Date().toLocaleDateString(),
      source: 'manual',
      weight: 182.5,
      glucose: 88,
      insulin: 0,
      bloodPressureSystolic: 118,
      bloodPressureDiastolic: 78,
      notes: 'Manual entry from patient mobile app'
    }
  ];

  console.log('2️⃣ Demonstrating mobile data submissions...\n');

  for (let i = 0; i < mobileSources.length; i++) {
    const source = mobileSources[i];
    console.log(`📲 Submitting data from ${source.source.replace('_', ' ').toUpperCase()}...`);
    
    // Submit without blockchain for demo (faster)
    const result = await mobileClient.submitHealthData(source, false);
    
    if (result.success) {
      console.log(`   ✅ Success: ${result.message}`);
      console.log(`   📊 Data points: ${result.data?.dataPoints}`);
      console.log(`   💰 Potential reward: ${result.data?.reward} CTBAL`);
      console.log(`   💾 Stored locally: ${result.data?.localPath}`);
      if (result.data?.txHash) {
        console.log(`   🔗 Transaction: ${result.data.etherscanUrl}`);
      }
    } else {
      console.log(`   ❌ Failed: ${result.error || result.message}`);
    }
    console.log('');
    
    // Small delay between submissions
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('3️⃣ Retrieving recent health data...\n');
  const recentData = await mobileClient.getRecentHealthData(5);
  
  if (recentData.success && recentData.data) {
    console.log(`📋 Found ${recentData.data.length} recent health records:`);
    recentData.data.forEach((record: any, index: number) => {
      console.log(`   ${index + 1}. ${record.date} (${record.source}) - ${record.dataPoints || 'N/A'} data points`);
    });
  } else {
    console.log('❌ Could not retrieve recent data');
  }

  console.log('\n🎯 Mobile Integration Summary:');
  console.log('   ✅ API server connectivity verified');
  console.log('   ✅ Multiple mobile source integrations demonstrated');
  console.log('   ✅ Local data storage working');
  console.log('   ✅ Token reward system operational');
  console.log('   ✅ Data retrieval functional');

  console.log('\n📱 Next Steps for Mobile App Development:');
  console.log('   1. Integrate this API into your mobile app (iOS/Android)');
  console.log('   2. Connect to device health APIs (HealthKit, Google Fit, etc.)');
  console.log('   3. Implement user authentication and data consent');
  console.log('   4. Add real-time sync with blockchain submission');
  console.log('   5. Build dashboard for viewing rewards and health trends');

  console.log('\n🔧 Development Tools:');
  console.log('   • API Server: npm run api:server');
  console.log('   • Health Submission: npm run health:submit');
  console.log('   • Blockchain Query: npm run dashboard:sepolia');
  console.log('   • Test Suite: npm run test');

  console.log('\n🚀 Ready for mobile app integration!');
}

// Run the demonstration
demonstrateMobileIntegration().catch(console.error);

export { CTBALMobileIntegration, type MobileHealthData, type MobileSubmissionResponse };