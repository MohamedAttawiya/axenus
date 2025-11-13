// include.js - Inject shared header and footer
async function loadHTML(id, file) {
  const el = document.getElementById(id);
  if (el) {
    try {
      const resp = await fetch(file);
      if (resp.ok) {
        el.innerHTML = await resp.text();
      } else {
        console.error("Error loading", file);
      }
    } catch (err) {
      console.error("Fetch failed:", err);
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadHTML("header", "partials/header.html");
  loadHTML("footer", "partials/footer.html");
});
