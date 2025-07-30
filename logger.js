// Terminal + WebSocket log streaming
class Logger {
  constructor() {
    this.logs = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type,
      message,
      formatted: `[${timestamp}] ${message}`
    };
    
    this.logs.push(logEntry);
    
    // Console output
    switch (type) {
      case 'error':
        console.error(logEntry.formatted);
        break;
      case 'warn':
        console.warn(logEntry.formatted);
        break;
      case 'success':
        console.log(`✅ ${message}`);
        break;
      default:
        console.log(logEntry.formatted);
    }
    
    return logEntry;
  }

  error(message) {
    return this.log(message, 'error');
  }

  warn(message) {
    return this.log(message, 'warn');
  }

  success(message) {
    return this.log(message, 'success');
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}

module.exports = Logger; 