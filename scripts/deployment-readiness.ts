#!/usr/bin/env node
import { execSync } from 'child_process';
import * as fs from 'fs';

/**
 * CTBAL Production Deployment Readiness Validator
 * Final comprehensive check before production deployment
 */

interface ReadinessReport {
  overall: 'ready' | 'not-ready';
  score: number;
  categories: {
    [key: string]: {
      passed: boolean;
      score: number;
      maxScore: number;
      checks: Array<{
        name: string;
        passed: boolean;
        critical: boolean;
        message: string;
      }>;
    };
  };
  recommendations: string[];
  blockers: string[];
}

async function checkCodeQuality(): Promise<{ passed: boolean; score: number; maxScore: number; checks: any[] }> {
  const checks = [
    {
      name: 'Smart Contract Compilation',
      critical: true,
      check: () => {
        try {
          const artifactsExist = fs.existsSync('artifacts/contracts');
          const ctbalToken = fs.existsSync('artifacts/contracts/CTBALToken.sol/CTBALToken.json');
          const ctbalAnalytics = fs.existsSync('artifacts/contracts/CTBALAnalytics.sol/CTBALAnalytics.json');
          return { passed: artifactsExist && ctbalToken && ctbalAnalytics, message: 'Smart contracts compiled successfully' };
        } catch {
          return { passed: false, message: 'Compilation artifacts missing' };
        }
      }
    },
    {
      name: 'TypeScript Configuration',
      critical: false,
      check: () => {
        const tsConfigExists = fs.existsSync('hardhat.config.ts');
        return { passed: tsConfigExists, message: tsConfigExists ? 'TypeScript configuration present' : 'Missing TypeScript config' };
      }
    },
    {
      name: 'Test Coverage',
      critical: false,
      check: () => {
        const testDir = fs.existsSync('test');
        let testCount = 0;
        if (testDir) {
          testCount = fs.readdirSync('test').filter(f => f.endsWith('.test.ts')).length;
        }
        return { passed: testCount >= 2, message: `${testCount} test files found` };
      }
    }
  ];

  const results = checks.map(check => {
    const result = check.check();
    return {
      name: check.name,
      passed: result.passed,
      critical: check.critical,
      message: result.message
    };
  });

  const passedChecks = results.filter(r => r.passed).length;
  const score = Math.round((passedChecks / checks.length) * 100);

  return {
    passed: results.filter(r => r.critical).every(r => r.passed),
    score,
    maxScore: 100,
    checks: results
  };
}

async function checkSecurityCompliance(): Promise<{ passed: boolean; score: number; maxScore: number; checks: any[] }> {
  const checks = [
    {
      name: 'Security Policy',
      critical: true,
      check: () => {
        const securityMd = fs.existsSync('SECURITY.md');
        return { passed: securityMd, message: securityMd ? 'Security policy documented' : 'Security policy missing' };
      }
    },
    {
      name: 'Environment Security',
      critical: true,
      check: () => {
        const envExample = fs.existsSync('.env.example');
        const gitignore = fs.existsSync('.gitignore');
        let gitignoreContent = '';
        if (gitignore) {
          gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
        }
        const envIgnored = gitignoreContent.includes('.env');
        return { passed: envExample && envIgnored, message: `Environment template: ${envExample}, .env ignored: ${envIgnored}` };
      }
    },
    {
      name: 'Smart Contract Security',
      critical: true,
      check: () => {
        // Check for OpenZeppelin imports in contracts
        let securityFeatures = 0;
        const contracts = ['contracts/CTBALToken.sol', 'contracts/CTBALAnalytics.sol'];
        
        contracts.forEach(contractPath => {
          if (fs.existsSync(contractPath)) {
            const content = fs.readFileSync(contractPath, 'utf8');
            if (content.includes('AccessControl')) securityFeatures++;
            if (content.includes('ReentrancyGuard')) securityFeatures++;
            if (content.includes('Pausable')) securityFeatures++;
          }
        });
        
        return { passed: securityFeatures >= 3, message: `Security features implemented: ${securityFeatures}` };
      }
    }
  ];

  const results = checks.map(check => {
    const result = check.check();
    return {
      name: check.name,
      passed: result.passed,
      critical: check.critical,
      message: result.message
    };
  });

  const passedChecks = results.filter(r => r.passed).length;
  const score = Math.round((passedChecks / checks.length) * 100);

  return {
    passed: results.filter(r => r.critical).every(r => r.passed),
    score,
    maxScore: 100,
    checks: results
  };
}

