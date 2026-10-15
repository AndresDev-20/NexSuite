import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import "./header.css";

/* ---------- Datos editables ---------- */
const NAV_ITEMS = [
  { label: "Inicio", to: "/dashboard", icon: "home" },
  { label: "Clientes", to: "/clientes", icon: "users" },
  { label: "Ventas", to: "/ventas", icon: "cart" },
  { label: "Inventario", to: "/inventario", icon: "box" },
  { label: "Reportes", to: "/reportes", icon: "chart" },
];

const DEFAULT_USER = { name: "Usuario NexSuite", role: "Administrador" };

const DESKTOP_QUERY = "(min-width: 1024px)";

/* ---------- Iconos (SVG en línea) ---------- */
const ICONS = {
  home: (
    <>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-5.5 6.5-5.5s6.5 1.9 6.5 5.5" />
      <path d="M16 4.8a3.3 3.3 0 0 1 0 6.4" />
      <path d="M18 14.8c2 .7 3.5 2.3 3.5 5.2" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h2.5l2.2 11h10.3l2-8H6.5" />
    </>
  ),
  box: (
    <>
      <path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5z" />
      <path d="M3 7.5l9 4.5 9-4.5" />
      <path d="M12 12v9" />
    </>
  ),
  chart: (
    <>
      <path d="M3 20h18" />
      <path d="M7 20v-7" />
      <path d="M12 20V6" />
      <path d="M17 20v-10" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4l2-2z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
      <path d="M16 8l4 4-4 4" />
      <path d="M20 12H9" />
    </>
  ),
  chevron: <path d="M6 9l6 6 6-6" />,
};

function Icon({ name, className = "" }) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

/* ---------- Utilidades ---------- */
const getInitials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

/* ---------- Lista de navegación (se reutiliza en barra y drawer) ---------- */
function NavList({ variant, onNavigate }) {
  return (
    <ul className={`nav nav--${variant}`}>
      {NAV_ITEMS.map((item, index) => (
        <li className="nav__item" key={item.to} style={{ "--i": index }}>
          <NavLink
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `nav__link ${isActive ? "nav__link--active" : ""}`
            }
          >
            <span className="nav__icon-box">
              <Icon name={item.icon} className="nav__icon" />
            </span>
            <span className="nav__text">{item.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Header ---------- */
const Header = ({ user = DEFAULT_USER, notifications = 3 }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [menuOpen, setMenuOpen] = useState(false); // drawer móvil / tablet
  const [userOpen, setUserOpen] = useState(false); // menú del usuario
  const userMenuRef = useRef(null);

  const initials = getInitials(user.name);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    console.log("Cerrando sesión...");
    // Aquí limpia tu sesión: token, localStorage, contexto, etc.
    setMenuOpen(false);
    setUserOpen(false);
    navigate("/login"); // cambia la ruta si tu login está en otra
  };

  const goTo = (path) => {
    setUserOpen(false);
    navigate(path);
  };

  // Cierra todo al cambiar de página
  useEffect(() => {
    setMenuOpen(false);
    setUserOpen(false);
  }, [pathname]);

  // Bloquea el scroll del fondo mientras el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Cierra el drawer si la pantalla pasa a tamaño portátil
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const handleChange = (event) => {
      if (event.matches) setMenuOpen(false);
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  // Escape cierra menús; clic fuera cierra el menú del usuario
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setUserOpen(false);
      }
    };
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <header className="header">
        <div className="header__inner">
          <Link to="/dashboard" className="header__logo" aria-label="NexSuite - Inicio">
            <img
              src="/nexsuite-logo-icono.png"
              alt=""
              className="header__logo-image"
            />
            <span className="header__logo-text">
              <span className="header__logo-nex">Nex</span>Suite
            </span>
          </Link>

          {/* Navegación de escritorio */}
          <nav className="header__nav" aria-label="Principal">
            <NavList variant="bar" />
          </nav>

          <div className="header__actions">
            <button
              type="button"
              className="icon-button"
              aria-label={`Notificaciones (${notifications})`}
            >
              <Icon name="bell" className="icon-button__icon" />
              {notifications > 0 && (
                <span className="icon-button__badge">{notifications > 9 ? "9+" : notifications}</span>
              )}
            </button>

            {/* Menú de usuario (tablet y portátil) */}
            <div className="user-menu" ref={userMenuRef}>
              <button
                type="button"
                className="user-menu__trigger"
                aria-haspopup="menu"
                aria-expanded={userOpen}
                onClick={() => setUserOpen((prev) => !prev)}
              >
                <span className="user-menu__avatar">{initials}</span>
                <span className="user-menu__info">
                  <span className="user-menu__name">{user.name}</span>
                  <span className="user-menu__role">{user.role}</span>
                </span>
                <Icon
                  name="chevron"
                  className={`user-menu__chevron ${userOpen ? "user-menu__chevron--open" : ""}`}
                />
              </button>

              <div
                className={`user-menu__dropdown ${userOpen ? "user-menu__dropdown--open" : ""}`}
                role="menu"
              >
                <div className="user-menu__header">
                  <span className="user-menu__avatar user-menu__avatar--lg">{initials}</span>
                  <div>
                    <p className="user-menu__header-name">{user.name}</p>
                    <p className="user-menu__header-role">{user.role}</p>
                  </div>
                </div>

                <button type="button" className="user-menu__item" role="menuitem" onClick={() => goTo("/perfil")}>
                  <Icon name="user" className="user-menu__item-icon" />
                  Mi perfil
                </button>
                <button type="button" className="user-menu__item" role="menuitem" onClick={() => goTo("/configuracion")}>
                  <Icon name="settings" className="user-menu__item-icon" />
                  Configuración
                </button>

                <hr className="user-menu__divider" />

                <button
                  type="button"
                  className="user-menu__item user-menu__item--danger"
                  role="menuitem"
                  onClick={handleLogout}
                >
                  <Icon name="logout" className="user-menu__item-icon" />
                  Cerrar sesión
                </button>
              </div>
            </div>

            {/* Botón hamburguesa animado (móvil y tablet) */}
            <button
              type="button"
              className={`burger ${menuOpen ? "burger--open" : ""}`}
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <span className="burger__box">
                <span className="burger__line" />
                <span className="burger__line" />
                <span className="burger__line" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Fondo oscuro detrás del drawer */}
      <div
        className={`overlay ${menuOpen ? "overlay--visible" : ""}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* Drawer de navegación (móvil y tablet) */}
      <aside
        id="mobile-menu"
        className={`drawer ${menuOpen ? "drawer--open" : ""}`}
        aria-label="Menú de navegación"
        aria-hidden={!menuOpen}
      >
        <div className="drawer__user">
          <span className="user-menu__avatar user-menu__avatar--lg">{initials}</span>
          <div>
            <p className="drawer__user-name">{user.name}</p>
            <p className="drawer__user-role">{user.role}</p>
          </div>
        </div>

        <nav className="drawer__nav" aria-label="Principal">
          <NavList variant="drawer" onNavigate={closeMenu} />
        </nav>

        <div className="drawer__footer">
          <button type="button" className="button button--logout" onClick={handleLogout}>
            <Icon name="logout" className="button__icon" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
};

export default Header;