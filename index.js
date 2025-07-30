// Load environment variables
require('dotenv').config();

// Simple entry point for direct scraping
const { connectChrome } = require('./chrome/connectChrome');
const { readInputSheet } = require('./sheets/reader');
const GoodFirmsScraper = require('./scraper/goodfirmsScraper');

async function main() {
  console.log('🚀 Starting GoodFirms scraper...');
  
  try {
    const inputRows = await readInputSheet();
    console.log(`📖 Found ${inputRows.length} input rows`);
    
    if (inputRows.length === 0) {
      console.log('❌ No input data found. Please check your input sheet has data in columns A and B starting from row 2.');
      return;
    }
    
    let driver = await connectChrome();
    const scraper = new GoodFirmsScraper(driver);
    
    try {
      for (const { keyword, location } of inputRows) {
        await scraper.searchAndScrape(keyword, location);
      }
      console.log('🏁 Scraping completed');
    } finally {
      await driver.quit();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main(); 