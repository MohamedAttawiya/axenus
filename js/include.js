// include.js - Inject shared header and footer
async function loadHTML(id, file) {
  const el = document.getElementById(id);
  if (!el) return false;

  try {
    const resp = await fetch(file);
    if (resp.ok) {
      el.innerHTML = await resp.text();
      return true;
    }

    console.error("Error loading", file);
    return false;
  } catch (err) {
    console.error("Fetch failed:", err);
    return false;
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const [headerLoaded, footerLoaded] = await Promise.all([
    loadHTML("header", "partials/header.html"),
    loadHTML("footer", "partials/footer.html")
  ]);

  if (headerLoaded) {
    if (!document.querySelector("script[data-cart-app]")) {
      const cartScript = document.createElement("script");
      cartScript.src = "js/app.js";
      cartScript.defer = true;
      cartScript.setAttribute("data-cart-app", "true");
      document.body.appendChild(cartScript);
    }

    document.dispatchEvent(new Event("header:loaded"));
  }

  if (footerLoaded) {
    document.dispatchEvent(new Event("footer:loaded"));
  }
});
