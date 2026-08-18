/* Google Sheets helper — appends rows via the Sheets REST API using a
   service account. No heavy SDK; just google-auth-library for the token. */
const { JWT } = require("google-auth-library");

function getPrivateKey() {
  let key = process.env.GOOGLE_PRIVATE_KEY || "";
  // Support keys pasted with literal \n as well as real newlines.
  if (key.indexOf("\\n") !== -1) key = key.replace(/\\n/g, "\n");
  return key;
}

function isConfigured() {
  return Boolean(
    process.env.GOOGLE_SHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
  );
}

async function getAccessToken() {
  const client = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const { token } = await client.getAccessToken();
  return token;
}

/**
 * Append a single row to a tab (defaults to "Leads").
 * @param {Array<string|number>} row - ordered cell values
 * @param {string} tab - sheet/tab name
 */
async function appendRow(row, tab = "Leads") {
  if (!isConfigured()) {
    console.warn("[sheets] Google Sheets not configured — skipping append.");
    return { skipped: true };
  }
  const token = await getAccessToken();
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const range = encodeURIComponent(`${tab}!A1`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [row] }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets append failed (${res.status}): ${text}`);
  }
  return res.json();
}

module.exports = { appendRow, isConfigured };
