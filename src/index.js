import express from 'express';
import cron from 'node-cron';
import config, { validateConfig } from './config/index.js';
import logger from './utils/logger.js';
import oracleUpdater from './services/oracleUpdater.js';
import goldApiService from './services/goldApiService.js';

// Validate configuration before starting
try {
  validateConfig();
  logger.success('Configuration validated successfully');
} catch (error) {
  logger.error('Configuration validation failed', error);
  process.exit(1);
}

const app = express();

// Middleware
app.use(express.json());

// API Key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== config.server.apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid or missing API key',
    });
  }

  next();
};

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    config: {
      updateIntervalMinutes: config.update.intervalMinutes,
      contractAddress: config.blockchain.contractAddress,
    },
  });
});

/**
 * Get current prices from contract
 */
app.get('/prices', async (req, res) => {
  try {
    const prices = await oracleUpdater.getCurrentContractPrices();
    const isStale = await oracleUpdater.isStale();

    res.json({
      success: true,
      data: {
        pricePerGram: prices.pricePerGram.toString(),
        pricePerOunce: prices.pricePerOunce.toString(),
        pricePerKarat24: prices.pricePerKarat24.toString(),
        pricePerKarat22: prices.pricePerKarat22.toString(),
        pricePerKarat18: prices.pricePerKarat18.toString(),
        lastUpdated: prices.lastUpdated.toString(),
        isStale,
      },
      humanReadable: {
        pricePerGram: (Number(prices.pricePerGram) / 100000000).toFixed(2) + ' USD',
        pricePerOunce: (Number(prices.pricePerOunce) / 100000000).toFixed(2) + ' USD',
        pricePerKarat24: (Number(prices.pricePerKarat24) / 100000000).toFixed(2) + ' USD',
        pricePerKarat22: (Number(prices.pricePerKarat22) / 100000000).toFixed(2) + ' USD',
        pricePerKarat18: (Number(prices.pricePerKarat18) / 100000000).toFixed(2) + ' USD',
        lastUpdated: new Date(Number(prices.lastUpdated) * 1000).toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to get prices', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prices from contract',
      message: error.message,
    });
  }
});

/**
 * Manual price update endpoint (protected)
 */
app.post('/update-prices', authenticateApiKey, async (req, res) => {
  try {
    logger.info('Manual price update triggered');

    const result = await oracleUpdater.updatePrices();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Manual price update failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prices',
      message: error.message,
    });
  }
});

/**
 * Get latest price from GoldAPI (without updating contract)
 */
app.get('/api/gold-price', async (req, res) => {
  try {
    const prices = await goldApiService.getGoldPrices();

    res.json({
      success: true,
      data: prices,
      humanReadable: {
        pricePerGram: (prices.pricePerGram / 100000000).toFixed(2) + ' USD',
        pricePerOunce: (prices.pricePerOunce / 100000000).toFixed(2) + ' USD',
        pricePerKarat24: (prices.pricePerKarat24 / 100000000).toFixed(2) + ' USD',
        pricePerKarat22: (prices.pricePerKarat22 / 100000000).toFixed(2) + ' USD',
        pricePerKarat18: (prices.pricePerKarat18 / 100000000).toFixed(2) + ' USD',
      },
    });
  } catch (error) {
    logger.error('Failed to fetch gold price from API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gold price',
      message: error.message,
    });
  }
});

/**
 * Scheduled price update function
 */
async function scheduledUpdate() {
  try {
    logger.info('=== Scheduled price update started ===');
    const result = await oracleUpdater.updatePrices();

    if (result.updated) {
      logger.success('Scheduled update completed successfully');
      logger.info(`Transaction: ${result.transactionHash}`);
    } else {
      logger.info('Scheduled update skipped: ' + result.message);
    }
  } catch (error) {
    logger.error('Scheduled price update failed', error);
  }
}

/**
 * Setup cron job for automatic updates
 */
function setupCronJob() {
  // Run every X minutes based on config
  const cronExpression = `*/${config.update.intervalMinutes} * * * *`;

  logger.info(`Setting up cron job with expression: ${cronExpression}`);
  logger.info(`Updates will run every ${config.update.intervalMinutes} minutes`);

  cron.schedule(cronExpression, scheduledUpdate);

  logger.success('Cron job scheduled successfully');
}

/**
 * Start the server
 */
function startServer() {
  const port = config.server.port;

  app.listen(port, () => {
    logger.success(`🚀 Gold Oracle API server running on port ${port}`);
    logger.info(`Health check: http://localhost:${port}/health`);
    logger.info(`Get prices: http://localhost:${port}/prices`);
    logger.info(`Manual update: POST http://localhost:${port}/update-prices (requires X-API-Key header)`);

    // Setup automatic updates
    setupCronJob();

    // Run initial update after 10 seconds
    setTimeout(() => {
      logger.info('Running initial price update...');
      scheduledUpdate();
    }, 10000);
  });
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection', error);
});

// Start the application
startServer();
