import { useState } from "react";
import Icon from "../../../components/ui/Icon/Icon";
import Switch from "../../../components/forms/Switch/Switch";
import "./permissionGroups.css";

/**
 * Grupos de permisos de un módulo (rediseño 2026-11-24): cada grupo es una tarjeta plegable con su avance y
 * botones para activar o quitar todo el grupo de una vez.
 * canAssign / canRemove: activar o quitar (los roles del sistema y los permisos del usuario lo limitan).
 */
const PermissionGroup = ({ group, assigned, pending, canAssign, canRemove, onToggle, onToggleGroup, showModule }) => {
  const [open, setOpen] = useState(true);
  const active = group.items.filter((item) => assigned.has(item.id)).length;
  const total = group.items.length;
  const busy = group.items.some((item) => pending.has(item.id));
  const title = showModule ? group.title : group.section || group.module;
  const bodyId = `permission-group-${group.title.replace(/\W+/g, "-")}`;

  return (
    <section className={`permission-groups__group ${open ? "" : "permission-groups__group--closed"}`.trim()}>
      <header className="permission-groups__header">
        <button type="button" className="permission-groups__toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
          <Icon name="chevron" className="permission-groups__chevron" />
          <span className="permission-groups__title">{title}</span>
          <span className={`permission-groups__count ${active === total ? "permission-groups__count--full" : ""}`.trim()}>
            {active}/{total}
          </span>
        </button>

        <div className="permission-groups__bulk">
          {canAssign && active < total && (
            <button type="button" className="permission-groups__bulk-btn" disabled={busy} onClick={() => onToggleGroup(group, true)}>
              <Icon name="check" />
              Activar todos
            </button>
          )}
          {canRemove && active > 0 && (
            <button type="button" className="permission-groups__bulk-btn permission-groups__bulk-btn--off" disabled={busy} onClick={() => onToggleGroup(group, false)}>
              <Icon name="x" />
              Quitar todos
            </button>
          )}
        </div>
      </header>

      <div className="permission-groups__meter" aria-hidden="true">
        <span style={{ width: `${total ? (active / total) * 100 : 0}%` }} />
      </div>

      {open && (
        <ul className="permission-groups__list" id={bodyId}>
          {group.items.map((item) => (
            <li className="permission-groups__item" key={item.id}>
              <Switch
                label={item.label}
                description={item.description}
                checked={assigned.has(item.id)}
                disabled={pending.has(item.id) || (assigned.has(item.id) ? !canRemove : !canAssign)}
                onChange={(checked) => onToggle(item.id, checked)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const PermissionGroups = ({ groups, showModule = false, ...props }) => (
  <div className="permission-groups">
    {groups.map((group) => (
      <PermissionGroup key={group.title} group={group} showModule={showModule} {...props} />
    ))}
  </div>
);

export default PermissionGroups;
