import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Application configuration
 * All values are loaded from environment variables
 */
const config = {
  // GoldAPI.io configuration
  goldApi: {
    key: process.env.GOLD_API_KEY,
    baseUrl: 'https://www.goldapi.io/api',
    symbol: 'XAU',
    currency: 'USD',
  },

  // Blockchain configuration
  blockchain: {
    rpcUrl: process.env.RPC_URL,
    privateKey: process.env.PRIVATE_KEY,
    contractAddress: process.env.CONTRACT_ADDRESS,
  },

  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    apiKey: process.env.API_KEY || 'your-secret-api-key',
  },

  // Update configuration
  update: {
    intervalMinutes: parseInt(process.env.UPDATE_INTERVAL_MINUTES || '15'),
    maxRetries: 3,
    retryDelayMs: 5000,
  },
};

/**
 * Validate required configuration
 */
export function validateConfig() {
  const required = [
    { key: 'GOLD_API_KEY', value: config.goldApi.key },
    { key: 'RPC_URL', value: config.blockchain.rpcUrl },
    { key: 'PRIVATE_KEY', value: config.blockchain.privateKey },
    { key: 'CONTRACT_ADDRESS', value: config.blockchain.contractAddress },
  ];

  const missing = required.filter(({ value }) => !value);

  if (missing.length > 0) {
    const missingKeys = missing.map(({ key }) => key).join(', ');
    throw new Error(
      `Missing required environment variables: ${missingKeys}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
}

export default config;
