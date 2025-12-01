(function() {
  let cartContainer,
    cartContent,
    toggleCartBtn,
    clearCartBtn,
    checkoutBtn,
    totalPriceContainer,
    headerCart,
    cartEmpty,
    cartCount,
    cartCountInline,
    toastContainer;
  let initialized = false;
  let cartObserver;

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
    headerCart = document.querySelector(".header__cart");
    cartEmpty = document.querySelector("#cart-empty");
    cartCount = document.querySelector("#cart-count");
    cartCountInline = document.querySelector("#cart-count-inline");
  }

  function toggleCart() {
    if (!cartContainer) return;

    const isOpen = cartContainer.classList.toggle("open");

    if (toggleCartBtn) {
      toggleCartBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
  }

  function closeCart() {
    if (!cartContainer) return;
    cartContainer.classList.remove("open");
    if (toggleCartBtn) {
      toggleCartBtn.setAttribute("aria-expanded", "false");
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
    totalPriceContainer.textContent = `${currency(total)}`;
    updateCartCounts(lsContent);
  }

  function updateCartCounts(lsContent = getLSContent()) {
    const count = lsContent.reduce((sum, item) => sum + (item.qty || 1), 0);
    if (cartCount) {
      cartCount.textContent = count;
    }
    if (cartCountInline) {
      cartCountInline.textContent = `${count || 0} ${count === 1 ? "item" : "items"}`;
    }
  }

  function displayProducts() {
    if (!cartContent) return;

    const lsContent = getLSContent();
    let productMarkup = "";

    if (lsContent.length) {
      for (let product of lsContent) {
        const qty = product.qty || 1;
        const lineTotal = currency(product.price * qty);
        productMarkup += `
          <article class="cart-item" data-id="${product.id}" role="listitem">
            <img class="cart-image" src="${product.image}" alt="${product.name}">
            <div>
              <p class="cart-item-title">${product.name}</p>
              <div class="cart-item-meta">
                <span class="price">${lineTotal}</span>
                <span class="qty" aria-label="Quantity ${qty}">Qty ${qty}</span>
              </div>
            </div>
            <button type="button" data-id="${product.id}" class="remove" aria-label="Remove ${product.name}">×</button>
          </article>
        `;
      }
    }

    cartContent.innerHTML = productMarkup;
    toggleEmptyState(lsContent.length === 0);
  }

  function toggleEmptyState(isEmpty) {
    if (cartContent) {
      cartContent.style.display = isEmpty ? "none" : "flex";
    }
    if (cartEmpty) {
      cartEmpty.style.display = isEmpty ? "block" : "none";
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
    showToast(`${prodName} added to cart`, "success");
    openCart();
  }

  function removeProduct(productId) {
    const lsContent = getLSContent();
    const updated = lsContent.filter((product) => product.id !== productId);
    setLSContent(updated);
    displayProducts();
    displayCartTotal();
    showToast("Removed from cart", "removed");
  }

  function clearCart() {
    setLSContent([]);
    displayProducts();
    displayCartTotal();
    showToast("Cart cleared", "info");
  }

  function checkout() {
    const lsContent = getLSContent();
    if (!lsContent.length) {
      alert("Your cart is empty.");
      return;
    }

    window.location.href = "checkout.html";
  }

  function ensureToastContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = document.createElement("div");
    toastContainer.className = "cart-toast-container";
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  function showToast(message, tone = "success") {
    const container = ensureToastContainer();
    const toast = document.createElement("div");
    toast.className = `cart-toast ${tone}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("fade-out");
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    }, 1800);
  }

  function openCart() {
    if (!cartContainer) return;
    cartContainer.classList.add("open");
    if (toggleCartBtn) {
      toggleCartBtn.setAttribute("aria-expanded", "true");
    }
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

    if (headerCart) {
      headerCart.addEventListener("click", function(e) {
        e.stopPropagation();
      });
    }

    document.addEventListener("click", function(e) {
      if (!headerCart || headerCart.contains(e.target)) return;
      closeCart();
    });

    document.addEventListener("click", function(e) {
      const btn = e.target.closest(".add-to-cart");
      if (btn) {
        e.preventDefault();
        saveProduct(btn);
      }
    });

    cartContent.addEventListener("click", function(e) {
      const clickedBtn = e.target.closest(".remove");
      if (clickedBtn) {
        e.preventDefault();
        const productId = clickedBtn.getAttribute("data-id");
        removeProduct(productId);
      }
    });

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

    if (cartContent) {
      displayProducts();
      displayCartTotal();
      bindEvents();
      if (cartObserver) {
        cartObserver.disconnect();
        cartObserver = null;
      }
      return;
    }

    if (!cartObserver) {
      cartObserver = new MutationObserver(() => {
        hydrateElements();
        if (cartContent) {
          displayProducts();
          displayCartTotal();
          bindEvents();
          cartObserver.disconnect();
          cartObserver = null;
        }
      });

      cartObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("header:loaded", init);

  if (document.readyState !== "loading") {
    init();
  }
})();
