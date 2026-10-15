import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "../ui/Icon/Icon";
import Menu from "../menu/Menu";
import { clearSession, getUser } from "../../utils/session";
import { getFullName, getInitials, getShortName } from "../../utils/userDisplay";
import "./header.css";

const DESKTOP_QUERY = "(min-width: 1024px)";

const Header = ({ notifications = 0 }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [menuOpen, setMenuOpen] = useState(false); // drawer móvil / tablet
  const [userOpen, setUserOpen] = useState(false); // menú del usuario
  const userMenuRef = useRef(null);

  // Usuario de la sesión (lo guardó el login)
  const user = useMemo(() => getUser(), []);
  const shortName = getShortName(user) || "Usuario";
  const fullName = getFullName(user) || "Usuario";
  const initials = getInitials(user) || "U";
  const roleName = user?.role?.nameRole ?? "";
  const email = user?.email ?? "";

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    clearSession();
    navigate("/", { replace: true });
  };

  // Cierra los menús al cambiar de página
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

  // Cierra el drawer si la pantalla pasa a tamaño portátil (ahí el menú es el sidebar)
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const handleChange = (event) => {
      if (event.matches) setMenuOpen(false);
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  // Escape cierra los menús; un clic fuera cierra el menú del usuario
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
          <Link to="/welcome" className="header__logo" aria-label="NexSuite - Inicio">
            <img src="/nexsuite-logo-icono.png" alt="" className="header__logo-image" />
            <span className="header__logo-text">
              <span className="header__logo-nex">Nex</span>Suite
            </span>
          </Link>

          <div className="header__actions">
            <button
              type="button"
              className="icon-button"
              aria-label={notifications > 0 ? `Notificaciones (${notifications})` : "Notificaciones"}
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
                  <span className="user-menu__name">{shortName}</span>
                  {roleName && <span className="user-menu__role">{roleName}</span>}
                </span>
                <Icon
                  name="chevron"
                  className={`user-menu__chevron ${userOpen ? "user-menu__chevron--open" : ""}`.trim()}
                />
              </button>

              <div
                className={`user-menu__dropdown ${userOpen ? "user-menu__dropdown--open" : ""}`.trim()}
                role="menu"
              >
                <div className="user-menu__header">
                  <span className="user-menu__avatar user-menu__avatar--lg">{initials}</span>
                  <div className="user-menu__header-text">
                    <p className="user-menu__header-name">{fullName}</p>
                    {roleName && <p className="user-menu__header-role">{roleName}</p>}
                    {email && <p className="user-menu__header-email">{email}</p>}
                  </div>
                </div>

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
              className={`burger ${menuOpen ? "burger--open" : ""}`.trim()}
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
        className={`drawer-overlay ${menuOpen ? "drawer-overlay--visible" : ""}`.trim()}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* Drawer (móvil y tablet): contiene el mismo Menu que el sidebar de escritorio */}
      <aside
        id="mobile-menu"
        className={`drawer ${menuOpen ? "drawer--open" : ""}`.trim()}
        aria-label="Menú de navegación"
        aria-hidden={!menuOpen}
      >
        <div className="drawer__user">
          <span className="user-menu__avatar user-menu__avatar--lg">{initials}</span>
          <div className="drawer__user-text">
            <p className="drawer__user-name">{shortName}</p>
            {roleName && <p className="drawer__user-role">{roleName}</p>}
          </div>
        </div>

        <div className="drawer__nav">
          <Menu onNavigate={closeMenu} />
        </div>

        <div className="drawer__footer">
          <button type="button" className="drawer__logout" onClick={handleLogout}>
            <Icon name="logout" className="drawer__logout-icon" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
};

export default Header;