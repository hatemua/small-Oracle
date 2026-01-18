/**
 * Simple logger utility with timestamps
 */

const getTimestamp = () => {
  return new Date().toISOString();
};

const formatMessage = (level, message) => {
  return `[${getTimestamp()}] [${level}] ${message}`;
};

const logger = {
  /**
   * Log info message
   * @param {string} message - Message to log
   */
  info: (message) => {
    console.log(formatMessage('INFO', message));
  },

  /**
   * Log error message
   * @param {string} message - Message to log
   * @param {Error} error - Optional error object
   */
  error: (message, error = null) => {
    console.error(formatMessage('ERROR', message));
    if (error) {
      console.error(error);
    }
  },

  /**
   * Log warning message
   * @param {string} message - Message to log
   */
  warn: (message) => {
    console.warn(formatMessage('WARN', message));
  },

  /**
   * Log success message
   * @param {string} message - Message to log
   */
  success: (message) => {
    console.log(formatMessage('SUCCESS', message));
  },
};

export default logger;
