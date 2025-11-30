const SHIPPING_STORAGE_KEY = "axen-demo-shipping";
const ADDRESS_STORAGE_KEY = "axen-demo-address";

window.addEventListener("DOMContentLoaded", () => {
  const cartAPI = window.AxenCart;
  const PRODUCT_CATALOG = cartAPI?.PRODUCT_CATALOG || {};
  const DISCOUNT_RATE = cartAPI?.DISCOUNT_RATE ?? 0;

  let cart = cartAPI ? cartAPI.getCart() : {};
  let shippingCost = getSelectedShippingCost();

  const cartList = document.querySelector("[data-cart-items]");
  const subtotalNode = document.querySelector("[data-subtotal]");
  const discountNode = document.querySelector("[data-discount]");
  const shippingNode = document.querySelector("[data-shipping]");
  const totalNode = document.querySelector("[data-total]");
  const addressDisplay = document.querySelector("[data-selected-address]");
  const checkoutButton = document.querySelector("[data-place-order]");
  const checkoutStatus = document.querySelector("[data-checkout-status]");
  const confirmationCard = document.querySelector("[data-confirmation]");
  const confirmationId = document.querySelector("[data-confirmation-id]");
  const confirmationSummary = document.querySelector("[data-confirmation-summary]");
  const confirmationItems = document.querySelector("[data-confirmation-items]");
  const confirmationTotal = document.querySelector("[data-confirmation-total]");

  hydrateShippingFromStorage();
  hydrateAddressFromStorage();
  renderCart();
  renderTotals();

  if (cartAPI) {
    window.addEventListener("cart:updated", (event) => {
      cart = event.detail?.cart || {};
      renderCart();
      renderTotals();
    });
  }

  document.querySelectorAll('input[name="shipping"]').forEach((input) => {
    input.addEventListener("change", () => {
      shippingCost = getSelectedShippingCost();
      persistShippingSelection(input.value);
      renderTotals();
    });
  });

  document.querySelectorAll('input[name="address"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (addressDisplay) {
        addressDisplay.textContent = input.dataset.addressLabel;
      }
      persistAddressSelection(input.value);
    });
  });

  if (checkoutButton) {
    checkoutButton.addEventListener("click", async () => {
      const paymentIsValid = validatePaymentForm();

      if (!Object.keys(cart).length) {
        showStatus("Add at least one item before placing your mock order.", "error");
        return;
      }

      if (!paymentIsValid) {
        showStatus("Enter a name and mock card details to continue.", "error");
        return;
      }

      setProcessing(true);
      showStatus("Simulating checkout...", "info");

      const orderPayload = cartAPI
        ? cartAPI.buildCheckoutPayload({
            cartOverride: cart,
            shippingCost,
            shippingLabel: getSelectedShippingLabel(),
            addressLabel: getSelectedAddressLabel(),
            discountRate: DISCOUNT_RATE
          })
        : buildOrderPayloadFallback();

      const response = await simulateOrderRequest(orderPayload);

      renderConfirmation(response);
      clearCart();
      renderCart();
      renderTotals();
      setProcessing(false);
      showStatus("Order simulation complete. Confirmation generated below.", "success");
    });
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

  function calculateTotals() {
    if (cartAPI && typeof cartAPI.calculateTotals === "function") {
      return cartAPI.calculateTotals(cart, shippingCost, DISCOUNT_RATE);
    }

    const subtotal = Object.entries(cart).reduce((total, [key, qty]) => {
      const product = PRODUCT_CATALOG[key];
      return total + product.price * qty;
    }, 0);

    const discount = subtotal * DISCOUNT_RATE;
    const shipping = subtotal > 0 ? shippingCost : 0;
    const total = subtotal - discount + shipping;

    return { subtotal, discount, shipping, total };
  }

  function renderTotals() {
    if (!subtotalNode || !discountNode || !shippingNode || !totalNode) return;

    const { subtotal, discount, shipping, total } = calculateTotals();

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

  function getSelectedShippingLabel() {
    const checked = document.querySelector('input[name="shipping"]:checked');
    return checked ? checked.dataset.shippingLabel || checked.value : "";
  }

  function getSelectedAddressLabel() {
    const checked = document.querySelector('input[name="address"]:checked');
    return checked ? checked.dataset.addressLabel || checked.value : "";
  }

  function persistShippingSelection(value) {
    localStorage.setItem(SHIPPING_STORAGE_KEY, value);
  }

  function persistAddressSelection(value) {
    localStorage.setItem(ADDRESS_STORAGE_KEY, value);
  }

  function hydrateShippingFromStorage() {
    const stored = localStorage.getItem(SHIPPING_STORAGE_KEY);
    const match = stored ? document.querySelector(`input[name="shipping"][value="${stored}"]`) : null;
    if (match) {
      match.checked = true;
      shippingCost = getSelectedShippingCost();
    }
  }

  function hydrateAddressFromStorage() {
    const stored = localStorage.getItem(ADDRESS_STORAGE_KEY);
    const match = stored ? document.querySelector(`input[name="address"][value="${stored}"]`) : null;
    if (match) {
      match.checked = true;
      if (addressDisplay) {
        addressDisplay.textContent = match.dataset.addressLabel;
      }
    }
  }

  function setProcessing(isProcessing) {
    if (!checkoutButton) return;
    checkoutButton.disabled = isProcessing;
    checkoutButton.textContent = isProcessing ? "Processing..." : "Place order";
  }

  function validatePaymentForm() {
    const paymentForm = document.querySelector("[data-mock-payment]");
    if (!paymentForm) return true;
    const requiredFields = paymentForm.querySelectorAll("[data-payment-input]");
    return Array.from(requiredFields).every((input) => input.value.trim().length);
  }

  function buildOrderPayloadFallback() {
    const { subtotal, discount, shipping, total } = calculateTotals();
    return {
      items: Object.entries(cart).map(([key, quantity]) => ({
        id: key,
        name: PRODUCT_CATALOG[key].name,
        price: PRODUCT_CATALOG[key].price,
        quantity,
        lineTotal: PRODUCT_CATALOG[key].price * quantity
      })),
      total,
      discount,
      shipping,
      subtotal,
      shippingLabel: getSelectedShippingLabel(),
      addressLabel: getSelectedAddressLabel()
    };
  }

  function simulateOrderRequest(payload) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          orderId: `AX-${Math.floor(Math.random() * 900000) + 100000}`,
          ...payload
        });
      }, 1000);
    });
  }

  function renderConfirmation(order) {
    if (!confirmationCard || !confirmationId || !confirmationItems || !confirmationSummary || !confirmationTotal) return;

    confirmationCard.classList.remove("is-hidden");
    confirmationId.textContent = order.orderId;
    confirmationSummary.textContent = `Shipping to ${order.addressLabel} via ${order.shippingLabel}.`;
    confirmationItems.innerHTML = "";

    order.items.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${item.name} × ${item.quantity}</span><span>${formatCurrency(item.lineTotal)}</span>`;
      confirmationItems.appendChild(li);
    });

    confirmationTotal.textContent = formatCurrency(order.total);
  }

  function clearCart() {
    if (cartAPI) {
      cartAPI.clear();
      cart = cartAPI.getCart();
      return;
    }

    cart = {};
  }

  function showStatus(message, tone = "info") {
    if (!checkoutStatus) return;
    checkoutStatus.textContent = message;
    checkoutStatus.dataset.tone = tone;
  }
});
