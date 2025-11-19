# Contributing to CTBAL

Thank you for your interest in contributing to the Clinical Test Blockchain Analytics (CTBAL) project! We welcome contributions from healthcare professionals, blockchain developers, researchers, and anyone passionate about improving clinical research through technology.

## 🌟 How to Contribute

### Types of Contributions

We welcome several types of contributions:

- 🐛 **Bug Reports**: Help us identify and fix issues
- ✨ **Feature Requests**: Suggest new functionality
- 📝 **Documentation**: Improve our docs and guides
- 🔧 **Code Contributions**: Submit bug fixes and new features
- 🧪 **Testing**: Help test new features and report issues
- 📊 **Data Analysis**: Contribute to mortality data insights

### Getting Started

1. **Fork the Repository**
   ```bash
   git clone https://github.com/djmanley/ctbal.git
   cd ctbal
   ```

2. **Set Up Development Environment**
   ```bash
   npm install
   cp .env.example .env
   # Configure your .env file with testnet credentials
   ```

3. **Verify Setup**
   ```bash
   npm run compile
   npm test
   npm run dashboard:sepolia
   ```

## 🔧 Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for new features  
- `feature/*`: Individual feature branches
- `hotfix/*`: Critical bug fixes

### Making Changes

1. **Create a Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow our coding standards (see below)
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   npm run compile
   npm test
   npm run test:analytics
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Submit a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   # Create PR through GitHub interface
   ```

## 📋 Coding Standards

### Smart Contracts (Solidity)

- Use Solidity 0.8.20 or later
- Follow OpenZeppelin patterns for security
- Include comprehensive natspec documentation
- Use ReentrancyGuard for state-changing functions
- Implement proper role-based access control

```solidity
/**
 * @title Example Contract
 * @dev Brief description of contract purpose
 */
contract ExampleContract is AccessControl, ReentrancyGuard {
    // Contract implementation
}
```

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable names
- Include JSDoc comments for functions
- Prefer async/await over promises

```typescript
/**
 * Process mortality data for blockchain deployment
 * @param csvData Raw CSV mortality data
 * @returns Processed clinical test data
 */
async function processMortalityData(csvData: string[]): Promise<ClinicalTestData[]> {
    // Implementation
}
```

### Testing

- Write comprehensive unit tests
- Include integration tests for smart contracts
- Test both success and failure scenarios
- Aim for >90% code coverage

```typescript
describe("CTBALToken", function() {
    it("should create clinical test with proper token allocation", async function() {
        // Test implementation
    });
});
```

## 🏥 Healthcare Compliance Guidelines

### Data Privacy

- **No PII**: Never commit personally identifiable information
- **HIPAA Awareness**: Follow healthcare data protection principles  
- **Encryption**: Use cryptographic hashes for sensitive data
- **Audit Trails**: Ensure all data operations are logged

### Clinical Standards

- **Evidence-Based**: Ground features in clinical research methodology
- **Regulatory Compliance**: Consider FDA, HIPAA, and other healthcare regulations
- **Ethical Considerations**: Ensure patient privacy and consent protocols
- **Documentation**: Maintain comprehensive audit documentation

## 🔒 Security Requirements

### Smart Contract Security

- **Reentrancy Protection**: Use `nonReentrant` modifier
- **Access Control**: Implement proper role-based permissions
- **Input Validation**: Validate all function parameters
- **Gas Optimization**: Consider gas costs in implementations

### Code Review Process

All contributions require:
- Security review for smart contract changes
- Healthcare compliance check for data handling
- Performance review for gas optimization
- Documentation review for completeness

## 📊 Data Contributions

### CSV Data Format

When contributing mortality data:

```csv
Name,Birth Date,Death Date,Age,Location,Additional Info
"John Doe","1940-01-01","2023-12-01",83,"Wyoming, USA","Veteran"
```

### Data Quality Standards

- **Completeness**: All required fields must be present
- **Accuracy**: Verify data sources and dates
- **Formatting**: Follow established CSV patterns
- **Privacy**: Remove or hash any sensitive information

## 🚀 Deployment Guidelines

### Testing Environments

1. **Local Development**: Use Hardhat local network
2. **Sepolia Testing**: Deploy to Sepolia testnet for integration testing
3. **Production**: Production deployment requires multi-signature approval

### Deployment Checklist

- [ ] All tests passing
- [ ] Security audit completed  
- [ ] Documentation updated
- [ ] Gas optimization reviewed
- [ ] Contract verification prepared

## 📚 Documentation Standards

### README Updates

- Keep contract addresses current
- Update system status information
- Include new feature documentation
- Maintain deployment instructions

### Code Documentation

- Include natspec for all smart contract functions
- Document API endpoints and responses
- Provide usage examples
- Maintain architecture diagrams

## 🎯 Issue Guidelines

### Bug Reports

Please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (network, version, etc.)
- Screenshots or logs if applicable

### Feature Requests

Please include:
- Clear description of the feature
- Use case and benefits
- Healthcare/clinical relevance
- Implementation considerations

## 🏆 Recognition

Contributors will be recognized in:
- Project README acknowledgments
- Release notes for significant contributions
- Academic publications citing the work
- Conference presentations about the project

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and community discussions
- **Documentation**: Check our comprehensive docs first
- **Email**: For sensitive security issues

## 📄 License

By contributing to CTBAL, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping advance clinical research through blockchain technology! 🚀**