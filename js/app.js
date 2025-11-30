(function() {
  let cartContainer,
    cartContent,
    toggleCartBtn,
    clearCartBtn,
    checkoutBtn,
    totalPriceContainer;
  let initialized = false;

  const currency = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? `$${num.toFixed(2)}` : "$0.00";
  };

  const parsePrice = (value) => {
    const num = Number(String(value).replace(/[^\d.]/g, ""));
    return Number.isFinite(num) ? num : 0;
  };

  function hydrateElements() {
    cartContainer = document.querySelector("#shopping-cart");
    cartContent = document.querySelector("#cart-content");
    toggleCartBtn = document.querySelector("#toggle-cart-btn");
    clearCartBtn = document.querySelector("#clear-cart");
    checkoutBtn = document.querySelector("#checkout-btn");
    totalPriceContainer = document.querySelector("#total-price");
  }

  function toggleCart() {
    if (!cartContainer) return;

    const isOpen = cartContainer.classList.toggle("open");

    if (toggleCartBtn) {
      toggleCartBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
  }

  function getLSContent() {
    const lsContent = JSON.parse(localStorage.getItem("products")) || [];
    return Array.isArray(lsContent)
      ? lsContent.map((item) => ({
          ...item,
          price: parsePrice(item.price),
          qty: Number(item.qty) || 1
        }))
      : [];
  }

  function setLSContent(lsContent) {
    localStorage.setItem("products", JSON.stringify(lsContent));
  }

  function displayCartTotal() {
    if (!totalPriceContainer) return;
    const lsContent = getLSContent();
    const total = lsContent.reduce((sum, item) => sum + item.price * item.qty, 0);
    totalPriceContainer.innerHTML = `<span class="total">Total: ${currency(total)}</span>`;
  }

  function displayProducts() {
    if (!cartContent) return;

    const lsContent = getLSContent();
    let productMarkup = "";

    if (lsContent.length) {
      for (let product of lsContent) {
        const qty = product.qty || 1;
        productMarkup += `
          <tr>
            <td><img class="cart-image" src="${product.image}" alt="${product.name}" width="120"></td>
            <td>
              ${product.name}
              ${qty > 1 ? `<div class="cart-qty">Qty ${qty}</div>` : ""}
            </td>
            <td>${currency(product.price * qty)}</td>
            <td><a href="#" data-id="${product.id}" class="remove" aria-label="Remove ${product.name}">X</a></td>
          </tr>
        `;
      }
    } else {
      productMarkup = '<tr><td colspan="4">Your cart is empty.</td></tr>';
    }

    const body = cartContent.querySelector("tbody");
    if (body) {
      body.innerHTML = productMarkup;
    }
  }

  function saveProduct(clickedBtn) {
    const productId = clickedBtn.getAttribute("data-id");
    const prodImage = clickedBtn.getAttribute("data-image") || clickedBtn.closest("article, section, main")?.querySelector("img")?.src || "";
    const prodName = clickedBtn.getAttribute("data-name") || clickedBtn.dataset.title || clickedBtn.textContent.trim();
    const prodPrice = parsePrice(clickedBtn.getAttribute("data-price"));

    const lsContent = getLSContent();
    const existing = lsContent.find((product) => product.id === productId);

    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
    } else {
      lsContent.push({
        id: productId,
        image: prodImage,
        name: prodName,
        price: prodPrice,
        qty: 1
      });
    }

    setLSContent(lsContent);
    displayProducts();
    displayCartTotal();
  }

  function removeProduct(productId) {
    const lsContent = getLSContent();
    const updated = lsContent.filter((product) => product.id !== productId);
    setLSContent(updated);
    displayProducts();
    displayCartTotal();
  }

  function clearCart() {
    setLSContent([]);
    displayProducts();
    displayCartTotal();
  }

  function checkout() {
    const lsContent = getLSContent();
    if (!lsContent.length) {
      alert("Your cart is empty.");
      return;
    }

    window.location.href = "checkout.html";
  }

  function bindEvents() {
    if (initialized) return;
    if (!cartContent) return;

    initialized = true;

    if (toggleCartBtn) {
      toggleCartBtn.addEventListener("click", function(e) {
        e.preventDefault();
        toggleCart();
      });
    }

    document.addEventListener("click", function(e) {
      const btn = e.target.closest(".add-to-cart");
      if (btn) {
        e.preventDefault();
        saveProduct(btn);
      }
    });

    const cartBody = cartContent.querySelector("tbody");
    if (cartBody) {
      cartBody.addEventListener("click", function(e) {
        const clickedBtn = e.target;
        if (clickedBtn.classList.contains("remove")) {
          e.preventDefault();
          const productId = clickedBtn.getAttribute("data-id");
          removeProduct(productId);
        }
      });
    }

    if (clearCartBtn) {
      clearCartBtn.addEventListener("click", function(e) {
        e.preventDefault();
        clearCart();
      });
    }

    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", function(e) {
        e.preventDefault();
        checkout();
      });
    }

    window.addEventListener("storage", function(event) {
      if (event.key === "products") {
        displayProducts();
        displayCartTotal();
      }
    });
  }

  function init() {
    hydrateElements();
    if (!cartContent) return;
    displayProducts();
    displayCartTotal();
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("header:loaded", init);
})();
