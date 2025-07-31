const puppeteer = require('puppeteer-core');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function startChromeWithDebugging() {
  try {
    // Always kill any existing Chrome processes with debugging port to ensure clean start
    try {
      await execAsync('pkill -f "chrome.*--remote-debugging-port=9222"');
      console.log('Killed existing Chrome debugging processes');
      // Wait a moment for processes to fully terminate
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
      // No processes to kill, continue
    }
    
    // Start Chrome with remote debugging enabled
    const chromeCommand = '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-profile --no-first-run --no-default-browser-check --window-size=1920,1080 --window-position=0,0 --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-web-security --allow-running-insecure-content --no-sandbox --disable-dev-shm-usage --disable-features=TranslateUI --disable-ipc-flooding-protection --disable-blink-features=AutomationControlled --disable-extensions --disable-background-mode --disable-background-networking --disable-background-sync --disable-component-extensions-with-background-pages --disable-default-apps --disable-sync --disable-translate --hide-scrollbars --mute-audio --no-default-browser-check --no-first-run --disable-gpu --disable-software-rasterizer';
    
    console.log('Starting Chrome with debugging...');
    exec(chromeCommand, (error, stdout, stderr) => {
      if (error) {
        console.log('Chrome start error:', error.message);
      } else {
        console.log('Chrome started with debugging enabled');
      }
    });
    
    // Wait for Chrome to be ready on port 9222
    let attempts = 0;
    const maxAttempts = 30;
    while (attempts < maxAttempts) {
      try {
        const response = await fetch('http://localhost:9222/json/version');
        if (response.ok) {
          console.log('✅ Chrome is ready on port 9222');
          break;
        }
      } catch (e) {
        // Chrome not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      console.log(`Waiting for Chrome... (${attempts}/${maxAttempts})`);
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Chrome failed to start on port 9222');
    }
    
  } catch (error) {
    console.error('Error starting Chrome:', error.message);
    throw error;
  }
}

async function connectChrome() {
  // Start Chrome with debugging if not already running
  await startChromeWithDebugging();
  
  // Connect to the existing Chrome instance
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  // Get the first page or create a new one
  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();
  
  // Set window size
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Add a cleanup function to the browser
  browser.forceQuit = async () => {
    try {
      await browser.disconnect();
    } catch (e) {
      console.log('⚠️ Error in normal disconnect:', e.message);
    }
    
    // Force kill Chrome processes
    const { exec } = require('child_process');
    exec('pkill -9 -f "chrome.*--remote-debugging-port=9222"', (error) => {
      if (!error) {
        console.log('🔒 Force killed Chrome processes');
      }
    });
  };
  
  console.log('✅ Connected to Chrome successfully');
  return { browser, page };
}

module.exports = { connectChrome }; 