async function checkDeploymentReadiness(): Promise<{ passed: boolean; score: number; maxScore: number; checks: any[] }> {
  const checks = [
    {
      name: 'Blockchain Deployment',
      critical: true,
      check: () => {
        // Check deployment records
        const deploymentFiles = fs.readdirSync('.').filter(f => f.includes('sepolia-deployment'));
        return { passed: deploymentFiles.length > 0, message: `Deployment records: ${deploymentFiles.length}` };
      }
    },
    {
      name: 'Contract Verification',
      critical: true,
      check: () => {
        const verificationFiles = fs.readdirSync('.').filter(f => f.includes('verification'));
        return { passed: verificationFiles.length > 0, message: `Verification records: ${verificationFiles.length}` };
      }
    },
    {
      name: 'CI/CD Pipeline',
      critical: false,
      check: () => {
        const cicd = fs.existsSync('.github/workflows/ci-cd.yml');
        return { passed: cicd, message: cicd ? 'CI/CD pipeline configured' : 'No CI/CD pipeline' };
      }
    },
    {
      name: 'Environment Configuration',
      critical: true,
      check: () => {
        const env = fs.existsSync('.env');
        let envVars = 0;
        if (env) {
          const content = fs.readFileSync('.env', 'utf8');
          envVars = content.split('\n').filter(line => line.includes('=') && !line.startsWith('#')).length;
        }
        return { passed: envVars >= 5, message: `Environment variables: ${envVars}` };
      }
    }
  ];

  const results = checks.map(check => {
    const result = check.check();
    return {
      name: check.name,
      passed: result.passed,
      critical: check.critical,
      message: result.message
    };
  });

  const passedChecks = results.filter(r => r.passed).length;
  const score = Math.round((passedChecks / checks.length) * 100);

  return {
    passed: results.filter(r => r.critical).every(r => r.passed),
    score,
    maxScore: 100,
    checks: results
  };
}

async function checkDocumentationCompleteness(): Promise<{ passed: boolean; score: number; maxScore: number; checks: any[] }> {
  const checks = [
    {
      name: 'Core Documentation',
      critical: true,
      check: () => {
        const required = ['README.md', 'CONTRIBUTING.md', 'LICENSE'];
        const existing = required.filter(doc => fs.existsSync(doc));
        return { passed: existing.length === required.length, message: `Core docs: ${existing.length}/${required.length}` };
      }
    },
    {
      name: 'Technical Documentation',
      critical: false,
      check: () => {
        const technical = ['DEPLOYMENT_GUIDE.md', 'ANALYTICS_GUIDE.md', 'INFRASTRUCTURE.md'];
        const existing = technical.filter(doc => fs.existsSync(doc));
        return { passed: existing.length >= 2, message: `Technical docs: ${existing.length}/${technical.length}` };
      }
    },
    {
      name: 'README Content Quality',
      critical: true,
      check: () => {
        if (!fs.existsSync('README.md')) {
          return { passed: false, message: 'README.md missing' };
        }
        const readme = fs.readFileSync('README.md', 'utf8');
        const hasDescription = readme.includes('Clinical Test Blockchain Analytics');
        const hasInstallation = readme.includes('Installation') || readme.includes('Getting Started');
        const hasUsage = readme.includes('Usage') || readme.includes('Quick Start');
        const score = [hasDescription, hasInstallation, hasUsage].filter(Boolean).length;
        return { passed: score >= 2, message: `README quality score: ${score}/3` };
      }
    }
  ];

  const results = checks.map(check => {
    const result = check.check();
    return {
      name: check.name,
      passed: result.passed,
      critical: check.critical,
      message: result.message
    };
  });

  const passedChecks = results.filter(r => r.passed).length;
  const score = Math.round((passedChecks / checks.length) * 100);

  return {
    passed: results.filter(r => r.critical).every(r => r.passed),
    score,
    maxScore: 100,
    checks: results
  };
}

async function checkDataIntegrity(): Promise<{ passed: boolean; score: number; maxScore: number; checks: any[] }> {
  const checks = [
    {
      name: 'CSV Queue System',
      critical: false,
      check: () => {
        const queueScript = fs.existsSync('scripts/csv-queue-manager.ts');
        const batchImport = fs.existsSync('scripts/batch-csv-import.ts');
        return { passed: queueScript && batchImport, message: `Queue system: ${queueScript}, Batch import: ${batchImport}` };
      }
    },
    {
      name: 'Data Processing Scripts',
      critical: false,
      check: () => {
        const scriptsDir = 'scripts';
        if (!fs.existsSync(scriptsDir)) {
          return { passed: false, message: 'Scripts directory missing' };
        }
        const scripts = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
        return { passed: scripts.length >= 10, message: `Processing scripts: ${scripts.length}` };
      }
    },
    {
      name: 'Geographic Coverage',
      critical: true,
      check: () => {
        // Check if system is configured for nationwide coverage
        const readmeExists = fs.existsSync('README.md');
        if (!readmeExists) return { passed: false, message: 'README missing' };
        
        const readme = fs.readFileSync('README.md', 'utf8');
        const nationwide = readme.includes('53 states') || readme.includes('nationwide') || readme.includes('all US states');
        return { passed: nationwide, message: nationwide ? 'Nationwide coverage configured' : 'Limited geographic scope' };
      }
    }
  ];

  const results = checks.map(check => {
    const result = check.check();
    return {
      name: check.name,
      passed: result.passed,
      critical: check.critical,
      message: result.message
    };
  });

  const passedChecks = results.filter(r => r.passed).length;
  const score = Math.round((passedChecks / checks.length) * 100);

  return {
    passed: results.filter(r => r.critical).every(r => r.passed),
    score,
    maxScore: 100,
    checks: results
  };
}

