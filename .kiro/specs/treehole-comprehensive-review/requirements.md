# Requirements Document

## Introduction

This document outlines the comprehensive review requirements for the TreeHole decentralized payment splitter system - a token payment system for P2P voice chat application built for EthOnline Hackathon. The system enables users to pay tokens to extend conversation time with a 50/50 split between listener and treasury.

## Glossary

- **TreeHole_System**: The complete decentralized payment splitter application
- **Payment_Splitter_Contract**: Smart contract that handles token payments and splits
- **Test_Token_Contract**: ERC-20 token contract for testing purposes
- **Frontend_Application**: Vite-based vanilla JavaScript user interface
- **Wallet_Connection**: MetaMask integration for blockchain interaction
- **Countdown_Timer**: Time-based component that tracks remaining conversation time
- **Payment_Flow**: Complete process from token approval to payment execution
- **Event_Listener**: System that monitors blockchain events for real-time updates
- **Treasury_Address**: Designated address that receives 50% of all payments
- **Listener_Address**: User address that receives 50% of payments for providing listening service

## Requirements

### Requirement 1

**User Story:** As a user, I want to connect my MetaMask wallet to the application, so that I can interact with the payment system.

#### Acceptance Criteria

1. WHEN the user clicks "Connect Wallet", THE TreeHole_System SHALL initiate MetaMask connection
2. WHEN MetaMask connection succeeds, THE TreeHole_System SHALL display user address and token balance
3. WHEN MetaMask connection fails, THE TreeHole_System SHALL display appropriate error message
4. WHEN the user switches accounts in MetaMask, THE TreeHole_System SHALL update displayed information
5. WHEN the user switches networks in MetaMask, THE TreeHole_System SHALL reload the application

### Requirement 2

**User Story:** As a user, I want to claim test tokens from a faucet, so that I can test the payment functionality.

#### Acceptance Criteria

1. WHEN the user clicks "Claim Faucet", THE Test_Token_Contract SHALL mint 1000 THT tokens to user address
2. WHEN faucet claim succeeds, THE TreeHole_System SHALL update displayed token balance
3. WHEN faucet claim fails, THE TreeHole_System SHALL display error message
4. THE Test_Token_Contract SHALL allow unlimited faucet claims for testing purposes

### Requirement 3

**User Story:** As a user, I want to start and control a countdown timer, so that I can track remaining conversation time.

#### Acceptance Criteria

1. WHEN the user clicks "Start Timer", THE Countdown_Timer SHALL begin counting down from current value
2. WHEN the user clicks "Pause", THE Countdown_Timer SHALL stop counting
3. WHEN the user clicks "Reset", THE Countdown_Timer SHALL set random time between 5-15 minutes
4. WHEN timer reaches zero, THE Countdown_Timer SHALL stop and display "Time is up" message
5. THE Countdown_Timer SHALL update display every second while running

### Requirement 4

**User Story:** As a user, I want to pay tokens to extend conversation time, so that I can continue the session.

#### Acceptance Criteria

1. WHEN the user enters listener address and extension minutes, THE TreeHole_System SHALL calculate total cost
2. WHEN the user clicks "Pay to Extend", THE TreeHole_System SHALL show payment confirmation modal
3. WHEN the user confirms payment, THE TreeHole_System SHALL execute approve transaction first
4. WHEN approve succeeds, THE TreeHole_System SHALL execute payAndSplit transaction
5. WHEN payAndSplit succeeds, THE TreeHole_System SHALL extend timer by specified minutes

### Requirement 5

**User Story:** As a payment processor, I want tokens to be split 50/50 between listener and treasury, so that revenue is distributed fairly.

#### Acceptance Criteria

1. WHEN payAndSplit executes, THE Payment_Splitter_Contract SHALL transfer 50% to listener address
2. WHEN payAndSplit executes, THE Payment_Splitter_Contract SHALL transfer 50% to treasury address
3. WHEN split completes, THE Payment_Splitter_Contract SHALL emit PaymentProcessed event
4. THE Payment_Splitter_Contract SHALL use SafeERC20 for secure token transfers
5. THE Payment_Splitter_Contract SHALL include ReentrancyGuard protection

### Requirement 6

**User Story:** As a listener, I want to receive real-time notifications when someone pays for extended time, so that I can accept or decline the session.

#### Acceptance Criteria

1. WHEN PaymentProcessed event is emitted, THE Event_Listener SHALL detect the event
2. WHEN event is for current user as listener, THE TreeHole_System SHALL show acceptance prompt
3. WHEN listener accepts, THE TreeHole_System SHALL extend timer in real-time
4. WHEN listener declines, THE TreeHole_System SHALL show appropriate message
5. THE Event_Listener SHALL work across multiple browser tabs/windows

### Requirement 7

**User Story:** As a developer, I want comprehensive error handling, so that users receive clear feedback on all operations.

#### Acceptance Criteria

1. WHEN any transaction fails, THE TreeHole_System SHALL display specific error message
2. WHEN user has insufficient balance, THE TreeHole_System SHALL prevent payment attempt
3. WHEN user rejects MetaMask transaction, THE TreeHole_System SHALL show cancellation message
4. WHEN network connection fails, THE TreeHole_System SHALL display connection error
5. THE TreeHole_System SHALL validate all user inputs before processing

### Requirement 8

**User Story:** As a security auditor, I want the smart contracts to be secure and tested, so that user funds are protected.

#### Acceptance Criteria

1. THE Payment_Splitter_Contract SHALL include ReentrancyGuard on payAndSplit function
2. THE Payment_Splitter_Contract SHALL validate all addresses are not zero
3. THE Payment_Splitter_Contract SHALL validate payment amounts are greater than zero
4. THE Payment_Splitter_Contract SHALL use SafeERC20 for all token operations
5. THE Test_Token_Contract SHALL include proper access controls for minting