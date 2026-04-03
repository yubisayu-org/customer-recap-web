import { COPY_ICON, CHECK_ICON } from "./config.js";

/**
 * Format a number using Indonesian locale (e.g. 1.000.000).
 */
export function formatNumber(n) {
  return new Intl.NumberFormat("id-ID").format(n);
}

/**
 * Escape HTML special characters to prevent XSS.
 */
export function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

/**
 * Copy text to clipboard and show a check icon on the button.
 */
export function copyNumber(btn, number) {
  navigator.clipboard.writeText(number).then(() => {
    btn.innerHTML = CHECK_ICON;
    btn.classList.add("copied");
    setTimeout(() => {
      btn.innerHTML = COPY_ICON;
      btn.classList.remove("copied");
    }, 2000);
  });
}

/**
 * Copy text from a badge button with inline text + icon.
 */
export function copyBadge(btn, number) {
  navigator.clipboard.writeText(number).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = `<span>${escapeHtml(number)}</span>${CHECK_ICON}`;
    btn.classList.add("copied");
    setTimeout(() => {
      btn.innerHTML = original;
      btn.classList.remove("copied");
    }, 2000);
  });
}
