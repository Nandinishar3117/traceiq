const formatTime = () => new Date().toISOString();

const logger = {
  info: (msg, meta = {}) => {
    console.log(`[${formatTime()}] [INFO] [backend] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  warn: (msg, meta = {}) => {
    console.warn(`[${formatTime()}] [WARN] [backend] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  error: (msg, meta = {}) => {
    console.error(`[${formatTime()}] [ERROR] [backend] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  debug: (msg, meta = {}) => {
    if (process.env.DEBUG) {
      console.log(`[${formatTime()}] [DEBUG] [backend] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
    }
  }
};

module.exports = logger;
