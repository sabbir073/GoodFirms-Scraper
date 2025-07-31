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
const logger = new Logger();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
});

// Broadcast function for WebSocket
function broadcastLog(message, type = 'info') {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ message, type, timestamp: new Date().toISOString() }));
    }
  });
}

// Routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>GoodFirms Scraper</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .log { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .error { color: red; }
        .success { color: green; }
        button { padding: 10px 20px; margin: 10px; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>GoodFirms Scraper</h1>
      <button onclick="runScraper()">Run Scraper</button>
      <div id="logs"></div>
      
      <script>
        const ws = new WebSocket('ws://localhost:${process.env.PORT || 3000}');
        
        ws.onmessage = function(event) {
          const data = JSON.parse(event.data);
          const logsDiv = document.getElementById('logs');
          const logDiv = document.createElement('div');
          logDiv.className = 'log ' + data.type;
          logDiv.textContent = data.message;
          logsDiv.appendChild(logDiv);
          logsDiv.scrollTop = logsDiv.scrollHeight;
        };
        
        function runScraper() {
          fetch('/run', { method: 'POST' })
            .then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.error('Error:', error));
        }
      </script>
    </body>
    </html>
  `);
});

app.post('/run', async (req, res) => {
  logger.log('🚀 Starting scraper...');
  broadcastLog('🚀 Starting scraper...', 'info');
  
  let browser = null;
  
  try {
    const inputRows = await readInputSheet();
    logger.log(`📖 Found ${inputRows.length} input rows`);
    broadcastLog(`📖 Found ${inputRows.length} input rows`, 'info');
    
    if (inputRows.length === 0) {
      const errorMsg = '❌ No input data found. Please check your input sheet has data in columns A and B starting from row 2.';
      logger.log(errorMsg);
      broadcastLog(errorMsg, 'error');
      return res.json({ success: false, error: errorMsg });
    }
    
    const { browser: chromeBrowser, page } = await connectChrome();
    browser = chromeBrowser;
    const scraper = new GoodFirmsScraper(browser, page);
    
    logger.log('✅ Chrome connected successfully');
    broadcastLog('✅ Chrome connected successfully', 'success');
    
    for (const { keyword, location } of inputRows) {
      logger.log(`🔍 Processing: ${keyword} in ${location}`);
      broadcastLog(`🔍 Processing: ${keyword} in ${location}`, 'info');
      
      try {
        await scraper.searchAndScrape(keyword, location);
        logger.log(`✅ Completed: ${keyword} in ${location}`);
        broadcastLog(`✅ Completed: ${keyword} in ${location}`, 'success');
      } catch (error) {
        logger.error(`❌ Error processing ${keyword} in ${location}: ${error.message}`);
        broadcastLog(`❌ Error processing ${keyword} in ${location}: ${error.message}`, 'error');
      }
    }
    
    logger.log('🏁 Scraping completed successfully');
    broadcastLog('🏁 Scraping completed successfully', 'success');
    
    res.json({ success: true, message: 'Scraping completed successfully' });
    
  } catch (error) {
    const errorMsg = `❌ Error running scraper: ${error.message}`;
    logger.error(errorMsg);
    broadcastLog(errorMsg, 'error');
    res.json({ success: false, error: errorMsg });
  } finally {
    try {
      // Use the enhanced quit method if available
      if (browser && browser.forceQuit) {
        await browser.forceQuit();
        logger.log('🔒 Chrome browser force closed successfully');
        broadcastLog('🔒 Chrome browser force closed successfully', 'info');
      } else if (browser) {
        await browser.disconnect();
        logger.log('🔒 Chrome browser closed successfully');
        broadcastLog('🔒 Chrome browser closed successfully', 'info');
      }
      
      // Additional cleanup: kill any remaining Chrome processes
      const { exec } = require('child_process');
      exec('pkill -f "chrome.*--remote-debugging-port=9222"', (error) => {
        if (!error) {
          logger.log('🔒 Additional Chrome processes terminated');
        } else {
          logger.log('⚠️ No additional Chrome processes to terminate');
        }
      });
      
      // Force kill after a delay to ensure cleanup
      setTimeout(() => {
        exec('pkill -9 -f "Google.*Chrome.*9222"', (error) => {
          if (!error) {
            logger.log('🔒 Force killed Google Chrome processes');
          }
        });
        exec('pkill -9 -f "chromedriver"', (error) => {
          if (!error) {
            logger.log('🔒 Force killed ChromeDriver processes');
          }
        });
      }, 1000); // Reduced delay for faster cleanup
    } catch (quitError) {
      logger.error(`❌ Error closing Chrome: ${quitError.message}`);
      broadcastLog(`❌ Error closing Chrome: ${quitError.message}`, 'error');
      
      // Force kill Chrome processes if normal quit fails
      const { exec } = require('child_process');
      exec('pkill -f "chrome.*--remote-debugging-port=9222"', (error) => {
        if (!error) {
          logger.log('🔒 Force terminated Chrome processes');
        }
      });
    }
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  
  // Kill any remaining Chrome processes
  const { exec } = require('child_process');
  exec('pkill -f "chrome.*--remote-debugging-port=9222"', (error) => {
    if (!error) {
      console.log('🔒 Chrome processes terminated');
    }
  });
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
}); 