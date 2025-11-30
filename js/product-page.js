import { getOrCreateSessionId } from "./session.js";

const readBtn = b => ({ id:b.dataset.id, name:b.dataset.name, price:parseFloat(b.dataset.price), image:b.dataset.image });

document.querySelectorAll(".buy-now").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const sid = getOrCreateSessionId();
    sessionStorage.setItem(`checkout:${sid}`, JSON.stringify({ mode:"buy-now", items:[{...readBtn(btn), qty:1}], ts:Date.now() }));
    window.location.href = "/checkout.html?mode=buy-now";
  });
});
