import { config } from '../config/index.js';

export const logger = {
  info(...args) {
    if (config.nodeEnv !== 'test') {
      console.log(`[${new Date().toISOString()}] [INFO]`, ...args);
    }
  },
  warn(...args) {
    if (config.nodeEnv !== 'test') {
      console.warn(`[${new Date().toISOString()}] [WARN]`, ...args);
    }
  },
  error(...args) {
    if (config.nodeEnv !== 'test') {
      console.error(`[${new Date().toISOString()}] [ERROR]`, ...args);
    }
  },
  debug(...args) {
    if (config.nodeEnv === 'development') {
      console.debug(`[${new Date().toISOString()}] [DEBUG]`, ...args);
    }
  },
};

export default logger;
