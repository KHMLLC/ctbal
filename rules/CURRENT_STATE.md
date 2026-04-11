# CTBAL Rules - Current State

## Project Rules and Governance

### Smart Contract Rules

- **Solidity Version**: 0.8.20 with optimizer enabled (200 runs)
- **Access Control**: Role-based access using OpenZeppelin's AccessControl
  - `CLINICIAN_ROLE`: Can create clinical tests
  - `VALIDATOR_ROLE`: Can validate clinical tests
  - `AUDITOR_ROLE`: Can audit system records
  - `ANALYST_ROLE`: Can access analytics functions
- **Reentrancy Protection**: All state-changing functions use `nonReentrant`
- **Pausable Contracts**: System can be paused with `whenNotPaused` modifier

### Development Rules

- **TypeScript Required**: All new scripts must be TypeScript, no plain JavaScript
- **Viem Toolbox**: Use Viem for contract interactions, not ethers.js or web3.js
- **Testing Framework**: Mocha + Chai with Viem-specific patterns
- **Code Quality**: Use `npm run production:ready` for full validation pipeline

### Data Governance Rules

- **Clinical Data Integrity**: All clinical data must be hashed before on-chain storage
- **IPFS Integration**: Clinical data stored off-chain, only hashes on-chain
- **Escrow Mechanism**: Tokens locked until clinical tests completed and validated
- **Audit Trail**: All data operations create immutable audit records

### Network Deployment Rules

- **Development**: Local Hardhat network
- **Testing**: khmweb01 blockchain server + Sepolia testnet
- **Production**: Quorum consortium for healthcare compliance
- **Verification**: Etherscan verification required for public networks

### File Organization Rules

- **Contracts**: Store in `/contracts` directory
- **Scripts**: Deployment and interaction scripts in `/scripts`
- **Tests**: Testing files in `/test` directory
- **CSV Data**: Process through `/csv-queue`, completed in `/csv-completed`

## Compliance Requirements

- **Healthcare Compliance**: HIPAA compliance through private consortium deployment
- **Regulatory Audit**: Immutable audit trails for regulatory compliance
- **Multi-signature**: Critical operations require validator approval
