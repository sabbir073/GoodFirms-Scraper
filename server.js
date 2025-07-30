const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { connectChrome } = require('./chrome/connectChrome');
const { readInputSheet } = require('./sheets/reader');
const GoodFirmsScraper = require('./scraper/goodfirmsScraper');
const Logger = require('./logger');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const logger = new Logger();

// WebSocket connection handling
wss.on('connection', (ws) => {
  logger.log('WebSocket client connected');
  
  ws.on('close', () => {
    logger.log('WebSocket client disconnected');
  });
});

// Broadcast logs to all WebSocket clients
function broadcastLog(message, type = 'info') {
  const logEntry = logger.log(message, type);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(logEntry));
    }
  });
}

// API Routes
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/logs', (req, res) => {
  res.json(logger.getLogs());
});

app.post('/run', async (req, res) => {
  try {
    logger.log('🚀 Starting GoodFirms scraper via API...');
    broadcastLog('🚀 Starting GoodFirms scraper via API...', 'info');
    
    const inputRows = await readInputSheet();
    logger.log(`📖 Found ${inputRows.length} input rows`);
    broadcastLog(`📖 Found ${inputRows.length} input rows`, 'info');
    
    if (inputRows.length === 0) {
      const errorMsg = '❌ No input data found. Please check your input sheet has data in columns A and B starting from row 2.';
      logger.error(errorMsg);
      broadcastLog(errorMsg, 'error');
      return res.status(400).json({ error: errorMsg });
    }
    
    let driver = await connectChrome();
    const scraper = new GoodFirmsScraper(driver);
    
    try {
      for (const { keyword, location } of inputRows) {
        await scraper.searchAndScrape(keyword, location);
      }
      
      const successMsg = '🏁 Scraping completed successfully';
      logger.success(successMsg);
      broadcastLog(successMsg, 'success');
      
      res.json({ 
        success: true, 
        message: successMsg,
        processed: inputRows.length 
      });
      
    } finally {
      await driver.quit();
    }
    
  } catch (error) {
    const errorMsg = `❌ Error running scraper: ${error.message}`;
    logger.error(errorMsg);
    broadcastLog(errorMsg, 'error');
    res.status(500).json({ error: errorMsg });
  }
});

// Start server
server.listen(PORT, () => {
  logger.log(`🚀 Server running on port ${PORT}`);
  logger.log(`📊 Health check: http://localhost:${PORT}/health`);
  logger.log(`📋 Logs: http://localhost:${PORT}/logs`);
  logger.log(`▶️  Run scraper: POST http://localhost:${PORT}/run`);
});

module.exports = { app, server, wss, logger }; 