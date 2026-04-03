import {
  ACCOUNT_BCA,
  ACCOUNT_JAGO,
  COPY_ICON,
  IG_DM_LINK,
  JNE_TRACKING_LINK,
} from "./config.js";
import { formatNumber, escapeHtml } from "./utils.js";

// ── Helper: build the DM link HTML ─────────────────────
function dmLink() {
  return `<a href="${IG_DM_LINK}" target="_blank" rel="noopener noreferrer" style="color:#5c0a14;font-weight:600;">@yubisayu.id</a>`;
}

// ── Remarks section (top) ──────────────────────────────
function buildRemarks() {
  return `
    <div class="remarks">
      Silakan cek rekapan, kontak ${dmLink()} jika rekapan ada yang salah, kurang, atau tidak sesuai.<br>
      <br>
      Jika rekapan sudah sesuai, bisa langsung transfer (tidak perlu tunggu diinvoice admin) ke:<br>
      <br>
      Rekening a/n Shinta Michiko<br>
      BCA <strong>${ACCOUNT_BCA}</strong><button class="copy-btn" data-copy="${ACCOUNT_BCA}" title="Copy">${COPY_ICON}</button><br>
      JAGO <strong>${ACCOUNT_JAGO}</strong><button class="copy-btn" data-copy="${ACCOUNT_JAGO}" title="Copy">${COPY_ICON}</button><br>
      <br>
      Pembayaran dibawah Rp200.000,00 bisa melalui <button class="qris-btn" data-popup="qris">QRIS</button><br>
      <br>
      Bukti transfer jangan lupa kirim ke ${dmLink()} untuk diverifikasi, terima kasih!
    </div>`;
}

// ── Event card header ──────────────────────────────────
function buildHeader(ev, customer) {
  const { eventId, eta, status, shipments, showShipments } = ev;
  const total = shipments.length;

  return `
    <div class="event-card-header">
      <div class="header-col header-col-lead">
        <div class="header-item">
          <span class="header-value">${escapeHtml(customer.toUpperCase())}</span>
        </div>
        <div class="header-item">
          <span class="header-value">${escapeHtml(eventId)}</span>
          ${eta ? `<span class="header-value-normal">${escapeHtml(eta)}</span><button class="info-btn" data-popup="eta" title="Info ETA">i</button>` : ""}
        </div>
        ${status ? `<div class="header-item header-item--inline">
          <span class="header-label header-label--strong">Status</span>
          <span class="header-value--normal">${escapeHtml(status)}</span>
          <button class="info-btn" data-popup="status" title="Info Status">i</button>
        </div>` : ""}
        ${showShipments ? shipments.map((s, i) => `<div class="header-item header-item--shipment">
          <span class="header-label header-label--strong">Resi ${total > 1 ? `${i + 1}/${total}` : ""}</span>
          <div class="header-badges">
            <span class="header-badge header-badge--normal header-badge-with-copy"><a class="header-badge-link" href="${JNE_TRACKING_LINK}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.resi)}</a><button class="copy-btn copy-btn-light" data-copy="${escapeHtml(s.resi)}" title="Copy resi">${COPY_ICON}</button></span>
            ${s.tanggalKirim ? `<span class="header-badge header-badge--normal">${escapeHtml(s.tanggalKirim)}</span>` : ""}
          </div>
        </div>`).join("") : ""}
      </div>
    </div>`;
}

// ── Order table ────────────────────────────────────────
function buildOrderTable(orders, totals) {
  const rows = [...orders].reverse().map((r) => `
    <tr>
      <td>${escapeHtml(r.order)}</td>
      <td>${r.unit}</td>
      <td>${escapeHtml(r.price)}</td>
      <td>${escapeHtml(r.subtotal)}</td>
      <td>${r.unitArrive}</td>
    </tr>
  `).join("");

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Unit</th>
            <th>Price</th>
            <th>Subtotal</th>
            <th>Ready</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="event-total">
            <td>Total</td>
            <td>${totals.unit}</td>
            <td></td>
            <td>${formatNumber(totals.subtotal)}</td>
            <td>${totals.arrive}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

// ── Invoice / Ringkasan section ────────────────────────
function buildRingkasan(ev, customer) {
  const { invoice, totals } = ev;
  const {
    subtotalBarang,
    estimasiOngkir,
    biayaLainnya,
    total,
    pembayaran,
    sisaPelunasan,
  } = invoice;

  const sisaClass = sisaPelunasan <= 0 ? "sisa-zero" : "sisa-positive";
  const sisaAbs = Math.abs(sisaPelunasan);

  const sisaLabel =
    sisaPelunasan < 0
      ? `Pengembalian Dana <button class="info-btn info-btn--dark" data-popup="pengembalianDana" data-popup-args='${JSON.stringify([customer, ev.eventId, sisaAbs])}' aria-label="Info pengembalian dana">i</button>`
      : "Sisa Pelunasan";

  return `
    <div class="ringkasan">
      <div class="ringkasan-title">Invoice</div>
      <div class="ringkasan-row">
        <span class="r-label">Subtotal Barang</span>
        <span class="r-value">Rp ${formatNumber(subtotalBarang)}</span>
      </div>
      <div class="ringkasan-row">
        <span class="r-label">Estimasi Berat</span>
        <span class="r-value">${formatNumber(totals.weightKg)} kg</span>
      </div>
      <div class="ringkasan-row${total && !biayaLainnya ? " ringkasan-row--no-bottom" : ""}">
        <span class="r-label">Estimasi Ongkos Kirim</span>
        <span class="r-value">Rp ${formatNumber(estimasiOngkir)}</span>
      </div>
      ${biayaLainnya > 0 ? `<div class="ringkasan-row ringkasan-row--no-bottom">
        <span class="r-label">Diskon</span>
        <span class="r-value">- Rp ${formatNumber(biayaLainnya)}</span>
      </div>` : ""}
      ${biayaLainnya < 0 ? `<div class="ringkasan-row ringkasan-row--no-bottom">
        <span class="r-label">Biaya Lainnya</span>
        <span class="r-value">+ Rp ${formatNumber(Math.abs(biayaLainnya))}</span>
      </div>` : ""}
      ${total ? `<div class="ringkasan-row ringkasan-row--separator">
        <span class="r-label">Total</span>
        <span class="r-value">Rp ${formatNumber(total)}</span>
      </div>` : ""}
      <div class="ringkasan-row">
        <span class="r-label">Pembayaran</span>
        <span class="r-value">Rp ${formatNumber(pembayaran)}</span>
      </div>
      <div class="ringkasan-row">
        <span class="r-label">${sisaLabel}</span>
        <span class="r-value ${sisaClass}">Rp ${formatNumber(sisaAbs)}</span>
      </div>
    </div>`;
}

// ── Build a single event card ──────────────────────────
function buildEventCard(ev, customer) {
  return `
    <div class="event-card">
      ${buildHeader(ev, customer)}
      ${buildOrderTable(ev.orders, ev.totals)}
      ${buildRingkasan(ev, customer)}
    </div>`;
}

// ── Main render function ───────────────────────────────
export function renderOrders(customer, events) {
  let html = buildRemarks();

  // Render events in reverse order (newest first)
  [...events].reverse().forEach((ev) => {
    html += buildEventCard(ev, customer);
  });

  return html;
}
