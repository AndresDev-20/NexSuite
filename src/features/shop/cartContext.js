import { createContext, useContext } from "react";

/** Carrito de la tienda (Fase 24): el estado vive en <CartProvider> (cart.jsx). */
const CartContext = createContext(null);

/** const { items, count, total, quantityOf, add, setQuantity, remove, clear, open, setOpen } = useCart(); */
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return context;
};

export default CartContext;
