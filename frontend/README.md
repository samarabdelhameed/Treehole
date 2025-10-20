# TreeHole - Vanilla JS Migration

A decentralized payment system for P2P voice chat sessions built with Vanilla JavaScript and modern web technologies.

## 🚀 Features

- **Wallet Integration**: Connect with MetaMask and other Web3 wallets
- **Token Payments**: Pay with ERC-20 tokens to extend conversation time
- **Voice Chat**: P2P voice communication (WebRTC)
- **Timer System**: Dynamic session timing with extensions
- **Responsive Design**: Mobile-first responsive UI
- **State Management**: Advanced reactive state management
- **Event System**: Pub/sub event communication
- **Performance Monitoring**: Built-in performance tracking
- **Error Handling**: Comprehensive error tracking and logging

## 🏗️ Architecture

### Core Components

- **App.js**: Main application controller with lifecycle management
- **StateManager**: Reactive state management with persistence
- **EventBus**: Pub/sub communication system
- **StorageManager**: Local storage with session management
- **Logger**: Advanced logging and debugging system

### Directory Structure

```
src/
├── components/          # UI components
│   ├── Timer.js        # Timer functionality
│   ├── Payment.js      # Payment processing
│   ├── VoiceChat.js    # Voice chat management
│   └── UI.js           # UI utilities
├── web3/               # Blockchain integration
│   ├── wallet.js       # Wallet management
│   ├── contracts.js    # Smart contract interaction
│   └── events.js       # Blockchain event handling
├── utils/              # Utility modules
│   ├── stateManager.js # State management system
│   ├── eventBus.js     # Event communication
│   ├── storage.js      # Data persistence
│   ├── logger.js       # Logging system
│   ├── sounds.js       # Audio management
│   └── time.js         # Time utilities
└── assets/             # Static assets
    └── sounds/         # Audio files
```

## 🛠️ Development

### Prerequisites

- Node.js 16+
- npm or yarn
- MetaMask or compatible Web3 wallet

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Setup

1. **Smart Contracts**: Update contract addresses in `src/web3/contracts.js`
2. **Network Configuration**: Configure supported networks
3. **Audio Assets**: Add sound files to `src/assets/sounds/`

## 🔧 Configuration

### Contract Addresses

Update the contract addresses in `src/web3/contracts.js`:

```javascript
export const CONTRACT_ADDRESSES = {
  paymentSplitter: 'YOUR_PAYMENT_SPLITTER_ADDRESS',
  testToken: 'YOUR_TEST_TOKEN_ADDRESS'
};
```

### State Management

The application uses a custom reactive state management system:

```javascript
// Subscribe to state changes
stateManager.subscribe((newState, prevState, action) => {
  console.log('State changed:', action);
});

// Update state
stateManager.setState({ 
  wallet: { isConnected: true } 
}, 'WALLET_CONNECTED');
```

### Event System

Components communicate through a centralized event bus:

```javascript
import { globalEventBus, EVENTS } from './utils/eventBus.js';

// Listen for events
globalEventBus.on(EVENTS.WALLET_CONNECTED, (walletState) => {
  console.log('Wallet connected:', walletState);
});

// Emit events
globalEventBus.emit(EVENTS.PAYMENT_SUCCESS, { amount: 10 });
```

## 📱 Features

### Wallet Integration

- MetaMask connection
- Network switching (Sepolia testnet)
- Account change detection
- Balance monitoring

### Payment System

- ERC-20 token payments
- Automatic approval handling
- Payment history tracking
- Error handling and recovery

### Timer Management

- Random session durations
- Real-time countdown
- Extension capabilities
- Audio notifications

### Voice Chat

- WebRTC peer connections
- Microphone controls
- Connection status indicators
- Audio quality management

## 🎨 UI/UX

### Design System

- **Colors**: Purple/orange gradient theme
- **Typography**: Inter font family with mono for code
- **Components**: Glass morphism design
- **Animations**: Smooth transitions and hover effects
- **Responsive**: Mobile-first approach

### Accessibility

- High contrast mode support
- Reduced motion preferences
- Keyboard navigation
- Screen reader compatibility

## 🔍 Debugging

### Logging System

```javascript
import { logger } from './utils/logger.js';

logger.debug('Debug message', { data: 'value' });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);
```

### Performance Monitoring

```javascript
import { performanceMonitor } from './utils/logger.js';

// Measure function performance
const result = performanceMonitor.measure('operation-name', () => {
  // Your code here
});

// Get performance metrics
const metrics = performanceMonitor.getMetrics();
```

### Event Debugging

```javascript
import { globalEventBus } from './utils/eventBus.js';

// Get debug information
const debugInfo = globalEventBus.getDebugInfo();
console.log('Event bus state:', debugInfo);

// View event history
const history = globalEventBus.getHistory();
console.log('Recent events:', history);
```

## 🚀 Deployment

### Build Process

```bash
# Create production build
npm run build

# The build output will be in the 'dist' directory
```

### Environment Variables

- `NODE_ENV`: Set to 'production' for production builds
- Contract addresses should be updated for target network

### Hosting

The application can be deployed to any static hosting service:

- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **Contract not deployed**: Update contract addresses in `contracts.js`
2. **MetaMask not detected**: Ensure MetaMask is installed and enabled
3. **Network mismatch**: Switch to Sepolia testnet in MetaMask
4. **Audio not working**: Check browser permissions for microphone access

### Error Messages

- "Contracts not deployed": Deploy contracts or update addresses
- "Insufficient funds": Add ETH for gas fees
- "Transaction failed": Check network connection and gas settings

### Debug Mode

Enable debug mode by setting `NODE_ENV=development` to see detailed logs and performance metrics.

## 📞 Support

For support and questions:

1. Check the troubleshooting section
2. Review the browser console for errors
3. Check the event bus debug information
4. Review the application logs