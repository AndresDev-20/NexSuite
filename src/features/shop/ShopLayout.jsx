import { Suspense, useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../../components/ui/Icon/Icon";
import { savePreferences, usePreferences } from "../settings/preferences";
import getErrorMessage from "../../utils/getErrorMessage";
import CartDrawer from "./CartDrawer";
import { CartProvider } from "./cart";
import { useCart } from "./cartContext";
import { ChatIcon } from "./ShopParts";
import { getShop } from "./shopApi";
import { STORE_NAME, money } from "./shopFormat";
import { SeasonAccessory, SeasonGarland, SeasonParticles } from "../seasons/SeasonDecor";
import WelcomeGreeting from "../seasons/WelcomeGreeting";
import { SeasonSky } from "../seasons/SeasonScene";
import "./shop.css";

const SEARCH_DELAY_MS = 350;
const YEAR = new Date().getFullYear();

/**
 * Buscador del encabezado: busca mientras escribes (en el inicio de la tienda) y desde un producto
 * te lleva a los resultados. Va sin estado propio para no perder el foco al cambiar la dirección.
 */
const HeaderSearch = () => {
  const [searchParams] = useSearchParams();
  const { pathname, key } = useLocation();
  const navigate = useNavigate();
  const input = useRef(null);
  const timer = useRef(null);
  const current = pathname === "/tienda" ? searchParams.get("buscar") ?? "" : "";

  // En cada cambio de página (una categoría, «Ver todo», un producto) el campo muestra la búsqueda de la
  // dirección; mientras se escribe en él no se toca
  useEffect(() => {
    if (input.current && document.activeElement !== input.current) input.current.value = current;
  }, [current, key]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const go = (value) => {
    const next = new URLSearchParams(pathname === "/tienda" ? searchParams : undefined);
    if (value.trim()) next.set("buscar", value.trim());
    else next.delete("buscar");
    navigate({ pathname: "/tienda", search: next.toString() ? `?${next}` : "" }, { replace: pathname === "/tienda" });
  };

  return (
    <form
      className="shop-header__search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        clearTimeout(timer.current);
        go(input.current.value);
        input.current.blur();
      }}
    >
      <label className="shop-sr" htmlFor="shop-search">
        Buscar productos
      </label>
      <input
        id="shop-search"
        ref={input}
        type="search"
        className="shop-header__search-input"
        placeholder="Buscar productos, marcas y más…"
        defaultValue={current}
        maxLength={100}
        autoComplete="off"
        onChange={(event) => {
          clearTimeout(timer.current);
          const { value } = event.target;
          if (pathname === "/tienda") timer.current = setTimeout(() => go(value), SEARCH_DELAY_MS);
        }}
      />
      <button type="submit" className="shop-header__search-button" aria-label="Buscar">
        <Icon name="search" />
      </button>
    </form>
  );
};

