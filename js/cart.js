(function () {
  const PRODUCT_CATALOG = {
    absolu: { name: "ETHRIX Absolu", price: 89 },
    flux: { name: "ETHRIX Flux", price: 64 },
    shield: { name: "Axion Shield", price: 48 }
  };

  const CART_STORAGE_KEY = "axen-demo-cart";
  const DISCOUNT_RATE = 0.2;

  let cart = loadCartFromStorage();

  document.addEventListener("DOMContentLoaded", () => {
    bindAddToCartButtons(document);
    emitCartUpdated();
  });

  function bindAddToCartButtons(root = document) {
    const buttons = root.querySelectorAll("[data-add-product]:not([data-cart-bound])");
    if (!buttons.length) return;

    buttons.forEach((button) => {
      button.dataset.cartBound = "true";
      button.addEventListener("click", () => {
        addItem(button.dataset.addProduct, Number(button.dataset.addQuantity) || 1);
      });
    });
  }

  function addItem(productKey, quantity = 1) {
    if (!PRODUCT_CATALOG[productKey] || quantity <= 0) return;
    cart[productKey] = (cart[productKey] || 0) + quantity;
    persistCart();
    emitCartUpdated();
  }

  function removeItem(productKey) {
    if (!cart[productKey]) return;
    delete cart[productKey];
    persistCart();
    emitCartUpdated();
  }

  function setQuantity(productKey, quantity) {
    if (!PRODUCT_CATALOG[productKey]) return;
    if (quantity <= 0) {
      removeItem(productKey);
      return;
    }

    cart[productKey] = quantity;
    persistCart();
    emitCartUpdated();
  }

  function clear() {
    cart = {};
    persistCart();
    emitCartUpdated();
  }

  function getCart() {
    return { ...cart };
  }

  function getLineItems(currentCart = cart) {
    return Object.entries(currentCart).map(([key, quantity]) => {
      const product = PRODUCT_CATALOG[key];
      return {
        id: key,
        name: product.name,
        price: product.price,
        quantity,
        lineTotal: product.price * quantity
      };
    });
  }

  function calculateSubtotal(currentCart = cart) {
    return Object.entries(currentCart).reduce((total, [key, qty]) => {
      const product = PRODUCT_CATALOG[key];
      return total + product.price * qty;
    }, 0);
  }

  function calculateTotals(currentCart = cart, shippingCost = 0, discountRate = DISCOUNT_RATE) {
    const subtotal = calculateSubtotal(currentCart);
    const discount = subtotal * discountRate;
    const shipping = subtotal > 0 ? shippingCost : 0;
    const total = subtotal - discount + shipping;

    return { subtotal, discount, shipping, total };
  }

  function buildCheckoutPayload({
    cartOverride,
    shippingCost = 0,
    shippingLabel = "",
    addressLabel = "",
    discountRate = DISCOUNT_RATE
  } = {}) {
    const workingCart = cartOverride || cart;
    const items = getLineItems(workingCart);
    const { subtotal, discount, shipping, total } = calculateTotals(workingCart, shippingCost, discountRate);

    return { items, subtotal, discount, shipping, total, shippingLabel, addressLabel };
  }

  function persistCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }

  function loadCartFromStorage() {
    if (typeof localStorage === "undefined") return {};

    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return Object.keys(parsed || {}).reduce((acc, key) => {
        if (PRODUCT_CATALOG[key]) {
          acc[key] = Number(parsed[key]) || 0;
        }
        return acc;
      }, {});
    } catch (e) {
      return {};
    }
  }

  function emitCartUpdated() {
    window.dispatchEvent(
      new CustomEvent("cart:updated", {
        detail: {
          cart: getCart(),
          items: getLineItems(),
          totals: calculateTotals()
        }
      })
    );
  }

  window.AxenCart = {
    addItem,
    removeItem,
    setQuantity,
    clear,
    getCart,
    getLineItems,
    calculateTotals,
    buildCheckoutPayload,
    bindAddToCartButtons,
    PRODUCT_CATALOG,
    DISCOUNT_RATE
  };
})();
