# 🏥 CTBAL - Clinical Test Blockchain Analytics

> **Transforming mortality data into incentivized clinical research on the blockchain**

[![Sepolia Testnet](https://img.shields.io/badge/Network-Sepolia_Testnet-blue)](https://sepolia.etherscan.io/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-green)](https://soliditylang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A groundbreaking blockchain platform that converts mortality data from Find-a-Grave into tokenized clinical research opportunities. **Now featuring complete nationwide coverage of all 53 US states and territories.**

## 🚀 Live Deployment (Sepolia Testnet)

### Smart Contracts
- **🪙 CTBALToken**: [`0xcfab0ab01fd1a4a72601dd30da96fc13b0403246`](https://sepolia.etherscan.io/address/0xcfab0ab01fd1a4a72601dd30da96fc13b0403246)
- **📊 CTBALAnalytics**: [`0x5b07f9bac1f72cbd5ef931f13d00bb87785eab5d`](https://sepolia.etherscan.io/address/0x5b07f9bac1f72cbd5ef931f13d00bb87785eab5d)

### System Status
- ✅ **Fully Operational**: Live on Sepolia testnet
- 📈 **Data Coverage**: Complete US mortality data (53 states & territories)
- 💰 **Token Distribution**: Age-weighted system (200-450 CTBAL per test)
- 🔍 **Public Verification**: All contracts verified on Etherscan

## 🎯 System Architecture

The CTBAL platform integrates multiple components for comprehensive healthcare blockchain analytics:

- **CTBALToken.sol** - Clinical testing token with role-based access and automated escrow
- **CTBALAnalytics.sol** - Real-time analytics engine for performance monitoring
- **Queue Processing System** - High-volume mortality data pipeline (53 states)
- **Dashboard & Reporting** - Live blockchain metrics and compliance tracking

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Clinicians    │    │     Patients     │    │    Analysts     │
│                 │    │                  │    │                 │
│ Create Tests    │    │ Participate in   │    │ Monitor & Report│
│ Validate Tests  │    │ Clinical Trials  │    │ Performance     │
│ Complete Tests  │    │ Earn CTBAL       │    │ Generate Insights│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CTBALToken Contract                         │
│  • Role-based Access Control (Clinicians, Patients, Auditors)  │
│  • Clinical Test Creation & Management                          │
│  • Token Escrow & Automated Release                            │
│  • Audit Trail & Compliance Features                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CTBALAnalytics Contract                       │
│  • Real-time Metrics Collection                                │
│  • Performance Tracking (Clinicians & Patients)                │
│  • Test Type Analysis & Trends                                 │
│  • Time Series Data for Forecasting                            │
│  • Compliance & Audit Reporting                                │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
git clone <repository-url>
cd ctbal
npm install
```

### Available Commands

```bash
npm run compile      # Compile smart contracts
npm run test         # Run analytics validation
npm run test:compile # Force recompilation
npm run analytics    # Test analytics functions
npm run summary      # Show deployment status
npm run demo         # Show system capabilities
npm run clean        # Clear build artifacts
```

## 🧪 Use Case Example

### Multi-Hospital Clinical Research Study

**Participants:**

- Hospital A: Cardiology Department (Dr. Smith)
- Hospital B: Neurology Department (Dr. Jones)
- 6 Patients participating in clinical trials
- Data Analyst monitoring compliance & performance

**Workflow:**

1. **Setup**: Grant roles to clinicians, patients, analysts
2. **Funding**: Mint CTBAL tokens for patient incentives
3. **Tests**: Clinicians create clinical tests with token rewards
4. **Validation**: Tests validated by qualified clinicians
5. **Completion**: Tests completed, tokens released to patients
6. **Analytics**: Real-time metrics updated and analyzed
7. **Reporting**: Performance reports generated for stakeholders

**Sample Clinical Tests:**

- Cardiac Stress Test → 200 CTBAL reward
- Brain MRI with Contrast → 400 CTBAL reward
- Cognitive Assessment → 250 CTBAL reward
- EEG Sleep Study → 350 CTBAL reward

## 📊 Analytics Features

### Real-time Metrics

- Total tests created/validated/completed
- Token allocation and distribution tracking
- Validation rate (% of tests validated)
- Completion rate (% of tests finished)

### Performance Tracking

- Clinician productivity metrics
- Patient participation levels
- Test type analysis and trends
- Time series data for forecasting

### Compliance & Auditing

- Immutable audit trails
- Role-based access controls
- Automated reporting capabilities
- Regulatory compliance monitoring

## 🔐 Security Features

- **Role-Based Access Control**: Clinicians, Patients, Auditors, Analysts
- **Reentrancy Protection**: Prevents malicious contract interactions
- **Input Validation**: Comprehensive bounds checking
- **Event Logging**: Complete audit trail for all operations
- **Token Escrow**: Secure token holding until test completion

## 💼 Business Value

### Cost Reduction

- Automated patient payments (no manual processing)
- Reduced administrative overhead
- Streamlined compliance reporting

### Efficiency Gains

- Real-time trial monitoring
- Instant performance feedback
- Automated workflow management

### Risk Mitigation

- Immutable audit trails
- Transparent payment system
- Compliance automation

### Performance Optimization

- Data-driven decision making
- Bottleneck identification
- Resource allocation insights

## 🛠️ Technical Specifications

### Contract Details

- **Solidity Version**: 0.8.20
- **OpenZeppelin**: 5.4.0 (Security & Standards)
- **Hardhat**: 3.0.14 (Development Framework)
- **Viem**: 2.39.0 (Ethereum Interaction)

### Contract Functions

- **CTBALToken**: 40 functions
- **CTBALAnalytics**: 23 functions

### Key Contract Features

- ERC20 token standard compliance
- Role-based access control
- Clinical test lifecycle management
- Comprehensive analytics collection
- Time series data tracking
- Gas-optimized operations

## 📚 Contract Reference

### CTBALToken Main Functions

```solidity
// Test Management
function createClinicalTest(string name, string description, uint256 reward, address patient, uint256 testType)
function validateTest(uint256 testId)
function completeTest(uint256 testId, string results)

// Role Management
function grantRole(bytes32 role, address account)
function revokeRole(bytes32 role, address account)

// Token Operations
function mint(address to, uint256 amount)
function transfer(address to, uint256 amount)
```

### CTBALAnalytics Main Functions

```solidity
// Analytics Updates
function updateMetrics()

// Metrics Retrieval
function getOverallMetrics() returns (uint256, uint256, uint256, uint256, uint256)
function getValidationRate() returns (uint256)
function getCompletionRate() returns (uint256)
function getClinicianPerformance(address clinician) returns (uint256)
function getPatientParticipation(address patient) returns (uint256)
function getTestTypeMetrics(uint256 testType) returns (uint256, uint256)
function getTimeSeriesData() returns (TimeSeriesData[] memory)
```

## 🌐 Deployment

### Local Testing

```bash
# Compile contracts
npm run compile

# Run tests
npm run test

# Show system demo
npm run demo
```

### Production Deployment

1. Configure network in `hardhat.config.ts`
2. Set up environment variables
3. Deploy using deployment script
4. Verify contracts on block explorer
5. Set up monitoring and alerting

### Network Configuration Example

```typescript
// hardhat.config.ts
const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    mainnet: {
      url: process.env.MAINNET_URL,
      accounts: [process.env.PRIVATE_KEY]
    },
    polygon: {
      url: process.env.POLYGON_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

## 📈 Monitoring & Analytics

### Key Performance Indicators (KPIs)

- Test Creation Rate
- Validation Efficiency
- Completion Rate
- Token Distribution
- Clinician Performance
- Patient Engagement

### Real-time Dashboards

- Live test statistics
- Performance metrics
- Compliance status
- Financial analytics
- Trend analysis

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🎉 Conclusion

The CTBAL system provides a complete blockchain solution for clinical testing management, offering transparency, automation, compliance, and comprehensive analytics for healthcare research operations.

**Ready for production deployment!** 🚀🚀 CI/CD Ready
🚀 CTBAL CI/CD Pipeline Fully Operational - All Secrets Configured!