/** Encabezado: el negocio, el buscador, el tema, el carrito y las categorías. */
const ShopHeader = ({ shop }) => {
  const { count, setOpen, notice } = useCart();
  const { activeTheme } = usePreferences();
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const dark = activeTheme === "dark";
  const onHome = pathname === "/tienda";
  const activeCategory = onHome ? searchParams.get("categoria") : null;
  const categories = shop?.categories ?? [];

  return (
    <header className="shop-header">
      <SeasonSky variant="store" />
      <div className="shop-header__top">
        <Link to="/tienda" className="shop-brand" aria-label={`${STORE_NAME}: inicio`}>
          <SeasonAccessory className="season-accessory--store" />
          <span className="shop-brand__mark" aria-hidden="true">
            <img src="/nexsuite-logo-icono.png" alt="" className="shop-brand__logo" />
          </span>
          <span className="shop-brand__name" aria-hidden="true">
            Nex<span className="shop-brand__store">Store</span>
          </span>
        </Link>
        <HeaderSearch />
        <div className="shop-header__actions">
          <button type="button" className="shop-icon-button shop-icon-button--ghost" aria-label={dark ? "Usar tema claro" : "Usar tema oscuro"} onClick={() => savePreferences({ theme: dark ? "light" : "dark" })}>
            <Icon name={dark ? "sun" : "moon"} />
          </button>
          <button type="button" className="shop-cart-button" aria-label={`Abrir el carrito (${count} productos)`} onClick={() => setOpen(true)}>
            <Icon name="cart" />
            <span className="shop-cart-button__text">Carrito</span>
            {count > 0 && (
              <span key={notice?.key ?? "badge"} className="shop-cart-button__badge">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
      {categories.length > 0 && (
        <nav className="shop-header__nav" aria-label="Categorías">
          <Link to="/tienda" className={`shop-nav-link ${onHome && !activeCategory && !searchParams.get("buscar") ? "shop-nav-link--on" : ""}`.trim()}>
            Inicio
          </Link>
          {categories.map((category) => (
            <Link key={category.id} to={`/tienda?categoria=${category.id}`} className={`shop-nav-link ${activeCategory === String(category.id) ? "shop-nav-link--on" : ""}`.trim()}>
              {category.name}
            </Link>
          ))}
        </nav>
      )}
      <SeasonGarland />
    </header>
  );
};

/** Aviso «Agregado al carrito» que sale abajo unos segundos. */
const AddedNotice = () => {
  const { notice, dismissNotice, setOpen } = useCart();
  if (!notice) return null;
  return (
    <div key={notice.key} className="shop-notice" role="status">
      <span className="shop-notice__check">
        <Icon name="check" />
      </span>
      <span className="shop-notice__text">
        <strong>Agregado al carrito</strong>
        <span>{notice.name}</span>
      </span>
      <button
        type="button"
        className="shop-notice__action"
        onClick={() => {
          dismissNotice();
          setOpen(true);
        }}
      >
        Ver carrito
      </button>
    </div>
  );
};

/** Botón flotante del carrito (cuando tiene algo), a la mano del pulgar en el celular. */
const FloatingCart = () => {
  const { count, total, setOpen, notice } = useCart();
  if (count === 0 || notice) return null;
  return (
    <button type="button" className="shop-floating-cart" onClick={() => setOpen(true)}>
      <Icon name="cart" />
      <span>
        Ver pedido · {count} {count === 1 ? "producto" : "productos"}
      </span>
      <strong>{money(total)}</strong>
    </button>
  );
};

/** Pie: cómo comprar, dónde estamos y cómo contactarnos. */
const ShopFooter = ({ shop }) => (
  <footer className="shop-footer">
    <div className="shop-footer__inner">
      <div className="shop-footer__col">
        <strong className="shop-footer__name">{shop?.name || STORE_NAME}</strong>
        <p className="shop-footer__text">Arma tu pedido en {STORE_NAME} y envíalo por WhatsApp. Te respondemos para confirmar disponibilidad, pago y entrega.</p>
      </div>
      <div className="shop-footer__col">
        <h2 className="shop-footer__title">Contacto</h2>
        <ul className="shop-footer__list">
          {(shop?.address || shop?.city) && (
            <li>
              <Icon name="pin" /> {[shop.address, shop.city].filter(Boolean).join(", ")}
            </li>
          )}
          {shop?.phone && (
            <li>
              <Icon name="phone" /> {shop.phone}
            </li>
          )}
          {shop?.email && (
            <li>
              <Icon name="mail" /> {shop.email}
            </li>
          )}
          {shop?.whatsapp && (
            <li>
              <ChatIcon />
              <a href={`https://wa.me/${shop.whatsapp}`} target="_blank" rel="noopener noreferrer">
                Escríbenos por WhatsApp
              </a>
            </li>
          )}
        </ul>
      </div>
      <div className="shop-footer__col">
        <h2 className="shop-footer__title">Cómo comprar</h2>
        <ol className="shop-footer__steps">
          <li>Elige tus productos y agrégalos al carrito.</li>
          <li>Toca «Pedir por WhatsApp»: el pedido va escrito.</li>
          <li>Envíalo y te confirmamos.</li>
        </ol>
      </div>
    </div>
    <p className="shop-footer__copy">
      © {YEAR} {shop?.name ? `${shop.name} · ` : ""}
      {STORE_NAME} · Precios en pesos colombianos
    </p>
  </footer>
);

/**
 * Tienda en línea (Fase 24): pública, sin iniciar sesión, en #/tienda. Carga los datos del negocio
 * una vez y los pasa a las páginas (inicio y producto); el carrito vive aquí.
 */
const ShopLayout = () => {
  const [state, setState] = useState({ shop: null, error: "", loading: true });
  const [attempt, setAttempt] = useState(0);

  // Al salir de la tienda (por ejemplo, al sistema) la pestaña vuelve a su nombre de siempre
  useEffect(
    () => () => {
      document.title = "NexSuite";
    },
    []
  );

  useEffect(() => {
    let current = true;
    getShop()
      .then((shop) => {
        if (!current) return;
        setState({ shop, error: "", loading: false });
        document.title = shop.name ? `${STORE_NAME} · ${shop.name}` : STORE_NAME;
      })
      .catch((error) => current && setState({ shop: null, error: getErrorMessage(error, "No pudimos abrir la tienda."), loading: false }));
    return () => {
      current = false;
    };
  }, [attempt]);

  return (
    <CartProvider>
      <div className="shop">
        <SeasonParticles variant="store" />
        <ShopHeader shop={state.shop} />
        <main className="shop-main">
          <Suspense fallback={<p className="shop-count">Cargando…</p>}>
            <Outlet context={{ ...state, retry: () => setAttempt((value) => value + 1) }} />
          </Suspense>
        </main>
        <ShopFooter shop={state.shop} />
        <FloatingCart />
        <AddedNotice />
        <CartDrawer shop={state.shop} />
        <WelcomeGreeting mode="store" />
      </div>
    </CartProvider>
  );
};

export default ShopLayout;
