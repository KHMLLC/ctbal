# CTBAL - Clinical Test Blockchain Analytics

## Architecture Overview

This is a **healthcare blockchain system** with two core smart contracts:
- **CTBALToken.sol** - Clinical testing token with role-based access, test lifecycle management, and automated escrow
- **CTBALAnalytics.sol** - Real-time analytics engine tracking performance metrics and compliance data

The system uses **Hardhat 3.0.14 with Viem toolbox** (not Web3.js) for modern TypeScript blockchain development.

## Key Technical Patterns

### Contract Architecture
- **Role-based Access Control**: Uses OpenZeppelin's AccessControl with custom roles (`CLINICIAN_ROLE`, `VALIDATOR_ROLE`, `AUDITOR_ROLE`, `ANALYST_ROLE`)
- **Reentrancy Protection**: All state-changing functions use `ReentrancyGuard`
- **Escrow Mechanism**: Tokens are locked until clinical tests are completed and validated
- **Analytics Integration**: CTBALAnalytics reads from CTBALToken via interface, not inheritance

### Development Stack
- **Solidity 0.8.20** with optimizer enabled (200 runs)
- **Viem** for contract interactions (not ethers.js or web3.js)
- **TypeScript** throughout - no plain JavaScript
- **Mocha + Chai** for testing with Viem-specific patterns

### Network Configuration
```typescript
// Four deployment targets in hardhat.config.ts:
// 1. localhost - Local Hardhat network for development  
// 2. khmweb01 - Local blockchain server for testing
// 3. sepolia - Ethereum testnet for public testing
// 4. quorum - Private consortium for production (healthcare compliance)
```

## Critical Development Workflows

### Deployment Process
```bash
# Standard deployment pipeline:
npm run compile          # Compile contracts
npm run test            # Run analytics validation  
npm run deploy:sepolia  # Deploy to testnet
npm run check:deployment # Validate deployment status
```

### Testing Pattern
- Use `npm run test` (runs `scripts/test-analytics.ts`) for contract validation
- Use `npm run demo` for system capability demonstrations
- Test files use Viem deployment: `await viem.deployContract("ContractName", [params])`

### Script Organization
- **deploy-system.ts** - Basic deployment for development
- **deploy-production.ts** - Production deployment with env config
- **test-analytics.ts** - Contract compilation and function validation
- **system-overview.ts** - System capability demonstrations

## Environment & Configuration

### Required Environment Variables
```bash
# Testnet deployment
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_key

# Production (Quorum consortium)  
QUORUM_URL=http://localhost:22000
QUORUM_PRIVATE_KEY=your_quorum_key
```

### Key Package.json Scripts
- `npm run production:ready` - Full validation pipeline (compile + test + analytics)
- `npm run deploy:prod` - Alias for Quorum deployment
- `npm run verify:sepolia` - Contract verification helper
- `npm run setup:env` - Environment file initialization (PowerShell)

## Integration Points

### Contract Dependencies
```solidity
// CTBALAnalytics depends on CTBALToken address in constructor
CTBALAnalytics analytics = new CTBALAnalytics(tokenAddress);

// Analytics reads token data via public interface:
ctbalToken.getTestDetails(testId)
ctbalToken.getClinicianTests(clinician)  
```

### Multi-Network Deployment
- **Development**: Local Hardhat node
- **Local Testing**: khmweb01 blockchain server
- **Public Testing**: Sepolia testnet (public, Etherscan verification)
- **Production**: Quorum consortium (private, healthcare compliance)

## Project-Specific Conventions

### Contract Naming
- Use `CTBAL` prefix for all contracts (`CTBALToken`, `CTBALAnalytics`)  
- Role constants use `_ROLE` suffix: `CLINICIAN_ROLE`, `ANALYST_ROLE`

### TypeScript Patterns
- Import Viem utilities: `import { parseEther, formatEther } from "viem"`
- Use `hre.viem.deployContract()` not ignition for simple deployments
- Access deployed contracts via `await contract.read.functionName()` and `await contract.write.functionName([params])`

### Analytics Integration
- Update analytics after token operations: `analytics.updateMetrics()`
- Query patterns: `getOverallMetrics()`, `getClinicianPerformance(address)`, `getTimeSeriesData()`
- Role verification: Always check `ANALYST_ROLE` before analytics operations

### Error Handling
- Deployment scripts include comprehensive error logging
- Use try/catch blocks around analytics queries (may fail if no data)
- Check contract deployment status with `npm run check:deployment`

## Client Data Ingestion Patterns

### Data Flow Architecture
```typescript
// Three-stage clinical data pipeline:
// 1. Clinician creates test → 2. Validator approves → 3. Analytics updated
```

### Allowed Data Push Methods
- **Clinical Test Creation**: Only `CLINICIAN_ROLE` can push clinical data via `createClinicalTest()`
- **Analytics Updates**: Only `ANALYST_ROLE` can trigger `updateMetrics()` to refresh analytics
- **Test Validation**: Only `VALIDATOR_ROLE` can approve tests via `validateClinicalTest()`

### Required Data Structure for Client Submissions
```solidity
// All clinical data must include:
createClinicalTest(
    string testType,        // e.g., "Cardiac Stress Test"
    address patient,        // Patient's blockchain address
    string dataHash,        // IPFS hash of clinical data
    string metadataHash,    // Additional metadata hash
    uint256 tokenAllocation // CTBAL tokens for patient incentive
)
```

### Data Validation Rules
- **Role Verification**: All data submissions require appropriate role (`onlyRole` modifiers)
- **Hash Validation**: Data and metadata must be provided as cryptographic hashes
- **Token Escrow**: Clinicians must have sufficient CTBAL balance for token allocation
- **Reentrancy Protection**: All data push functions use `nonReentrant` modifier

### Batch Data Collection Patterns
```bash
# Import CSV data from external sources (e.g., scrape-a-grave)
npm run import:csv:dry    # Dry run to validate CSV format
npm run import:csv        # Execute batch import to blockchain
```
- **CSV Integration**: Use `batch-csv-import.ts` to convert external CSV data into clinical tests
- **Flexible Mapping**: Script auto-detects CSV columns and maps to appropriate test types
- **Token Allocation**: Higher rewards for more complete data records (100-400 CTBAL)
- **Data Hashing**: CSV records converted to cryptographic hashes for on-chain storage

### External Client Integration Points
- **No Direct Database Access**: All data goes through smart contract functions
- **Event-Driven Updates**: Monitor `ClinicalTestCreated`, `ClinicalTestValidated` events
- **Analytics Polling**: Use `getOverallMetrics()`, `getTimeSeriesData()` for reporting
- **IPFS Integration**: Clinical data stored off-chain, only hashes on-chain
- **CSV Batch Import**: Use `batch-csv-import.ts` for bulk data ingestion from external systems

### Security Constraints for Data Clients
- **Pausable Contracts**: System can be paused (`whenNotPaused` modifier)
- **Access Control**: Must have appropriate roles before pushing data
- **Gas Optimization**: Batch operations when possible (single analytics update covers multiple tests)
- **Audit Trail**: All data pushes create immutable audit records

## Healthcare Compliance Notes

This system is designed for **clinical testing environments** with:
- Immutable audit trails for regulatory compliance
- Role-based access matching healthcare hierarchies  
- Private consortium deployment (Quorum) for HIPAA compliance
- Multi-signature validation for critical test data