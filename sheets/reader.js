const { sheets, spreadsheetId } = require('./googleClient');

const INPUT_SHEET = process.env.INPUT_SHEET || 'input';

async function readInputSheet() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${INPUT_SHEET}!A2:B`, // Read from A2 to get data rows (skip header)
    });
    const rows = res.data.values || [];
    return rows.map(row => ({
      keyword: row[0] || '',
      location: row[1] || '',
    })).filter(row => row.keyword && row.location); // Only return rows with both keyword and location
  } catch (error) {
    console.error('Error reading input sheet:', error.message);
    return [];
  }
}

module.exports = { readInputSheet }; 