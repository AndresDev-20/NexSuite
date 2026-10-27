import Switch from "../../../components/forms/Switch/Switch";
import "./permissionGroups.css";

/** canAssign / canRemove: activar o quitar (los roles del sistema y los permisos del usuario lo limitan). */
const PermissionGroups = ({ groups, assigned, pending, canAssign = true, canRemove = true, onToggle }) => (
  <div className="permission-groups">
    {groups.map((group) => {
      const active = group.items.filter((item) => assigned.has(item.id)).length;

      return (
        <section className="permission-groups__group" key={group.title}>
          <header className="permission-groups__header">
            <h2 className="permission-groups__title">{group.title}</h2>
            <span className="permission-groups__count">
              {active}/{group.items.length}
            </span>
          </header>

          <ul className="permission-groups__list">
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
        </section>
      );
    })}
  </div>
);

export default PermissionGroups;