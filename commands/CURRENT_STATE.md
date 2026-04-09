# CTBAL Commands - Current State

## NPM Script Commands

### Core Build Commands
```bash
npm run compile          # Compile smart contracts
npm run test            # Run analytics validation (scripts/test-analytics.ts)
npm run demo            # System capability demonstrations
npm run production:ready # Full validation pipeline (compile + test + analytics)
```

### Deployment Commands
```bash
npm run deploy:sepolia   # Deploy to Sepolia testnet
npm run deploy:prod     # Deploy to Quorum consortium (production)
npm run deploy:local    # Deploy to local Hardhat network
npm run check:deployment # Validate deployment status
npm run verify:sepolia  # Contract verification on Etherscan
```

### Environment Setup
```bash
npm run setup:env       # Initialize environment files (PowerShell)
```

## Key Script Commands

### Deployment Scripts
- `scripts/deploy-system.ts` - Basic development deployment
- `scripts/deploy-production.ts` - Production deployment with env config
- `scripts/deploy-sepolia-simple.ts` - Simplified Sepolia deployment
- `scripts/deploy-v2-enhanced.ts` - Enhanced system deployment

### Testing and Validation
- `scripts/test-analytics.ts` - Contract compilation and function validation
- `scripts/system-overview.ts` - System capability demonstrations
- `scripts/deployment-readiness.ts` - Pre-deployment validation
- `scripts/validate-setup.ts` - Environment validation

### Data Management
- `scripts/batch-csv-import.ts` - Bulk CSV data import to blockchain
- `scripts/csv-queue-manager.ts` - Manage CSV processing queue
- `scripts/mortality-data-import.ts` - Nationwide mortality data processing
- `scripts/auto-queue-manager.ts` - Automated CSV queue processing

### Analytics and Reporting
- `scripts/sepolia-dashboard.ts` - Generate deployment dashboard
- `scripts/success-summary.ts` - Deployment success reporting  
- `scripts/system-status.ts` - System health monitoring
- `scripts/query-blockchain-contents.ts` - Query deployed contract data

### Network Interaction
- `scripts/check-balance.ts` - Check token balances
- `scripts/interact-v2-enhanced.ts` - Enhanced contract interaction
- `scripts/verify-sepolia-deployment.ts` - Verify Sepolia deployment

## Hardhat Commands
```bash
npx hardhat compile     # Compile contracts
npx hardhat test       # Run test suite
npx hardhat node      # Start local blockchain
npx hardhat run scripts/deploy-system.ts --network localhost
npx hardhat run scripts/deploy-system.ts --network sepolia
```

## Data Processing Commands
```bash
# CSV Queue Management
node scripts/add-processed-csvs-to-queue.py
node scripts/add-all-new-csvs.py

# Python Data Processing
python scripts/ctbal-scrape-integration.py
python inventor_patent.py
```

## Network-Specific Commands

### Local Development
```bash
npm run deploy:local && npm run test
```

### Sepolia Testing
```bash
npm run deploy:sepolia && npm run verify:sepolia
```

### Production (Quorum)
```bash
npm run production:ready && npm run deploy:prod
```