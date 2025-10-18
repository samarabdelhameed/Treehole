# Contributing to TreeHole

Thank you for your interest in contributing to TreeHole! This document provides guidelines and information for contributors.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/treehole.git
   cd treehole
   ```
3. **Set up the development environment**:
   ```bash
   ./start.sh test
   ```

## 🛠️ Development Setup

### Prerequisites

- Node.js (v18+)
- Foundry (for smart contracts)
- Git

### Quick Start

```bash
# Install all dependencies
npm run install-all

# Run tests
npm test

# Start development environment
npm start
```

## 📝 Code Style

### Smart Contracts (Solidity)

- Follow the [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- Use meaningful variable and function names
- Add comprehensive comments for complex logic
- Include NatSpec documentation for public functions

### Frontend (TypeScript/React)

- Follow the existing code style
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use meaningful component and variable names
- Add proper error handling

### General

- Write clear, self-documenting code
- Add comments for complex logic
- Follow existing naming conventions
- Keep functions small and focused

## 🧪 Testing

### Smart Contract Tests

```bash
cd contracts
forge test -vv
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Integration Tests

```bash
# Start Anvil
anvil --port 8545

# Deploy contracts
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# Test manually or with scripts
```

## 📋 Pull Request Process

1. **Create a feature branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:

   - Write clean, well-documented code
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**:

   ```bash
   npm test
   ```

4. **Commit your changes**:

   ```bash
   git add .
   git commit -m "Add: brief description of changes"
   ```

5. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

### Pull Request Guidelines

- **Clear title**: Describe what the PR does
- **Detailed description**: Explain the changes and why they're needed
- **Link issues**: Reference any related issues
- **Screenshots**: For UI changes, include before/after screenshots
- **Testing**: Describe how you tested the changes

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Clear description** of the bug
2. **Steps to reproduce** the issue
3. **Expected behavior** vs actual behavior
4. **Environment details** (OS, browser, Node.js version, etc.)
5. **Screenshots** if applicable
6. **Console logs** or error messages

## 💡 Feature Requests

For feature requests, please:

1. **Check existing issues** to avoid duplicates
2. **Describe the feature** clearly
3. **Explain the use case** and benefits
4. **Provide examples** if possible
5. **Consider implementation** complexity

## 📚 Documentation

- Update README.md for significant changes
- Add inline documentation for complex code
- Update API documentation if applicable
- Include examples for new features

## 🔒 Security

If you discover a security vulnerability:

1. **DO NOT** create a public issue
2. **Email** the maintainers directly
3. **Include** detailed information about the vulnerability
4. **Wait** for confirmation before public disclosure

## 🏷️ Commit Message Format

Use clear, descriptive commit messages:

```
type: brief description

Detailed explanation of the changes made.
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:

```
feat: add payment history tracking

Add a new component to display user payment history
with filtering and sorting capabilities.

fix: resolve timer synchronization issue

Fix bug where timer would not sync properly between
multiple browser tabs.

docs: update installation instructions

Add step-by-step installation guide for Windows users.
```

## 🎯 Areas for Contribution

### High Priority

- **Security improvements**
- **Performance optimizations**
- **Mobile responsiveness**
- **Error handling improvements**

### Medium Priority

- **Additional test coverage**
- **Documentation improvements**
- **UI/UX enhancements**
- **Code refactoring**

### Low Priority

- **New features**
- **Additional integrations**
- **Advanced analytics**
- **Internationalization**

## 🤝 Community Guidelines

- **Be respectful** and inclusive
- **Help others** learn and grow
- **Provide constructive feedback**
- **Follow the code of conduct**
- **Ask questions** when unsure

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Discord**: For real-time chat (if available)
- **Email**: For security issues

## 🏆 Recognition

Contributors will be recognized in:

- **README.md** contributors section
- **Release notes** for significant contributions
- **GitHub** contributor statistics

## 📄 License

By contributing to TreeHole, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to TreeHole! 🎉
