# CTBALAnalytics Contract - Usage Guide

## 📊 Contract Overview
The `CTBALAnalytics.sol` contract provides comprehensive analytics for your clinical testing blockchain system. It integrates with `CTBALToken.sol` to track and analyze clinical test data, participant performance, and token economics.

## 🔧 Key Functions

### Core Analytics Functions
```solidity
// Update all analytics metrics from the token contract
function updateMetrics() external onlyRole(ANALYST_ROLE) nonReentrant

// Get comprehensive metrics summary
function getOverallMetrics() external view returns (
    uint256 totalTests,
    uint256 validatedTests, 
    uint256 completedTests,
    uint256 totalTokensAllocated,
    uint256 totalTokensReleased
)

// Get validation and completion rates as percentages
function getValidationRate() external view returns (uint256)
function getCompletionRate() external view returns (uint256)
```

### Performance Tracking
```solidity
// Track clinician performance
function getClinicianPerformance(address clinician) external view returns (uint256)

// Track patient participation and earnings
function getPatientParticipation(address patient) external view returns (uint256)

// Analyze test types and completion rates
function getTestTypeMetrics(uint256 testType) external view returns (uint256 count, uint256 completed)
```

### Time Series Analytics  
```solidity
// Get historical data for trend analysis
function getTimeSeriesData() external view returns (TimeSeriesData[] memory)

// Get number of time series data points
function getTimeSeriesLength() external view returns (uint256)
```

## 🔐 Access Control
- **ANALYST_ROLE**: Required to call `updateMetrics()`
- **DEFAULT_ADMIN_ROLE**: Can grant/revoke analyst roles
- All view functions are public for transparency

## 📈 Data Structures

### ClinicalMetrics
```solidity
struct ClinicalMetrics {
    uint256 totalTests;
    uint256 validatedTests;
    uint256 completedTests;
    uint256 totalTokensAllocated;
    uint256 totalTokensReleased;
    mapping(address => uint256) clinicianPerformance;
    mapping(address => uint256) patientParticipation;
    mapping(uint256 => TestTypeMetric) testTypeMetrics;
}
```

### TimeSeriesData
```solidity
struct TimeSeriesData {
    uint256 timestamp;
    uint256 totalTests;
    uint256 completedTests;
    uint256 tokensReleased;
}
```

## 🚀 Integration Example

```javascript
// 1. Deploy contracts
const ctbalToken = await deployContract("CTBALToken", [
    "Clinical Test Blockchain Token",
    "CTBAL", 
    parseEther("1000000")
]);

const ctbalAnalytics = await deployContract("CTBALAnalytics", [
    ctbalToken.address
]);

// 2. Grant analyst role
const ANALYST_ROLE = await ctbalAnalytics.ANALYST_ROLE();
await ctbalAnalytics.grantRole(ANALYST_ROLE, analystAddress);

// 3. Create clinical tests (via CTBALToken)
await ctbalToken.createClinicalTest(
    "Blood Test Analysis",
    "Comprehensive blood work",
    parseEther("100"),
    patientAddress,
    1 // testType
);

// 4. Update analytics after tests are created/completed
await ctbalAnalytics.updateMetrics();

// 5. Query analytics data
const metrics = await ctbalAnalytics.getOverallMetrics();
const completionRate = await ctbalAnalytics.getCompletionRate();
const timeSeriesData = await ctbalAnalytics.getTimeSeriesData();
```

## 🎯 Use Cases

### Research Dashboard
- Track total tests, validation rates, completion rates
- Monitor token allocation and distribution
- Analyze time series trends

### Performance Monitoring  
- Evaluate clinician performance and efficiency
- Track patient participation and earnings
- Compare test type completion rates

### Compliance Reporting
- Generate audit reports for regulatory compliance
- Track test validation workflows
- Monitor token escrow and release patterns

## ⚡ Gas Optimization

The contract includes several gas optimizations:
- Batch metric updates in single transaction
- Efficient mapping structures
- Limited time series data (max 100 points)
- View functions for cost-free queries

## 🔒 Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **AccessControl**: Role-based permissions
- **Input Validation**: Proper bounds checking
- **Event Logging**: Comprehensive audit trail

Your analytics contract is production-ready and provides comprehensive insights into your clinical testing blockchain system!