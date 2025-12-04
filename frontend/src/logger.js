// 前端日志系统
const LOG_ENDPOINT = 'http://localhost:58232/api/log';

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
  }

  log(level, message, data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 输出到控制台
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      debug: '🔍',
      api: '📡',
      data: '📦',
    };

    const prefix = emoji[level] || '📝';
    console.log(`${prefix} [${level.toUpperCase()}] ${message}`, data || '');

    // 发送到后端
    this.sendToBackend(logEntry);
  }

  info(message, data) {
    this.log('info', message, data);
  }

  success(message, data) {
    this.log('success', message, data);
  }

  error(message, data) {
    this.log('error', message, data);
  }

  warning(message, data) {
    this.log('warning', message, data);
  }

  debug(message, data) {
    this.log('debug', message, data);
  }

  api(message, data) {
    this.log('api', message, data);
  }

  data(message, data) {
    this.log('data', message, data);
  }

  sendToBackend(logEntry) {
    // 异步发送，不阻塞主流程
    fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry),
    }).catch(() => {
      // 静默失败，不影响主流程
    });
  }

  getLogs() {
    return this.logs;
  }
}

const logger = new Logger();
export default logger;

