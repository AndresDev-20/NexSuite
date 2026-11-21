import Icon from "../../../components/ui/Icon/Icon";
import "./purchasePicker.css";

const timeAgo = (value) => {
  const minutes = Math.max(Math.round((Date.now() - new Date(value).getTime()) / 60000), 0);
  if (minutes < 60) return minutes <= 1 ? "hace un momento" : `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.round(hours / 24);
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
};

const Option = ({ purchase, selected, onSelect }) => (
  <li>
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`purchase-pick ${selected ? "purchase-pick--on" : ""} ${purchase.recent ? "purchase-pick--recent" : ""}`.trim()}
      onClick={() => onSelect(purchase.id)}
    >
      <span className="purchase-pick__icon" aria-hidden="true">
        <Icon name={selected ? "check" : "cart"} />
      </span>
      <span className="purchase-pick__body">
        <strong className="purchase-pick__title">{purchase.title}</strong>
        <span className="purchase-pick__meta">
          {purchase.number} · {purchase.suppliers === 0 ? "vacía" : `${purchase.suppliers} ${purchase.suppliers === 1 ? "proveedor" : "proveedores"} · ${purchase.products} ${purchase.products === 1 ? "producto" : "productos"}`} ·{" "}
          {timeAgo(purchase.createdAt)}
        </span>
      </span>
    </button>
  </li>
);

/**
 * «¿A qué compra va?» (Fase 32.3): las compras en borrador, las de las últimas 24 horas primero. value: id elegido o
 * null (ninguna: queda como inventario inicial). state: { status: loading | ready | error, items }.
 */
const PurchasePicker = ({ state, value, onChange }) => {
  const recent = state.items.filter((purchase) => purchase.recent);
  const older = state.items.filter((purchase) => !purchase.recent);
  return (
    <fieldset className="purchase-picker">
      <legend className="purchase-picker__legend">¿A qué compra va?</legend>
      <p className="purchase-picker__hint">
        Elige la compra que estás descargando: el producto entra a ella con su proveedor, su costo y las cantidades de abajo, y las unidades llegan a
        las sucursales al confirmar la compra.
      </p>
      {state.status === "loading" && <p className="purchase-picker__hint">Buscando las compras abiertas…</p>}
      {state.status === "error" && <p className="purchase-picker__hint">No se pudieron cargar las compras abiertas.</p>}
      <div className="purchase-picker__groups" role="radiogroup" aria-label="¿A qué compra va?">
        <ul className="purchase-picker__list">
          <li>
            <button
              type="button"
              role="radio"
              aria-checked={value === null}
              className={`purchase-pick purchase-pick--none ${value === null ? "purchase-pick--on" : ""}`.trim()}
              onClick={() => onChange(null)}
            >
              <span className="purchase-pick__icon" aria-hidden="true">
                <Icon name={value === null ? "check" : "box"} />
              </span>
              <span className="purchase-pick__body">
                <strong className="purchase-pick__title">Ninguna</strong>
                <span className="purchase-pick__meta">Queda como inventario inicial (lo que ya tenías)</span>
              </span>
            </button>
          </li>
        </ul>
        {recent.length > 0 && (
          <>
            <span className="purchase-picker__group">Recientes · últimas 24 horas</span>
            <ul className="purchase-picker__list">
              {recent.map((purchase) => (
                <Option key={purchase.id} purchase={purchase} selected={value === purchase.id} onSelect={onChange} />
              ))}
            </ul>
          </>
        )}
        {older.length > 0 && (
          <>
            <span className="purchase-picker__group">Anteriores</span>
            <ul className="purchase-picker__list">
              {older.map((purchase) => (
                <Option key={purchase.id} purchase={purchase} selected={value === purchase.id} onSelect={onChange} />
              ))}
            </ul>
          </>
        )}
        {state.status === "ready" && state.items.length === 0 && (
          <p className="purchase-picker__hint">No hay compras abiertas. Ábrela en Compras → Nueva compra para mandar productos a ella.</p>
        )}
      </div>
    </fieldset>
  );
};

export default PurchasePicker;
