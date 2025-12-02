import { Cart } from "./cart.js";

const PROCESSING_DURATION = 6000;
const DECLINE_DURATION = 3000;

function getOrderId() {
  const params = new URLSearchParams(window.location.search);
  const providedId = params.get("orderId");
  if (providedId) return providedId;

  return crypto.randomUUID ? crypto.randomUUID() : `AX-${Math.random().toString(16).slice(2, 10)}`;
}

function setOrderIdText(orderId) {
  document.querySelectorAll("[data-order-id]").forEach((node) => {
    node.textContent = orderId;
  });
}

function startProcessing(orderId) {
  setOrderIdText(orderId);
  setTimeout(() => {
    window.location.href = `order-declined.html?orderId=${encodeURIComponent(orderId)}`;
  }, PROCESSING_DURATION);
}

function startDeclined(orderId) {
  setOrderIdText(orderId);
  setTimeout(() => {
    Cart.clear();
    window.location.href = "index.html";
  }, DECLINE_DURATION);
}

document.addEventListener("DOMContentLoaded", () => {
  const pageType = document.body.dataset.page;
  const orderId = getOrderId();

  if (pageType === "processing") {
    startProcessing(orderId);
  }

  if (pageType === "declined") {
    startDeclined(orderId);
  }
});
