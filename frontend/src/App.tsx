import { useState, useEffect, useCallback } from 'react';
import { Wallet, Droplet, Plus, Minus, Clock, Coins, Settings, History } from 'lucide-react';
import Countdown from './ui/Countdown';
import Modal from './ui/Modal';
import Toast, { ToastType } from './ui/Toast';
import SettingsPanel from './ui/SettingsPanel';
import PaymentHistory from './ui/PaymentHistory';
import {
  connectWallet,
  disconnectWallet,
  switchToSepoliaNetwork,
  onAccountsChanged,
  onChainChanged,
  type WalletState,
} from './web3/wallet';
import {
  getContracts,
  getTokenBalance,
  approveTokens,
  payAndExtend,
  getTokenRatePerMinute,
  CONTRACT_ADDRESSES,
  type ContractInstances,
} from './web3/contracts';

import { claimFaucet, getFaucetAmount } from './web3/faucet';
import { minutesToSeconds } from './utils/time';
import { soundManager } from './utils/sounds';
import { storageManager } from './utils/storage';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

interface ToastMessage {
  message: string;
  type: ToastType;
  id: number;
}

function App() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    signer: null,
    chainId: null,
    isConnected: false,
  });
  const [contracts, setContracts] = useState<ContractInstances | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [tokenRate, setTokenRate] = useState<string>('10');
  const [extensionMinutes, setExtensionMinutes] = useState<number>(
    storageManager.getUserPreferences().defaultExtensionMinutes
  );
  const [listenerAddress, setListenerAddress] = useState<string>('');
  const [timerSeconds, setTimerSeconds] = useState<number>(900);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
    
    // Play sound based on toast type
    switch (type) {
      case 'success':
        soundManager.playPaymentSuccess();
        break;
      case 'error':
        soundManager.playError();
        break;
      case 'warning':
        soundManager.playTimerWarning();
        break;
    }
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const handleConnectWallet = async () => {
    try {
      setIsLoading(true);
      const walletState = await connectWallet();
      setWallet(walletState);

      if (walletState.signer) {
        // Verify we're on Sepolia testnet
        if (walletState.chainId !== 11155111) {
          addToast('Please switch to Sepolia testnet', 'warning');
          return;
        }

        // Always use real contracts - no mocking
        try {
          const contractInstances = getContracts(walletState.signer);
          setContracts(contractInstances);

          const bal = await getTokenBalance(
            contractInstances.testToken,
            walletState.address!
          );
          setBalance(bal);

          const rate = await getTokenRatePerMinute(contractInstances.paymentSplitter);
          setTokenRate(rate);
        } catch (contractError: any) {
          console.error('Contract initialization error:', contractError);
          addToast(`Contract error: ${contractError.message}`, 'error');
          return;
        }

        addToast('Wallet connected successfully to Sepolia testnet!', 'success');
      }
    } catch (error: any) {
      addToast(error.message || 'Failed to connect wallet', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
    setWallet({
      address: null,
      signer: null,
      chainId: null,
      isConnected: false,
    });
    setContracts(null);
    setBalance('0');
    addToast('Wallet disconnected', 'info');
  };

  const handleClaimFaucet = async () => {
    if (!contracts || !contracts.testToken || !wallet.address) {
      addToast('Please connect your wallet first', 'warning');
      return;
    }

    try {
      setIsLoading(true);
      await claimFaucet(contracts.testToken, wallet.address);
      const newBalance = await getTokenBalance(contracts.testToken, wallet.address);
      setBalance(newBalance);
      addToast(`Successfully claimed ${getFaucetAmount()} THT!`, 'success');
    } catch (error: any) {
      addToast(error.message || 'Failed to claim faucet', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTimer = () => {
    setIsTimerRunning(true);
    addToast('Timer started!', 'info');
  };

  const handleStopTimer = () => {
    setIsTimerRunning(false);
    addToast('Timer paused', 'info');
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    // Generate random time between 5-15 minutes (300-900 seconds)
    const randomMinutes = Math.floor(Math.random() * 11) + 5; // 5-15 minutes
    const randomSeconds = randomMinutes * 60;
    setTimerSeconds(randomSeconds);
    addToast(`Timer reset to ${randomMinutes} minutes`, 'info');
  };

  const handlePayToExtend = async () => {
    if (!contracts || !wallet.address) {
      addToast('Please connect your wallet first', 'warning');
      return;
    }

    if (!listenerAddress || listenerAddress === '') {
      addToast('Please enter a listener address', 'warning');
      return;
    }

    const totalCost = (parseFloat(tokenRate) * extensionMinutes).toFixed(2);
    if (parseFloat(balance) < parseFloat(totalCost)) {
      addToast('Insufficient balance for this payment', 'error');
      return;
    }

    setShowPaymentModal(true);
  };

  const executePayment = async () => {
    if (!contracts || !wallet.address) return;

    try {
      setIsLoading(true);
      const totalCost = (parseFloat(tokenRate) * extensionMinutes).toFixed(2);

      addToast('Step 1/2: Approving tokens...', 'info');
      await approveTokens(
        contracts.testToken,
        CONTRACT_ADDRESSES.paymentSplitter,
        totalCost
      );

      addToast('Step 2/2: Processing payment...', 'info');
      const tx = await payAndExtend(
        contracts.paymentSplitter,
        contracts.testToken,
        listenerAddress,
        extensionMinutes,
        totalCost
      );

      // Add to payment history
      const paymentRecord = storageManager.addPaymentRecord({
        type: 'sent',
        amount: totalCost,
        extensionMinutes,
        counterparty: listenerAddress,
        txHash: tx.hash,
        status: 'completed'
      });

      const newBalance = await getTokenBalance(contracts.testToken, wallet.address);
      setBalance(newBalance);

      const extensionSeconds = minutesToSeconds(extensionMinutes);
      setTimerSeconds((prev) => prev + extensionSeconds);

      addToast(
        `Payment successful! Extended ${extensionMinutes} minutes for ${totalCost} THT`,
        'success'
      );
      setShowPaymentModal(false);
    } catch (error: any) {
      addToast(error.message || 'Payment failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    onAccountsChanged(async (accounts) => {
      if (accounts.length === 0) {
        handleDisconnect();
      } else {
        const walletState = await connectWallet();
        setWallet(walletState);
        if (walletState.signer && contracts) {
          const bal = await getTokenBalance(contracts.testToken, accounts[0]);
          setBalance(bal);
        }
      }
    });

    onChainChanged(() => {
      window.location.reload();
    });

    // Listen for PaymentProcessed events
    if (contracts && wallet.address) {
      const paymentSplitter = contracts.paymentSplitter;
      
      const handlePaymentProcessed = (payer: string, listener: string, amount: any, extensionSeconds: any, event: any) => {
        // If current user is the listener, show notification and extend timer
        if (listener.toLowerCase() === wallet.address?.toLowerCase()) {
          const extensionMinutes = Number(extensionSeconds) / 60;
          const paymentAmount = Number(amount) / 1e18; // Convert from wei
          
          // Check user preferences for auto-accept
          const preferences = storageManager.getUserPreferences();
          let acceptPayment = preferences.autoAcceptPayments;
          
          if (!acceptPayment) {
            // Show acceptance prompt
            acceptPayment = window.confirm(
              `You received a payment of ${paymentAmount.toFixed(2)} THT for ${extensionMinutes} minutes extension. Accept?`
            );
          }
          
          if (acceptPayment) {
            // Add to payment history
            storageManager.addPaymentRecord({
              type: 'received',
              amount: paymentAmount.toFixed(2),
              extensionMinutes,
              counterparty: payer,
              txHash: event.log.transactionHash,
              status: 'completed'
            });
            
            addToast(`Payment accepted! Timer extended by ${extensionMinutes} minutes`, 'success');
            // Extend the timer
            setTimerSeconds(prev => prev + Number(extensionSeconds));
          } else {
            addToast('Payment declined', 'warning');
            // Note: In a real implementation, you might want to refund the payment
          }
        }
      };

      paymentSplitter.on('PaymentProcessed', handlePaymentProcessed);

      return () => {
        paymentSplitter.off('PaymentProcessed', handlePaymentProcessed);
      };
    }
  }, [contracts, wallet.address]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onStartTimer: () => {
      if (wallet.isConnected) {
        if (!isTimerRunning) {
          handleStartTimer();
        } else {
          handleStopTimer();
        }
      }
    },
    onResetTimer: handleResetTimer,
    onOpenSettings: () => setShowSettings(true),
    onOpenHistory: () => setShowHistory(true),
    onToggleSound: () => {
      soundManager.toggle();
      addToast(`Sound ${soundManager.isEnabled() ? 'enabled' : 'disabled'}`, 'info');
    }
  });

  const totalCost = (parseFloat(tokenRate) * extensionMinutes).toFixed(2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white relative overflow-hidden">
      <div className="stars-bg absolute inset-0" />

      <div className="relative z-10">
        <header className="p-6 flex justify-between items-center backdrop-blur-sm bg-black/20 border-b border-purple-500/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-orange-500 flex items-center justify-center glow-box">
              <Clock size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold glow-text">TreeHole</h1>
          </div>

          {!wallet.isConnected ? (
            <button
              onClick={handleConnectWallet}
              disabled={isLoading}
              className="btn-primary animate-pulse-slow"
            >
              <Wallet size={20} />
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="glass-card px-4 py-2 flex items-center gap-2">
                <Coins size={20} className="text-yellow-400" />
                <span className="font-mono font-bold">{parseFloat(balance).toFixed(2)} THT</span>

              </div>
              <div className="glass-card px-4 py-2">
                <span className="text-sm text-gray-300">
                  {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                </span>
              </div>
              <button 
                onClick={() => setShowHistory(true)} 
                className="btn-icon"
                title="Payment History"
              >
                <History size={20} />
              </button>
              <button 
                onClick={() => setShowSettings(true)} 
                className="btn-icon"
                title="Settings"
              >
                <Settings size={20} />
              </button>
              <button onClick={handleDisconnect} className="btn-secondary">
                Disconnect
              </button>
            </div>
          )}
        </header>

        <main className="container mx-auto px-4 py-12">
          {!wallet.isConnected ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
              <div className="glass-card p-12 max-w-2xl animate-fadeIn">
                <h2 className="text-5xl font-bold mb-6 glow-text">
                  Pay to Listen. Pay to Extend Time.
                </h2>
                <p className="text-xl text-gray-300 mb-8">
                  Connect your wallet to start your listening session
                </p>
                <button
                  onClick={handleConnectWallet}
                  disabled={isLoading}
                  className="btn-primary text-xl px-8 py-4 animate-pulse-slow"
                >
                  <Wallet size={24} />
                  Start Listening Session
                </button>
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 flex flex-col items-center justify-center">
                <div className="glass-card p-12 w-full text-center">
                  <Countdown
                    initialSeconds={timerSeconds}
                    isRunning={isTimerRunning}
                    onTimeEnd={() => {
                      setIsTimerRunning(false);
                      soundManager.playTimerEnd();
                      addToast('Time is up!', 'warning');
                    }}
                    onTimeUpdate={(seconds) => {
                      setTimerSeconds(seconds);
                      // Play warning sound at 60 seconds
                      if (seconds === 60) {
                        soundManager.playTimerWarning();
                      }
                    }}
                  />

                  <div className="mt-8 flex gap-4 justify-center">
                    {!isTimerRunning ? (
                      <button onClick={handleStartTimer} className="btn-primary">
                        <Clock size={20} />
                        Start Timer
                      </button>
                    ) : (
                      <button onClick={handleStopTimer} className="btn-secondary">
                        Pause
                      </button>
                    )}
                    <button onClick={handleResetTimer} className="btn-secondary">
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="glass-card p-6">
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Droplet size={24} className="text-blue-400" />
                    Get Test Tokens
                  </h3>
                  <p className="text-gray-300 mb-4">
                    Claim {getFaucetAmount()} THT tokens for testing

                  </p>
                  
                  {wallet.chainId !== 11155111 && (
                    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
                      <p className="text-yellow-200 text-sm mb-2">
                        ⚠️ Please switch to Sepolia testnet to claim tokens
                      </p>
                      <button
                        onClick={async () => {
                          try {
                            await switchToSepoliaNetwork();
                            addToast('Switched to Sepolia testnet!', 'success');
                            // Reconnect to refresh state
                            setTimeout(() => handleConnectWallet(), 1000);
                          } catch (error: any) {
                            addToast(error.message || 'Failed to switch network', 'error');
                          }
                        }}
                        className="btn-secondary text-sm w-full"
                      >
                        Switch to Sepolia
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={handleClaimFaucet}
                    disabled={isLoading || wallet.chainId !== 11155111}
                    className="btn-primary w-full shine-effect"
                  >
                    <Droplet size={20} />
                    {isLoading ? 'Claiming...' : 'Claim Faucet'}
                  </button>
                  
                  <p className="text-xs text-gray-400 mt-2">
                    Network: {wallet.chainId === 11155111 ? 'Sepolia Testnet ✅' : `Chain ID: ${wallet.chainId} ❌`}
                  </p>
                </div>

                <div className="glass-card p-6">
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Plus size={24} className="text-green-400" />
                    Extend Time
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        Listener Address
                      </label>
                      <input
                        type="text"
                        value={listenerAddress}
                        onChange={(e) => setListenerAddress(e.target.value)}
                        placeholder="0x..."
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        Extension Minutes
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setExtensionMinutes(Math.max(1, extensionMinutes - 10))}
                          className="btn-icon"
                        >
                          <Minus size={20} />
                        </button>
                        <input
                          type="number"
                          value={extensionMinutes}
                          onChange={(e) => setExtensionMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                          className="input-field text-center font-mono text-2xl"
                          min="1"
                        />
                        <button
                          onClick={() => setExtensionMinutes(extensionMinutes + 10)}
                          className="btn-icon"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="glass-card p-4 bg-purple-500/10">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Total Cost:</span>
                        <span className="text-2xl font-bold font-mono glow-text">
                          {totalCost} THT
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Rate: {tokenRate} THT/minute
                      </div>
                    </div>

                    <button
                      onClick={handlePayToExtend}
                      disabled={isLoading || !listenerAddress}
                      className="btn-primary w-full shine-effect hover:scale-105 transition-transform"
                    >
                      <Coins size={20} />
                      Pay to Extend
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Confirm Payment"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            You are about to pay <span className="font-bold text-white">{totalCost} THT</span> to
            extend <span className="font-bold text-white">{extensionMinutes} minutes</span> for
            listener:
          </p>
          <div className="glass-card p-3 font-mono text-sm break-all">
            {listenerAddress}
          </div>

          <div className="glass-card p-4 bg-yellow-500/10 border-yellow-500/30">
            <p className="text-sm text-yellow-200">
              This will execute 2 transactions:
            </p>
            <ol className="list-decimal list-inside text-sm text-gray-300 mt-2 space-y-1">
              <li>Approve tokens for spending</li>
              <li>Process payment and split</li>
            </ol>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="btn-secondary flex-1"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={executePayment}
              className="btn-primary flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      </Modal>

      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      {/* Settings Panel */}
      <SettingsPanel 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      {/* Payment History */}
      <PaymentHistory 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
      />
    </div>
  );
}

export default App;
