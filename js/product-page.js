import { Cart } from "./cart.js";

const readBtn = b => ({ id:b.dataset.id, name:b.dataset.name, price:parseFloat(b.dataset.price), image:b.dataset.image });

document.querySelectorAll(".add-to-cart").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    Cart.add({ ...readBtn(btn), qty: 1 });
    // optional: show toast / mini-cart count
  });
});

document.querySelectorAll(".buy-now").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const sid = document.cookie.match(/(?:^|; )ax_sess=([^;]*)/)?.[1] || "";
    sessionStorage.setItem(`checkout:${sid}`, JSON.stringify({ mode:"buy-now", items:[{...readBtn(btn), qty:1}], ts:Date.now() }));
    window.location.href = "/checkout.html?mode=buy-now";
  });
});
