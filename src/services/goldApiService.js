import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Service for fetching gold prices from GoldAPI.io
 */

const GRAMS_PER_OUNCE = 31.1035;

/**
 * Fetch gold price data from GoldAPI.io
 * @returns {Promise<Object>} Raw API response
 */
async function fetchGoldPrice() {
  const url = `${config.goldApi.baseUrl}/${config.goldApi.symbol}/${config.goldApi.currency}`;

  logger.info(`Fetching gold price from: ${url}`);

  try {
    const response = await axios.get(url, {
      headers: {
        'x-access-token': config.goldApi.key,
      },
    });

    if (response.data && response.data.price) {
      logger.success(`Successfully fetched gold price: $${response.data.price} per ounce`);
      return response.data;
    } else {
      throw new Error('Invalid response format from GoldAPI');
    }
  } catch (error) {
    if (error.response) {
      // API responded with error
      logger.error(`GoldAPI error: ${error.response.status} - ${error.response.statusText}`);
      throw new Error(`GoldAPI request failed: ${error.response.status}`);
    } else if (error.request) {
      // No response received
      logger.error('No response from GoldAPI', error);
      throw new Error('GoldAPI did not respond');
    } else {
      // Other error
      logger.error('Error setting up GoldAPI request', error);
      throw error;
    }
  }
}

/**
 * Calculate all price formats from raw API data
 * @param {Object} apiData - Raw data from GoldAPI
 * @returns {Object} Calculated prices in 8-decimal format
 */
function calculatePrices(apiData) {
  const pricePerOunce = apiData.price;
  const pricePerGram = pricePerOunce / GRAMS_PER_OUNCE;

  // Pure gold (24K)
  const pricePerKarat24 = pricePerGram;

  // 22K gold (22/24 purity)
  const pricePerKarat22 = pricePerKarat24 * (22 / 24);

  // 18K gold (18/24 purity)
  const pricePerKarat18 = pricePerKarat24 * (18 / 24);

  // Convert to 8 decimal format (multiply by 10^8)
  const DECIMALS = 100000000; // 10^8

  return {
    pricePerGram: Math.floor(pricePerGram * DECIMALS),
    pricePerOunce: Math.floor(pricePerOunce * DECIMALS),
    pricePerKarat24: Math.floor(pricePerKarat24 * DECIMALS),
    pricePerKarat22: Math.floor(pricePerKarat22 * DECIMALS),
    pricePerKarat18: Math.floor(pricePerKarat18 * DECIMALS),
  };
}

/**
 * Fetch and calculate gold prices with retry logic
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<Object>} Calculated prices
 */
async function getGoldPrices(retryCount = 0) {
  try {
    const apiData = await fetchGoldPrice();
    const prices = calculatePrices(apiData);

    logger.info('Calculated prices:');
    logger.info(`  Per Gram: ${prices.pricePerGram} (${prices.pricePerGram / 100000000} USD)`);
    logger.info(`  Per Ounce: ${prices.pricePerOunce} (${prices.pricePerOunce / 100000000} USD)`);
    logger.info(`  24K per Gram: ${prices.pricePerKarat24} (${prices.pricePerKarat24 / 100000000} USD)`);
    logger.info(`  22K per Gram: ${prices.pricePerKarat22} (${prices.pricePerKarat22 / 100000000} USD)`);
    logger.info(`  18K per Gram: ${prices.pricePerKarat18} (${prices.pricePerKarat18 / 100000000} USD)`);

    return prices;
  } catch (error) {
    if (retryCount < config.update.maxRetries) {
      logger.warn(`Retry attempt ${retryCount + 1}/${config.update.maxRetries} after ${config.update.retryDelayMs}ms`);

      await new Promise(resolve => setTimeout(resolve, config.update.retryDelayMs));

      return getGoldPrices(retryCount + 1);
    } else {
      logger.error('Max retries reached, unable to fetch gold prices', error);
      throw error;
    }
  }
}

export default {
  getGoldPrices,
  fetchGoldPrice,
  calculatePrices,
};
