# DeFi Direct

A decentralized finance protocol built on Stacks that enables direct crypto-to-fiat transactions through a bridge service. Users can initiate transactions to convert their SIP-010 tokens to fiat currency, which gets deposited directly into their bank accounts.

## 🚀 Features

- **Direct Crypto-to-Fiat Conversion**: Convert SIP-010 tokens directly to fiat currency
- **Multi-Token Support**: Support for multiple SIP-010 compliant tokens
- **Secure Transaction Management**: Role-based access control with owner and transaction manager roles
- **Fee Management**: Configurable spread fees with maximum limits
- **Transaction Tracking**: Complete transaction history and status tracking
- **Refund System**: Built-in refund mechanism for failed transactions
- **Pausable Contract**: Emergency pause functionality for security


## 📑 Smart Contract Overview

### Core Components

- **Transaction Management**: Handles initiation, completion, and refunds
- **Token Support**: Dynamic addition/removal of supported tokens
- **Fee System**: Configurable percentage-based fees (max 5%)
- **Role-Based Access**: Owner, transaction manager, and fee receiver roles
- **Emergency Controls**: Pause/unpause functionality

### Key Data Structures

```clarity
;; Transaction Record
{
  user: principal,
  token: principal,
  amount: uint,
  amount-spent: uint,
  transaction-fee: uint,
  transaction-timestamp: uint,
  fiat-bank-account-number: uint,
  fiat-bank: (string-ascii 32),
  recipient-name: (string-ascii 32),
  fiat-amount: uint,
  is-completed: bool,
  is-refunded: bool,
}
```

## Getting Started

### Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) - Stacks development environment
- [Node.js](https://nodejs.org/) - For running tests
- [Git](https://git-scm.com/) - Version control

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd defi-direct
```

2. Install dependencies:
```bash
npm install
```

3. Check contract syntax:
```bash
clarinet check
```

## Usage

### 1. Initialize the Contract

```clarity
(contract-call? .defi-direct initializer
  u100           ;; 1% fee (100 basis points)
  'SP123...      ;; transaction manager address
  'SP456...      ;; fee receiver address
  'SP789...      ;; vault address
)
```

### 2. Add Supported Tokens

```clarity
(contract-call? .defi-direct add-supported-token 'SP123...TOKEN)
```

### 3. Initiate a Fiat Transaction

```clarity
(contract-call? .defi-direct initiate-fiat-transaction
  .token-contract
  u1000000       ;; amount (with decimals)
  u1234567890    ;; bank account number
  u50000         ;; fiat amount (cents)
  "Chase Bank"   ;; bank name
  "John Doe"     ;; recipient name
)
```

### 4. Complete Transaction (Transaction Manager Only)

```clarity
(contract-call? .defi-direct complete-transaction
  .token-contract
  0x1234...      ;; transaction ID
  u1000000       ;; amount spent
)
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:report
```

### Watch Mode
```bash
npm run test:watch
```

### Test Structure

- **Unit Tests** (`defi-direct.unit.test.ts`): Test individual functions
- **Integration Tests** (`defi-direct.integration.test.ts`): Test complete workflows


## 🔗 Links

- [Stacks Documentation](https://docs.stacks.co/)
- [Clarinet Documentation](https://docs.hiro.so/clarinet)
- [SIP-010 Standard](https://github.com/stacksgov/sips/blob/main/sips/sip-010/sip-010-fungible-token-standard.md)
