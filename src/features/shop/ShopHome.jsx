import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import Icon from "../../components/ui/Icon/Icon";
import getErrorMessage from "../../utils/getErrorMessage";
import Reveal from "./Reveal";
import { Arrow, ChatIcon, ProductCard, ProductRail } from "./ShopParts";
import { getShopProducts } from "./shopApi";
import { STORE_NAME, initialOf, toneOf } from "./shopFormat";

const SORTS = [
  { value: "name", label: "Nombre (A-Z)" },
  { value: "price-asc", label: "Menor precio" },
  { value: "price-desc", label: "Mayor precio" },
];
const RAIL_SIZE = 12;
const SLIDE_MS = 5500;

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduced";

/** Portada con anuncios que pasan solos (se detienen al pasar el mouse o con «Animaciones reducidas»). */
const HeroCarousel = ({ shop, categories }) => {
  const slides = [
    {
      key: "welcome",
      eyebrow: shop?.name ? `La tienda en línea de ${shop.name}` : "Tienda en línea",
      title: `Bienvenido a ${STORE_NAME}`,
      text: "Elige lo que te gusta, arma tu pedido y envíalo por WhatsApp en segundos.",
      tone: "red",
    },
    { key: "whatsapp", eyebrow: "Así de fácil", title: "Tu pedido llega escrito a nuestro WhatsApp", text: "Sin registrarte: agrega al carrito, toca «Pedir por WhatsApp» y te confirmamos.", tone: "ink" },
    ...(categories[0]
      ? [
          {
            key: "category",
            eyebrow: "Mira nuestras categorías",
            title: categories
              .map((item) => item.name)
              .slice(0, 3)
              .join(" · "),
            text: "Encuentra lo que buscas por categoría o con el buscador de arriba.",
            tone: "blue",
            link: `/tienda?categoria=${categories[0].id}`,
            linkLabel: `Ver ${categories[0].name}`,
          },
        ]
      : []),
  ];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = index % slides.length;

  useEffect(() => {
    if (paused || slides.length < 2 || reducedMotion()) return undefined;
    const timer = setInterval(() => setIndex((value) => value + 1), SLIDE_MS);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  return (
    <section
      className="shop-hero"
      aria-roledescription="carrusel"
      aria-label="Anuncios"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((slide, position) => (
        <div key={slide.key} className={`shop-hero__slide shop-hero__slide--${slide.tone} ${position === current ? "shop-hero__slide--on" : ""}`.trim()} aria-hidden={position !== current}>
          <span className="shop-hero__orb shop-hero__orb--one" />
          <span className="shop-hero__orb shop-hero__orb--two" />
          <div className="shop-hero__content">
            <p className="shop-hero__eyebrow">{slide.eyebrow}</p>
            <h1 className="shop-hero__title">{slide.title}</h1>
            <p className="shop-hero__text">{slide.text}</p>
            {slide.link ? (
              <Link to={slide.link} className="shop-hero__cta" tabIndex={position === current ? 0 : -1}>
                {slide.linkLabel} <Arrow />
              </Link>
            ) : (
              <a href="#/tienda" className="shop-hero__cta" tabIndex={position === current ? 0 : -1} onClick={(event) => {
                event.preventDefault();
                document.getElementById("shop-products")?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" });
              }}>
                Ver productos <Arrow />
              </a>
            )}
          </div>
        </div>
      ))}
      {slides.length > 1 && (
        <>
          <button type="button" className="shop-hero__nav shop-hero__nav--prev" aria-label="Anuncio anterior" onClick={() => setIndex((value) => value + slides.length - 1)}>
            <Arrow direction="left" />
          </button>
          <button type="button" className="shop-hero__nav shop-hero__nav--next" aria-label="Anuncio siguiente" onClick={() => setIndex((value) => value + 1)}>
            <Arrow />
          </button>
          <div className="shop-hero__dots">
            {slides.map((slide, position) => (
              <button key={slide.key} type="button" className={`shop-hero__dot ${position === current ? "shop-hero__dot--on" : ""}`.trim()} aria-label={`Anuncio ${position + 1}`} aria-current={position === current} onClick={() => setIndex(position)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

/** Franja de cómo funciona la tienda. */
const Benefits = () => (
  <Reveal className="shop-benefits" aria-label="Cómo funciona">
    <div className="shop-benefit">
      <span className="shop-benefit__icon">
        <ChatIcon />
      </span>
      <span className="shop-benefit__text">
        <strong>Pide por WhatsApp</strong>
        <span>Tu pedido va escrito, solo lo envías</span>
      </span>
    </div>
    <div className="shop-benefit">
      <span className="shop-benefit__icon">
        <Icon name="shield" />
      </span>
      <span className="shop-benefit__text">
        <strong>Garantía</strong>
        <span>La de cada producto, en su página</span>
      </span>
    </div>
    <div className="shop-benefit">
      <span className="shop-benefit__icon">
        <Icon name="store" />
      </span>
      <span className="shop-benefit__text">
        <strong>Pago y entrega</strong>
        <span>Los acordamos contigo por el chat</span>
      </span>
    </div>
  </Reveal>
);

/** Categorías en círculos de color. */
const CategoryCircles = ({ categories }) => (
  <Reveal className="shop-section" aria-labelledby="shop-categories-title">
    <h2 className="shop-section__title" id="shop-categories-title">
      Categorías
    </h2>
    <ul className="shop-categories">
      {categories.map((category, index) => (
        <li key={category.id} style={{ "--i": index }}>
          <Link to={`/tienda?categoria=${category.id}`} className="shop-category">
            <span className={`shop-category__circle shop-tile--${toneOf(category)}`}>{initialOf(category.name)}</span>
            <span className="shop-category__name">{category.name}</span>
            <span className="shop-category__count">
              {category.count} {category.count === 1 ? "producto" : "productos"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </Reveal>
);

const Empty = ({ filtered, onReset }) => (
  <div className="shop-state">
    <Icon name="search" className="shop-state__icon" />
    <h2 className="shop-state__title">{filtered ? "No encontramos productos" : "Pronto tendremos productos aquí"}</h2>
    <p className="shop-state__text">{filtered ? "Prueba con otra palabra o mira todas las categorías." : "Vuelve pronto o escríbenos por WhatsApp."}</p>
    {filtered && (
      <button type="button" className="shop-button shop-button--soft" onClick={onReset}>
        Ver toda la tienda
      </button>
    )}
  </div>
);

/**
 * Inicio de la tienda (Fase 24): sin búsqueda ni categoría, la portada, cómo funciona, las
 * categorías y una fila por categoría; con búsqueda o categoría, los resultados con su orden.
 * Todo queda en la dirección, así el enlace se puede compartir.
 */
const ShopHome = () => {
  const { shop, error: shopError, retry } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("buscar") ?? "";
  const category = searchParams.get("categoria") ?? "";
  const sort = SORTS.some((item) => item.value === searchParams.get("orden")) ? searchParams.get("orden") : "name";
  const browsing = !search && !category;
  const [state, setState] = useState({ key: "", products: [], error: "" });
  const [attempt, setAttempt] = useState(0);

  const update = (changes) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
        return next;
      },
      { replace: true }
    );

  // Al volver de un producto, la pestaña vuelve a decir el nombre de la tienda
  useEffect(() => {
    document.title = shop?.name ? `${STORE_NAME} · ${shop.name}` : STORE_NAME;
  }, [shop?.name]);

  const params = useMemo(() => ({ ...(search && { search }), ...(category && { category }), sort }), [search, category, sort]);
  const requestKey = `${JSON.stringify(params)}#${attempt}`;

  useEffect(() => {
    let current = true;
    getShopProducts(params)
      .then((products) => current && setState({ key: requestKey, products, error: "" }))
      .catch((error) => current && setState({ key: requestKey, products: [], error: getErrorMessage(error, "No pudimos cargar los productos.") }));
    return () => {
      current = false;
    };
  }, [params, requestKey]);

  const loading = state.key !== requestKey;
  const categories = useMemo(() => shop?.categories ?? [], [shop]);
  const activeCategory = categories.find((item) => String(item.id) === category);
  // Una fila por categoría, en el orden de las categorías (primero los que hay)
  const rails = useMemo(
    () =>
      categories
        .map((item) => ({
          category: item,
          products: state.products
            .filter((product) => product.category?.id === item.id)
            .sort((a, b) => (a.availability === "out") - (b.availability === "out"))
            .slice(0, RAIL_SIZE),
        }))
        .filter((rail) => rail.products.length > 0),
    [categories, state.products]
  );

  if (shopError) {
    return (
      <div className="shop-state">
        <Icon name="alert" className="shop-state__icon" />
        <h1 className="shop-state__title">No pudimos abrir la tienda</h1>
        <p className="shop-state__text">{shopError}</p>
        <button type="button" className="shop-button" onClick={retry}>
          Reintentar
        </button>
      </div>
    );
  }

  const error = state.error && !loading && (
    <div className="shop-state">
      <p className="shop-state__text">{state.error}</p>
      <button type="button" className="shop-button" onClick={() => setAttempt((value) => value + 1)}>
        Reintentar
      </button>
    </div>
  );
  const skeleton = (
    <ul className="shop-grid" aria-busy="true">
      {Array.from({ length: 8 }, (_, index) => (
        <li key={index} className="shop-card shop-card--skeleton" />
      ))}
    </ul>
  );

  if (browsing) {
    return (
      <div className="shop-home">
        <HeroCarousel shop={shop} categories={categories} />
        <Benefits />
        {categories.length > 0 && <CategoryCircles categories={categories} />}
        <div id="shop-products" className="shop-anchor" />
        {error ||
          (loading && state.products.length === 0 ? (
            skeleton
          ) : state.products.length === 0 ? (
            <Empty filtered={false} />
          ) : (
            rails.map((rail) => (
              <Reveal key={rail.category.id} className="shop-section">
                <ProductRail
                  title={rail.category.name}
                  link={`/tienda?categoria=${rail.category.id}`}
                  linkLabel={rail.category.count > rail.products.length ? `Ver los ${rail.category.count}` : "Ver todo"}
                  products={rail.products}
                />
              </Reveal>
            ))
          ))}
      </div>
    );
  }

  return (
    <div className="shop-home shop-results">
      <nav className="shop-breadcrumb" aria-label="Ruta">
        <Link to="/tienda">Inicio</Link>
        <Arrow />
        <span>{activeCategory ? activeCategory.name : `Resultados para «${search}»`}</span>
      </nav>
      <div className="shop-results__head">
        <div className="shop-results__heading">
          <h1 className="shop-results__title">{activeCategory ? activeCategory.name : search}</h1>
          <p className="shop-count" role="status">
            {loading ? "Buscando…" : `${state.products.length} ${state.products.length === 1 ? "producto" : "productos"}${activeCategory && search ? ` para «${search}»` : ""}`}
          </p>
        </div>
        <label className="shop-sort">
          <span className="shop-sort__label">Ordenar por</span>
          <select className="shop-sort__select" value={sort} onChange={(event) => update({ orden: event.target.value === "name" ? "" : event.target.value })}>
            {SORTS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {categories.length > 1 && (
        <div className="shop-chips" role="group" aria-label="Categorías">
          <button type="button" className={`shop-chip ${!category ? "shop-chip--on" : ""}`.trim()} aria-pressed={!category} onClick={() => update({ categoria: "" })}>
            Todas
          </button>
          {categories.map((item) => (
            <button key={item.id} type="button" className={`shop-chip ${category === String(item.id) ? "shop-chip--on" : ""}`.trim()} aria-pressed={category === String(item.id)} onClick={() => update({ categoria: String(item.id) })}>
              {item.name}
            </button>
          ))}
        </div>
      )}
      {error ||
        (loading && state.products.length === 0 ? (
          skeleton
        ) : !loading && state.products.length === 0 ? (
          <Empty filtered onReset={() => update({ buscar: "", categoria: "", orden: "" })} />
        ) : (
          <ul className={`shop-grid ${loading ? "shop-grid--loading" : ""}`.trim()} aria-busy={loading}>
            {state.products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </ul>
        ))}
    </div>
  );
};

export default ShopHome;
