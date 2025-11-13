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
