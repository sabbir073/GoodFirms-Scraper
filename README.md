# GoodFirms Scraper

A modular GoodFirms scraper with Express API, WebSocket logging, and Google Sheets integration.

## File Structure

```
goodfirms-scraper/
│
├─ credentials.json             # Google service account credentials 
│
├─ chrome/
│   └─ connectChrome.js         # Connects to running signed-in Chrome via CDP
│
├─ sheets/
│   ├─ googleClient.js          # Sets up Google Sheets API client with credentials.json
│   ├─ reader.js                # Reads keyword-location pairs from Sheet1
│   └─ writer.js                # Writes one scraped row at a time to Sheet2
│
├─ scraper/
│   ├─ humanBehavior.js         # Human-like typing, clicking, mouse movement
│   ├─ goodfirmsScraper.js      # Scrapes one listing at a time & saves to Google Sheet
│   └─ selectors.js             # Central file for all CSS/XPath selectors (configurable)
│
├─ server.js                    # Express API + WebSocket /run endpoint
├─ logger.js                    # Terminal + WebSocket log streaming
├─ index.js                     # Simple entry point for direct scraping
├─ package.json                 # Dependencies and scripts
├─ env.example                  # Environment configuration template
└─ README.md                    # Comprehensive documentation
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Add Google credentials:**
   - Place your `credentials.json` file in the root directory
   - Update `GOOGLE_APPLICATION_CREDENTIALS` in `.env`

4. **Setup Google Sheet:**
   - Create a Google Sheet with the ID specified in `SHEET_ID`
   - Add an "input" sheet with columns: keyword, location (starting from row 2)

## Usage

### Start the server:
```bash
npm start
```

### API Endpoints:

- `GET /health` - Health check
- `GET /logs` - Get all logs
- `POST /run` - Start scraping

### WebSocket:
Connect to `ws://localhost:3000` for real-time log streaming.

### Direct scraping:
```bash
npm run scrape
```

## Configuration

### Environment Variables:
- `PORT` - Server port (default: 3000)
- `SHEET_ID` - Google Sheet ID
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to credentials file
- `INPUT_SHEET` - Input sheet name (default: input)
- `OUTPUT_SHEET` - Output sheet name (default: output)
- `REVIEWS_SHEET` - Reviews sheet name (default: reviews)
- `MAX_ITEMS_PER_PAGE` - Max companies per page (default: 5)
- `MAX_PAGES` - Max pages to scrape (default: 2)

### Selectors:
All CSS selectors are centralized in `scraper/selectors.js` for easy configuration.

## Features

- ✅ Modular architecture
- ✅ Express API with WebSocket logging
- ✅ Human-like browser interactions
- ✅ Google Sheets integration
- ✅ Configurable selectors
- ✅ Error handling and recovery
- ✅ Real-time log streaming

## Output

The scraper creates two sheets:
1. **Output sheet** - Company data (name, reviews, rating, website, etc.)
2. **Reviews sheet** - Individual reviews with company association 