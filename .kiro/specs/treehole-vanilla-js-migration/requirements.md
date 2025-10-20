# Requirements Document

## Introduction

This document outlines the requirements for migrating the TreeHole project from React/TypeScript to Vanilla JavaScript and adding P2P voice chat functionality to fully meet the original specifications for the EthOnline Hackathon. The system must be 100% decentralized with no central servers, using only Vanilla JS with Vite as specified in the original requirements.

## Glossary

- **TreeHole_System**: The complete P2P voice chat application with token payment system
- **Vanilla_Frontend**: Pure JavaScript frontend without React or TypeScript frameworks
- **P2P_Voice_Chat**: Peer-to-peer audio communication using WebRTC
- **Payment_Extension_Flow**: Complete process from payment to real-time timer extension
- **Event_Notification_System**: Real-time blockchain event listening and UI updates
- **Random_Timer**: Timer that starts with random duration between 5-15 minutes
- **Payment_Confirmation_Dialog**: Modal dialog for payment confirmation with alarm-style UI
- **Toast_Notification_System**: User feedback system for payment confirmations
- **Listener_Acceptance_Flow**: System for listeners to accept or decline payment extensions

## Requirements

### Requirement 1

**User Story:** As a developer, I want to migrate the frontend from React/TypeScript to Vanilla JavaScript, so that the project meets the original technical specifications.

#### Acceptance Criteria

1. THE TreeHole_System SHALL use only Vanilla JavaScript without React or TypeScript
2. THE TreeHole_System SHALL use Vite as the build tool with vanilla-js template
3. THE TreeHole_System SHALL maintain all existing functionality during migration
4. THE TreeHole_System SHALL use modern ES6+ JavaScript features for clean code
5. THE TreeHole_System SHALL implement component-like structure using JavaScript modules

### Requirement 2

**User Story:** As a user, I want to participate in P2P voice chat, so that I can have real-time audio conversations.

#### Acceptance Criteria

1. WHEN users connect, THE P2P_Voice_Chat SHALL establish WebRTC connection
2. THE P2P_Voice_Chat SHALL support audio streaming between two users
3. THE P2P_Voice_Chat SHALL work without central servers (fully P2P)
4. WHEN connection fails, THE P2P_Voice_Chat SHALL display appropriate error messages
5. THE P2P_Voice_Chat SHALL integrate with the payment timer system

### Requirement 3

**User Story:** As a user, I want the timer to start with random duration, so that each session has unpredictable length.

#### Acceptance Criteria

1. WHEN timer resets, THE Random_Timer SHALL generate duration between 5-15 minutes
2. THE Random_Timer SHALL display the randomly generated time clearly
3. WHEN timer reaches zero, THE Random_Timer SHALL stop and display "Time is up"
4. THE Random_Timer SHALL update every second with smooth animations
5. THE Random_Timer SHALL support extension through payment system

### Requirement 4

**User Story:** As a payer, I want to see payment confirmation dialog, so that I can confirm my payment before execution.

#### Acceptance Criteria

1. WHEN user initiates payment, THE Payment_Confirmation_Dialog SHALL display with alarm-style design
2. THE Payment_Confirmation_Dialog SHALL show exact payment amount and recipient
3. THE Payment_Confirmation_Dialog SHALL show calculated extension time
4. WHEN user confirms, THE Payment_Confirmation_Dialog SHALL execute approve then payAndSplit
5. THE Payment_Confirmation_Dialog SHALL handle transaction rejections gracefully

### Requirement 5

**User Story:** As a user, I want to receive toast notifications for payments, so that I get immediate feedback on transactions.

#### Acceptance Criteria

1. WHEN payment succeeds, THE Toast_Notification_System SHALL show "You have just received 5 tokens"
2. WHEN payment fails, THE Toast_Notification_System SHALL show specific error message
3. THE Toast_Notification_System SHALL auto-dismiss after 5 seconds
4. THE Toast_Notification_System SHALL support multiple simultaneous toasts
5. THE Toast_Notification_System SHALL have different styles for success, error, and info

### Requirement 6

**User Story:** As a listener, I want to accept or decline payment extensions, so that I can control my participation.

#### Acceptance Criteria

1. WHEN payment is received for listener, THE Listener_Acceptance_Flow SHALL show acceptance prompt
2. WHEN listener accepts, THE TreeHole_System SHALL extend timer immediately
3. WHEN listener declines, THE TreeHole_System SHALL show decline message
4. THE Listener_Acceptance_Flow SHALL work in real-time across browser tabs
5. THE Listener_Acceptance_Flow SHALL timeout after 30 seconds if no response

### Requirement 7

**User Story:** As a user, I want real-time event notifications, so that I see immediate updates when payments occur.

#### Acceptance Criteria

1. WHEN PaymentProcessed event emits, THE Event_Notification_System SHALL detect it immediately
2. THE Event_Notification_System SHALL update UI without page refresh
3. THE Event_Notification_System SHALL work across multiple browser tabs
4. WHEN event listening fails, THE Event_Notification_System SHALL attempt reconnection
5. THE Event_Notification_System SHALL show connection status to users

### Requirement 8

**User Story:** As a user, I want enhanced payment controls, so that I can easily adjust extension time.

#### Acceptance Criteria

1. THE TreeHole_System SHALL provide ±10 minute adjustment buttons
2. THE TreeHole_System SHALL calculate cost dynamically as user adjusts time
3. THE TreeHole_System SHALL validate minimum and maximum extension limits
4. THE TreeHole_System SHALL show cost per minute clearly
5. THE TreeHole_System SHALL prevent payments with insufficient balance

### Requirement 9

**User Story:** As a developer, I want comprehensive error handling, so that users get clear feedback on all failure scenarios.

#### Acceptance Criteria

1. WHEN user rejects payment, THE TreeHole_System SHALL show "Payment cancelled by user"
2. WHEN insufficient balance, THE TreeHole_System SHALL show "Insufficient token balance"
3. WHEN network fails, THE TreeHole_System SHALL show "Network connection error"
4. WHEN contract call fails, THE TreeHole_System SHALL show specific contract error
5. THE TreeHole_System SHALL provide recovery suggestions for each error type

### Requirement 10

**User Story:** As a tester, I want to test with two accounts, so that I can verify the complete payment and splitting flow.

#### Acceptance Criteria

1. THE TreeHole_System SHALL support testing with Account A as payer and Account B as listener
2. WHEN Account A pays, THE TreeHole_System SHALL split tokens 50/50 to Account B and treasury
3. THE TreeHole_System SHALL update both accounts' balances in real-time
4. THE TreeHole_System SHALL extend timer on both accounts simultaneously
5. THE TreeHole_System SHALL handle concurrent payments from multiple accounts