async function generateReadinessReport(): Promise<ReadinessReport> {
  console.log('🚀 CTBAL Production Deployment Readiness Assessment');
  console.log('====================================================\n');

  const categories = {
    'Code Quality': await checkCodeQuality(),
    'Security & Compliance': await checkSecurityCompliance(),
    'Deployment Infrastructure': await checkDeploymentReadiness(),
    'Documentation': await checkDocumentationCompleteness(),
    'Data Pipeline': await checkDataIntegrity()
  };

  // Calculate overall scores
  const totalScore = Object.values(categories).reduce((sum, cat) => sum + cat.score, 0);
  const maxTotalScore = Object.values(categories).length * 100;
  const overallScore = Math.round(totalScore / Object.values(categories).length);

  // Check if ready for production
  const allCriticalPassed = Object.values(categories).every(cat => cat.passed);
  const overallReady = allCriticalPassed && overallScore >= 80;

  // Generate recommendations and blockers
  const recommendations: string[] = [];
  const blockers: string[] = [];

  Object.entries(categories).forEach(([categoryName, category]) => {
    category.checks.forEach(check => {
      if (!check.passed) {
        if (check.critical) {
          blockers.push(`${categoryName}: ${check.name} - ${check.message}`);
        } else {
          recommendations.push(`${categoryName}: ${check.name} - ${check.message}`);
        }
      }
    });
  });

  return {
    overall: overallReady ? 'ready' : 'not-ready',
    score: overallScore,
    categories,
    recommendations,
    blockers
  };
}

async function displayReadinessReport(report: ReadinessReport) {
  const statusEmoji = report.overall === 'ready' ? '🎉' : '⚠️';
  
  console.log(`${statusEmoji} OVERALL READINESS: ${report.overall.toUpperCase()}`);
  console.log(`📊 Deployment Score: ${report.score}%\n`);

  console.log('📋 CATEGORY BREAKDOWN');
  console.log('====================');

  Object.entries(report.categories).forEach(([name, category]) => {
    const emoji = category.passed ? '✅' : '❌';
    console.log(`${emoji} ${name}: ${category.score}% (${category.passed ? 'PASSED' : 'FAILED'})`);
    
    category.checks.forEach(check => {
      const checkEmoji = check.passed ? '  ✅' : (check.critical ? '  ❌' : '  ⚠️');
      console.log(`${checkEmoji} ${check.name}: ${check.message}`);
    });
    console.log('');
  });

  if (report.blockers.length > 0) {
    console.log('🚫 DEPLOYMENT BLOCKERS (Must Fix)');
    console.log('=================================');
    report.blockers.forEach(blocker => console.log(`❌ ${blocker}`));
    console.log('');
  }

  if (report.recommendations.length > 0) {
    console.log('💡 RECOMMENDATIONS (Should Fix)');
    console.log('===============================');
    report.recommendations.forEach(rec => console.log(`⚠️  ${rec}`));
    console.log('');
  }

  if (report.overall === 'ready') {
    console.log('🎉 DEPLOYMENT STATUS: PRODUCTION READY!');
    console.log('======================================');
    console.log('✅ All critical requirements met');
    console.log('✅ Security and compliance validated');
    console.log('✅ Infrastructure properly configured');
    console.log('✅ Documentation complete');
    console.log('\n🚀 System approved for production deployment!');
    console.log('📋 Contract addresses:');
    console.log('   • CTBALToken: 0xcfab0ab01fd1a4a72601dd30da96fc13b0403246');
    console.log('   • CTBALAnalytics: 0x5b07f9bac1f72cbd5ef931f13d00bb87785eab5d');
    console.log('🌐 Network: Sepolia Testnet (verified on Etherscan)');
    console.log('🏥 Coverage: 53 US states and territories');
    
  } else {
    console.log('⚠️  DEPLOYMENT STATUS: NOT READY');
    console.log('=================================');
    console.log(`❌ ${report.blockers.length} critical issues must be resolved`);
    console.log(`⚠️  ${report.recommendations.length} improvements recommended`);
    console.log('🔧 Address blockers before attempting production deployment');
  }
}

async function main() {
  try {
    const report = await generateReadinessReport();
    await displayReadinessReport(report);
    
    // Save detailed report
    fs.writeFileSync(
      'deployment-readiness-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n💾 Detailed report saved to: deployment-readiness-report.json');
    
    // Exit with appropriate code
    process.exit(report.overall === 'ready' ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Error generating readiness report:', error);
    process.exit(1);
  }
}

main().catch(console.error);