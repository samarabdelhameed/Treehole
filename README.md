# 🕳️ TreeHole - Decentralized Timer & Voice Chat Platform

A revolutionary Web3 application that combines blockchain-based payments with real-time communication, featuring a unique timer system that can be extended through cryptocurrency payments.

## 🌟 Features

### 🔗 Blockchain Integration
- **MetaMask Wallet Connection** - Seamless Web3 wallet integration
- **Smart Contract Interaction** - PaymentSplitter and TestToken contracts
- **Sepolia Testnet Support** - Full testnet compatibility
- **Token-based Payments** - THT (TreeHole Token) for timer extensions

### ⏰ Advanced Timer System
- **Random Duration Timer** - 10-15 minute sessions
- **Real-time Countdown** - Live updates with visual indicators
- **Payment Extensions** - Extend timer through blockchain payments
- **State Management** - Running, paused, warning, and critical states
- **Audio Notifications** - Sound alerts for state changes

### 🎤 Voice Chat System
- **WebRTC Integration** - Peer-to-peer voice communication
- **Audio Processing** - Real-time audio level monitoring
- **Permission Management** - Graceful microphone access handling
- **P2P Simulation** - Testing environment for voice features

### 💰 Payment System
- **Automatic Token Approval** - Streamlined payment process
- **Payment Splitting** - 50/50 split between listener and treasury
- **Transaction Tracking** - Complete payment history
- **Error Handling** - Comprehensive retry logic and user feedback

### 🎨 Modern UI/UX
- **Glassmorphism Design** - Beautiful modern interface
- **Responsive Layout** - Works on all devices
- **Real-time Updates** - Live status indicators
- **Toast Notifications** - User-friendly feedback system
- **Loading States** - Professional loading indicators

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MetaMask browser extension
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/treehole.git
cd treehole
```

2. **Install dependencies**
```bash
# Install frontend dependencies
cd frontend
npm install

# Install contract dependencies
cd ../contracts
npm install
```

3. **Environment Setup**
```bash
# Copy environment examples
cp .env.example .env
cp contracts/.env.example contracts/.env
cp frontend/.env.example frontend/.env

# Edit .env files with your configuration
```

4. **Deploy Contracts (Optional)**
```bash
cd contracts
npm run deploy:sepolia
```

5. **Start Development Server**
```bash
cd frontend
npm run dev
```

6. **Open Application**
Navigate to `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

#### Contracts (.env)
```env
SEPOLIA_RPC_URL=your_alchemy_or_infura_url
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

#### Frontend (.env)
```env
VITE_CONTRACT_ADDRESS_PAYMENT_SPLITTER=deployed_contract_address
VITE_CONTRACT_ADDRESS_TEST_TOKEN=deployed_token_address
VITE_NETWORK_CHAIN_ID=11155111
```

### Smart Contracts

The project uses two main contracts:

1. **PaymentSplitter** - Handles payment processing and splitting
2. **TestToken** - ERC20 token for payments (THT)

Contract addresses are configured for Sepolia testnet by default.

## 📱 Usage

### 1. Connect Wallet
- Click "Connect Wallet" button
- Approve MetaMask connection
- Ensure you're on Sepolia testnet

### 2. Get Test Tokens
- Click "Claim Tokens" to get THT tokens
- Tokens are required for timer extensions

### 3. Start Timer
- Click "Start Timer" to begin session
- Timer runs for 10-15 minutes randomly

### 4. Extend Timer
- Click "Extend Timer" when running low
- Choose extension duration (1-60 minutes)
- Approve token spending and payment

### 5. Voice Chat (Optional)
- Click "Start Voice Chat" to test voice features
- Allow microphone access when prompted

## 🏗️ Architecture

### Frontend Stack
- **Framework**: Vanilla JavaScript (ES6+)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Custom CSS
- **Web3**: Ethers.js v6
- **State Management**: Custom EventBus + StateManager

### Smart Contracts
- **Framework**: Foundry
- **Language**: Solidity ^0.8.19
- **Network**: Sepolia Testnet
- **Standards**: ERC20, OpenZeppelin

### Key Components

#### Frontend
- `App.js` - Main application controller
- `Timer.js` - Timer logic and state management
- `Payment.js` - Payment processing
- `WalletManager.js` - Web3 wallet integration
- `ContractsManager.js` - Smart contract interactions
- `VoiceChat.js` - Audio/voice functionality
- `EventBus.js` - Event system
- `StateManager.js` - Application state

#### Smart Contracts
- `PaymentSplitter.sol` - Payment processing and splitting
- `TestToken.sol` - ERC20 token implementation

## 🧪 Testing

### Frontend Testing
```bash
cd frontend
npm run test
```

### Contract Testing
```bash
cd contracts
forge test
```

### Manual Testing
1. Connect wallet and claim tokens
2. Start timer and let it run
3. Extend timer through payment
4. Test voice chat functionality
5. Verify all error scenarios

## 🚀 Deployment

### Frontend Deployment
```bash
cd frontend
npm run build
# Deploy dist/ folder to your hosting service
```

### Contract Deployment
```bash
cd contracts
npm run deploy:mainnet  # For production
npm run deploy:sepolia  # For testing
```

## 🔒 Security

### Best Practices Implemented
- Input validation for all user inputs
- Safe contract interactions with proper error handling
- Secure token handling and approval patterns
- Protection against common Web3 vulnerabilities
- Environment variable protection

### Security Considerations
- Never commit private keys or sensitive data
- Always verify contract addresses before deployment
- Test thoroughly on testnets before mainnet deployment
- Use hardware wallets for production deployments

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenZeppelin for secure smart contract libraries
- Ethers.js for Web3 integration
- Vite for fast development experience
- Tailwind CSS for styling system
- Foundry for smart contract development

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/treehole/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/treehole/discussions)
- **Email**: support@treehole.app

## 🗺️ Roadmap

- [ ] Mainnet deployment
- [ ] Real P2P voice chat implementation
- [ ] Mobile app development
- [ ] Additional payment tokens support
- [ ] Advanced timer customization
- [ ] User profiles and history
- [ ] Multi-language support

---

**Built with ❤️ by the TreeHole Team**

*Connecting people through blockchain technology and real-time communication.*