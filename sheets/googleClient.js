const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config();

const spreadsheetId = process.env.SHEET_ID;
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

module.exports = { sheets, spreadsheetId }; 