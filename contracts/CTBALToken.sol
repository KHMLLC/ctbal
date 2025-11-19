// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CTBAL Token - Clinical Testing Blockchain Analytical Ledger
 * @dev Manages clinical testing data with blockchain immutability
 */
contract CTBALToken is ERC20, AccessControl, Pausable, ReentrancyGuard {
    
    // Role definitions for clinical testing environment
    bytes32 public constant CLINICAL_ADMIN_ROLE = keccak256("CLINICAL_ADMIN_ROLE");
    bytes32 public constant CLINICIAN_ROLE = keccak256("CLINICIAN_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    
    // Clinical test data structure
    struct ClinicalTest {
        uint256 testId;
        string testType;
        address clinician;
        address patient;
        uint256 timestamp;
        string dataHash; // IPFS hash for test data
        string metadataHash; // Additional metadata hash
        bool validated;
        bool completed;
        uint256 associatedTokens;
        mapping(address => bool) approvals; // Multi-signature approvals
        uint256 approvalCount;
    }
    
    // Audit trail for all balance changes
    struct AuditRecord {
        address account;
        uint256 previousBalance;
        uint256 newBalance;
        uint256 timestamp;
        string operation;
        address authorizer;
        uint256 testId; // Associated clinical test if applicable
    }
    
    // State variables
    mapping(uint256 => ClinicalTest) public clinicalTests;
    mapping(address => uint256[]) public patientTests;
    mapping(address => uint256[]) public clinicianTests;
    mapping(string => uint256) public testTypeCount;
    
    AuditRecord[] public auditTrail;
    uint256 private _testIdCounter;
    
    uint256 public totalClinicalTests;
    uint256 public validatedTests;
    
    // Events for clinical testing workflow
    event ClinicalTestCreated(
        uint256 indexed testId,
        address indexed clinician,
        address indexed patient,
        string testType,
        uint256 associatedTokens,
        string dataHash
    );
    
    event ClinicalTestValidated(
        uint256 indexed testId,
        address indexed validator,
        uint256 timestamp
    );
    
    event ClinicalTestCompleted(
        uint256 indexed testId,
        address indexed clinician,
        uint256 timestamp
    );
    
    event AuditRecorded(
        address indexed account,
        uint256 previousBalance,
        uint256 newBalance,
        string operation,
        address indexed authorizer
    );
    
    event TestApprovalReceived(
        uint256 indexed testId,
        address indexed approver,
        uint256 approvalCount
    );
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CLINICAL_ADMIN_ROLE, msg.sender);
        _mint(msg.sender, initialSupply * 10**decimals());
        _testIdCounter = 1; // Start at 1
    }
    
    /**
     * @dev Create a new clinical test record
     */
    function createClinicalTest(
        string memory testType,
        address patient,
        string memory dataHash,
        string memory metadataHash,
        uint256 tokenAllocation
    ) external onlyRole(CLINICIAN_ROLE) whenNotPaused returns (uint256) {
        require(patient != address(0), "Invalid patient address");
        require(bytes(testType).length > 0, "Test type required");
        require(bytes(dataHash).length > 0, "Data hash required");
        require(tokenAllocation > 0, "Token allocation must be positive");
        require(balanceOf(msg.sender) >= tokenAllocation, "Insufficient tokens");
        
        uint256 testId = _testIdCounter;
        _testIdCounter++;
        
        ClinicalTest storage newTest = clinicalTests[testId];
        newTest.testId = testId;
        newTest.testType = testType;
        newTest.clinician = msg.sender;
        newTest.patient = patient;
        newTest.timestamp = block.timestamp;
        newTest.dataHash = dataHash;
        newTest.metadataHash = metadataHash;
        newTest.validated = false;
        newTest.completed = false;
        newTest.associatedTokens = tokenAllocation;
        newTest.approvalCount = 0;
        
        // Update mappings
        patientTests[patient].push(testId);
        clinicianTests[msg.sender].push(testId);
        testTypeCount[testType]++;
        totalClinicalTests++;
        
        // Transfer tokens to escrow (contract holds them until validation)
        _transfer(msg.sender, address(this), tokenAllocation);
        
        // Record audit trail
        _recordAudit(
            address(this),
            balanceOf(address(this)) - tokenAllocation,
            balanceOf(address(this)),
            "Clinical test token escrow",
            msg.sender,
            testId
        );
        
        emit ClinicalTestCreated(
            testId,
            msg.sender,
            patient,
            testType,
            tokenAllocation,
            dataHash
        );
        
        return testId;
    }
    
    /**
     * @dev Validate a clinical test
     */
    function validateClinicalTest(
        uint256 testId
    ) external onlyRole(VALIDATOR_ROLE) whenNotPaused {
        require(testId > 0 && testId < _testIdCounter, "Invalid test ID");
        require(!clinicalTests[testId].validated, "Test already validated");
        require(!clinicalTests[testId].completed, "Test already completed");
        
        clinicalTests[testId].validated = true;
        validatedTests++;
        
        emit ClinicalTestValidated(testId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Complete a clinical test and release escrowed tokens
     */
    function completeClinicalTest(
        uint256 testId
    ) external onlyRole(CLINICIAN_ROLE) whenNotPaused {
        require(testId > 0 && testId < _testIdCounter, "Invalid test ID");
        require(clinicalTests[testId].clinician == msg.sender, "Not test owner");
        require(clinicalTests[testId].validated, "Test not validated");
        require(!clinicalTests[testId].completed, "Test already completed");
        
        ClinicalTest storage test = clinicalTests[testId];
        test.completed = true;
        
        // Release escrowed tokens to patient
        _transfer(address(this), test.patient, test.associatedTokens);
        
        // Record audit trail
        _recordAudit(
            test.patient,
            balanceOf(test.patient) - test.associatedTokens,
            balanceOf(test.patient),
            "Clinical test completion",
            msg.sender,
            testId
        );
        
        emit ClinicalTestCompleted(testId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Add approval for a clinical test (multi-signature support)
     */
    function approveClinicalTest(
        uint256 testId
    ) external onlyRole(VALIDATOR_ROLE) whenNotPaused {
        require(testId > 0 && testId < _testIdCounter, "Invalid test ID");
        require(!clinicalTests[testId].approvals[msg.sender], "Already approved");
        
        clinicalTests[testId].approvals[msg.sender] = true;
        clinicalTests[testId].approvalCount++;
        
        emit TestApprovalReceived(testId, msg.sender, clinicalTests[testId].approvalCount);
    }
    
    /**
     * @dev Get clinical test details
     */
    function getClinicalTest(uint256 testId) external view returns (
        uint256 id,
        string memory testType,
        address clinician,
        address patient,
        uint256 timestamp,
        string memory dataHash,
        string memory metadataHash,
        bool validated,
        bool completed,
        uint256 associatedTokens,
        uint256 approvalCount
    ) {
        require(testId > 0 && testId < _testIdCounter, "Invalid test ID");
        
        ClinicalTest storage test = clinicalTests[testId];
        return (
            test.testId,
            test.testType,
            test.clinician,
            test.patient,
            test.timestamp,
            test.dataHash,
            test.metadataHash,
            test.validated,
            test.completed,
            test.associatedTokens,
            test.approvalCount
        );
    }
    
    /**
     * @dev Get patient's clinical tests
     */
    function getPatientTests(address patient) external view returns (uint256[] memory) {
        return patientTests[patient];
    }
    
    /**
     * @dev Get clinician's clinical tests
     */
    function getClinicianTests(address clinician) external view returns (uint256[] memory) {
        return clinicianTests[clinician];
    }
    
    /**
     * @dev Get audit trail length
     */
    function getAuditTrailLength() external view returns (uint256) {
        return auditTrail.length;
    }
    
    /**
     * @dev Get audit record
     */
    function getAuditRecord(uint256 index) external view returns (AuditRecord memory) {
        require(index < auditTrail.length, "Invalid audit index");
        return auditTrail[index];
    }
    
    /**
     * @dev Internal function to record audit trail
     */
    function _recordAudit(
        address account,
        uint256 previousBalance,
        uint256 newBalance,
        string memory operation,
        address authorizer,
        uint256 testId
    ) internal {
        auditTrail.push(AuditRecord({
            account: account,
            previousBalance: previousBalance,
            newBalance: newBalance,
            timestamp: block.timestamp,
            operation: operation,
            authorizer: authorizer,
            testId: testId
        }));
        
        emit AuditRecorded(account, previousBalance, newBalance, operation, authorizer);
    }
    
    /**
     * @dev Override transfer to include audit trail
     */
    function transfer(address to, uint256 amount) public virtual override nonReentrant whenNotPaused returns (bool) {
        uint256 previousBalance = balanceOf(to);
        bool success = super.transfer(to, amount);
        
        if (success) {
            _recordAudit(
                to,
                previousBalance,
                balanceOf(to),
                "Token transfer",
                msg.sender,
                0
            );
        }
        
        return success;
    }
    
    /**
     * @dev Mint tokens for clinical programs
     */
    function mint(address to, uint256 amount) external onlyRole(CLINICAL_ADMIN_ROLE) {
        _mint(to, amount);
        _recordAudit(
            to,
            balanceOf(to) - amount,
            balanceOf(to),
            "Token minting",
            msg.sender,
            0
        );
    }
    
    /**
     * @dev Emergency pause
     */
    function pause() external onlyRole(CLINICAL_ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause
     */
    function unpause() external onlyRole(CLINICAL_ADMIN_ROLE) {
        _unpause();
    }
}