# CTBAL Hooks - Current State

## System Hooks and Event Triggers

### Smart Contract Hooks

#### Clinical Test Lifecycle Hooks
- **Pre-Creation Hook**: Validates clinician role and token balance
  - Trigger: Before `createClinicalTest()` execution
  - Implementation: `onlyRole(CLINICIAN_ROLE)` modifier
  - Validation: Sufficient token allocation check

- **Post-Creation Hook**: Emit events and escrow tokens
  - Trigger: After successful clinical test creation
  - Event: `ClinicalTestCreated(testId, clinician, patient, tokenAllocation)`
  - Action: Lock tokens in escrow

- **Validation Hook**: Release escrowed tokens
  - Trigger: `validateClinicalTest()` execution
  - Implementation: `onlyRole(VALIDATOR_ROLE)` modifier
  - Event: `ClinicalTestValidated(testId, validator)`
  - Action: Transfer tokens to patient

- **Analytics Update Hook**: Refresh metrics after operations
  - Trigger: After test creation/validation
  - Implementation: `updateMetrics()` call in analytics contract
  - Purpose: Real-time performance tracking

### Deployment Hooks

#### Pre-Deployment Hooks
- **Environment Validation**: Check configuration before deployment
  - Script: `scripts/deployment-readiness.ts`
  - Checks: Network connectivity, private keys, contract compilation

- **Contract Compilation**: Ensure clean build before deployment
  - Trigger: All deployment scripts
  - Implementation: `npm run compile` prerequisite

#### Post-Deployment Hooks
- **Contract Verification**: Auto-verify on public networks
  - Trigger: After successful Sepolia deployment
  - Script: `scripts/verify-sepolia-deployment.ts`
  - Integration: Etherscan API verification

- **Status Dashboard**: Generate deployment report
  - Trigger: After any deployment
  - Scripts: `scripts/sepolia-dashboard.ts`, `scripts/success-summary.ts`

### Data Processing Hooks

#### CSV File Hooks
- **File Drop Hook**: Monitor CSV directories for new files
  - Directory: `/csv-queue`
  - Trigger: File system watcher (Python scripts)
  - Action: Add to processing queue

- **Queue Processing Hook**: Automated batch processing
  - Script: `scripts/auto-queue-manager.ts`
  - Trigger: Queue not empty + system available
  - Action: Process next batch of CSV files

- **Completion Hook**: Move processed files
  - Trigger: Successful CSV import completion
  - Action: Move to `/csv-completed` directory
  - Logging: Update processing logs

#### Error Handling Hooks
- **Processing Failure Hook**: Handle failed CSV imports
  - Trigger: Import operation failure
  - Action: Move to `/csv-failed` directory
  - Logging: Error details and retry information

### Monitoring Hooks

#### Health Check Hooks
- **System Health Hook**: Regular health status monitoring
  - Script: `scripts/health-api-server.ts`
  - Trigger: Scheduled intervals or API requests
  - Metrics: Contract status, network connectivity, data integrity

- **Performance Monitoring Hook**: Track system metrics
  - Integration: CTBALAnalytics contract
  - Trigger: Analytics function calls
  - Metrics: Test completion rates, clinician performance

### Network Hooks

#### Connection Hooks
- **Network Switch Hook**: Handle multi-network deployment
  - Implementation: Hardhat network configuration
  - Trigger: Network parameter change in deployment scripts
  - Networks: localhost, khmweb01, sepolia, quorum

- **Gas Optimization Hook**: Dynamic gas price adjustment
  - Trigger: Transaction preparation
  - Implementation: Viem gas estimation
  - Purpose: Optimize transaction costs

### Integration Hooks

#### API Hooks
- **Mobile API Hook**: Handle mobile application requests
  - Server: `scripts/health-api-server.ts`
  - Endpoints: Health status, data queries
  - Authentication: Role-based access

- **External Data Hook**: Process external data sources
  - Scripts: `scripts/ctbal-scrape-integration.py`
  - Trigger: External data availability
  - Action: Convert and import to blockchain

### Security Hooks

#### Access Control Hooks
- **Role Verification Hook**: Validate permissions before operations
  - Implementation: OpenZeppelin AccessControl
  - Trigger: All role-restricted functions
  - Roles: CLINICIAN, VALIDATOR, AUDITOR, ANALYST

- **Reentrancy Protection Hook**: Prevent re-entrant attacks
  - Implementation: `nonReentrant` modifier
  - Trigger: All state-changing functions
  - Protection: OpenZeppelin ReentrancyGuard

- **Pause Hook**: Emergency system pause capability
  - Implementation: `whenNotPaused` modifier
  - Trigger: Administrative pause command
  - Purpose: Emergency protection

## Hook Configuration Files

### Environment Hooks
- `.env` and `.env.example`: Environment variable configuration
- `hardhat.config.ts`: Network and deployment hooks
- `package.json`: NPM script hooks

### Processing Queues
- `/csv-queue`: Input file monitoring hooks
- `/csv-processing`: Active processing hooks  
- `/csv-completed`: Completion notification hooks
- `/csv-failed`: Error handling hooks

## Automation Workflows

### Daily Operations
- Morning health check hook
- CSV queue processing hook
- Evening status report hook

### Weekly Operations  
- Weekly mortality data import hook
- System maintenance check hook
- Performance analytics summary hook

### Emergency Procedures
- System pause hook for critical issues
- Automatic failover for network problems
- Data backup and recovery hooks

## Current Hook Status

| Hook Type | Status | Implementation |
|-----------|--------|----------------|
| Smart Contract Hooks | ✅ Active | Role-based and event-driven |
| Deployment Hooks | ✅ Active | Pre/post deployment automation |
| Data Processing Hooks | ✅ Active | CSV queue automation |
| Monitoring Hooks | ✅ Active | Health and performance tracking |
| Security Hooks | ✅ Active | Access control and protection |