import { useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import { calculateMargin, formatCurrency } from "../../../utils/money";
import normalizeText from "../../../utils/normalizeText";
import { formatDateTime } from "../../administration/audit/auditOptions";
import StockAdjustModal from "../branchStock/StockAdjustModal";
import { adjustPermissions, postAdjustment } from "../branchStock/stockAdjustments";
import { formatDelta } from "../branchStock/stockOptions";
import usePermissions from "../../auth/usePermissions";
import useToast from "../../../components/feadback/Toast/useToast";
import { Warranty } from "../productUnits/ProductUnitsTable";
import { UNIT_STATUSES, formatDate, getStatusLabel } from "../productUnits/productUnitOptions";
import { getUnitLabel, getUnitShort } from "./productOptions";
import useProductOverview from "./useProductOverview";
import "../productUnits/productUnitsTable.css";
import "./productDetailModal.css";

const EMPTY = "—";
// Unidades que se listan en la ficha; las demás se consultan en Unidades con serial
const MAX_SHOWN_UNITS = 50;
const quantityFormatter = new Intl.NumberFormat("es-CO");

const STOCK_STATUS = {
  agotado: { label: "Agotado", tone: "empty" },
  bajo: { label: "Bajo mínimo", tone: "low" },
  ok: { label: "Disponible", tone: "ok" },
};

const Item = ({ label, wide = false, children }) => (
  <div className={`product-detail__item ${wide ? "product-detail__item--wide" : ""}`.trim()}>
    <dt className="product-detail__label">{label}</dt>
    <dd className="product-detail__value">{children || EMPTY}</dd>
  </div>
);

const Kpi = ({ label, value, tone }) => (
  <div className={`product-detail__kpi ${tone ? `product-detail__kpi--${tone}` : ""}`.trim()}>
    <span className="product-detail__kpi-value">{value}</span>
    <span className="product-detail__kpi-label">{label}</span>
  </div>
);

const Section = ({ title, count, children }) => (
  <section className="product-detail__section">
    <h3 className="product-detail__section-title">
      {title}
      {count !== undefined && <span className="product-detail__section-count">{count}</span>}
    </h3>
    {children}
  </section>
);

const marginText = (product) => {
  const margin = calculateMargin(product.costPrice, product.salePrice);
  return margin ? `${formatCurrency(margin.profit)} · ${margin.percent.toFixed(1)}%` : EMPTY;
};

/* ---------- Existencias en cada sucursal ---------- */
const StockSection = ({ stock, unit, onAdjust }) => (
  <Section title="Existencias por sucursal" count={stock.branches.length}>
    {stock.branches.length === 0 ? (
      <p className="product-detail__empty">No está asignado a ninguna de tus sucursales.</p>
    ) : (
      <ul className="product-detail__rows">
        {stock.branches.map((row) => {
          const status = STOCK_STATUS[row.status];
          return (
            <li className="product-detail__row" key={row.id}>
              <div className="product-detail__row-main">
                <span className="product-detail__row-title">{row.branchName}</span>
                <span className="product-detail__row-meta">
                  {row.minQuantity > 0 ? `Mínimo ${row.minQuantity} ${getUnitShort(unit)}` : "Sin mínimo"}
                </span>
              </div>
              <div className="product-detail__row-side">
                <strong className="product-detail__row-number">
                  {quantityFormatter.format(row.quantity)} {getUnitShort(unit)}
                </strong>
                <span className={`product-detail__badge product-detail__badge--${status.tone}`}>{status.label}</span>
                {onAdjust && (
                  <Button
                    variant="outline"
                    icon="edit"
                    className="product-detail__adjust"
                    aria-label={`Ajustar en ${row.branchName}`}
                    onClick={() => onAdjust(row)}
                  >
                    Ajustar
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </Section>
);

/* ---------- Unidades con serial: conteo por estado, búsqueda y lista ---------- */
const UnitsSection = ({ units, onViewUnits }) => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    const term = normalizeText(query.trim()).replace(/\s+/g, "");
    return units.items.filter(
      (unit) =>
        (!status || unit.status === status) &&
        (!term || normalizeText(`${unit.serial}${unit.imei2 ?? ""}${unit.branchName}`).replace(/\s+/g, "").includes(term))
    );
  }, [units.items, query, status]);
  const shown = filtered.slice(0, MAX_SHOWN_UNITS);

  return (
    <Section title="Unidades con serial (IMEI / serial)" count={units.total}>
      {units.total === 0 ? (
        <p className="product-detail__empty">No hay unidades registradas en tus sucursales.</p>
      ) : (
        <>
          <div className="product-detail__chips" role="group" aria-label="Filtrar unidades por estado">
            <button
              type="button"
              className={`product-detail__chip ${status === "" ? "product-detail__chip--on" : ""}`.trim()}
              aria-pressed={status === ""}
              onClick={() => setStatus("")}
            >
              Todas · {units.total}
            </button>
            {UNIT_STATUSES.filter((item) => units.counts[item.value] > 0).map((item) => (
              <button
                type="button"
                key={item.value}
                className={`product-detail__chip ${status === item.value ? "product-detail__chip--on" : ""}`.trim()}
                aria-pressed={status === item.value}
                onClick={() => setStatus((current) => (current === item.value ? "" : item.value))}
              >
                {item.label} · {units.counts[item.value]}
              </button>
            ))}
          </div>

          <SearchInput label="Buscar IMEI o serial" placeholder="Buscar IMEI, serial o sucursal" value={query} onChange={setQuery} />

          {filtered.length === 0 ? (
            <p className="product-detail__empty">Ninguna unidad coincide con la búsqueda.</p>
          ) : (
            <ul className="product-detail__rows">
              {shown.map((unit) => (
                <li className="product-detail__row product-detail__row--unit" key={unit.id}>
                  <div className="product-detail__row-main">
                    <span className="unit-cell__serial">{unit.serial}</span>
                    {unit.imei2 && <span className="product-detail__row-meta">IMEI 2: {unit.imei2}</span>}
                    <span className="product-detail__row-meta">
                      {unit.branchName} · {unit.supplierName || "Sin proveedor"}
                      {unit.supplierPhone && ` · ${unit.supplierPhone}`} · Ingresó {formatDate(unit.receivedAt)}
                    </span>
                  </div>
                  <div className="product-detail__row-side">
                    <span className={`unit-cell__status unit-cell__status--${unit.status}`}>{getStatusLabel(unit.status)}</span>
                    <Warranty unit={unit} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {(filtered.length > shown.length || onViewUnits) && (
            <p className="product-detail__more">
              {filtered.length > shown.length && `Se muestran ${shown.length} de ${filtered.length}. `}
              {onViewUnits && (
                <button type="button" className="product-detail__link" onClick={onViewUnits}>
                  Abrir en Unidades con serial
                </button>
              )}
            </p>
          )}
        </>
      )}
    </Section>
  );
};

/* ---------- Últimos movimientos del kárdex ---------- */
const MovementsSection = ({ movements, onViewMovements }) => (
  <Section title="Últimos movimientos" count={movements.total}>
    {movements.items.length === 0 ? (
      <p className="product-detail__empty">Aún no tiene movimientos en tus sucursales.</p>
    ) : (
      <ul className="product-detail__rows">
        {movements.items.map((movement) => (
          <li className="product-detail__row" key={movement.id}>
            <div className="product-detail__row-main">
              <span className="product-detail__row-title">{movement.label}</span>
              {movement.note && <span className="product-detail__row-meta">{movement.note}</span>}
              <span className="product-detail__row-meta">
                {formatDateTime(movement.createdAt)} · {movement.branchName} · {movement.userName ?? "Sistema"}
              </span>
            </div>
            <div className="product-detail__row-side">
              <span className={`product-detail__delta product-detail__delta--${movement.quantity > 0 ? "in" : "out"}`}>
                {formatDelta(movement.quantity)}
              </span>
              <span className="product-detail__row-meta">Saldo {movement.balance}</span>
            </div>
          </li>
        ))}
      </ul>
    )}
    {onViewMovements && movements.total > 0 && (
      <button type="button" className="product-detail__link" onClick={onViewMovements}>
        {movements.total > movements.items.length ? `Ver los ${movements.total} movimientos en el kárdex` : "Abrir en el kárdex"}
      </button>
    )}
  </Section>
);

/* ---------- Ficha ---------- */
const ProductSheet = ({ listed, onChanged, canEdit, canDelete, showCost, onClose, onEdit, onDelete, onRestore, onViewChanges, onAssign, onViewMovements, onViewUnits }) => {
  const { overview, loading, error, reload } = useProductOverview(listed.id);
  const { can } = usePermissions();
  const toast = useToast();
  const [adjusting, setAdjusting] = useState(null); // fila de existencias que se ajusta
  // Mientras carga se muestra lo que ya trae la lista
  const product = overview?.product ?? listed;
  const stock = overview?.stock;
  const units = overview?.units;
  const movements = overview?.movements;
  const total = stock ? stock.total : product.quantity;

  return (
    <div className="product-detail">
      <header className="product-detail__head">
        <p className="product-detail__name">{product.name}</p>
        <div className="product-detail__tags">
          <span className="product-detail__sku">{product.sku}</span>
          <span className={`product-detail__tag product-detail__tag--${product.isActive ? "active" : "inactive"}`}>
            {product.isActive ? "Activo" : "Inactivo"}
          </span>
          {product.hasSerial && <span className="product-detail__tag">Con serial</span>}
          {product.pendingAssignment && product.isActive && (
            <span className="product-detail__tag product-detail__tag--pending">Pendiente de asignar</span>
          )}
          {product.isArchived && <span className="product-detail__tag product-detail__tag--inactive">Archivado</span>}
        </div>
      </header>

      <div className="product-detail__kpis">
        <Kpi
          label={stock ? "En tus sucursales" : "Existencias totales"}
          value={total === null ? EMPTY : `${quantityFormatter.format(total)} ${getUnitShort(product.unit)}`}
          tone={total === 0 && !product.pendingAssignment ? "empty" : undefined}
        />
        {stock && <Kpi label="Sucursales" value={stock.branches.length} />}
        {stock && stock.empty > 0 && <Kpi label={stock.empty === 1 ? "Agotada" : "Agotadas"} value={stock.empty} tone="empty" />}
        {stock && stock.low > 0 && <Kpi label="Bajo mínimo" value={stock.low} tone="low" />}
        {units && units.counts.garantia > 0 && <Kpi label="En garantía" value={units.counts.garantia} tone="low" />}
      </div>

      {product.pendingAssignment && product.isActive && (
        <p className="product-detail__note product-detail__note--pending" role="note">
          Este producto aún no está en ninguna sucursal: asígnalo para indicar a qué sucursales llega y cuánto.
        </p>
      )}

      <Section title="Datos del producto">
        <dl className="product-detail__list">
          <Item label="Categoría">{product.categoryName}</Item>
          <Item label="Unidad de medida">{getUnitLabel(product.unit)}</Item>
          <Item label="Código de barras">{product.barcode}</Item>
          <Item label="Maneja serial">{product.hasSerial ? "Sí (IMEI o serial por unidad)" : "No"}</Item>
          {showCost && <Item label="Precio de costo">{formatCurrency(product.costPrice)}</Item>}
          <Item label="Precio de venta">{formatCurrency(product.salePrice)}</Item>
          {showCost && <Item label="Ganancia por unidad">{marginText(product)}</Item>}
          {showCost && total > 0 && (
            <Item label="Inventario a costo">{formatCurrency((product.costPrice ?? 0) * total)}</Item>
          )}
          <Item label="Descripción" wide>
            {product.description}
          </Item>
        </dl>
      </Section>

      {loading && (
        <div className="product-detail__loading" role="status" aria-live="polite">
          Cargando existencias, unidades y movimientos…
        </div>
      )}
      {error && (
        <div className="product-detail__error" role="alert">
          <span>{error}</span>
          <Button variant="outline" icon="refresh" onClick={reload}>
            Reintentar
          </Button>
        </div>
      )}

      {stock && !product.isArchived && (
        <StockSection
          stock={stock}
          unit={product.unit}
          onAdjust={(() => {
            const { canIncrease, canDecrease } = adjustPermissions(can, product.hasSerial);
            if (!canIncrease && !canDecrease) return undefined;
            return (row) =>
              setAdjusting({
                id: row.id,
                productId: product.id,
                productName: product.name,
                branchId: row.branchId,
                branchName: row.branchName,
                quantity: row.quantity,
                hasSerial: product.hasSerial,
              });
          })()}
        />
      )}

      <StockAdjustModal
        row={adjusting}
        onClose={() => setAdjusting(null)}
        onSubmit={async (payload, options) => {
          const { stock: updated } = await postAdjustment(adjusting.id, payload, options);
          toast.success(`Ajuste registrado. Quedan ${updated.quantity} en ${adjusting.branchName}.`);
          setAdjusting(null);
          reload();
          onChanged?.();
        }}
      />
      {units && <UnitsSection units={units} onViewUnits={onViewUnits} />}
      {movements && <MovementsSection movements={movements} onViewMovements={onViewMovements} />}

      {product.isArchived && (
        <p className="product-detail__note" role="note">
          Producto archivado: no aparece en las listas ni se puede usar, pero su historia (compras, movimientos e IMEI)
          queda guardada. Restáuralo si lo vuelves a vender.
        </p>
      )}

      {onViewChanges && (
        <button type="button" className="product-detail__link" onClick={() => onViewChanges(product)}>
          Ver historial de cambios
        </button>
      )}

      <FormActions>
        {product.isArchived ? (
          <>
            {onRestore && (
              <Button icon="refresh" onClick={() => onRestore(product)}>
                Restaurar
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </>
        ) : (
          <>
        {canDelete && (
          <Button variant="outline" icon="trash" className="product-detail__delete" onClick={() => onDelete(product)}>
            Eliminar
          </Button>
        )}
        {onAssign && (
          <Button
            variant={canEdit ? "outline" : "primary"}
            icon="store"
            onClick={() => onAssign(product, Object.fromEntries((stock?.branches ?? []).map((row) => [row.branchId, row.quantity])))}
          >
            {product.pendingAssignment ? "Asignar a sucursales" : "Asignar a otra sucursal"}
          </Button>
        )}
        {/* Sin data-autofocus: la ficha es larga y debe abrir desde arriba */}
        {canEdit ? (
          <Button icon="edit" onClick={() => onEdit(product)}>
            Editar
          </Button>
        ) : (
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        )}
          </>
        )}
      </FormActions>
    </div>
  );
};

/**
 * Ficha completa de un producto: datos, existencias por sucursal, IMEI/seriales y últimos
 * movimientos. Cada sección sale solo si el servidor la envía (según los permisos y las
 * sucursales del usuario). Desde aquí se edita, se asigna, se elimina (solo si nunca se usó) y
 * se abre el historial de cambios en la auditoría.
 * product: el de la lista (se muestra mientras carga la ficha). showCost: permiso "Ver costos".
 * onViewChanges, onAssign(product, { [idbranch]: cantidad }), onViewMovements(product) y
 * onViewUnits(product) son opcionales.
 * onChanged(): opcional; se llama después de ajustar existencias desde la ficha (refrescar la lista).
 */
const ProductDetailModal = ({ product, onViewMovements, onViewUnits, ...props }) => (
  <Modal open={Boolean(product)} title="Ficha del producto" size="wide" onClose={props.onClose}>
    {product && (
      <ProductSheet
        key={product.id}
        listed={product}
        onViewMovements={onViewMovements && (() => onViewMovements(product))}
        onViewUnits={onViewUnits && (() => onViewUnits(product))}
        {...props}
      />
    )}
  </Modal>
);

export default ProductDetailModal;
