// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CTBALToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CTBAL Analytics - Clinical Testing Analytics
 * @dev Provides comprehensive analytics for clinical testing data
 */
contract CTBALAnalytics is AccessControl, ReentrancyGuard {
    CTBALToken public ctbalToken;
    
    bytes32 public constant ANALYST_ROLE = keccak256("ANALYST_ROLE");
    
    struct ClinicalMetrics {
        uint256 totalTests;
        uint256 validatedTests;
        uint256 completedTests;
        uint256 totalTokensAllocated;
        uint256 totalTokensReleased;
        uint256 averageTestDuration;
        mapping(string => uint256) testTypeMetrics;
        mapping(address => uint256) clinicianPerformance;
        mapping(address => uint256) patientParticipation;
    }
    
    struct TimeSeriesData {
        uint256 timestamp;
        uint256 testsCreated;
        uint256 testsValidated;
        uint256 testsCompleted;
        uint256 tokensAllocated;
    }
    
    ClinicalMetrics public metrics;
    TimeSeriesData[] public timeSeriesData;
    string[] public testTypes;
    mapping(string => bool) public testTypeExists;
    
    event MetricsUpdated(uint256 timestamp, address updater);
    event TimeSeriesRecorded(uint256 timestamp, uint256 testsCreated, uint256 testsValidated);
    
    constructor(address _ctbalToken) {
        ctbalToken = CTBALToken(_ctbalToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ANALYST_ROLE, msg.sender);
    }
    
    /**
     * @dev Update all analytics metrics
     */
    function updateMetrics() external onlyRole(ANALYST_ROLE) nonReentrant {
        uint256 totalTests = ctbalToken.totalClinicalTests();
        uint256 validatedTests = ctbalToken.validatedTests();
        uint256 completedTests = 0;
        uint256 totalTokensAllocated = 0;
        uint256 totalTokensReleased = 0;
        uint256 totalDuration = 0;
        uint256 completedWithDuration = 0;
        
        // Analyze each test
        for (uint256 i = 1; i <= totalTests; i++) {
            (
                ,
                string memory testType,
                address clinician,
                address patient,
                uint256 timestamp,
                ,
                ,
                bool validated,
                bool completed,
                uint256 associatedTokens,
            ) = ctbalToken.getClinicalTest(i);
            
            totalTokensAllocated += associatedTokens;
            
            if (completed) {
                completedTests++;
                totalTokensReleased += associatedTokens;
                
                // Calculate duration (simplified - would use completion timestamp in real implementation)
                uint256 duration = block.timestamp - timestamp;
                totalDuration += duration;
                completedWithDuration++;
            }
            
            // Update test type metrics
            if (!testTypeExists[testType]) {
                testTypes.push(testType);
                testTypeExists[testType] = true;
            }
            
            metrics.testTypeMetrics[testType]++;
            metrics.clinicianPerformance[clinician]++;
            metrics.patientParticipation[patient]++;
        }
        
        // Update aggregate metrics
        metrics.totalTests = totalTests;
        metrics.validatedTests = validatedTests;
        metrics.completedTests = completedTests;
        metrics.totalTokensAllocated = totalTokensAllocated;
        metrics.totalTokensReleased = totalTokensReleased;
        
        if (completedWithDuration > 0) {
            metrics.averageTestDuration = totalDuration / completedWithDuration;
        }
        
        // Record time series data
        timeSeriesData.push(TimeSeriesData({
            timestamp: block.timestamp,
            testsCreated: totalTests,
            testsValidated: validatedTests,
            testsCompleted: completedTests,
            tokensAllocated: totalTokensAllocated
        }));
        
        emit MetricsUpdated(block.timestamp, msg.sender);
        emit TimeSeriesRecorded(block.timestamp, totalTests, validatedTests);
    }
    
    /**
     * @dev Get test type metrics
     */
    function getTestTypeMetrics(string memory testType) external view returns (uint256) {
        return metrics.testTypeMetrics[testType];
    }
    
    /**
     * @dev Get clinician performance
     */
    function getClinicianPerformance(address clinician) external view returns (uint256) {
        return metrics.clinicianPerformance[clinician];
    }
    
    /**
     * @dev Get patient participation
     */
    function getPatientParticipation(address patient) external view returns (uint256) {
        return metrics.patientParticipation[patient];
    }
    
    /**
     * @dev Get all test types
     */
    function getAllTestTypes() external view returns (string[] memory) {
        return testTypes;
    }
    
    /**
     * @dev Get overall metrics summary
     */
    function getOverallMetrics() external view returns (
        uint256 totalTests,
        uint256 validatedTests,
        uint256 completedTests,
        uint256 totalTokensAllocated,
        uint256 totalTokensReleased
    ) {
        return (
            metrics.totalTests,
            metrics.validatedTests,
            metrics.completedTests,
            metrics.totalTokensAllocated,
            metrics.totalTokensReleased
        );
    }

    /**
     * @dev Get completion rate
     */
    function getCompletionRate() external view returns (uint256) {
        if (metrics.totalTests == 0) return 0;
        return (metrics.completedTests * 100) / metrics.totalTests;
    }
    
    /**
     * @dev Get validation rate
     */
    function getValidationRate() external view returns (uint256) {
        if (metrics.totalTests == 0) return 0;
        return (metrics.validatedTests * 100) / metrics.totalTests;
    }
    
    /**
     * @dev Get time series data length
     */
    function getTimeSeriesLength() external view returns (uint256) {
        return timeSeriesData.length;
    }
    
    /**
     * @dev Get time series data by index
     */
    function getTimeSeriesData(uint256 index) external view returns (TimeSeriesData memory) {
        require(index < timeSeriesData.length, "Invalid index");
        return timeSeriesData[index];
    }
}
