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
  initFortuneWheel();
});

const FORTUNE_OFFERS = [
  { label: "Rush Lab Handling", detail: "Orders skip the standard queue" },
  { label: "Sample Vial Add-On", detail: "Complimentary testing vial" },
  { label: "Concierge Tuning Notes", detail: "Build-specific mixing cues" },
  { label: "20% Off Sitewide", detail: "Use code LAB20 today", isWinner: true },
  { label: "Pro Driver Sticker Pack", detail: "Track-inspired decals" },
  { label: "Expedited Fulfillment", detail: "Same-day lab release" }
];

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

// ========== Fortune Wheel ========== //
function initFortuneWheel() {
  if (!document.body) return;
  if (localStorage.getItem("axen-fortune-wheel")) return;

  const overlay = buildFortuneWheel();
  document.body.appendChild(overlay);

  window.requestAnimationFrame(() => {
    overlay.classList.add("visible");
  });

  setTimeout(() => {
    spinFortuneWheel(overlay);
  }, 700);

  localStorage.setItem("axen-fortune-wheel", Date.now().toString());
}

function buildFortuneWheel() {
  const overlay = document.createElement("div");
  overlay.className = "fortune-overlay";

  const offerList = FORTUNE_OFFERS.map(
    (offer, index) =>
      `<li style="--i:${index}"><strong>${offer.label}</strong><span>${offer.detail}</span></li>`
  ).join("");

  overlay.innerHTML = `
    <div class="fortune-modal" role="dialog" aria-label="Axen Labs offer wheel" aria-modal="true">
      <button class="fortune-close" aria-label="Close offer wheel">×</button>
      <div class="fortune-grid">
        <div class="fortune-copy">
          <p class="eyebrow">You unlocked a lab-only drop</p>
          <h3>Spin for an Axen Labs bonus</h3>
          <p>Every slot is engineered for builders, but this wheel is rigged in your favor. Give it a whirl and claim your reward.</p>
          <div class="fortune-result">Locking in your reward...</div>
        </div>
        <div class="fortune-wheel-stack">
          <div class="fortune-pointer" aria-hidden="true"></div>
          <div class="fortune-wheel" aria-hidden="true">
            <ul class="fortune-slices">${offerList}</ul>
          </div>
          <button class="fortune-spin" type="button">Spin now</button>
          <p class="fortune-note">New visitors always land a 20% off win. Welcome to the lab.</p>
        </div>
      </div>
    </div>
  `;

  overlay.addEventListener("click", (evt) => {
    if (evt.target === overlay) {
      overlay.remove();
    }
  });

  overlay.querySelector(".fortune-close")?.addEventListener("click", () => overlay.remove());

  const spinBtn = overlay.querySelector(".fortune-spin");
  if (spinBtn) {
    spinBtn.addEventListener("click", () => spinFortuneWheel(overlay));
  }

  return overlay;
}

function spinFortuneWheel(overlay) {
  const wheel = overlay.querySelector(".fortune-wheel");
  const result = overlay.querySelector(".fortune-result");
  const spinBtn = overlay.querySelector(".fortune-spin");

  if (!wheel || !result) return;

  if (spinBtn) {
    spinBtn.disabled = true;
  }

  const winningIndex = FORTUNE_OFFERS.findIndex((offer) => offer.isWinner);
  const sliceAngle = 360 / FORTUNE_OFFERS.length;
  const buffer = 6;
  const padding = randomBetween(buffer, sliceAngle - buffer);
  const targetRotation = 360 * 5 + winningIndex * sliceAngle + padding;

  wheel.style.setProperty("--fortune-rotation", `${targetRotation}deg`);
  wheel.classList.add("spinning");

  setTimeout(() => {
    result.innerHTML = `<span class="fortune-hit">You won 20% off.</span> Use code <strong>LAB20</strong> at checkout.`;
    overlay.classList.add("won");
    if (spinBtn) {
      spinBtn.textContent = "20% locked in";
    }
  }, 4200);
}
