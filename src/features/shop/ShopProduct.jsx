import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import Icon from "../../components/ui/Icon/Icon";
import getErrorMessage from "../../utils/getErrorMessage";
import { useCart } from "./cartContext";
import Reveal from "./Reveal";
import { Arrow, Availability, ChatIcon, ProductRail, ProductTile, QuantityStepper } from "./ShopParts";
import { getShopProduct, getShopProducts } from "./shopApi";
import { STORE_NAME, money, orderMessage, whatsappLink } from "./shopFormat";

const UNITS = { unidad: "unidad", caja: "caja", paquete: "paquete", par: "par", kg: "kg", g: "g", l: "litro", ml: "ml", m: "metro" };
const RELATED = 12;

/**
 * Página de un producto de la tienda (Fase 24): ruta, el cuadro del producto y la caja de compra
 * (precio, disponibilidad, garantía, cantidad, agregar o pedir solo este por WhatsApp), la
 * descripción, las características y otros de la misma categoría.
 */
const ShopProduct = ({ id }) => {
  const { shop } = useOutletContext();
  const { add, quantityOf, setOpen } = useCart();
  const [state, setState] = useState({ done: false, product: null, error: "", missing: false });
  const [related, setRelated] = useState([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let current = true;
    window.scrollTo(0, 0);
    getShopProduct(id)
      .then((product) => {
        if (!current) return;
        setState({ done: true, product, error: "", missing: false });
        document.title = `${product.name} · ${STORE_NAME}`;
        // Otros de la misma categoría (los disponibles primero)
        if (product.category) {
          getShopProducts({ category: product.category.id })
            .then((list) => current && setRelated(list.filter((item) => item.id !== product.id).sort((a, b) => (a.availability === "out") - (b.availability === "out")).slice(0, RELATED)))
            .catch(() => {});
        }
      })
      .catch((error) => current && setState({ done: true, product: null, error: getErrorMessage(error, "No pudimos cargar el producto."), missing: error?.response?.status === 404 }));
    return () => {
      current = false;
    };
  }, [id, shop?.name]);

  if (!state.done) {
    return (
      <div className="shop-product" aria-busy="true">
        <div className="shop-product__layout">
          <div className="shop-tile shop-tile--large shop-skeleton" />
          <div className="shop-buybox">
            <span className="shop-skeleton shop-skeleton--line" />
            <span className="shop-skeleton shop-skeleton--title" />
            <span className="shop-skeleton shop-skeleton--line" />
          </div>
        </div>
      </div>
    );
  }
  if (!state.product) {
    return (
      <div className="shop-state">
        <Icon name={state.missing ? "search" : "alert"} className="shop-state__icon" />
        <h1 className="shop-state__title">{state.missing ? "Este producto ya no está en la tienda" : "No pudimos cargar el producto"}</h1>
        <p className="shop-state__text">{state.missing ? "Mira los demás productos o escríbenos por WhatsApp." : state.error}</p>
        <Link to="/tienda" className="shop-button">
          Ver productos
        </Link>
      </div>
    );
  }

  const { product } = state;
  const out = product.availability === "out";
  const inCart = quantityOf(product.id);
  const single = shop?.whatsapp && !out ? whatsappLink(shop.whatsapp, orderMessage([{ ...product, quantity }])) : null;
  const ask = shop?.whatsapp && out ? whatsappLink(shop.whatsapp, `Hola, ¿cuándo les llega «${product.name}»?`) : null;

  return (
    <article className="shop-product">
      <nav className="shop-breadcrumb" aria-label="Ruta">
        <Link to="/tienda">Inicio</Link>
        {product.category && (
          <>
            <Arrow />
            <Link to={`/tienda?categoria=${product.category.id}`}>{product.category.name}</Link>
          </>
        )}
        <Arrow />
        <span>{product.name}</span>
      </nav>

      <div className="shop-product__layout">
        <div className="shop-product__media">
          <ProductTile product={product} large />
        </div>

        <div className="shop-buybox">
          {product.category && (
            <Link to={`/tienda?categoria=${product.category.id}`} className="shop-buybox__category">
              {product.category.name}
            </Link>
          )}
          <h1 className="shop-buybox__name">{product.name}</h1>
          <div className="shop-buybox__price-row">
            <strong className="shop-buybox__price">{money(product.price)}</strong>
            <span className="shop-buybox__unit">por {UNITS[product.unit] ?? product.unit}</span>
          </div>
          <ul className="shop-buybox__facts">
            <li>
              <Availability value={product.availability} />
            </li>
            <li>
              <Icon name="shield" /> {product.warrantyMonths > 0 ? `Garantía de ${product.warrantyMonths} ${product.warrantyMonths === 1 ? "mes" : "meses"}` : "Sin garantía"}
            </li>
            <li>
              <ChatIcon /> Pago y entrega por WhatsApp
            </li>
          </ul>

          {out ? (
            <div className="shop-buybox__out">
              <p>Por ahora no tenemos unidades.</p>
              {ask && (
                <a className="shop-button shop-button--whatsapp shop-button--block" href={ask} target="_blank" rel="noopener noreferrer">
                  <ChatIcon /> Preguntar cuándo llega
                </a>
              )}
            </div>
          ) : (
            <>
              <div className="shop-buybox__quantity">
                <span>Cantidad</span>
                <QuantityStepper label="Cantidad" value={quantity} onChange={setQuantity} />
              </div>
              <button type="button" className="shop-button shop-button--block shop-button--large" onClick={() => add(product, quantity)}>
                <Icon name="cart" /> Agregar al carrito
              </button>
              {single && (
                <a className="shop-button shop-button--whatsapp shop-button--block shop-button--large" href={single} target="_blank" rel="noopener noreferrer">
                  <ChatIcon /> Pedir este por WhatsApp
                </a>
              )}
            </>
          )}
          {inCart > 0 && (
            <button type="button" className="shop-link-button" onClick={() => setOpen(true)}>
              Tienes {inCart} en el carrito · Ver pedido
            </button>
          )}
        </div>

        <div className="shop-product__details">
          {product.features.length > 0 && (
            <Reveal className="shop-product__section" aria-labelledby="shop-features">
              <h2 className="shop-product__heading" id="shop-features">
                Características
              </h2>
              <dl className="shop-features">
                {product.features.map((feature) => (
                  <div key={feature.name} className="shop-features__row">
                    <dt>{feature.name}</dt>
                    <dd>{feature.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          )}
          {product.description && (
            <Reveal className="shop-product__section" aria-labelledby="shop-description">
              <h2 className="shop-product__heading" id="shop-description">
                Descripción
              </h2>
              <p className="shop-product__description">{product.description}</p>
            </Reveal>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <Reveal className="shop-section shop-product__related">
          <ProductRail title="También te puede interesar" link={product.category ? `/tienda?categoria=${product.category.id}` : null} products={related} />
        </Reveal>
      )}
    </article>
  );
};

/** Cada producto empieza de cero (cantidad 1) al pasar de uno a otro. */
const ShopProductPage = () => {
  const { id } = useParams();
  return <ShopProduct key={id} id={id} />;
};

export default ShopProductPage;
