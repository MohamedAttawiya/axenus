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
let countries = [];
let states = [];
let cities = null;
const citiesByState = new Map();
let shippingCost = 0;

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

  if (!items.length) {
    window.location.href = "products.html";
    return;
  }

  const cartList = document.querySelector("[data-cart-items]");
  const subtotalNode = document.querySelector("[data-subtotal]");
  const discountNode = document.querySelector("[data-discount]");
  const shippingNode = document.querySelector("[data-shipping]");
  const totalNode = document.querySelector("[data-total]");
  const addressDisplay = document.querySelector("[data-selected-address]");
  const shippingForm = document.querySelector("[data-shipping-form]");
  const pickupForm = document.querySelector("[data-pickup-form]");
  const shippingAvailability = document.querySelector("[data-shipping-availability]");
  const countrySelect = document.querySelector("[data-country]");
  const stateSelect = document.querySelector("[data-state]");
  const citySelect = document.querySelector("[data-city]");
  const addressLineInput = document.querySelector("[data-address-line]");
  const postalInput = document.querySelector("[data-postal]");
  const pickupPhoneCode = document.querySelector("[data-pickup-phone-code]");
  const pickupPhoneInput = document.querySelector("[data-pickup-phone]");
  const shippingPhoneCode = document.querySelector("[data-shipping-phone-code]");
  const shippingPhoneInput = document.querySelector("[data-shipping-phone]");
  const blockedInputs = document.querySelectorAll("[data-blocked-input]");
  const partnerModal = document.querySelector("[data-partner-modal]");
  const partnerLink = document.querySelector("[data-partner-link]");
  const partnerClosers = document.querySelectorAll("[data-partner-close]");
  const shippingMethodPanel = document.querySelector("[data-shipping-method-panel]");
  const cardNumberInput = document.querySelector("[data-card-number]");
  const cardNameInput = document.querySelector("[data-card-name]");
  const cardExpInput = document.querySelector("[data-card-exp]");
  const cardCvvInput = document.querySelector("[data-card-cvv]");
  const cardBrandNode = document.querySelector("[data-card-brand]");
  const cardNumberHint = document.querySelector("[data-card-number-hint]");
  const cardNameHint = document.querySelector("[data-card-name-hint]");
  const cardExpHint = document.querySelector("[data-card-exp-hint]");
  const cardCvvHint = document.querySelector("[data-card-cvv-hint]");
  const placeOrderButton = document.querySelector("[data-place-order]");
  const statusScreen = document.querySelector("[data-status-screen]");
  const statusCard = document.querySelector("[data-status-card]");
  const statusEyebrow = document.querySelector("[data-status-eyebrow]");
  const statusTitle = document.querySelector("[data-status-title]");
  const statusIdNode = document.querySelector("[data-status-id]");
  const statusNote = document.querySelector("[data-status-note]");

  let shippingCostSelection = getSelectedShippingCost();
  let partnerShown = false;
  let currentCardBrand = "unknown";

  initAddressSelectors().catch((err) => console.error("Address data failed to load", err));
  initPaymentValidation();

  partnerClosers.forEach((node) => node.addEventListener("click", hidePartnerModal));
  partnerLink?.addEventListener("click", (event) => {
    event.preventDefault();
    openPartnerSite();
  });

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
      shippingCostSelection = getSelectedShippingCost();
      updateSelectedAddress();
    });
  });

  document.querySelectorAll('input[name="address"]').forEach((input) => {
    input.addEventListener("change", updateSelectedAddress);
  });

  placeOrderButton?.addEventListener("click", handlePlaceOrder);

  [countrySelect, stateSelect, citySelect, addressLineInput, postalInput, pickupPhoneCode, pickupPhoneInput]
    .filter(Boolean)
    .forEach((field) => {
      field.addEventListener("change", updateSelectedAddress);
      field.addEventListener("input", updateSelectedAddress);
    });

  renderCartItems();
  renderTotals();
  updateSelectedAddress();

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
      const imageSrc = item.image || "assets/images/products/ETHRIX_Absolu_Render_1200.png";
      const node = document.createElement("div");
      node.className = "cart-item";
      node.innerHTML = `
        <div class="cart-item__media">
          <img src="${imageSrc}" alt="${item.name}">
        </div>
        <div class="cart-item__body">
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

  function updateSelectedAddress() {
    if (!addressDisplay) return;

    setShippingFormVisibility();
    setShippingMethodVisibility();
    const availability = updateShippingAvailability();
    const selected = document.querySelector('input[name="address"]:checked');

    if (!selected) return;

    if (selected.value === "ship") {
      if (availability.eligible === false) {
        addressDisplay.textContent = availability.message || "Not Currently Shipping to Selected Location";
        renderTotals();
        return;
      }

      const summary = buildShippingSummary();
      addressDisplay.textContent = summary || selected.dataset.addressLabel || "Select shipping address";
      renderTotals();
      return;
    }

    addressDisplay.textContent = selected.dataset.addressLabel || "";

    renderTotals();
  }

  function buildShippingSummary() {
    const summaryParts = [];
    const addressLine = addressLineInput?.value.trim();
    const postal = postalInput?.value.trim();
    const cityName = citySelect?.value ? citySelect.selectedOptions[0].textContent : "";
    const stateName = stateSelect?.value ? stateSelect.selectedOptions[0].textContent : "";
    const countryName = countrySelect?.value ? countrySelect.selectedOptions[0].textContent : "";

    if (addressLine) summaryParts.push(addressLine);

    const locality = [cityName, stateName].filter(Boolean).join(", ");
    const region = [postal, countryName].filter(Boolean).join(" ").trim();

    if (locality) summaryParts.push(locality);
    if (region) summaryParts.push(region);

    return summaryParts.join(" · ").trim();
  }

  function setShippingFormVisibility() {
    const selected = document.querySelector('input[name="address"]:checked');
    const isShipping = selected?.value === "ship";

    if (shippingForm) shippingForm.hidden = !isShipping;
    if (pickupForm) {
      pickupForm.hidden = isShipping;
      toggleRequiredFields(pickupForm, !isShipping);
    }

    toggleRequiredFields(shippingForm, isShipping);
  }

  function setShippingMethodVisibility() {
    const selected = document.querySelector('input[name="address"]:checked');
    const isShipping = selected?.value === "ship";

    if (shippingMethodPanel) shippingMethodPanel.hidden = !isShipping;
    shippingCost = isShipping ? shippingCostSelection : 0;
  }

  function updateShippingAvailability() {
    if (!shippingAvailability) return { eligible: true };

    shippingAvailability.textContent = "";
    shippingAvailability.innerHTML = "";
    shippingAvailability.classList.remove("shipping-availability--error");

    const selected = document.querySelector('input[name="address"]:checked');
    if (!selected || selected.value !== "ship") {
      lockBlockedInputs(false);
      return { eligible: true };
    }

    const countryId = Number(countrySelect?.value || 0);
    const countryName = countrySelect?.value ? countrySelect.selectedOptions[0].textContent.trim() : "";
    const stateName = stateSelect?.value ? stateSelect.selectedOptions[0].textContent.trim() : "";

    if (!countryId) {
      lockBlockedInputs(false);
      return { eligible: null };
    }

    if (countryId === 65) {
      const partnerMessage =
        'We have a partner in Egypt. Please reach out to <a href="https://www.axenegypt.com" target="_blank" rel="noopener" data-partner-inline>AxenEgypt.com</a> to arrange delivery locally.';
      shippingAvailability.innerHTML = partnerMessage;
      shippingAvailability.classList.add("shipping-availability--error");
      attachPartnerInlineLink();
      lockBlockedInputs(false);

      if (!partnerShown) {
        partnerShown = true;
        showPartnerModal();
      }

      return { eligible: false, message: "We have a partner in Egypt via AxenEgypt.com." };
    }

    const eligibleCountry = countryId === 233 || countryName.toLowerCase() === "united states";

    if (!eligibleCountry) {
      const message = "Not Currently Shipping to Selected Location";
      shippingAvailability.textContent = message;
      shippingAvailability.classList.add("shipping-availability--error");
      lockBlockedInputs(false);
      return { eligible: false, message };
    }

    if (!stateName) {
      lockBlockedInputs(false);
      return { eligible: null };
    }

    const eligible = stateName.toLowerCase() === "ohio";

    if (!eligible) {
      shippingAvailability.textContent = "Not Currently Shipping to Selected Location";
      shippingAvailability.classList.add("shipping-availability--error");
      lockBlockedInputs(false);
      return { eligible, message: "Not Currently Shipping to Selected Location" };
    }

    lockBlockedInputs(true);
    return { eligible, message: "" };
  }

  function lockBlockedInputs(allowEntries) {
    blockedInputs?.forEach((input) => {
      input.disabled = !allowEntries;
      if (!allowEntries) input.value = "";
    });
  }

  function handlePlaceOrder() {
    const selectedAddress = document.querySelector('input[name="address"]:checked');
    const shippingCheck = updateShippingAvailability();
    const shippingChosen = selectedAddress?.value === "ship";
    const countryName = countrySelect?.value ? countrySelect.selectedOptions[0].textContent.trim().toLowerCase() : "";
    const stateName = stateSelect?.value ? stateSelect.selectedOptions[0].textContent.trim().toLowerCase() : "";
    const cardIsGreen = cardNumberInput?.closest(".field")?.classList.contains("is-valid");
    const orderToOhio = shippingChosen && shippingCheck?.eligible === true && countryName.includes("united states") && stateName === "ohio";

    const accepted = Boolean(cardIsGreen && orderToOhio);
    const orderId = generateOrderId();

    displayStatusScreen({ accepted, orderId });
  }

  function displayStatusScreen({ accepted, orderId }) {
    if (!statusScreen || !statusCard || !statusTitle || !statusIdNode || !statusEyebrow || !statusNote) return;

    statusScreen.hidden = false;
    statusScreen.classList.remove("checkout-status--error", "checkout-status--glitch");
    statusIdNode.textContent = orderId;
    statusEyebrow.textContent = accepted ? "Order accepted" : "Payment interrupted";
    statusTitle.textContent = accepted ? "Order confirmation will be sent" : "Payment Declined";
    statusNote.textContent = accepted
      ? "USA · Ohio order verified. Confirmation will be emailed shortly."
      : "The transaction was declined before processing.";

    if (accepted) {
      setTimeout(() => triggerDecline(orderId), 2200);
      return;
    }

    statusScreen.classList.add("checkout-status--error", "checkout-status--glitch");
  }

  function triggerDecline(orderId) {
    if (!statusScreen || statusScreen.hidden) return;

    statusScreen.classList.add("checkout-status--error", "checkout-status--glitch");
    statusEyebrow.textContent = "Processing fault detected";
    statusTitle.textContent = "Payment Declined";
    statusNote.textContent = `Reference ${orderId} could not be captured due to a payment decline.`;
  }

  async function initAddressSelectors() {
    if (!countrySelect || !stateSelect || !citySelect) return;

    countries = await fetchJsonPayload("data/countries.json");
    states = await fetchJsonPayload("data/states.json");

    populateSelect(countrySelect, countries, "name", "id", "Select a country");
    countrySelect.disabled = false;

    populatePhoneCodes(pickupPhoneCode, pickupPhoneInput);
    populatePhoneCodes(shippingPhoneCode, shippingPhoneInput);

    countrySelect.addEventListener("change", handleCountryChange);
    stateSelect.addEventListener("change", handleStateChange);

    await handleCountryChange();
  }

  async function handleCountryChange() {
    if (!stateSelect || !citySelect) return;

    const countryId = Number(countrySelect.value);
    const allowRegions = countryId === 233 || countryId === 65;

    if (!countryId) {
      disableRegionSelectors();
      updateSelectedAddress();
      return;
    }

    if (!allowRegions) {
      disableRegionSelectors("Not available for this destination");
      updateSelectedAddress();
      return;
    }

    if (countryId === 65) {
      disableRegionSelectors("Handled by Axen Egypt partner");
      updateSelectedAddress();
      return;
    }

    const countryStates = states.filter((state) => state.country_id === countryId);

    populateSelect(stateSelect, countryStates, "name", "id", "Select a state");
    stateSelect.disabled = !countryId || !countryStates.length;
    await populateCitiesForState();
    updateSelectedAddress();
  }

  async function handleStateChange() {
    const stateId = Number(stateSelect.value);
    await populateCitiesForState(stateId);
    updateSelectedAddress();
  }

  async function populateCitiesForState(stateId) {
    if (!citySelect) return;

    if (!stateId) {
      populateSelect(citySelect, [], "name", "id", "Select a city");
      citySelect.disabled = true;
      return;
    }

    const cityList = await getCitiesForState(stateId);
    populateSelect(citySelect, cityList, "name", "id", "Select a city");
    citySelect.disabled = !cityList.length;
  }

  async function getCitiesForState(stateId) {
    if (citiesByState.has(stateId)) return citiesByState.get(stateId);

    const cityData = await loadCitiesData();
    const filtered = cityData.filter((city) => city.state_id === Number(stateId));
    citiesByState.set(stateId, filtered);

    return filtered;
  }

  async function loadCitiesData() {
    if (cities) return cities;

    cities = await fetchJsonPayload("data/cities.json.gz");
    return cities;
  }

  function populateSelect(node, list, labelKey, valueKey, placeholder) {
    if (!node) return;

    node.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = placeholder;
    node.appendChild(defaultOption);

    (list || []).forEach((item) => {
      const option = document.createElement("option");
      option.value = item[valueKey];
      option.textContent = item[labelKey];
      node.appendChild(option);
    });
  }

  function populatePhoneCodes(selectNode, inputNode) {
    if (!selectNode) return;

    selectNode.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Code";
    selectNode.appendChild(placeholder);

    const phoneCountries = (countries || [])
      .filter((country) => country.phonecode)
      .sort((a, b) => a.name.localeCompare(b.name));

    phoneCountries.forEach((country) => {
      const option = document.createElement("option");
      option.value = country.phonecode;
      option.textContent = `+${country.phonecode} (${country.name})`;
      selectNode.appendChild(option);
    });

    const defaultCountry = phoneCountries.find((country) => country.id === 233);
    if (defaultCountry) {
      selectNode.value = defaultCountry.phonecode;
    }

    updatePhonePlaceholder(selectNode.value, inputNode);

    selectNode.addEventListener("change", () => {
      updatePhonePlaceholder(selectNode.value, inputNode);
    });
  }

  function disableRegionSelectors(statePlaceholder = "Select a state") {
    if (stateSelect) {
      populateSelect(stateSelect, [], "name", "id", statePlaceholder);
      stateSelect.disabled = true;
    }

    if (citySelect) {
      populateSelect(citySelect, [], "name", "id", "Select a city");
      citySelect.disabled = true;
    }
  }

  function toggleRequiredFields(container, isRequired) {
    container?.querySelectorAll("input, select, textarea").forEach((field) => {
      field.required = Boolean(isRequired);
    });
  }

  function getSelectedShippingCost() {
    const checked = document.querySelector('input[name="shipping"]:checked');
    return checked ? Number(checked.dataset.shippingCost) : 0;
  }

  function updatePhonePlaceholder(code, inputNode) {
    const cleanCode = (code || "").replace(/^\+/, "");
    const prefix = cleanCode ? `+${cleanCode}` : "";
    if (inputNode) {
      inputNode.placeholder = prefix ? `${prefix} Enter phone number` : "Enter phone number";
    }
  }

  function attachPartnerInlineLink() {
    shippingAvailability
      ?.querySelectorAll("[data-partner-inline]")
      .forEach((anchor) =>
        anchor.addEventListener("click", (event) => {
          event.preventDefault();
          openPartnerSite();
        })
      );
  }

  function showPartnerModal() {
    if (!partnerModal) return;
    partnerModal.hidden = false;
  }

  function hidePartnerModal() {
    if (!partnerModal) return;
    partnerModal.hidden = true;
  }

  function openPartnerSite() {
    window.open("https://www.axenegypt.com", "_blank", "noopener");
  }

  function initPaymentValidation() {
    if (!cardNumberInput) return;

    cardNumberInput.addEventListener("input", handleCardNumberInput);
    cardExpInput?.addEventListener("input", handleExpiryInput);
    cardCvvInput?.addEventListener("input", () => validateCvv(currentCardBrand));
    cardNameInput?.addEventListener("input", validateCardName);

    handleCardNumberInput();
    validateExpiry();
    validateCvv(currentCardBrand);
    validateCardName();
  }

  function handleCardNumberInput() {
    const digits = (cardNumberInput?.value || "").replace(/\D/g, "");
    currentCardBrand = detectCardBrand(digits);
    const formatted = formatCardNumber(digits, currentCardBrand);
    if (cardNumberInput) cardNumberInput.value = formatted;
    if (cardBrandNode) cardBrandNode.textContent = formatBrandLabel(currentCardBrand);

    validateCardNumber(digits, currentCardBrand);
  }

  function validateCardName() {
    if (!cardNameInput) return;
    const value = cardNameInput.value.trim();
    const valid = value.length >= 2;
    setFieldState(cardNameInput, cardNameHint, valid, valid ? "" : "Enter the name on the card");
  }

  function handleExpiryInput() {
    if (!cardExpInput) return;
    const digits = cardExpInput.value.replace(/\D/g, "").slice(0, 4);
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)} / ${digits.slice(2)}`;
    }
    cardExpInput.value = formatted;
    validateExpiry();
  }

  function validateExpiry() {
    if (!cardExpInput) return;
    const [monthRaw, yearRaw] = cardExpInput.value.split("/").map((part) => part.replace(/\D/g, ""));
    const month = Number(monthRaw);
    const year = Number(yearRaw);

    if (!monthRaw || !yearRaw) {
      setFieldState(cardExpInput, cardExpHint, false, "Enter expiry as MM/YY");
      return;
    }

    if (month < 1 || month > 12) {
      setFieldState(cardExpInput, cardExpHint, false, "Use a valid month");
      return;
    }

    const fullYear = 2000 + year;
    const now = new Date();
    const expiry = new Date(fullYear, month, 0);
    const isValidDate = expiry > now;

    setFieldState(cardExpInput, cardExpHint, isValidDate, isValidDate ? "" : "Card is expired");
  }

  function validateCvv(brand) {
    if (!cardCvvInput) return;
    const digits = cardCvvInput.value.replace(/\D/g, "");
    const expectedLength = brand === "amex" ? 4 : 3;
    cardCvvInput.value = digits.slice(0, expectedLength);
    const valid = digits.length === expectedLength;
    setFieldState(cardCvvInput, cardCvvHint, valid, valid ? "" : `${expectedLength}-digit code`);
  }

  function validateCardNumber(digits, brand) {
    if (!digits) {
      setFieldState(cardNumberInput, cardNumberHint, null, "");
      return;
    }

    const length = digits.length;
    let valid = false;

    if (brand === "amex") {
      valid = length === 15;
    } else if (brand === "visa") {
      valid = length === 13 || length === 16;
    } else if (brand === "mastercard") {
      valid = length === 16;
    }

    if (!valid || !luhnCheck(digits)) {
      setFieldState(
        cardNumberInput,
        cardNumberHint,
        false,
        "Enter a valid Visa, Mastercard, or Amex number"
      );
      return;
    }

    setFieldState(cardNumberInput, cardNumberHint, true, `${formatBrandLabel(brand)} recognized`);
  }

  function detectCardBrand(digits = "") {
    if (/^4/.test(digits)) return "visa";
    if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
    if (/^3[47]/.test(digits)) return "amex";
    return "unknown";
  }

  function formatBrandLabel(brand) {
    if (brand === "visa") return "VISA";
    if (brand === "mastercard") return "MC";
    if (brand === "amex") return "AMEX";
    return "••••";
  }

  function formatCardNumber(digits, brand) {
    if (brand === "amex") {
      return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
        .filter(Boolean)
        .join(" ");
    }

    return digits
      .replace(/[^0-9]/g, "")
      .match(/.{1,4}/g)
      ?.join(" ")
      .trim() || "";
  }

  function setFieldState(input, hintNode, isValid, message = "") {
    const field = input?.closest(".field");
    field?.classList.remove("is-valid", "is-invalid");
    if (typeof isValid === "boolean") {
      field?.classList.add(isValid ? "is-valid" : "is-invalid");
    }
    if (hintNode) hintNode.textContent = message;
  }

  function luhnCheck(numberString) {
    if (!numberString) return false;
    const digits = numberString
      .split("")
      .reverse()
      .map((digit) => parseInt(digit, 10));

    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let digit = digits[i];
      if (i % 2 !== 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }

    return sum % 10 === 0;
  }

  function generateOrderId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return `ax-${Date.now().toString(16)}-${Math.floor(Math.random() * 1_000_000).toString(16)}`;
  }
});

async function fetchJsonPayload(url) {
  const response = await fetch(url);
  const jsonClone = response.clone();

  try {
    return await jsonClone.json();
  } catch (err) {
    try {
      const buffer = await response.arrayBuffer();
      const processedBuffer = await inflateIfNeeded(buffer);
      const text = new TextDecoder().decode(processedBuffer);
      return JSON.parse(text);
    } catch (parseErr) {
      console.error(`Failed to parse ${url}`, parseErr);
      return [];
    }
  }

  return [];
}

async function inflateIfNeeded(buffer) {
  if (typeof DecompressionStream !== "undefined") {
    try {
      const stream = new DecompressionStream("gzip");
      const decompressed = await new Response(new Blob([buffer]).stream().pipeThrough(stream)).arrayBuffer();
      return decompressed;
    } catch (err) {
      console.warn("Falling back to raw payload", err);
    }
  }

  return buffer;
}
