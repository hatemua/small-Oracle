import { ethers } from 'ethers';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import goldApiService from './goldApiService.js';

// Contract ABI - only the functions we need
const CONTRACT_ABI = [
  'function updatePrices(uint256 _gram, uint256 _ounce, uint256 _k24, uint256 _k22, uint256 _k18) external',
  'function getAllPrices() external view returns (tuple(uint256 pricePerGram, uint256 pricePerOunce, uint256 pricePerKarat24, uint256 pricePerKarat22, uint256 pricePerKarat18, uint256 lastUpdated))',
  'function isStale() public view returns (bool)',
  'function owner() public view returns (address)',
  'event PricesUpdated(uint256 gram, uint256 ounce, uint256 k24, uint256 k22, uint256 k18, uint256 timestamp)',
];

let provider;
let wallet;
let contract;

/**
 * Initialize the blockchain connection and contract instance
 */
function initialize() {
  try {
    logger.info('Initializing blockchain connection...');

    // Create provider with static network to avoid gas station issues
    const network = ethers.Network.from({
      name: 'polygon',
      chainId: 137,
    });
    provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl, network, {
      staticNetwork: true,
    });

    // Create wallet
    wallet = new ethers.Wallet(config.blockchain.privateKey, provider);

    // Create contract instance
    contract = new ethers.Contract(
      config.blockchain.contractAddress,
      CONTRACT_ABI,
      wallet
    );

    logger.success(`Connected to contract at: ${config.blockchain.contractAddress}`);
    logger.info(`Using wallet address: ${wallet.address}`);
  } catch (error) {
    logger.error('Failed to initialize blockchain connection', error);
    throw error;
  }
}

/**
 * Get current prices from the smart contract
 * @returns {Promise<Object>} Current prices from contract
 */
async function getCurrentContractPrices() {
  try {
    const prices = await contract.getAllPrices();

    return {
      pricePerGram: prices.pricePerGram,
      pricePerOunce: prices.pricePerOunce,
      pricePerKarat24: prices.pricePerKarat24,
      pricePerKarat22: prices.pricePerKarat22,
      pricePerKarat18: prices.pricePerKarat18,
      lastUpdated: prices.lastUpdated,
    };
  } catch (error) {
    logger.error('Failed to get current contract prices', error);
    throw error;
  }
}

/**
 * Check if prices have changed significantly
 * @param {Object} oldPrices - Current contract prices
 * @param {Object} newPrices - New prices from API
 * @returns {boolean} True if prices changed significantly
 */
function pricesChanged(oldPrices, newPrices) {
  // If never updated (lastUpdated is 0), always update
  if (oldPrices.lastUpdated === 0n) {
    return true;
  }

  // Check if any price changed by more than 0.01% (to avoid unnecessary updates)
  const threshold = 10000n; // 0.01% with 8 decimals = 10000

  const gramDiff = oldPrices.pricePerGram > newPrices.pricePerGram
    ? oldPrices.pricePerGram - BigInt(newPrices.pricePerGram)
    : BigInt(newPrices.pricePerGram) - oldPrices.pricePerGram;

  return gramDiff > threshold;
}

/**
 * Update prices on the smart contract
 * @param {Object} prices - New prices to update
 * @returns {Promise<Object>} Transaction receipt
 */
async function updateContractPrices(prices) {
  try {
    logger.info('Preparing to update contract prices...');

    // Estimate gas
    const gasEstimate = await contract.updatePrices.estimateGas(
      prices.pricePerGram,
      prices.pricePerOunce,
      prices.pricePerKarat24,
      prices.pricePerKarat22,
      prices.pricePerKarat18
    );

    logger.info(`Estimated gas: ${gasEstimate.toString()}`);

    // Get current gas fees from network
    const feeData = await provider.getFeeData();

    // Configure EIP-1559 gas fees for Polygon
    // Use network fees if available, otherwise use safe defaults
    const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits('50', 'gwei');
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('30', 'gwei');

    logger.info(`Max fee per gas: ${ethers.formatUnits(maxFeePerGas, 'gwei')} gwei`);
    logger.info(`Max priority fee per gas: ${ethers.formatUnits(maxPriorityFeePerGas, 'gwei')} gwei`);

    // Send transaction with manual gas configuration
    const tx = await contract.updatePrices(
      prices.pricePerGram,
      prices.pricePerOunce,
      prices.pricePerKarat24,
      prices.pricePerKarat22,
      prices.pricePerKarat18,
      {
        maxFeePerGas,
        maxPriorityFeePerGas,
      }
    );

    logger.info(`Transaction sent: ${tx.hash}`);
    logger.info('Waiting for confirmation...');

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    logger.success(`Transaction confirmed in block ${receipt.blockNumber}`);
    logger.success(`Gas used: ${receipt.gasUsed.toString()}`);

    return receipt;
  } catch (error) {
    logger.error('Failed to update contract prices', error);
    throw error;
  }
}

/**
 * Main update function - fetches prices and updates contract if needed
 * @returns {Promise<Object>} Update result
 */
async function updatePrices() {
  try {
    logger.info('Starting price update process...');

    // Fetch new prices from GoldAPI
    const newPrices = await goldApiService.getGoldPrices();

    // Get current contract prices
    const currentPrices = await getCurrentContractPrices();

    // Check if update is needed
    const needsUpdate = pricesChanged(currentPrices, newPrices);

    if (!needsUpdate) {
      logger.info('Prices have not changed significantly, skipping update');
      return {
        updated: false,
        message: 'No significant price change',
      };
    }

    // Update contract
    const receipt = await updateContractPrices(newPrices);

    return {
      updated: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      prices: newPrices,
    };
  } catch (error) {
    logger.error('Price update process failed', error);
    throw error;
  }
}

/**
 * Check if the oracle data is stale
 * @returns {Promise<boolean>} True if stale
 */
async function isStale() {
  try {
    return await contract.isStale();
  } catch (error) {
    logger.error('Failed to check staleness', error);
    throw error;
  }
}

// Initialize on module load
initialize();

export default {
  updatePrices,
  getCurrentContractPrices,
  isStale,
};
