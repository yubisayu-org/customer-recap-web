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
  return entry.count > RATE_LIMIT_MAX;
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

// --- Column indices ---
// 0: Event, 1: Customer, 2: Order ID (stripped), 3: Order, 4: Unit,
// 5: Price, 6: UnitArrive, 7: Subtotal, 8: Ongkir, 9: Berat,
// 10: BeratUnit, 11: Pembayaran, 12: ETA, 13: Status,
// 14: TanggalKirim, 15: Resi, 16: BiayaLainnya,
// 17: Total, 18: SisaPelunasan, 19: SubtotalBarang
const COL = {
  EVENT: 0,
  CUSTOMER: 1,
  ORDER_ID: 2,
  ORDER: 3,
  UNIT: 4,
  PRICE: 5,
  UNIT_ARRIVE: 6,
  SUBTOTAL: 7,
  ONGKIR: 8,
  BERAT: 9,
  BERAT_UNIT: 10,
  PEMBAYARAN: 11,
  ETA: 12,
  STATUS: 13,
  TANGGAL_KIRIM: 14,
  RESI: 15,
  BIAYA_LAINNYA: 16,
  TOTAL: 17,
  SISA_PELUNASAN: 18,
  SUBTOTAL_BARANG: 19,
};

function parseNum(v) {
  return parseFloat(String(v || "0").replace(/,/g, "")) || 0;
}

/**
 * Clean leading apostrophe variants from resi numbers.
 * Google Sheets sometimes prepends these to force text formatting.
 */
function cleanResi(s) {
  return s.trim().replace(/^[\u0027\u2018\u2019\u02B9\u0060]+/, "");
}

/**
 * Parse multi-line resi and tanggal kirim into shipment objects.
 */
function parseShipments(resiRaw, tanggalRaw, status) {
  const resiList = resiRaw
    ? resiRaw.split("\n").map(cleanResi).filter(Boolean)
    : [];
  const tanggalList = tanggalRaw
    ? tanggalRaw.split("\n").map((s) => s.trim()).filter(Boolean)
    : [];

  const shipments = resiList.map((resi, i) => ({
    resi,
    tanggalKirim: tanggalList[i] || "",
  }));

  const showShipments =
    shipments.length > 0 &&
    (status === "Completed" || (status && status.includes("Shipped")));

  return { shipments, showShipments };
}

/**
 * Group matching rows into structured event objects with pre-computed values.
 */
function buildEventGroups(matchingRows, ongkirPerKg) {
  const groups = {};
  const groupOrder = [];

  for (const row of matchingRows) {
    const eid = row[COL.EVENT] || "";
    if (!groups[eid]) {
      groups[eid] = [];
      groupOrder.push(eid);
    }
    groups[eid].push(row);
  }

  return groupOrder.map((eid) => {
    const rows = groups[eid];
    const firstRow = rows[0];

    // Per-order data (for table display)
    const orders = rows.map((row) => ({
      order: row[COL.ORDER] || "",
      unit: parseNum(row[COL.UNIT]),
      price: row[COL.PRICE] || "",
      subtotal: row[COL.SUBTOTAL] || "",
      unitArrive: parseNum(row[COL.UNIT_ARRIVE]),
    }));

    // Aggregate totals
    const totalUnit = orders.reduce((s, o) => s + o.unit, 0);
    const totalSubtotal = rows.reduce(
      (s, r) => s + parseNum(r[COL.SUBTOTAL]),
      0
    );
    const totalArrive = orders.reduce((s, o) => s + o.unitArrive, 0);
    const totalBeratUnit = rows.reduce(
      (s, r) => s + parseNum(r[COL.BERAT_UNIT]),
      0
    );
    const weightKg = Math.ceil(totalBeratUnit / 1000);
    const estimasiOngkir = ongkirPerKg * weightKg;

    // Invoice values (pre-calculated in sheet, read from first row)
    const subtotalBarang = parseNum(firstRow[COL.SUBTOTAL_BARANG]);
    const biayaLainnya = parseNum(firstRow[COL.BIAYA_LAINNYA]);
    const total = parseNum(firstRow[COL.TOTAL]);
    const pembayaran = parseNum(firstRow[COL.PEMBAYARAN]);
    const sisaPelunasan = parseNum(firstRow[COL.SISA_PELUNASAN]);

    // Shipping info
    const status = firstRow[COL.STATUS] || "";
    const { shipments, showShipments } = parseShipments(
      firstRow[COL.RESI] || "",
      firstRow[COL.TANGGAL_KIRIM] || "",
      status
    );

    return {
      eventId: eid,
      eta: firstRow[COL.ETA] || "",
      status,
      shipments,
      showShipments,
      orders,
      totals: {
        unit: totalUnit,
        subtotal: totalSubtotal,
        arrive: totalArrive,
        weightKg,
      },
      invoice: {
        subtotalBarang: subtotalBarang || totalSubtotal,
        estimasiOngkir,
        biayaLainnya,
        total,
        pembayaran,
        sisaPelunasan,
      },
    };
  });
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Rate limiting
  const ip =
    event.headers["x-forwarded-for"] ||
    event.headers["client-ip"] ||
    "unknown";
  if (isRateLimited(ip)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        error:
          "Terlalu banyak permintaan. Silakan coba lagi dalam satu menit.",
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
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ customer: "", events: [] }),
      };
    }

    const dataRows = rows.slice(1);

    const matchingRows = dataRows.filter((row) => {
      if (!row || row.every((cell) => !cell || String(cell).trim() === ""))
        return false;
      const rowIg = (row[COL.CUSTOMER] || "").replace(/^@/, "").toLowerCase();
      return rowIg === searchId;
    });

    if (matchingRows.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ customer: "", events: [] }),
      };
    }

    const customer = matchingRows[0][COL.CUSTOMER] || "";
    const ongkirPerKg =
      parseFloat(
        String(matchingRows[0][COL.ONGKIR] || "0").replace(/,/g, "")
      ) || 0;

    const events = buildEventGroups(matchingRows, ongkirPerKg);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ customer, events }),
    };
  } catch (err) {
    console.error("Error fetching sheet data:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Gagal mengambil data. Silakan coba lagi nanti.",
      }),
    };
  }
};
