// main.js - simple enhancement placeholder
const PRODUCT_AVAILABILITY = {
  default: {
    viewers: [42, 118],
    carts: [9, 36],
    stock: [14, 32],
    stockFloor: 6,
    lowStockThreshold: 10,
    stockDecayChance: 0.35,
    intervalRange: [9000, 15000]
  },
  "ethrix-absolu": {
    viewers: [140, 260],
    carts: [32, 78],
    stock: [18, 36],
    stockFloor: 10,
    lowStockThreshold: 12
  },
  "ethrix-ignis": {
    viewers: [98, 210],
    carts: [28, 66],
    stock: [12, 28],
    stockFloor: 8,
    lowStockThreshold: 10
  },
  "ethrix-flux": {
    viewers: [86, 190],
    carts: [24, 60],
    stock: [15, 30],
    stockFloor: 9,
    lowStockThreshold: 10
  },
  "axion-shield": {
    viewers: [65, 150],
    carts: [20, 54],
    stock: [18, 40],
    stockFloor: 12,
    lowStockThreshold: 14
  },
  "axion-vault": {
    viewers: [58, 140],
    carts: [18, 48],
    stock: [20, 42],
    stockFloor: 12,
    lowStockThreshold: 16
  }
};

document.addEventListener("DOMContentLoaded", () => {
  console.log("Axen Labs website loaded.");
  hydrateProductUrgency();
  initWheelOfFortune();
});

function hydrateProductUrgency() {
  const panels = document.querySelectorAll("[data-product-stats]");
  if (!panels.length) return;

  panels.forEach((panel) => {
    const productKey = panel.dataset.productStats;
    const config = resolveProductConfig(productKey);
    const initialState = {
      viewers: randomBetween(config.viewers[0], config.viewers[1]),
      carts: randomBetween(config.carts[0], config.carts[1]),
      stock: randomBetween(config.stock[0], config.stock[1])
    };

    if (!bindPanelElements(panel)) return;

    clampState(initialState, config);
    renderUrgency(panel, initialState, config);
    scheduleUrgencyUpdate(panel, initialState, config);
  });
}

function resolveProductConfig(productKey = "") {
  const base = PRODUCT_AVAILABILITY.default;
  const custom = PRODUCT_AVAILABILITY[productKey] || {};
  return {
    viewers: custom.viewers || base.viewers,
    carts: custom.carts || base.carts,
    stock: custom.stock || base.stock,
    stockFloor: custom.stockFloor ?? base.stockFloor,
    lowStockThreshold: custom.lowStockThreshold ?? base.lowStockThreshold,
    stockDecayChance: custom.stockDecayChance ?? base.stockDecayChance,
    intervalRange: custom.intervalRange || base.intervalRange
  };
}

function bindPanelElements(panel) {
  const viewingNode = panel.querySelector(".viewing-count");
  const cartNode = panel.querySelector(".cart-count");
  const stockNode = panel.querySelector(".stock-count");

  if (!viewingNode || !cartNode || !stockNode) {
    return false;
  }

  panel._urgencyNodes = { viewingNode, cartNode, stockNode };
  return true;
}

function scheduleUrgencyUpdate(panel, state, config) {
  const interval = randomBetween(config.intervalRange[0], config.intervalRange[1]);

  window.setTimeout(() => {
    state.viewers = jitterWithin(state.viewers, config.viewers);
    state.carts = jitterWithin(state.carts, config.carts);

    if (state.carts > state.viewers - 2) {
      state.carts = Math.max(config.carts[0], state.viewers - 2);
    }

    const stockFloor = Math.max(config.stockFloor, config.stock[0]);
    if (Math.random() < config.stockDecayChance && state.stock > stockFloor) {
      state.stock -= 1;
    }

    clampState(state, config);
    renderUrgency(panel, state, config);
    scheduleUrgencyUpdate(panel, state, config);
  }, interval);
}

function clampState(state, config) {
  state.viewers = clamp(state.viewers, config.viewers[0], config.viewers[1]);
  state.carts = clamp(state.carts, config.carts[0], config.carts[1]);
  state.stock = clamp(state.stock, Math.max(config.stockFloor, config.stock[0]), config.stock[1]);

  if (state.carts > state.viewers - 2) {
    state.carts = Math.max(config.carts[0], state.viewers - 2);
  }
}

function renderUrgency(panel, state, config) {
  const { viewingNode, cartNode, stockNode } = panel._urgencyNodes;
  viewingNode.textContent = state.viewers;
  cartNode.textContent = state.carts;
  stockNode.textContent = state.stock;

  const lowStockThreshold = config.lowStockThreshold ?? config.stock[0];
  panel.classList.toggle("low-stock", state.stock <= lowStockThreshold);
}

