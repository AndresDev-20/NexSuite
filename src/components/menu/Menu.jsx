import { useId, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import usePermissions from "../../features/auth/usePermissions";
import Icon from "../ui/Icon/Icon";
import NAV_ITEMS from "./navItems";
import "./menu.css";


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
