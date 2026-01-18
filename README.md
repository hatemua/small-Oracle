# Gold Price Oracle

A decentralized oracle system that fetches real-time gold prices from GoldAPI.io and updates a Solidity smart contract on the blockchain. The oracle provides gold prices in multiple formats (per gram, per ounce, and by karat purity) for consumption by other smart contracts.

## Features

- 🔄 Automatic price updates every 15 minutes (configurable)
- 💰 Multiple price formats: per gram, per ounce, 24K, 22K, and 18K gold
- 🔒 Secure ownership model with access control
- 📊 RESTful API for price queries and manual updates
- ⛽ Gas-optimized smart contract
- 🧪 Comprehensive test suite
- 📈 Staleness detection to ensure fresh data

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│  GoldAPI.io │─────▶│  Node.js API │─────▶│  Smart Contract │
└─────────────┘      └──────────────┘      └─────────────────┘
                            │                        │
                            │                        │
                            ▼                        ▼
                     ┌──────────────┐      ┌─────────────────┐
                     │   Cron Job   │      │  Other Contracts│
                     │  (15 mins)   │      │  (Consumers)    │
                     └──────────────┘      └─────────────────┘
```

## Prerequisites

- Node.js >= 16.x
- npm or yarn
- A blockchain wallet with some ETH for gas
- GoldAPI.io API key ([Get one here](https://www.goldapi.io/dashboard))
- RPC endpoint (Infura, Alchemy, or local node)

## Installation

1. **Clone or navigate to the project directory:**

```bash
cd gold-oracle
```

2. **Install dependencies:**

```bash
npm install
```

3. **Configure environment variables:**

```bash
cp .env.example .env
```

Edit `.env` and fill in your configuration:

```env
GOLD_API_KEY=your_goldapi_key_here
RPC_URL=https://sepolia.infura.io/v3/your-project-id
PRIVATE_KEY=your_wallet_private_key_here
CONTRACT_ADDRESS=deployed_contract_address
PORT=3000
UPDATE_INTERVAL_MINUTES=15
API_KEY=your-secret-api-key-here
```

## Smart Contract Deployment

### 1. Compile the contracts

```bash
npm run compile
```

### 2. Run tests

```bash
npm test
```

### 3. Deploy to local network

Start a local Hardhat node:

```bash
npm run node
```

In another terminal, deploy:

```bash
npm run deploy:local
```

### 4. Deploy to testnet (Sepolia)

```bash
npm run deploy:sepolia
```

### 5. Verify on Etherscan (optional)

```bash
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS
```

**Important:** After deployment, copy the contract address to your `.env` file as `CONTRACT_ADDRESS`.

## Running the Oracle Service

### Start the server

```bash
npm start
```

### Development mode (with auto-reload)

```bash
npm run dev
```

The server will:
- Start on port 3000 (or your configured PORT)
- Run an initial price update after 10 seconds
- Schedule automatic updates every 15 minutes (configurable)

## API Endpoints

### Health Check

```bash
GET http://localhost:3000/health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "config": {
    "updateIntervalMinutes": 15,
    "contractAddress": "0x..."
  }
}
```

### Get Current Prices from Contract

```bash
GET http://localhost:3000/prices
```

Response:
```json
{
  "success": true,
  "data": {
    "pricePerGram": "6550000000",
    "pricePerOunce": "203750000000",
    "pricePerKarat24": "6550000000",
    "pricePerKarat22": "6004166667",
    "pricePerKarat18": "4912500000",
    "lastUpdated": "1705318200",
    "isStale": false
  },
  "humanReadable": {
    "pricePerGram": "65.50 USD",
    "pricePerOunce": "2037.50 USD",
    "pricePerKarat24": "65.50 USD",
    "pricePerKarat22": "60.04 USD",
    "pricePerKarat18": "49.13 USD",
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
}
```

### Get Latest Price from GoldAPI (without updating contract)

```bash
GET http://localhost:3000/api/gold-price
```

### Manual Price Update (Protected)

```bash
POST http://localhost:3000/update-prices
Headers:
  X-API-Key: your-secret-api-key-here
```

Response:
```json
{
  "success": true,
  "data": {
    "updated": true,
    "transactionHash": "0x...",
    "blockNumber": 12345,
    "gasUsed": "54321",
    "prices": { ... }
  }
}
```

## Using the Oracle in Other Contracts

### 1. Import the interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IGoldOracle.sol";

contract MyGoldContract {
    IGoldOracle public goldOracle;

    constructor(address _oracleAddress) {
        goldOracle = IGoldOracle(_oracleAddress);
    }

    function getGoldPrice() public view returns (uint256) {
        // Get price per ounce (8 decimals)
        return goldOracle.getGoldPricePerOunce();
    }

    function get24KPrice() public view returns (uint256) {
        // Get 24K gold price per gram
        return goldOracle.getGoldPriceByKarat(24);
    }

    function getAllPriceData() public view returns (IGoldOracle.PriceData memory) {
        // Get all prices at once
        IGoldOracle.PriceData memory prices = goldOracle.getAllPrices();

        // Check if data is fresh
        require(!goldOracle.isStale(), "Oracle data is stale");

        return prices;
    }
}
```

### 2. Working with 8-decimal prices

All prices are stored with 8 decimals. To convert:

```solidity
// Contract returns: 6550000000 (for $65.50)
// To get USD value: divide by 10^8

uint256 priceWith8Decimals = goldOracle.getGoldPricePerGram();
// priceWith8Decimals = 6550000000

// In your application:
// actualPrice = 6550000000 / 100000000 = 65.50 USD
```

### 3. Example: Gold-backed token

```solidity
contract GoldBackedToken {
    IGoldOracle public oracle;

    constructor(address _oracle) {
        oracle = IGoldOracle(_oracle);
    }

    function calculateTokenValue(uint256 gramAmount) public view returns (uint256) {
        require(!oracle.isStale(), "Price data is stale");

        uint256 pricePerGram = oracle.getGoldPricePerGram();

        // Calculate value (both have 8 decimals)
        return (gramAmount * pricePerGram) / 1e8;
    }
}
```

## Smart Contract Interface

### View Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `getGoldPricePerGram()` | `uint256` | Current gold price per gram (8 decimals) |
| `getGoldPricePerOunce()` | `uint256` | Current gold price per ounce (8 decimals) |
| `getGoldPriceByKarat(uint8)` | `uint256` | Price by karat (18, 22, or 24) |
| `getAllPrices()` | `PriceData` | All prices in one call |
| `getLastUpdated()` | `uint256` | Timestamp of last update |
| `isStale()` | `bool` | True if data > 1 hour old |

### Owner Functions

| Function | Description |
|----------|-------------|
| `updatePrices(...)` | Update all gold prices (owner only) |
| `transferOwnership(address)` | Transfer ownership (owner only) |

### Events

```solidity
event PricesUpdated(
    uint256 gram,
    uint256 ounce,
    uint256 k24,
    uint256 k22,
    uint256 k18,
    uint256 timestamp
);

event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
);
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOLD_API_KEY` | GoldAPI.io API key | Yes |
| `RPC_URL` | Blockchain RPC endpoint | Yes |
| `PRIVATE_KEY` | Wallet private key (owner) | Yes |
| `CONTRACT_ADDRESS` | Deployed contract address | Yes |
| `PORT` | API server port | No (default: 3000) |
| `UPDATE_INTERVAL_MINUTES` | Update frequency | No (default: 15) |
| `API_KEY` | API protection key | No (default: generated) |

### Update Frequency

Modify `UPDATE_INTERVAL_MINUTES` in `.env`:

```env
UPDATE_INTERVAL_MINUTES=5   # Update every 5 minutes
UPDATE_INTERVAL_MINUTES=30  # Update every 30 minutes
UPDATE_INTERVAL_MINUTES=60  # Update every hour
```

## Project Structure

```
gold-oracle/
├── contracts/
│   ├── GoldOracle.sol              # Main oracle contract
│   └── interfaces/
│       └── IGoldOracle.sol         # Interface for consumers
├── scripts/
│   └── deploy.js                   # Deployment script
├── src/
│   ├── index.js                    # Express server
│   ├── services/
│   │   ├── goldApiService.js       # GoldAPI integration
│   │   └── oracleUpdater.js        # Contract updater
│   ├── config/
│   │   └── index.js                # Configuration
│   └── utils/
│       └── logger.js               # Logging utility
├── test/
│   └── GoldOracle.test.js          # Contract tests
├── .env.example                    # Environment template
├── hardhat.config.js               # Hardhat configuration
├── package.json                    # Dependencies
└── README.md                       # This file
```

## Testing

Run the full test suite:

```bash
npm test
```

Run with gas reporting:

```bash
REPORT_GAS=true npm test
```

Run with coverage:

```bash
npx hardhat coverage
```

## Security Considerations

1. **Private Key Security**: Never commit your private key. Use environment variables and keep `.env` in `.gitignore`.

2. **API Key Protection**: The manual update endpoint is protected with an API key. Use a strong random string.

3. **Owner Control**: Only the contract owner can update prices. Secure your owner wallet.

4. **Staleness Check**: Always check `isStale()` in consuming contracts to ensure fresh data.

5. **Gas Optimization**: The contract is optimized for low gas usage. Batch reads using `getAllPrices()` when possible.

## Troubleshooting

### "Missing required environment variables"

Ensure all required variables in `.env` are set. Check `.env.example` for reference.

### "GoldAPI error: 401"

Your GoldAPI key is invalid or expired. Get a new one from [GoldAPI.io](https://www.goldapi.io/dashboard).

### "Transaction failed"

- Check you have enough ETH for gas
- Verify your wallet is the contract owner
- Check RPC endpoint is working

### "Prices have not changed significantly"

The oracle skips updates if prices haven't changed by >0.01% to save gas. This is normal behavior.

## Gas Costs (Approximate)

- Deploy contract: ~500,000 gas
- Update prices: ~45,000 gas
- Read single price: ~2,500 gas (view, free)
- Read all prices: ~8,000 gas (view, free)

## License

MIT

## Support

For issues and questions:
- Check the [Issues](https://github.com/your-repo/gold-oracle/issues) page
- Review the code documentation
- Check GoldAPI.io documentation

## Roadmap

- [ ] Support for multiple currencies (EUR, GBP, etc.)
- [ ] Chainlink price feed integration as backup
- [ ] Multi-oracle aggregation
- [ ] Historical price storage
- [ ] WebSocket API for real-time updates
- [ ] Dashboard UI for monitoring

---

Built with ❤️ using Node.js, Hardhat, and Ethers.js v6
