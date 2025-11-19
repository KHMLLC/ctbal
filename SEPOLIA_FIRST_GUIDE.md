# CTBAL Development Guide - Sepolia-First Approach

## Quick Start (Sepolia Deployment)

### Prerequisites
- Node.js and npm installed
- .env file configured with Sepolia credentials
- Sufficient Sepolia ETH for deployment (~0.1 ETH recommended)

### Standard Workflow
```bash
# 1. Compile contracts
npm run compile

# 2. Deploy to Sepolia (our primary network)
npm run deploy

# 3. Verify deployment
npm run verify:sepolia:contracts

# 4. Import nationwide mortality data (53 states)
npm run queue:process-all

# 5. View analytics dashboard
npm run dashboard:sepolia

# 6. Generate success report
npm run success:summary
```

## Network Strategy

### Primary: Sepolia Testnet ✅
- **Default deployment target**
- Public verifiability via Etherscan
- Proven success with nationwide mortality data (53 states/territories)
- Zero infrastructure maintenance
- Industry standard Ethereum testnet

### Secondary: Local Development
- **localhost** for rapid iteration
- **khmweb01** for specific healthcare consortium testing (when needed)
- **quorum** for production healthcare deployments (future)

## Key Commands

| Command | Purpose | Network |
|---------|---------|---------|
| `npm run deploy` | Deploy CTBAL system | Sepolia (default) |
| `npm run queue:process-all` | Import nationwide mortality data | Sepolia |
| `npm run dashboard:sepolia` | Live analytics | Sepolia |
| `npm run verify:sepolia:contracts` | Contract verification | Sepolia |

## Successful Deployments

### Current Sepolia Deployment (Updated Nov 18, 2025)
- **CTBALToken**: `0xcfab0ab01fd1a4a72601dd30da96fc13b0403246`
- **CTBALAnalytics**: `0x5b07f9bac1f72cbd5ef931f13d00bb87785eab5d`
- **Status**: ✅ Fully operational with nationwide mortality data imported
- **Coverage**: All 53 US states and territories represented
- **Tokens**: Thousands of CTBAL allocated across comprehensive mortality research

## Development Philosophy

**Sepolia-First Development**:
1. All primary development happens on Sepolia
2. Public verifiability ensures transparency
3. No infrastructure dependencies
4. Easy collaboration and verification
5. Direct path to production via consortium networks when needed

**Use Other Networks When**:
- khmweb01: Specific healthcare consortium demos
- localhost: Rapid development iteration
- quorum: Production healthcare compliance (future)

## Data Import Success

The nationwide mortality data import achieved 100% success on Sepolia:
- 53 states/territories → Comprehensive clinical test database
- Thousands of mortality records processed and tokenized
- Age-based categorization working perfectly across all demographics
- Veteran population bonuses applied correctly nationwide
- Real-time analytics operational with full geographic insights
- Complete US coverage: All 50 states + DC + Puerto Rico + Virgin Islands + Territories
- Queue processing system handling high-volume data seamlessly

This proves Sepolia is the optimal platform for large-scale CTBAL deployment with comprehensive geographic coverage.