const { google } = require("googleapis");

// --- In-memory cache ---
let cachedData = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 seconds

// --- Rate limiting ---
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30;

function isRateLimited(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    entry = { windowStart: now, count: 1 };
    rateLimitMap.set(ip, entry);
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }
  return false;
}

async function getSheetData() {
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_TTL) {
    return cachedData;
  }

  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: "Private-INT_2026",
  });

  cachedData = response.data.values || [];
  cacheTimestamp = now;
  return cachedData;
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // Rate limiting
  const ip = event.headers["x-forwarded-for"] || event.headers["client-ip"] || "unknown";
  if (isRateLimited(ip)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        error: "Terlalu banyak permintaan. Silakan coba lagi dalam satu menit.",
      }),
    };
  }

  const instagramId = (event.queryStringParameters || {}).instagramId;
  if (!instagramId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Parameter instagramId wajib diisi." }),
    };
  }

  const searchId = instagramId.replace(/^@/, "").toLowerCase();

  try {
    const rows = await getSheetData();
    if (rows.length < 2) {
      return { statusCode: 200, headers, body: JSON.stringify({ orders: [], summary: null }) };
    }

    // Header row: Event, Customer, Order ID, Order, Unit, Price, UnitArrive, Subtotal, Ongkir, Berat, BeratUnit, Pembayaran
    // Indices:     0      1         2         3      4     5      6           7         8       9      10         11
    const dataRows = rows.slice(1);

    const matchingRows = dataRows.filter((row) => {
      // Filter completely empty rows
      if (!row || row.every((cell) => !cell || String(cell).trim() === "")) return false;
      const rowIg = (row[1] || "").replace(/^@/, "").toLowerCase();
      return rowIg === searchId;
    });

    if (matchingRows.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ orders: [], shippingFeePerKg: 0 }) };
    }

    // Strip Order ID (index 2), return remaining columns
    const orders = matchingRows.map((row) => ({
      eventId: row[0] || "",
      instagramId: row[1] || "",
      order: row[3] || "",
      unit: row[4] || "",
      price: row[5] || "",
      unitArrive: row[6] || "",
      subtotal: row[7] || "",
      ongkir: row[8] || "",
      berat: row[9] || "",
      beratUnit: row[10] || "",
      pembayaran: row[11] || "",
    }));

    const shippingFeePerKg =
      parseFloat(String(matchingRows[0][8] || "0").replace(/,/g, "")) || 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ orders, shippingFeePerKg }),
    };
  } catch (err) {
    console.error("Error fetching sheet data:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Gagal mengambil data. Silakan coba lagi nanti." }),
    };
  }
};
