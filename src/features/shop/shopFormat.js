import { formatCurrency } from "../../utils/money";

/* Textos de la tienda en línea, NexStore (Fase 24): disponibilidad, colores de categoría y el mensaje de WhatsApp. */

/** El nombre de la tienda en línea (decisión del 2026-11-12). */
export const STORE_NAME = "NexStore";

/** Nombre de la tienda: el de la empresa (Fase 29) o NexStore si no lo ha escrito. */
export const storeNameOf = (shop) => shop?.name || STORE_NAME;

export const MAX_QUANTITY = 99;

export const AVAILABILITY = {
  available: { label: "Disponible", tone: "ok" },
  few: { label: "Últimas unidades", tone: "warn" },
  out: { label: "Agotado", tone: "out" },
};

// Sin fotos por ahora: cada categoría tiene su color, siempre el mismo
const TONES = ["red", "ink", "blue", "rose", "amber", "violet"];
export const toneOf = (category) => TONES[(Number(category?.id) || 0) % TONES.length];

/** La inicial grande de la tarjeta: la del producto. */
export const initialOf = (name) => String(name ?? "").trim().charAt(0).toUpperCase() || "•";

export const money = (value) => formatCurrency(Math.round(Number(value) || 0));

/* ---------- Ofertas (Fase 31) ---------- */
// Etiqueta de cada oferta: { id, type (regalo | precio | segundo | combo), label, price? }
export const OFFER_ICONS = { regalo: "🎁", precio: "🔥", segundo: "✌️", combo: "🧩", rifa: "🎟️" };

/** El precio especial de un producto (el más bajo) o null. */
export const offerPriceOf = (product) => {
  const prices = (product?.offers ?? []).filter((offer) => offer.type === "precio" && offer.price > 0).map((offer) => offer.price);
  return prices.length > 0 ? Math.min(...prices) : null;
};

/** El precio que se paga: el de oferta si tiene. */
export const priceOf = (product) => offerPriceOf(product) ?? product.price;

/** Las ofertas que no son de precio (regalo, 2x1, combo), en texto para el pedido de WhatsApp. */
export const offerNoteOf = (product) =>
  (product?.offers ?? [])
    .filter((offer) => offer.type !== "precio")
    .map((offer) => offer.label)
    .join(" · ");

/**
 * El pedido ya escrito para WhatsApp:
 *   Hola, quiero pedir:
 *   • 2 × Cargador 20W — $ 50.000
 *   Total: $ 50.000
 *   Nombre: Don Jaime
 */
export const orderMessage = (items, customerName = "", storeName = STORE_NAME) => {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return [
    "Hola, quiero pedir:",
    ...items.map((item) => `• ${item.quantity} × ${item.name} — ${money(item.price * item.quantity)}${item.note ? ` (oferta: ${item.note})` : ""}`),
    `Total: ${money(total)}`,
    customerName.trim() && `Nombre: ${customerName.trim()}`,
    `(Pedido desde ${storeName})`,
  ]
    .filter(Boolean)
    .join("\n");
};

/** Enlace que abre el chat de WhatsApp con el mensaje escrito. number: solo dígitos con indicativo. */
export const whatsappLink = (number, text) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
