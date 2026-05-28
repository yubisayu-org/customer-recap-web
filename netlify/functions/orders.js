// Customer order recap lookup.
//
// Data source: the inventory dashboard's public, read-only invoice endpoint
// (GET ${INVOICE_API_URL}?customer=<ig>), which serves the recap from Supabase
// via a column-scoped `invoice_reader` role — never PII or bank data. This
// function is a thin server-side proxy: it normalizes the Instagram handle,
// rate-limits, caches per customer, and adapts the response to { customer, events }.

// --- Per-customer in-memory cache ---
const cache = new Map(); // searchId -> { data, ts }
const CACHE_TTL = 60_000; // 60 seconds
const UPSTREAM_TIMEOUT = 12_000; // 12s

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

/**
 * Fetch the recap for one customer from the dashboard's public invoice API.
 * Returns the parsed { customer, events } payload, cached per searchId.
 */
async function fetchRecap(searchId) {
  const now = Date.now();
  const hit = cache.get(searchId);
  if (hit && now - hit.ts < CACHE_TTL) {
    return hit.data;
  }

  const base = process.env.INVOICE_API_URL;
  if (!base) {
    throw new Error("INVOICE_API_URL is not configured");
  }

  const url = new URL(base);
  url.searchParams.set("customer", searchId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT);
  let res;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`Upstream invoice API returned ${res.status}`);
  }

  const payload = await res.json();

  // Adapt to the shape the frontend renders. The upstream already returns this
  // shape, but we default the shipment fields so the renderer can never crash
  // on a missing array.
  const events = Array.isArray(payload.events)
    ? payload.events.map((ev) => ({
        eventId: ev.eventId || "",
        eta: ev.eta || "",
        status: ev.status || "",
        shipments: Array.isArray(ev.shipments) ? ev.shipments : [],
        showShipments: Boolean(ev.showShipments),
        orders: Array.isArray(ev.orders) ? ev.orders : [],
        totals: ev.totals || { unit: 0, subtotal: 0, arrive: 0, weightKg: 0 },
        invoice: ev.invoice || {},
      }))
    : [];

  const data = { customer: payload.customer || "", events };
  cache.set(searchId, { data, ts: now });
  return data;
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
    const data = await fetchRecap(searchId);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("Error fetching recap data:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Gagal mengambil data. Silakan coba lagi nanti.",
      }),
    };
  }
};
