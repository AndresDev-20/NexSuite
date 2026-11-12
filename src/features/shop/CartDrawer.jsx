import { useEffect, useRef, useState } from "react";
import Icon from "../../components/ui/Icon/Icon";
import { useCart } from "./cartContext";
import { ChatIcon, QuantityStepper } from "./ShopParts";
import { money, orderMessage, whatsappLink } from "./shopFormat";

/**
 * Carrito de la tienda (Fase 24): un panel que sale por la derecha. Cambiar cantidades, quitar,
 * el nombre del cliente (opcional) y «Pedir por WhatsApp» con todo ya escrito. A diferencia de los
 * formularios del sistema, aquí sí se cierra al tocar afuera o con Escape (es una tienda).
 */
const CartDrawer = ({ shop }) => {
  const { items, total, count, setQuantity, remove, clear, open, setOpen } = useCart();
  const [name, setName] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const whatsapp = shop?.whatsapp;
  const link = whatsapp && items.length > 0 ? whatsappLink(whatsapp, orderMessage(items, name)) : null;

  return (
    <dialog
      ref={ref}
      className="shop-drawer"
      aria-labelledby="shop-drawer-title"
      onClose={() => setOpen(false)}
      onClick={(event) => event.target === ref.current && setOpen(false)}
    >
      <div className="shop-drawer__panel">
        <header className="shop-drawer__head">
          <h2 className="shop-drawer__title" id="shop-drawer-title">
            Tu pedido {count > 0 && <span className="shop-drawer__count">({count})</span>}
          </h2>
          <button type="button" className="shop-icon-button" aria-label="Cerrar el carrito" onClick={() => setOpen(false)}>
            <Icon name="x" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="shop-drawer__empty">
            <Icon name="cart" className="shop-drawer__empty-icon" />
            <p>Tu carrito está vacío.</p>
            <button type="button" className="shop-button shop-button--soft" onClick={() => setOpen(false)}>
              Ver productos
            </button>
          </div>
        ) : (
          <>
            <ul className="shop-drawer__list">
              {items.map((item) => (
                <li key={item.id} className="shop-drawer__item">
                  <div className="shop-drawer__item-text">
                    <span className="shop-drawer__item-name">{item.name}</span>
                    <span className="shop-drawer__item-price">{money(item.price)} c/u</span>
                  </div>
                  <QuantityStepper label={`Cantidad de ${item.name}`} value={item.quantity} onChange={(value) => setQuantity(item.id, value)} />
                  <strong className="shop-drawer__item-total">{money(item.price * item.quantity)}</strong>
                  <button type="button" className="shop-icon-button shop-icon-button--danger" aria-label={`Quitar ${item.name}`} onClick={() => remove(item.id)}>
                    <Icon name="trash" />
                  </button>
                </li>
              ))}
            </ul>

            <footer className="shop-drawer__foot">
              <div className="shop-drawer__total">
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>
              <label className="shop-field">
                <span className="shop-field__label">Tu nombre (opcional)</span>
                <input className="shop-field__input" value={name} maxLength={60} autoComplete="name" placeholder="Ej: Juan Pérez" onChange={(event) => setName(event.target.value)} />
              </label>
              {link ? (
                <a className="shop-button shop-button--whatsapp shop-button--block" href={link} target="_blank" rel="noopener noreferrer">
                  <ChatIcon />
                  Pedir por WhatsApp
                </a>
              ) : (
                <p className="shop-drawer__note">
                  Por ahora no recibimos pedidos por WhatsApp.{shop?.phone ? ` Llámanos al ${shop.phone}.` : ""}
                </p>
              )}
              <p className="shop-drawer__hint">Se abre WhatsApp con tu pedido escrito; solo tienes que enviarlo. Te confirmamos disponibilidad y entrega.</p>
              <button type="button" className="shop-link-button" onClick={clear}>
                Vaciar carrito
              </button>
            </footer>
          </>
        )}
      </div>
    </dialog>
  );
};

export default CartDrawer;
