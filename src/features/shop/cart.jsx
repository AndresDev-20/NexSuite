import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CartContext from "./cartContext";
import { MAX_QUANTITY } from "./shopFormat";

/*
 * Carrito de la tienda en línea (Fase 24). Se guarda en el navegador del cliente (si cierra y
 * vuelve, sigue ahí); si el navegador no deja guardar, funciona igual mientras la página esté abierta.
 * Cada producto: { id, name, price, quantity }. notice: el último que se agregó (para el aviso
 * «Agregado al carrito» y el salto del carrito), se borra solo a los pocos segundos.
 */
const STORAGE_KEY = "nexsuite.shop.cart";
const NOTICE_MS = 3200;

const readCart = () => {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((item) => item && Number.isInteger(item.id) && item.quantity > 0) : [];
  } catch {
    return [];
  }
};

const clamp = (quantity) => Math.min(Math.max(Math.round(Number(quantity) || 0), 0), MAX_QUANTITY);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(readCart);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(null); // { id, name, quantity, key }
  const timer = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Sin almacenamiento (modo privado): el carrito vive mientras la página esté abierta
    }
  }, [items]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const dismissNotice = useCallback(() => {
    clearTimeout(timer.current);
    setNotice(null);
  }, []);

  /** Suma unidades de un producto (con su precio y nombre de ahora) y avisa. */
  const add = useCallback((product, quantity = 1) => {
    setItems((current) => {
      const found = current.find((item) => item.id === product.id);
      if (found) return current.map((item) => (item.id === product.id ? { ...item, name: product.name, price: product.price, quantity: clamp(item.quantity + quantity) } : item));
      return [...current, { id: product.id, name: product.name, price: product.price, quantity: clamp(quantity) }];
    });
    clearTimeout(timer.current);
    setNotice({ id: product.id, name: product.name, quantity, key: Date.now() });
    timer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);
  /** Cambia la cantidad; en 0 lo quita. */
  const setQuantity = useCallback((id, quantity) => {
    const next = clamp(quantity);
    setItems((current) => (next === 0 ? current.filter((item) => item.id !== id) : current.map((item) => (item.id === id ? { ...item, quantity: next } : item))));
  }, []);
  const remove = useCallback((id) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      quantityOf: (id) => items.find((item) => item.id === id)?.quantity ?? 0,
      add,
      setQuantity,
      remove,
      clear,
      open,
      setOpen,
      notice,
      dismissNotice,
    }),
    [items, add, setQuantity, remove, clear, open, notice, dismissNotice]
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
