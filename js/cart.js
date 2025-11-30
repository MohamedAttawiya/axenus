import { getOrCreateSessionId } from "./session.js";

const key = () => `cart:${getOrCreateSessionId()}`;

export const Cart = {
  read() { try { return JSON.parse(localStorage.getItem(key())) || { items: [] }; } catch { return { items: [] }; } },
  write(c) { localStorage.setItem(key(), JSON.stringify(c)); },
  add(it) {
    const c = this.read();
    const i = c.items.findIndex(x => x.id === it.id);
    if (i >= 0) c.items[i].qty += it.qty || 1;
    else c.items.push({ ...it, qty: it.qty || 1 });
    this.write(c);
  },
  setQty(id, qty) {
    const c = this.read();
    const i = c.items.findIndex(x => x.id === id);
    if (i >= 0) { if (qty <= 0) c.items.splice(i,1); else c.items[i].qty = qty; this.write(c); }
  },
  clear() { this.write({ items: [] }); },
  totals() {
    const s = this.read().items.reduce((t, it) => t + it.price * it.qty, 0);
    return { subtotal: s, discount: 0, shipping: 0, total: s };
  }
};
