import { INFO_CONTENT } from "./config.js";

const overlay = document.getElementById("infoOverlay");
const titleEl = document.getElementById("infoPopupTitle");
const bodyEl = document.getElementById("infoPopupBody");

/**
 * Show an info popup by type key. Extra arguments are forwarded
 * if the popup body is a function (e.g. pengembalianDana).
 */
export function showInfoPopup(type, ...args) {
  const content = INFO_CONTENT[type];
  if (!content) return;

  titleEl.textContent = content.title;
  bodyEl.innerHTML =
    typeof content.body === "function" ? content.body(...args) : content.body;
  overlay.classList.add("active");
}

/**
 * Close the info popup. When used as an event handler on the overlay,
 * only closes when clicking the overlay background itself.
 */
export function closeInfoPopup(e) {
  if (e && e.target !== overlay) return;
  overlay.classList.remove("active");
}

// Bind the overlay click and close button
overlay.addEventListener("click", closeInfoPopup);
document
  .querySelector(".info-popup-close")
  .addEventListener("click", () => closeInfoPopup());
