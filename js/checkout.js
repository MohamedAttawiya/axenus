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
  const shippingForm = document.querySelector("[data-shipping-form]");
  const shippingAvailability = document.querySelector("[data-shipping-availability]");
  const countrySelect = document.querySelector("[data-country]");
  const stateSelect = document.querySelector("[data-state]");
  const citySelect = document.querySelector("[data-city]");
  const addressLineInput = document.querySelector("[data-address-line]");
  const postalInput = document.querySelector("[data-postal]");
  const phoneInput = document.querySelector("[data-phone]");
  const phoneCode = document.querySelector("[data-phone-code]");
  const partnerModal = document.querySelector("[data-partner-modal]");
  const partnerLink = document.querySelector("[data-partner-link]");
  const partnerClosers = document.querySelectorAll("[data-partner-close]");

  let shippingCost = getSelectedShippingCost();
  let partnerShown = false;

  initAddressSelectors().catch((err) => console.error("Address data failed to load", err));

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
      shippingCost = getSelectedShippingCost();
      renderTotals();
    });
  });

  document.querySelectorAll('input[name="address"]').forEach((input) => {
    input.addEventListener("change", updateSelectedAddress);
  });

  [countrySelect, stateSelect, citySelect, addressLineInput, postalInput, phoneInput]
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

  function updateSelectedAddress() {
    if (!addressDisplay) return;

    setShippingFormVisibility();
    const availability = updateShippingAvailability();
    const selected = document.querySelector('input[name="address"]:checked');

    if (!selected) return;

    if (selected.value === "ship") {
      if (availability.eligible === false) {
        addressDisplay.textContent = availability.message || "Not Currently Shipping to Selected Location";
        return;
      }

      const summary = buildShippingSummary();
      addressDisplay.textContent = summary || selected.dataset.addressLabel || "Select shipping address";
      return;
    }

    addressDisplay.textContent = selected.dataset.addressLabel || "";
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
    if (!shippingForm) return;

    const selected = document.querySelector('input[name="address"]:checked');
    const isShipping = selected?.value === "ship";

    shippingForm.hidden = !isShipping;
  }

  function updateShippingAvailability() {
    if (!shippingAvailability) return { eligible: true };

    shippingAvailability.textContent = "";
    shippingAvailability.innerHTML = "";
    shippingAvailability.classList.remove("shipping-availability--error");

    const selected = document.querySelector('input[name="address"]:checked');
    if (!selected || selected.value !== "ship") {
      return { eligible: true };
    }

    const countryId = Number(countrySelect?.value || 0);
    const cityName = citySelect?.value ? citySelect.selectedOptions[0].textContent.trim() : "";
    const stateName = stateSelect?.value ? stateSelect.selectedOptions[0].textContent.trim() : "";

    if (!stateName) return { eligible: null };

    const egyptianCairo =
      countryId === 65 &&
      (stateName.toLowerCase() === "cairo" || cityName.toLowerCase().includes("cairo"));

    if (egyptianCairo) {
      const partnerMessage =
        'We have a partner in Egypt. Please reach out to <a href="https://www.axenegypt.com" target="_blank" rel="noopener" data-partner-inline>AxenEgypt.com</a> to arrange delivery in Cairo.';
      shippingAvailability.innerHTML = partnerMessage;
      shippingAvailability.classList.add("shipping-availability--error");
      attachPartnerInlineLink();

      if (!partnerShown) {
        partnerShown = true;
        showPartnerModal();
      }

      return { eligible: false, message: "We have a partner in Egypt via AxenEgypt.com." };
    }

    const eligible = stateName.toLowerCase() === "ohio";

    if (!eligible) {
      shippingAvailability.textContent = "Not Currently Shipping to Selected Location";
      shippingAvailability.classList.add("shipping-availability--error");
    }

    return { eligible, message: eligible ? "" : "Not Currently Shipping to Selected Location" };
  }

  async function initAddressSelectors() {
    if (!countrySelect || !stateSelect || !citySelect) return;

    countries = await fetchJsonPayload("data/countries.json");
    states = await fetchJsonPayload("data/states.json");

    populateSelect(countrySelect, countries, "name", "id", "Select a country");
    countrySelect.disabled = false;

    countrySelect.addEventListener("change", handleCountryChange);
    stateSelect.addEventListener("change", handleStateChange);

    await handleCountryChange();
  }

  async function handleCountryChange() {
    if (!stateSelect || !citySelect) return;

    const countryId = Number(countrySelect.value);
    const selectedCountry = countries.find((country) => country.id === countryId);
    const countryStates = states.filter((state) => state.country_id === countryId);

    populateSelect(stateSelect, countryStates, "name", "id", "Select a state");
    stateSelect.disabled = !countryId || !countryStates.length;
    updatePhonePrefix(selectedCountry);

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

  function getSelectedShippingCost() {
    const checked = document.querySelector('input[name="shipping"]:checked');
    return checked ? Number(checked.dataset.shippingCost) : 0;
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

  function updatePhonePrefix(country) {
    const code = country?.phonecode ? `+${country.phonecode}` : "+--";
    if (phoneCode) phoneCode.textContent = code;
    if (phoneInput) phoneInput.placeholder = `${code} Enter phone number`;
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
