// ── Account numbers ──────────────────────────────────
export const ACCOUNT_BCA = "4419051991";
export const ACCOUNT_JAGO = "103382719370";

// ── SVG Icons ────────────────────────────────────────
export const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
export const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

// ── Links ────────────────────────────────────────────
export const IG_DM_LINK = "https://ig.me/m/yubisayu.id";
export const IG_CHANNEL_LINK = "https://www.instagram.com/channel/AbbvStpygutze1N8/";
export const JNE_TRACKING_LINK = "https://jne.co.id/en/tracking-package";
export const WHATSAPP_NUMBER = "62811905159";

// ── Info popup content ───────────────────────────────
export const INFO_CONTENT = {
  eta: {
    title: "Estimasi Kedatangan",
    body: `<p>Hanya estimasi, bisa maju/mundur. Jika ada perubahan estimasi waktu kedatangan, detailnya akan selalu diupdate di <a href="${IG_CHANNEL_LINK}" target="_blank" rel="noopener noreferrer" style="color:#5c0a14;font-weight:600;">Channel Instagram</a>.</p>`,
  },
  status: {
    title: "Status Pesanan",
    body: `
      <div class="status-list">
        <span class="status-name">Pending</span><span class="status-desc">Barang belum lengkap</span>
        <span class="status-name">Processing</span><span class="status-desc">Barang sudah lengkap, antri packing</span>
        <span class="status-name">Partially Shipped</span><span class="status-desc">Barang sudah dikirim sebagian</span>
        <span class="status-name">Shipped</span><span class="status-desc">Barang sudah dikirim lengkap, menunggu resi dari kurir</span>
        <span class="status-name">Completed</span><span class="status-desc">Resi pengiriman sudah dapat diakses dan dicek</span>
      </div>
    `,
  },
  qris: {
    title: "Pembayaran QRIS",
    body: `<img src="/qris.png" alt="QR Code QRIS" class="qris-img"><a href="/qris.png" download="QRIS-Yubisayu.png" class="qris-download-btn">&#8681; Download QRIS</a>`,
  },
  pengembalianDana: {
    title: "Pengembalian Dana",
    body: (instagramId, eventId, sisaValue) => {
      const formattedSisa = new Intl.NumberFormat("id-ID").format(sisaValue);
      const waMsg = encodeURIComponent(
        `Dear Mba Yu, berikut detail rekening @${instagramId} untuk pengembalian dana ${eventId} sejumlah Rp ${formattedSisa}:\nNama Pemilik Rekening:\nNomor Rekening:\nNama Bank:`
      );
      return `<p>Silakan kirim nomor rekening dan nama pemilik rekening lewat <a href="${IG_DM_LINK}" target="_blank" rel="noopener noreferrer" style="color:#5c0a14;font-weight:600;">Instagram Message</a> dan/atau <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}" target="_blank" rel="noopener noreferrer" style="color:#5c0a14;font-weight:600;">Whatsapp</a> untuk mempercepat proses pengembalian dana. Alternatifnya, bisa juga tunggu dikontak sesuai urutan.</p>`;
    },
  },
};
