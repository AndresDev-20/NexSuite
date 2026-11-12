import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/ui/Icon/Icon";
import { useCart } from "./cartContext";
import { AVAILABILITY, MAX_QUANTITY, initialOf, money, toneOf } from "./shopFormat";

/* Piezas de la tienda en línea (Fase 24): íconos, disponibilidad, cantidad, tarjeta y filas de productos. */

/** Globo de chat (botones de WhatsApp). */
export const ChatIcon = ({ className = "" }) => (
  <svg className={`shop-chat-icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z" />
    <path d="M9 9.2c.2 2.3 2.4 4.6 4.8 5 .6.1 1.2-.3 1.4-.9l.2-.6-1.6-.8-.6.7c-.8-.3-1.6-1.1-1.9-1.9l.7-.6-.8-1.6-.6.2c-.6.2-1 .8-.9 1.4z" />
  </svg>
);

/** Flecha (la del ícono «chevron», girada según la dirección). */
export const Arrow = ({ direction = "right" }) => <Icon name="chevron" className={`shop-arrow shop-arrow--${direction}`} />;

/** «Disponible», «Últimas unidades» o «Agotado». */
export const Availability = ({ value }) => {
  const item = AVAILABILITY[value] ?? AVAILABILITY.out;
  return <span className={`shop-availability shop-availability--${item.tone}`}>{item.label}</span>;
};

/** Cuadro de color con la inicial (en lugar de la foto, por ahora) y las etiquetas de arriba. */
export const ProductTile = ({ product, large = false, badges = true }) => (
  <div className={`shop-tile shop-tile--${toneOf(product.category)} ${large ? "shop-tile--large" : ""}`.trim()} aria-hidden="true">
    <span className="shop-tile__pattern" />
    <span className="shop-tile__initial">{initialOf(product.name)}</span>
    {badges && product.category && <span className="shop-tile__category">{product.category.name}</span>}
    {badges && product.availability === "few" && <span className="shop-tile__badge shop-tile__badge--few">Últimas unidades</span>}
    {badges && product.availability === "out" && <span className="shop-tile__badge shop-tile__badge--out">Agotado</span>}
  </div>
);

/** − cantidad + (de 1 a 99). */
export const QuantityStepper = ({ value, onChange, label, min = 1 }) => (
  <div className="shop-stepper" role="group" aria-label={label}>
    <button type="button" className="shop-stepper__button" aria-label="Quitar uno" disabled={value <= min} onClick={() => onChange(value - 1)}>
      −
    </button>
    <span className="shop-stepper__value" aria-live="polite">
      {value}
    </span>
    <button type="button" className="shop-stepper__button" aria-label="Agregar uno" disabled={value >= MAX_QUANTITY} onClick={() => onChange(value + 1)}>
      +
    </button>
  </div>
);

/** Tarjeta de un producto: abre su página y se agrega al carrito sin salir (con una marca de «listo»). */
export const ProductCard = ({ product, index = 0, as: Tag = "li" }) => {
  const { add, quantityOf, setOpen } = useCart();
  const [done, setDone] = useState(false);
  const inCart = quantityOf(product.id);
  const out = product.availability === "out";

  const quickAdd = () => {
    add(product, 1);
    setDone(true);
    setTimeout(() => setDone(false), 1200);
  };

  return (
    <Tag className={`shop-card ${out ? "shop-card--out" : ""}`.trim()} style={{ "--i": Math.min(index, 12) }}>
      <Link className="shop-card__link" to={`/tienda/producto/${product.id}`} aria-label={`${product.name}, ${money(product.price)}`}>
        <ProductTile product={product} />
        <span className="shop-card__body">
          <span className="shop-card__name">{product.name}</span>
          <strong className="shop-card__price">{money(product.price)}</strong>
          <span className="shop-card__meta">
            <Availability value={product.availability} />
            {product.warrantyMonths > 0 && <span className="shop-card__warranty">Garantía {product.warrantyMonths} m</span>}
          </span>
        </span>
      </Link>
      <div className="shop-card__actions">
        {inCart > 0 && !done ? (
          <button type="button" className="shop-button shop-button--soft shop-button--small" onClick={() => setOpen(true)}>
            <Icon name="cart" /> En el carrito ({inCart})
          </button>
        ) : (
          <button type="button" className={`shop-button shop-button--small ${done ? "shop-button--done" : ""}`.trim()} disabled={out} onClick={quickAdd}>
            <Icon name={done ? "check" : out ? "lock" : "plus"} />
            {done ? "¡Agregado!" : out ? "Agotado" : "Agregar"}
          </button>
        )}
      </div>
    </Tag>
  );
};

/** Fila de productos que se desliza de lado (en celular con el dedo; en computador con las flechas). */
export const ProductRail = ({ title, link, linkLabel = "Ver todo", products }) => {
  const ref = useRef(null);
  const scroll = (direction) => ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.85, behavior: "smooth" });
  if (products.length === 0) return null;
  return (
    <div className="shop-rail">
      <div className="shop-rail__head">
        <h2 className="shop-rail__title">{title}</h2>
        <div className="shop-rail__tools">
          {link && (
            <Link to={link} className="shop-rail__link">
              {linkLabel} <Arrow />
            </Link>
          )}
          <button type="button" className="shop-rail__nav" aria-label="Anteriores" onClick={() => scroll(-1)}>
            <Arrow direction="left" />
          </button>
          <button type="button" className="shop-rail__nav" aria-label="Siguientes" onClick={() => scroll(1)}>
            <Arrow />
          </button>
        </div>
      </div>
      <ul className="shop-rail__track" ref={ref}>
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </ul>
    </div>
  );
};
