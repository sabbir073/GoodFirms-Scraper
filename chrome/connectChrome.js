const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const fs = require('fs');

async function connectChrome() {
  // Create a unique user data directory for this session
  const timestamp = Date.now();
  const userDataDir = path.join('/tmp', `chrome-selenium-profile-${timestamp}`);
  
  // Ensure the directory exists
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  return await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options()
      .addArguments(`--user-data-dir=${userDataDir}`)
      .addArguments('--profile-directory=Default')
      .addArguments('--window-size=1600,1000')
      .addArguments('--no-headless')
      .addArguments('--disable-blink-features=AutomationControlled')
      .addArguments('--disable-extensions')
      .addArguments('--no-sandbox')
      .addArguments('--disable-dev-shm-usage')
    )
    .build();
}

module.exports = { connectChrome }; 