import { useId, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import Icon from "../ui/Icon/Icon";
import "./menu.css";

/* Opciones de navegación. Cuando agreguemos permisos, esta lista se filtrará. */
const NAV_ITEMS = [
  { label: "Inicio", to: "/welcome", icon: "home" },
  {
    label: "Administrativo",
    icon: "shield",
    children: [
      { label: "Usuarios", to: "/administrativo/usuarios" },
      { label: "Roles y permisos", to: "/administrativo/roles" },
      { label: "Sucursales", to: "/administrativo/sucursales" },
    ],
  },
];

const getLinkClass = (block) => ({ isActive }) =>
  `${block} ${isActive ? `${block}--active` : ""}`.trim();

const MenuGroup = ({ item, index, id, isActive, isOpen, onToggle, onNavigate }) => (
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

    <div id={id} className={`menu__submenu ${isOpen ? "menu__submenu--open" : ""}`.trim()}>
      <div className="menu__submenu-inner">
        <ul className="menu__sublist">
          {item.children.map((child) => (
            <li key={child.to}>
              <NavLink to={child.to} onClick={onNavigate} className={getLinkClass("menu__sublink")}>
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
  const baseId = useId(); // el Menu se monta en el sidebar y en el drawer: los ids no pueden repetirse
  const [toggled, setToggled] = useState({});

  const isGroupActive = (item) => item.children.some((child) => pathname.startsWith(child.to));
  const isGroupOpen = (item) => toggled[item.label] ?? isGroupActive(item);
  const toggleGroup = (item) =>
    setToggled((prev) => ({ ...prev, [item.label]: !isGroupOpen(item) }));

  return (
    <nav className="menu" aria-label="Navegación principal">
      <ul className="menu__list">
        {NAV_ITEMS.map((item, index) =>
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
              <NavLink to={item.to} end onClick={onNavigate} className={getLinkClass("menu__link")}>
                <span className="menu__icon-box">
                  <Icon name={item.icon} className="menu__icon" />
                </span>
                <span className="menu__text">{item.label}</span>
              </NavLink>
            </li>
          )
        )}
      </ul>
    </nav>
  );
};

export default Menu;