const PRODUCT_CATALOG = {
  absolu: { name: "ETHRIX Absolu", price: 89 },
  flux: { name: "ETHRIX Flux", price: 64 },
  shield: { name: "Axion Shield", price: 48 }
};

const DISCOUNT_RATE = 0.2;

window.addEventListener("DOMContentLoaded", () => {
  const cart = {};
  let shippingCost = getSelectedShippingCost();

  const cartList = document.querySelector("[data-cart-items]");
  const subtotalNode = document.querySelector("[data-subtotal]");
  const discountNode = document.querySelector("[data-discount]");
  const shippingNode = document.querySelector("[data-shipping]");
  const totalNode = document.querySelector("[data-total]");
  const addressDisplay = document.querySelector("[data-selected-address]");

  document.querySelectorAll("[data-add-product]").forEach((button) => {
    button.addEventListener("click", () => {
      addToCart(button.dataset.addProduct);
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

  function addToCart(productKey) {
    if (!PRODUCT_CATALOG[productKey]) return;

    cart[productKey] = (cart[productKey] || 0) + 1;
    renderCart();
    renderTotals();
  }

  function renderCart() {
    if (!cartList) return;

    cartList.innerHTML = "";

    const entries = Object.entries(cart);
    if (!entries.length) {
      cartList.innerHTML = '<p class="cart-empty">Your cart is ready whenever you are. Add an item to see it here.</p>';
      return;
    }

    entries.forEach(([key, quantity]) => {
      const product = PRODUCT_CATALOG[key];
      const linePrice = product.price * quantity;
      const item = document.createElement("div");
      item.className = "cart-item";
      item.innerHTML = `
        <div>
          <div>${product.name}</div>
          <div class="cart-item__meta">Qty ${quantity} · $${product.price.toFixed(2)} each</div>
        </div>
        <div class="cart-item__total">$${linePrice.toFixed(2)}</div>
      `;
      cartList.appendChild(item);
    });
  }

  function calculateSubtotal() {
    return Object.entries(cart).reduce((total, [key, qty]) => {
      const product = PRODUCT_CATALOG[key];
      return total + product.price * qty;
    }, 0);
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

  renderTotals();
});
