import { IG_DM_LINK } from "./config.js";
import { escapeHtml, copyNumber } from "./utils.js";
import { showInfoPopup } from "./popup.js";
import { renderOrders } from "./renderer.js";

// ── DOM elements ─────────────────────────────────────
const form = document.getElementById("searchForm");
const input = document.getElementById("igInput");
const btn = document.getElementById("searchBtn");
const results = document.getElementById("results");

// ── Helper: DM link HTML ─────────────────────────────
function dmLinkHtml() {
  return `<a href="${IG_DM_LINK}" target="_blank" rel="noopener noreferrer" style="color:#5c0a14;font-weight:600;">@yubisayu.id</a>`;
}

// ── Event delegation for data-* actions ──────────────
// Instead of inline onclick handlers, we use event delegation.
results.addEventListener("click", (e) => {
  // Copy button
  const copyBtn = e.target.closest("[data-copy]");
  if (copyBtn) {
    e.preventDefault();
    copyNumber(copyBtn, copyBtn.dataset.copy);
    return;
  }

  // Info popup button
  const popupBtn = e.target.closest("[data-popup]");
  if (popupBtn) {
    e.preventDefault();
    const type = popupBtn.dataset.popup;
    const argsAttr = popupBtn.dataset.popupArgs;
    if (argsAttr) {
      showInfoPopup(type, ...JSON.parse(argsAttr));
    } else {
      showInfoPopup(type);
    }
    return;
  }
});

// ── Form submission ──────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const raw = input.value.trim();
  if (!raw) return;

  const igId = raw.replace(/^@/, "");
  btn.disabled = true;
  btn.textContent = "Mencari...";
  results.innerHTML = '<div class="message">Memuat data...</div>';

  try {
    const res = await fetch(
      `/api/orders?instagramId=${encodeURIComponent(igId)}`
    );
    const data = await res.json();

    if (!res.ok) {
      results.innerHTML = `<div class="message error"><span class="msg-emoji">😢</span>${data.error || "Terjadi kesalahan."} Silakan DM ${dmLinkHtml()} untuk bantuan.</div>`;
      return;
    }

    if (!data.events || data.events.length === 0) {
      results.innerHTML = `<div class="message"><span class="msg-emoji">😢</span>Pesanan untuk @${escapeHtml(igId)} tidak ditemukan. Pastikan Instagram ID sudah benar, atau DM ${dmLinkHtml()} untuk bantuan.</div>`;
      return;
    }

    results.innerHTML = renderOrders(data.customer, data.events);
  } catch (err) {
    results.innerHTML = `<div class="message error"><span class="msg-emoji">😢</span>Gagal terhubung ke server. Silakan coba lagi. Bila error terus berlanjut silakan DM ${dmLinkHtml()} untuk bantuan.</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Cari";
  }
});
