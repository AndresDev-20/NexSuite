import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "../ui/Icon/Icon";
import Menu from "../menu/Menu";
import BranchSelector from "../../features/branches/BranchSelector";
import usePermissions from "../../features/auth/usePermissions";
import { useChatSummary } from "../../features/chats/useChats";
import { usePendingOrders } from "../../features/saleOrders/useSaleOrders";
import useActiveBranch from "../../features/branches/useActiveBranch";
import { clearSession, getUser } from "../../utils/session";
import { getFullName, getInitials, getShortName } from "../../utils/userDisplay";
import { SeasonAccessory, SeasonGarland } from "../../features/seasons/SeasonDecor";
import { SeasonSky } from "../../features/seasons/SeasonScene";
import { useBrand } from "../../features/brand/brandContext";
import BrandWordmark from "../../features/brand/BrandWordmark";
import { useLayawayAlerts } from "../../features/sales/layaways/layawayApi";
import { useWarehouseAlerts, useWarehouseEnabled } from "../../features/inventory/warehouse/warehouseApi";
import { useRequestsSummary } from "../../features/inventory/requests/requestsApi";
import "./header.css";

const DESKTOP_QUERY = "(min-width: 1024px)";

const Header = () => {
  const brand = useBrand(); // logo y nombre de la empresa (Fase 29)
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Aviso: conversaciones de WhatsApp que esperan vendedor (Fase 16); solo con «Ver chats»
  const { can } = usePermissions();
  const seesChats = can("chats.read");
  const { waiting: chatsWaiting } = useChatSummary(seesChats);
  // Y pedidos a caja esperando cobro (Fase 18); solo para quien cobra («Vender»)
  const seesOrders = can("sales.create");
  const { activeBranchId } = useActiveBranch();
  const ordersWaiting = usePendingOrders(seesOrders, activeBranchId);
  // Y apartados por vencer o con dinero por devolver (Fase 30); con «Consultar apartados»
  const layawayAlerts = useLayawayAlerts(can("layaways.read"), activeBranchId);
  const layawaysWaiting = layawayAlerts.dueSoon + layawayAlerts.refunds;
  // Y préstamos de la bodega vencidos (Fase 47); con la bodega activa y «Consultar bodega»
  const warehouseEnabled = useWarehouseEnabled();
  const warehouseAlerts = useWarehouseAlerts(warehouseEnabled === true && can("warehouse.read"), activeBranchId);
  // Y pedidos entre sucursales (Fase 52): por atender (me pidieron) y envíos por recibir
  const requests = useRequestsSummary(can("branch-requests.create") || can("branch-requests.dispatch"));
  const requestsWaiting = requests.toDispatch + requests.toReceive;
  const notifications = chatsWaiting + ordersWaiting + layawaysWaiting + warehouseAlerts.overdue + requestsWaiting;
  const noticeLabel = [
    ordersWaiting > 0 && `${ordersWaiting} ${ordersWaiting === 1 ? "pedido espera" : "pedidos esperan"} en caja`,
    chatsWaiting > 0 && `${chatsWaiting} ${chatsWaiting === 1 ? "chat espera" : "chats esperan"} vendedor`,
    layawayAlerts.dueSoon > 0 && `${layawayAlerts.dueSoon} ${layawayAlerts.dueSoon === 1 ? "apartado vence" : "apartados vencen"} pronto`,
    layawayAlerts.refunds > 0 && `${layawayAlerts.refunds} ${layawayAlerts.refunds === 1 ? "apartado tiene" : "apartados tienen"} dinero por devolver`,
    warehouseAlerts.overdue > 0 && `${warehouseAlerts.overdue} ${warehouseAlerts.overdue === 1 ? "préstamo vencido" : "préstamos vencidos"} en la bodega`,
    requests.toDispatch > 0 && `${requests.toDispatch} ${requests.toDispatch === 1 ? "pedido de otra sucursal por atender" : "pedidos de otras sucursales por atender"}`,
    requests.toReceive > 0 && `${requests.toReceive} ${requests.toReceive === 1 ? "envío en camino por recibir" : "envíos en camino por recibir"}`,
  ]
    .filter(Boolean)
    .join(" · ");
  // Primero los pedidos: el cliente está esperando en la caja
  const noticeTarget =
    ordersWaiting > 0
      ? "/ventas/pedidos"
      : chatsWaiting > 0
        ? "/ventas/chats"
        : layawayAlerts.dueSoon > 0
          ? "/ventas/apartados?filtro=por-vencer"
          : layawayAlerts.refunds > 0
            ? "/ventas/apartados?filtro=por-devolver"
            : warehouseAlerts.overdue > 0
              ? "/inventario/bodega?filtro=vencido"
            : requests.toDispatch > 0
              ? "/inventario/pedidos?bandeja=incoming"
            : requests.toReceive > 0
              ? "/inventario/pedidos?bandeja=mine"
            : seesChats
              ? "/ventas/chats"
              : null;

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
        <SeasonSky variant="app" />
        <div className="header__inner">
          <Link to="/welcome" className="header__logo" aria-label={`${brand.displayName} - Inicio`}>
            <SeasonAccessory className="season-accessory--header" />
            <img src={brand.logoUrl} alt="" className={`header__logo-image ${brand.hasLogo ? "header__logo-image--company" : ""}`.trim()} />
            <BrandWordmark name={brand.displayName} tagline={brand.tagline} size="header" className="header__wordmark" />
          </Link>

          <div className="header__actions">
            <BranchSelector className="header__branch" />

            <button
              type="button"
              className="icon-button"
              aria-label={notifications > 0 ? `Avisos: ${noticeLabel}` : "Notificaciones"}
              title={notifications > 0 ? noticeLabel : undefined}
              onClick={noticeTarget ? () => navigate(noticeTarget) : undefined}
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
        <SeasonGarland />
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

        <BranchSelector className="drawer__branch" />

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