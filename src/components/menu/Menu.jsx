import { useId, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import usePermissions from "../../features/auth/usePermissions";
import Icon from "../ui/Icon/Icon";
import "./menu.css";

/* Opciones de navegación. Una opción sin "permission" es visible para todos; con una lista, basta uno. */
const NAV_ITEMS = [
  { label: "Inicio", to: "/welcome", icon: "home" },
  // Administrativo justo después de Inicio: usuarios, roles y sucursales se configuran primero
  {
    label: "Administrativo",
    icon: "shield",
    children: [
      {
        label: "Usuarios",
        to: "/administrativo/usuarios",
        permission: "users.read",
      },
      { label: "Roles", to: "/administrativo/roles", permission: "roles.read" },
      {
        label: "Sucursales",
        to: "/administrativo/sucursales",
        permission: "branches.read",
      },
      {
        label: "Auditoría",
        to: "/administrativo/auditoria",
        permission: "audit.read",
      },
    ],
  },
  // Primero Compras: el proveedor y la compra van antes que los productos y su inventario
  {
    label: "Compras",
    icon: "bag",
    children: [
      {
        label: "Proveedores",
        to: "/compras/proveedores",
        permission: "suppliers.read",
      },
      {
        label: "Compras",
        to: "/compras/registro",
        permission: "orders.read",
      },
      {
        label: "Cuentas por pagar",
        to: "/compras/cuentas-por-pagar",
        permission: "payables.read",
      },
    ],
  },
  {
    label: "Inventarios",
    icon: "box",
    children: [
      {
        label: "Categorías",
        to: "/inventario/categorias",
        permission: "categories.read",
      },
      {
        label: "Productos",
        to: "/inventario/productos",
        permission: "products.read",
      },
      // Debajo de Productos: lo que se consulta, ajusta y corrige de lo que ya entró
      {
        label: "Existencias",
        to: "/inventario/existencias",
        permission: "branch-stock.read",
      },
      {
        label: "Unidades con serial",
        to: "/inventario/seriales",
        permission: "product-units.read",
      },
      {
        label: "Movimientos",
        to: "/inventario/movimientos",
        permission: "branch-stock.read",
      },
      {
        label: "Traslados",
        to: "/inventario/traslados",
        permission: "transfers.read",
      },
      {
        label: "Toma física",
        to: "/inventario/toma-fisica",
        permission: "stock-counts.read",
      },
    ],
  },
  {
    label: "Ventas",
    icon: "cart",
    children: [
      { label: "Vender", to: "/ventas/vender", permission: "sales.create" },
      { label: "Ventas", to: "/ventas/historial", permission: "sales.read" },
      { label: "Clientes", to: "/ventas/clientes", permission: "customers.read" },
      { label: "Cartera", to: "/ventas/cartera", permission: ["receivables.read", "receivables.pay"] },
      { label: "Reportes", to: "/ventas/reportes", permission: ["sales.read", "sales.read-all"] },
    ],
  },
  {
    label: "Caja",
    icon: "wallet",
    children: [
      { label: "Mi caja", to: "/caja/mi-caja", permission: "cash-sessions.operate" },
      { label: "Turnos", to: "/caja/turnos", permission: "cash-sessions.read" },
      { label: "Cajas", to: "/caja/cajas", permission: "cash-registers.read" },
    ],
  },
  // Al final y para todos: tema (claro / noche), animaciones y tamaño del texto de este equipo
  { label: "Configuración", to: "/configuracion", icon: "settings" },
];

const getLinkClass =
  (block) =>
  ({ isActive }) =>
    `${block} ${isActive ? `${block}--active` : ""}`.trim();

const MenuGroup = ({
  item,
  index,
  id,
  isActive,
  isOpen,
  onToggle,
  onNavigate,
}) => (
  <li className="menu__item" style={{ "--i": index }}>
    <button
      type="button"
      className={`menu__link ${isActive ? "menu__link--active" : ""}`.trim()}
      aria-expanded={isOpen}
      aria-controls={id}
      onClick={onToggle}
    >
      <span className="menu__icon-box">
        <Icon name={item.icon} className="menu__icon" />
      </span>
      <span className="menu__text">{item.label}</span>
      <Icon
        name="chevron"
        className={`menu__chevron ${isOpen ? "menu__chevron--open" : ""}`.trim()}
      />
    </button>

    <div
      id={id}
      className={`menu__submenu ${isOpen ? "menu__submenu--open" : ""}`.trim()}
    >
      <div className="menu__submenu-inner">
        <ul className="menu__sublist">
          {item.children.map((child) => (
            <li key={child.to}>
              <NavLink
                to={child.to}
                onClick={onNavigate}
                className={getLinkClass("menu__sublink")}
              >
                {child.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </li>
);

const Menu = ({ onNavigate }) => {
  const { pathname } = useLocation();
  const { can } = usePermissions();
  const baseId = useId(); // el Menu se monta en el sidebar y en el drawer: los ids no pueden repetirse
  // Un solo grupo abierto (acordeón). Lo que abre o cierra el usuario vale mientras siga en la misma
  // página; al navegar queda abierto solo el grupo de la página actual y los demás se cierran
  const [manual, setManual] = useState({ pathname: null, label: null }); // label null = todos cerrados

  // Deja solo lo que el usuario puede ver; un grupo sin opciones desaparece
  const items = useMemo(
    () =>
      NAV_ITEMS.map((item) =>
        item.children
          ? {
              ...item,
              children: item.children.filter((child) => can(child.permission)),
            }
          : item,
      ).filter((item) =>
        item.children ? item.children.length > 0 : can(item.permission),
      ),
    [can],
  );

  const isGroupActive = (item) =>
    item.children.some((child) => pathname.startsWith(child.to));
  const activeGroup = items.find((item) => item.children && isGroupActive(item))?.label ?? null;
  const openLabel = manual.pathname === pathname ? manual.label : activeGroup;
  const isGroupOpen = (item) => openLabel === item.label;
  // Abrir un grupo cierra el que estaba abierto; tocar el abierto lo cierra
  const toggleGroup = (item) =>
    setManual({ pathname, label: openLabel === item.label ? null : item.label });

  return (
    <nav className="menu" aria-label="Navegación principal">
      <ul className="menu__list">
        {items.map((item, index) =>
          item.children ? (
            <MenuGroup
              key={item.label}
              item={item}
              index={index}
              id={`${baseId}-submenu-${index}`}
              isActive={isGroupActive(item)}
              isOpen={isGroupOpen(item)}
              onToggle={() => toggleGroup(item)}
              onNavigate={onNavigate}
            />
          ) : (
            <li className="menu__item" key={item.to} style={{ "--i": index }}>
              <NavLink
                to={item.to}
                end
                onClick={onNavigate}
                className={getLinkClass("menu__link")}
              >
                <span className="menu__icon-box">
                  <Icon name={item.icon} className="menu__icon" />
                </span>
                <span className="menu__text">{item.label}</span>
              </NavLink>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
};

export default Menu;