function jitterWithin(current, [min, max]) {
  const delta = randomBetween(-3, 3);
  let next = current + delta;

  if (next < min) {
    next = min + randomBetween(0, 3);
  } else if (next > max) {
    next = max - randomBetween(0, 3);
  }

  if (next === current) {
    next = current + (delta >= 0 ? 1 : -1);
  }

  return clamp(next, min, max);
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// ---------- Wheel of Fortune Offer ----------
const WHEEL_STORAGE_KEY = "axen-wheel-shown";
const WHEEL_SPIN_DURATION = 5200;
const WHEEL_WIN_ANGLE = 0; // aligns the 20% off wedge to the pointer

function initWheelOfFortune() {
  if (!supportsLocalStorage() || hasSeenWheel()) return;

  const overlay = buildWheelOverlay();
  if (!overlay) return;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("is-visible"));
  markWheelSeen();
  bindWheelEvents(overlay);
}

function buildWheelOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "fortune-overlay";

  overlay.innerHTML = `
    <div class="fortune-overlay__backdrop" data-wheel-close></div>
    <div class="fortune-modal" role="dialog" aria-label="Spin for an Axen Labs bonus">
      <button class="fortune-modal__close" type="button" aria-label="Close spin wheel" data-wheel-close>&times;</button>
      <div class="fortune-modal__grid">
        <div class="fortune-modal__copy">
          <p class="fortune-modal__eyebrow">Site wide coupon</p>
          <h2 class="fortune-modal__title">Spin for an Axen Labs bonus</h2>
          <p class="fortune-modal__body">Every slot is engineered for builders, but this wheel is rigged in your favor. Spin to reveal the lab's best offer.</p>
          <div class="fortune-modal__result" data-wheel-status>Spin to reveal your offer.</div>
          <div class="fortune-modal__badge" data-wheel-badge aria-live="polite">You won 20% off. Applied automatically at checkout.</div>
          <p class="fortune-modal__note" data-wheel-note>Applied automatically at checkout.</p>
          <button class="fortune-modal__button" type="button" data-spin-button>Spin Now</button>
        </div>
        <div class="fortune-modal__visual">
          <div class="fortune-wheel" aria-hidden="true">
            <div class="fortune-wheel__glow"></div>
            <img src="assets/images/brand/wheel.png" alt="Axen Labs bonus wheel" class="fortune-wheel__image" data-wheel-image />
            <div class="fortune-wheel__pointer"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  return overlay;
}

function bindWheelEvents(overlay) {
  const closeTriggers = overlay.querySelectorAll("[data-wheel-close]");
  const spinButton = overlay.querySelector("[data-spin-button]");
  const wheelImage = overlay.querySelector("[data-wheel-image]");
  const status = overlay.querySelector("[data-wheel-status]");
  const badge = overlay.querySelector("[data-wheel-badge]");
  const note = overlay.querySelector("[data-wheel-note]");

  closeTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => closeWheelOverlay(overlay));
  });

  if (!spinButton || !wheelImage || !status || !badge || !note) return;

  spinButton.addEventListener("click", () => {
    if (overlay.dataset.wheelComplete === "true") {
      closeWheelOverlay(overlay);
      return;
    }

    startWheelSpin({ overlay, spinButton, wheelImage, status, badge, note });
  });
}

function startWheelSpin({ overlay, spinButton, wheelImage, status, badge, note }) {
  if (wheelImage.dataset.spinning === "true") return;

  wheelImage.dataset.spinning = "true";
  overlay.classList.add("is-spinning");
  spinButton.disabled = true;
  spinButton.textContent = "Spinning...";
  status.textContent = "Calibrating the lab wheel...";

  const baseTurns = 6 + Math.floor(Math.random() * 3);
  const finalRotation = baseTurns * 360 + WHEEL_WIN_ANGLE;
  wheelImage.style.setProperty("--wheel-rotation", `${finalRotation}deg`);

  window.setTimeout(() => {
    overlay.dataset.wheelComplete = "true";
    overlay.classList.add("has-result");
    overlay.classList.remove("is-spinning");
    wheelImage.dataset.spinning = "false";
    spinButton.disabled = false;
    spinButton.textContent = "Continue Shopping";
    status.textContent = "You won 20% off. Use it automatically at checkout.";
    badge.textContent = "20% off applied automatically at checkout.";
    note.textContent = "Applied automatically at checkout.";
  }, WHEEL_SPIN_DURATION);
}

function closeWheelOverlay(overlay) {
  overlay.classList.remove("is-visible");
  window.setTimeout(() => overlay.remove(), 240);
}

function hasSeenWheel() {
  try {
    return window.localStorage.getItem(WHEEL_STORAGE_KEY) === "true";
  } catch (_err) {
    return false;
  }
}

function markWheelSeen() {
  try {
    window.localStorage.setItem(WHEEL_STORAGE_KEY, "true");
  } catch (_err) {
    // no-op
  }
}

function supportsLocalStorage() {
  try {
    const key = "__wheel_test__";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch (_err) {
    return false;
  }
}
