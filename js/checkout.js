import { Cart } from "./cart.js";

const PRODUCT_CATALOG = {
  absolu: {
    name: "ETHRIX Absolu",
    price: 39,
    image: "assets/images/products/ETHRIX_Absolu_Render_1200.png"
  },
  flux: {
    name: "ETHRIX Flux",
    price: 45,
    image: "assets/images/products/ETHRIX_Flux_Render_1200.png"
  },
  shield: {
    name: "AXION Shield",
    price: 32,
    image: "assets/images/products/AXION_Shield_Render_1200.png"
  }
};

const DISCOUNT_RATE = 0.2;
const sid = (document.cookie.match(/(?:^|; )ax_sess=([^;]*)/) || [])[1] || "";
const buyNowKey = `checkout:${sid}`;
let items = [];

const normalizeItems = (list = []) =>
  (Array.isArray(list) ? list : [])
    .map((it) => ({
      id: it.id,
      name: it.name,
      price: Number(it.price) || 0,
      qty: Number(it.qty) || 1,
      image: it.image || ""
    }))
    .filter((it) => !!it.id);

function hydrateItemsFromStorage() {
  const raw = sessionStorage.getItem(buyNowKey);

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizeItems(parsed?.items);

      if (normalized.length) {
        Cart.write({ items: normalized });
        items = normalized;
      }
    } catch (err) {
      console.error("Failed to hydrate buy now payload", err);
    }

    sessionStorage.removeItem(buyNowKey);
  }

  if (!items.length) {
    items = Cart.read().items;
  }
}

function syncItemsFromCart() {
  items = Cart.read().items;
}

window.addEventListener("DOMContentLoaded", () => {
  hydrateItemsFromStorage();

  const cartList = document.querySelector("[data-cart-items]");
  const subtotalNode = document.querySelector("[data-subtotal]");
  const discountNode = document.querySelector("[data-discount]");
  const shippingNode = document.querySelector("[data-shipping]");
  const totalNode = document.querySelector("[data-total]");
  const addressDisplay = document.querySelector("[data-selected-address]");

  let shippingCost = getSelectedShippingCost();

  document.querySelectorAll("[data-add-product]").forEach((button) => {
    button.addEventListener("click", () => {
      const productKey = button.dataset.addProduct;
      const product = PRODUCT_CATALOG[productKey];
      if (!product) return;

      Cart.add({
        id: productKey,
        name: product.name,
        price: product.price,
        image: product.image,
        qty: 1
      });

      syncItemsFromCart();
      renderCartItems();
      renderTotals();
    });
  });

  document.querySelectorAll('input[name="shipping"]').forEach((input) => {
    input.addEventListener("change", () => {
      shippingCost = getSelectedShippingCost();
      renderTotals();
    });
  });

  document.querySelectorAll('input[name="address"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (addressDisplay) {
        addressDisplay.textContent = input.dataset.addressLabel;
      }
    });
  });

  renderCartItems();
  renderTotals();

  function renderCartItems() {
    if (!cartList) return;

    cartList.innerHTML = "";

    if (!items.length) {
      cartList.innerHTML =
        '<p class="cart-empty">Your cart is ready whenever you are. Add an item to see it here.</p>';
      return;
    }

    items.forEach((item) => {
      const linePrice = item.price * item.qty;
      const node = document.createElement("div");
      node.className = "cart-item";
      node.innerHTML = `
        <div>
          <div>${item.name}</div>
          <div class="cart-item__meta">Qty ${item.qty} · ${formatCurrency(item.price)} each</div>
        </div>
        <div class="cart-item__total">${formatCurrency(linePrice)}</div>
      `;
      cartList.appendChild(node);
    });
  }

  function calculateSubtotal() {
    return items.reduce((total, item) => total + item.price * item.qty, 0);
  }

  function renderTotals() {
    if (!subtotalNode || !discountNode || !shippingNode || !totalNode) return;

    const subtotal = calculateSubtotal();
    const discount = subtotal * DISCOUNT_RATE;
    const shipping = subtotal > 0 ? shippingCost : 0;
    const total = subtotal - discount + shipping;

    subtotalNode.textContent = formatCurrency(subtotal);
    discountNode.textContent = `-${formatCurrency(discount)}`;
    shippingNode.textContent = formatCurrency(shipping);
    totalNode.textContent = formatCurrency(total);
  }

  function formatCurrency(value) {
    return `$${value.toFixed(2)}`;
  }

  function getSelectedShippingCost() {
    const checked = document.querySelector('input[name="shipping"]:checked');
    return checked ? Number(checked.dataset.shippingCost) : 0;
  }
});
