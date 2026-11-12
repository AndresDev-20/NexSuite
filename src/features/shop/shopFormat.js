import { formatCurrency } from "../../utils/money";

/* Textos de la tienda en línea, NexStore (Fase 24): disponibilidad, colores de categoría y el mensaje de WhatsApp. */

/** El nombre de la tienda en línea (decisión del 2026-11-12). */
export const STORE_NAME = "NexStore";

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

/**
 * El pedido ya escrito para WhatsApp:
 *   Hola, quiero pedir:
 *   • 2 × Cargador 20W — $ 50.000
 *   Total: $ 50.000
 *   Nombre: Don Jaime
 */
export const orderMessage = (items, customerName = "") => {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return [
    "Hola, quiero pedir:",
    ...items.map((item) => `• ${item.quantity} × ${item.name} — ${money(item.price * item.quantity)}`),
    `Total: ${money(total)}`,
    customerName.trim() && `Nombre: ${customerName.trim()}`,
    `(Pedido desde ${STORE_NAME})`,
  ]
    .filter(Boolean)
    .join("\n");
};

/** Enlace que abre el chat de WhatsApp con el mensaje escrito. number: solo dígitos con indicativo. */
export const whatsappLink = (number, text) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
