const { sheets, spreadsheetId } = require('./googleClient');

const OUTPUT_SHEET = process.env.OUTPUT_SHEET || 'output';
const REVIEWS_SHEET = process.env.REVIEWS_SHEET || 'reviews';

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
    console.log(`🔍 writeCompanyRow received: companyName="${row.companyName}"`);
    const headers = [
      'companyName', 'totalReviews', 'rating', 'website', 'address', 'phone',
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
        row.companyName, row.totalReviews, row.rating, row.website, row.address, row.phone,
        row.serviceFocus, row.industryFocus, row.clientFocus
      ]] },
    });
    console.log(`✓ Written company data for: ${row.companyName}`);
  } catch (error) {
    console.error('Error writing company row:', error.message);
  }
}

async function writeReviewRow(row) {
  try {
    console.log(`🔍 writeReviewRow received: companyName="${row.companyName}", reviewerName="${row.reviewerName}"`);
    const headers = [
      'companyName', 'reviewerName', 'datePosted', 'datePublished', 'ratingGiven'
    ];
    await getOrCreateSheet(sheets, spreadsheetId, REVIEWS_SHEET, headers);
    // Append row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${REVIEWS_SHEET}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[
        row.companyName, row.reviewerName, row.datePosted, row.datePublished, row.ratingGiven
      ]] },
    });
    console.log(`✓ Written review for: ${row.reviewerName} (${row.companyName})`);
  } catch (error) {
    console.error('Error writing review row:', error.message);
  }
}

module.exports = { writeCompanyRow, writeReviewRow }; 