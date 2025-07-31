const { sheets, spreadsheetId } = require('./googleClient');

const OUTPUT_SHEET = process.env.OUTPUT_SHEET || 'output';
const REVIEWS_SHEET = process.env.REVIEWS_SHEET || 'reviews';

// Cache for existing company IDs to avoid repeated API calls
let existingCompanyIds = new Set();
let companyIdsLoaded = false;

// Load existing company IDs from the output sheet
async function loadExistingCompanyIds() {
  if (companyIdsLoaded) return;
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${OUTPUT_SHEET}!A:Z`,
    });
    
    const rows = response.data.values;
    if (rows && rows.length > 1) { // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length > 0 && row[0] && row[0].trim()) { // companyId is in first column
          existingCompanyIds.add(row[0].trim());
        }
      }
    }
    companyIdsLoaded = true;
    console.log(`📋 Loaded ${existingCompanyIds.size} existing company IDs`);
  } catch (error) {
    console.log('📋 No existing company IDs found or error loading:', error.message);
    companyIdsLoaded = true; // Mark as loaded to avoid repeated attempts
  }
}

// Check if company ID already exists
async function isCompanyIdExists(companyId) {
  await loadExistingCompanyIds();
  return existingCompanyIds.has(companyId);
}

// Add company ID to cache after successful write
function addCompanyIdToCache(companyId) {
  existingCompanyIds.add(companyId);
}

// Helper to get or create a sheet and append data
async function getOrCreateSheet(sheets, spreadsheetId, sheetName, headers) {
  // Get spreadsheet metadata
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) {
    // Create the sheet and set headers
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          { addSheet: { properties: { title: sheetName } } },
        ],
      },
    });
    // Set headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
  }
}

async function writeCompanyRow(row) {
  try {
    console.log(`🔍 writeCompanyRow received: companyName="${row.companyName}", companyId="${row.companyId}"`);
    
    // Check if company ID already exists
    if (await isCompanyIdExists(row.companyId)) {
      console.log(`⚠️ Company ID ${row.companyId} already exists, skipping...`);
      return false; // Indicate that this company was skipped
    }
    
    const headers = [
      'companyId', 'companyName', 'totalReviews', 'rating', 'website', 'address', 'phone',
      'serviceFocus', 'industryFocus', 'clientFocus'
    ];
    await getOrCreateSheet(sheets, spreadsheetId, OUTPUT_SHEET, headers);
    
    // Append row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${OUTPUT_SHEET}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[
        row.companyId, row.companyName, row.totalReviews, row.rating, row.website, row.address, row.phone,
        row.serviceFocus, row.industryFocus, row.clientFocus
      ]] },
    });
    
    // Add to cache to prevent future duplicates
    addCompanyIdToCache(row.companyId);
    console.log(`✓ Written company data for: ${row.companyName} (ID: ${row.companyId})`);
    return true; // Indicate that this company was successfully written
  } catch (error) {
    console.error('Error writing company row:', error.message);
    return false;
  }
}

async function writeReviewRow(row) {
  try {
    console.log(`🔍 writeReviewRow received: companyName="${row.companyName}", reviewerName="${row.author}"`);
    const headers = [
      'companyName', 'reviewerName', 'rating', 'datePosted'
    ];
    await getOrCreateSheet(sheets, spreadsheetId, REVIEWS_SHEET, headers);
    // Append row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${REVIEWS_SHEET}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[
        row.companyName, row.author, row.rating, row.datePosted
      ]] },
    });
    console.log(`✓ Written review for: ${row.author || 'Unknown'} (${row.companyName})`);
  } catch (error) {
    console.error('Error writing review row:', error.message);
  }
}

module.exports = { writeCompanyRow, writeReviewRow, isCompanyIdExists }; 