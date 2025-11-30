const STORAGE_KEY = "products";

const normalizePrice = (value) => {
  const num = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(num) ? num : 0;
};

const normalizeItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => ({
      ...item,
      price: normalizePrice(item.price),
      qty: Number(item.qty) || 1
    }))
    .filter((item) => !!item.id);

export const Cart = {
  read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const items = normalizeItems(Array.isArray(parsed) ? parsed : parsed?.items);
      return { items };
    } catch {
      return { items: [] };
    }
  },
  write(cart) {
    const items = normalizeItems(cart?.items || cart);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  },
  add(item) {
    const items = this.read().items;
    const idx = items.findIndex((x) => x.id === item.id);
    const price = normalizePrice(item.price);
    const qty = Number(item.qty) || 1;

    if (idx >= 0) {
      items[idx].qty += qty;
      items[idx].price = price || items[idx].price;
    } else {
      items.push({ ...item, price, qty });
    }

    this.write({ items });
  },
  setQty(id, qty) {
    const items = this.read().items;
    const idx = items.findIndex((x) => x.id === id);

    if (idx >= 0) {
      if (qty <= 0) {
        items.splice(idx, 1);
      } else {
        items[idx].qty = qty;
      }

      this.write({ items });
    }
  },
  clear() {
    this.write({ items: [] });
  },
  totals() {
    const subtotal = this.read().items.reduce((total, item) => total + item.price * item.qty, 0);
    return { subtotal, discount: 0, shipping: 0, total: subtotal };
  }
};
