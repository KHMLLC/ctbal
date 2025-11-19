# Security Policy

## Supported Versions

We provide security updates for the following versions of CTBAL:

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The CTBAL team takes security seriously. If you discover a security vulnerability, please follow these steps:

### 1. **Do NOT** create a public GitHub issue

Security vulnerabilities should be reported privately to allow us to address them before public disclosure.

### 2. Send a detailed report to: **security@ctbal.org**

Include in your report:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fix (if you have one)
- Your contact information

### 3. Response Timeline

- **24 hours**: Initial response acknowledging receipt
- **72 hours**: Preliminary assessment and severity classification
- **7 days**: Detailed analysis and fix timeline
- **30 days**: Security patch release (for critical issues)

## Security Best Practices

### For Developers

- **Never commit private keys** or sensitive credentials
- **Use environment variables** for all configuration secrets
- **Follow OpenZeppelin patterns** for smart contract security
- **Run security audits** before deploying contract changes
- **Use multi-signature wallets** for production deployments

### For Users

- **Verify contract addresses** before interacting with CTBAL contracts
- **Use hardware wallets** for production environments
- **Keep private keys secure** and never share them
- **Verify transactions** on Etherscan before confirming
- **Use official documentation** and trusted sources only

## Smart Contract Security

### Current Security Measures

- ✅ **OpenZeppelin 5.4.0** security patterns
- ✅ **ReentrancyGuard** on all state-changing functions  
- ✅ **AccessControl** for role-based permissions
- ✅ **Pausable** contracts for emergency stops
- ✅ **Input validation** on all public functions

### Security Audits

| Audit Firm | Date | Version | Report |
|------------|------|---------|---------|
| Internal Review | 2025-11 | v2.0.0 | [Link](docs/audits/internal-2025-11.md) |
| *Planned External* | 2025-Q1 | v2.1.0 | *Pending* |

### Known Security Considerations

1. **Testnet Environment**: Current deployment is on Sepolia testnet for development
2. **Data Privacy**: Mortality data requires proper anonymization before blockchain storage
3. **Role Management**: Proper role assignment is critical for system security
4. **Gas Optimization**: Functions optimized to prevent DoS through gas exhaustion

## Healthcare Data Security

### HIPAA Compliance Considerations

While CTBAL processes mortality data from public sources (Find-a-Grave), users should:

- **Hash all PII** before blockchain storage
- **Use IPFS** for sensitive data with cryptographic hashes on-chain
- **Implement access controls** appropriate for healthcare environments
- **Maintain audit logs** for all data operations
- **Follow institutional policies** for healthcare data handling

### Data Handling Guidelines

- ✅ **Public mortality data** (Find-a-Grave sources) - Approved
- ⚠️ **Anonymized clinical data** - Requires proper hashing/encryption
- ❌ **Personally identifiable information** - Not permitted on blockchain

## Responsible Disclosure

We follow responsible disclosure practices:

1. **Private reporting** of vulnerabilities
2. **Coordinated disclosure** timeline with researchers
3. **Public acknowledgment** of security researchers (with permission)
4. **Transparent communication** about security updates

## Bug Bounty Program

We are planning to launch a bug bounty program in Q1 2025. Details will be announced on our GitHub repository and official channels.

### Scope (Planned)

- Smart contract vulnerabilities
- Frontend security issues  
- API security flaws
- Infrastructure vulnerabilities

### Out of Scope

- Social engineering attacks
- Physical security issues
- Third-party service vulnerabilities
- Issues in dependencies (report to upstream)

## Contact Information

- **Security Email**: security@ctbal.org
- **General Contact**: hello@ctbal.org
- **GitHub Issues**: For non-security bugs only
- **Emergency Contact**: Use security email for urgent issues

## Acknowledgments

We thank the following researchers for responsible disclosure:

*No security researchers have been acknowledged yet. Be the first!*

---

**Last Updated**: November 18, 2025  
**Next Review**: February 18, 2026