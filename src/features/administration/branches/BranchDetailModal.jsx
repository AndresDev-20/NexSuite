import { useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import { formatCurrency } from "../../../utils/money";
import normalizeText from "../../../utils/normalizeText";
import { formatDateTime } from "../audit/auditOptions";
import { getUnitShort } from "../../inventory/products/productOptions";
import { Warranty } from "../../inventory/productUnits/ProductUnitsTable";
import { formatDate } from "../../inventory/productUnits/productUnitOptions";
import useBranchOverview from "./useBranchOverview";
import "../../inventory/productUnits/productUnitsTable.css";
import "../../../styles/sheet.css";

// Filas que se listan por sección; las demás se consultan en su módulo
const MAX_SHOWN = 100;
const quantityFormatter = new Intl.NumberFormat("es-CO");

const STOCK_STATUS = {
  agotado: { label: "Agotado", tone: "empty" },
  bajo: { label: "Bajo mínimo", tone: "low" },
  ok: { label: "Disponible", tone: "ok" },
};

const STOCK_FILTERS = [
  { value: "", label: "Todos" },
  { value: "agotado", label: "Agotados" },
  { value: "bajo", label: "Bajo mínimo" },
];

const Kpi = ({ label, value, tone }) => (
  <div className={`sheet__kpi ${tone ? `sheet__kpi--${tone}` : ""}`.trim()}>
    <span className="sheet__kpi-value">{value}</span>
    <span className="sheet__kpi-label">{label}</span>
  </div>
);

const Section = ({ title, count, children }) => (
  <section className="sheet__section">
    <h3 className="sheet__section-title">
      {title}
      {count !== undefined && <span className="sheet__section-count">{count}</span>}
    </h3>
    {children}
  </section>
);

/** Aviso cuando la lista se corta. */
const More = ({ shown, total }) =>
  total > shown ? <p className="sheet__more">{`Se muestran ${shown} de ${total}: usa la búsqueda para encontrar el resto.`}</p> : null;

/* ---------- Productos y existencias ---------- */
const StockSection = ({ stock, onViewMovements }) => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const counts = { "": stock.products, agotado: stock.empty, bajo: stock.low };

  const filtered = useMemo(() => {
    const term = normalizeText(query.trim());
    return stock.items.filter(
      (item) => (!status || item.status === status) && (!term || normalizeText(`${item.name} ${item.sku} ${item.category}`).includes(term))
    );
  }, [stock.items, query, status]);
  const shown = filtered.slice(0, MAX_SHOWN);

  return (
    <Section title="Productos y existencias" count={stock.products}>
      {stock.products === 0 ? (
        <p className="sheet__empty">Aún no tiene productos asignados. Llegan al crearlos (Asignar a sucursales) o con las compras.</p>
      ) : (
        <>
          <div className="sheet__chips" role="group" aria-label="Filtrar productos por estado">
            {STOCK_FILTERS.filter((filter) => filter.value === "" || counts[filter.value] > 0).map((filter) => (
              <button
                type="button"
                key={filter.value}
                className={`sheet__chip ${status === filter.value ? "sheet__chip--on" : ""}`.trim()}
                aria-pressed={status === filter.value}
                onClick={() => setStatus(filter.value)}
              >
                {filter.label} · {counts[filter.value]}
              </button>
            ))}
          </div>
          <SearchInput label="Buscar producto" placeholder="Buscar por nombre, SKU o categoría" value={query} onChange={setQuery} />

          {filtered.length === 0 ? (
            <p className="sheet__empty">Ningún producto coincide con la búsqueda.</p>
          ) : (
            <ul className="sheet__rows">
              {shown.map((item) => {
                const badge = STOCK_STATUS[item.status];
                return (
                  <li className="sheet__row" key={item.id}>
                    <div className="sheet__row-main">
                      <span className="sheet__row-title">{item.name}</span>
                      <span className="sheet__row-meta">
                        {item.sku}
                        {item.category && ` · ${item.category}`}
                        {item.hasSerial && " · Con serial"}
                        {!item.isActive && " · Inactivo"}
                      </span>
                    </div>
                    <div className="sheet__row-side">
                      <span className="sheet__number">
                        {quantityFormatter.format(item.quantity)} {getUnitShort(item.unit)}
                      </span>
                      {item.minQuantity > 0 && <span className="sheet__row-meta">Mín. {item.minQuantity}</span>}
                      <span className={`sheet__badge sheet__badge--${badge.tone}`}>{badge.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <More shown={shown.length} total={filtered.length} />
        </>
      )}
      {onViewMovements && (
        <button type="button" className="sheet__link" onClick={onViewMovements}>
          Ver los movimientos de esta sucursal en el kárdex
        </button>
      )}
    </Section>
  );
};

/* ---------- IMEI / seriales disponibles ---------- */
const UnitsSection = ({ units }) => {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const term = normalizeText(query.trim()).replace(/\s+/g, "");
    return units.available.filter(
      (unit) => !term || normalizeText(`${unit.serial}${unit.imei2 ?? ""}${unit.productName}`).replace(/\s+/g, "").includes(term)
    );
  }, [units.available, query]);
  const shown = filtered.slice(0, MAX_SHOWN);
  const others = units.total - units.available.length;

  return (
    <Section title="IMEI y seriales disponibles" count={units.available.length}>
      {units.available.length === 0 ? (
        <p className="sheet__empty">No hay unidades con serial disponibles en esta sucursal.</p>
      ) : (
        <>
          <SearchInput label="Buscar IMEI o serial" placeholder="Buscar IMEI, serial o producto" value={query} onChange={setQuery} />
          {filtered.length === 0 ? (
            <p className="sheet__empty">Ninguna unidad coincide con la búsqueda.</p>
          ) : (
            <ul className="sheet__rows">
              {shown.map((unit) => (
                <li className="sheet__row" key={unit.id}>
                  <div className="sheet__row-main">
                    <span className="sheet__mono">{unit.serial}</span>
                    {unit.imei2 && <span className="sheet__row-meta">IMEI 2: {unit.imei2}</span>}
                    <span className="sheet__row-meta">
                      {unit.productName} · {unit.supplierName || "Sin proveedor"} · Ingresó {formatDate(unit.receivedAt)}
                    </span>
                  </div>
                  <div className="sheet__row-side">
                    <Warranty unit={unit} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <More shown={shown.length} total={filtered.length} />
        </>
      )}
      {others > 0 && (
        <p className="sheet__more">
          Además: {units.counts.garantia > 0 && `${units.counts.garantia} en garantía · `}
          {units.counts.vendido > 0 && `${units.counts.vendido} vendidas · `}
          {units.counts.devuelto_proveedor > 0 && `${units.counts.devuelto_proveedor} devueltas al proveedor · `}
          {units.counts.baja > 0 && `${units.counts.baja} de baja · `}
          consúltalas en Unidades con serial.
        </p>
      )}
    </Section>
  );
};

/* ---------- Personal ---------- */
const StaffSection = ({ staff }) => (
  <Section title="Personal asignado" count={staff.length}>
    {staff.length === 0 ? (
      <p className="sheet__empty">No hay usuarios asignados. Asígnalos en Administrativo → Usuarios.</p>
    ) : (
      <ul className="sheet__rows">
        {staff.map((user) => (
          <li className="sheet__row" key={user.id}>
            <div className="sheet__row-main">
              <span className="sheet__row-title">{user.name}</span>
              <span className="sheet__row-meta">{user.role || "Sin rol"}</span>
            </div>
            <div className="sheet__row-side">
              <span className={`sheet__badge ${user.isActive ? "sheet__badge--ok" : ""}`.trim()}>
                {user.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    )}
  </Section>
);

/* ---------- Cajas y turnos ---------- */
const RegistersSection = ({ registers }) => (
  <Section title="Cajas y turnos" count={registers.length}>
    {registers.length === 0 ? (
      <p className="sheet__empty">No tiene cajas. Créalas en Caja → Cajas.</p>
    ) : (
      <ul className="sheet__rows">
        {registers.map((register) => (
          <li className="sheet__row" key={register.id}>
            <div className="sheet__row-main">
              <span className="sheet__row-title">{register.name}</span>
              <span className="sheet__row-meta">
                {register.openSession
                  ? `Abierta por ${register.openSession.userName} · desde ${formatDateTime(register.openSession.openedAt)}`
                  : register.isActive
                    ? "Sin turno abierto"
                    : "Caja inactiva"}
              </span>
            </div>
            <div className="sheet__row-side">
              <span className={`sheet__badge ${register.openSession ? "sheet__badge--ok" : ""}`.trim()}>
                {register.openSession ? "Turno abierto" : "Cerrada"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    )}
  </Section>
);

/* ---------- Ficha ---------- */
const BranchSheet = ({ listed, onClose, onEdit, onViewMovements }) => {
  const { overview, loading, error, reload } = useBranchOverview(listed.id);
  const branch = overview?.branch ?? { name: listed.nameBranch, address: listed.address, email: listed.email, phone: listed.number };
  const { stock, units, staff, registers } = overview ?? {};
  const openRegisters = registers?.filter((register) => register.openSession).length ?? 0;

  return (
    <div className="sheet">
      <header className="sheet__head">
        <p className="sheet__name">{branch.name}</p>
        <ul className="sheet__facts">
          {branch.address && <li>{branch.address}</li>}
          {branch.phone && (
            <li>
              <a href={`tel:${branch.phone.replace(/[^\d+]/g, "")}`}>{branch.phone}</a>
            </li>
          )}
          {branch.email && (
            <li>
              <a href={`mailto:${branch.email}`}>{branch.email}</a>
            </li>
          )}
        </ul>
      </header>

      {overview && (
        <div className="sheet__kpis">
          {stock && <Kpi label="Productos" value={stock.products} />}
          {stock && <Kpi label="Unidades en existencia" value={quantityFormatter.format(stock.units)} />}
          {stock && stock.empty > 0 && <Kpi label="Agotados" value={stock.empty} tone="empty" />}
          {stock && stock.low > 0 && <Kpi label="Bajo mínimo" value={stock.low} tone="low" />}
          {stock?.costValue != null && <Kpi label="Inventario a costo" value={formatCurrency(stock.costValue)} tone="money" />}
          {units && <Kpi label="IMEI disponibles" value={units.available.length} />}
          {staff && <Kpi label="Personal" value={staff.length} />}
          {registers && <Kpi label="Cajas abiertas" value={`${openRegisters} de ${registers.length}`} tone={openRegisters > 0 ? "ok" : undefined} />}
        </div>
      )}

      {loading && (
        <div className="sheet__loading" role="status" aria-live="polite">
          Cargando productos, unidades, personal y cajas…
        </div>
      )}
      {error && (
        <div className="sheet__error" role="alert">
          <span>{error}</span>
          <Button variant="outline" icon="refresh" onClick={reload}>
            Reintentar
          </Button>
        </div>
      )}

      {stock && <StockSection stock={stock} onViewMovements={onViewMovements} />}
      {units && <UnitsSection units={units} />}
      {staff && <StaffSection staff={staff} />}
      {registers && <RegistersSection registers={registers} />}

      {overview && !stock && !units && !staff && !registers && (
        <p className="sheet__empty">No tienes permisos para ver el inventario, el personal ni las cajas de esta sucursal.</p>
      )}

      <FormActions>
        {onEdit ? (
          <Button icon="edit" onClick={() => onEdit(listed)}>
            Editar
          </Button>
        ) : (
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        )}
      </FormActions>
    </div>
  );
};

/**
 * Ficha completa de una sucursal: datos, productos y existencias, IMEI disponibles, personal y
 * cajas. Cada sección sale solo si el servidor la envía (según los permisos del usuario).
 * branch: el de la lista (se muestra mientras carga). onEdit y onViewMovements(branch) son opcionales.
 */
const BranchDetailModal = ({ branch, onClose, onEdit, onViewMovements }) => (
  <Modal open={Boolean(branch)} title="Ficha de la sucursal" size="wide" onClose={onClose}>
    {branch && (
      <BranchSheet
        key={branch.id}
        listed={branch}
        onClose={onClose}
        onEdit={onEdit}
        onViewMovements={onViewMovements && (() => onViewMovements(branch))}
      />
    )}
  </Modal>
);

export default BranchDetailModal;
