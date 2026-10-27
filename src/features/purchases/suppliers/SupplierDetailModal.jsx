import { useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import { formatCurrency } from "../../../utils/money";
import { formatIdentification } from "../../../utils/nit";
import normalizeText from "../../../utils/normalizeText";
import { getUnitShort } from "../../inventory/products/productOptions";
import { Warranty } from "../../inventory/productUnits/ProductUnitsTable";
import { UNIT_STATUSES, formatDate, getStatusLabel } from "../../inventory/productUnits/productUnitOptions";
import OrderStatusBadge from "../orders/OrderStatusBadge";
import PaymentStatusBadge from "../orders/PaymentStatusBadge";
import { formatDay } from "../orders/orderOptions";
import { dueLabel, getMethodLabel } from "../orders/paymentOptions";
import { NIT_TYPE, getOrganizationLabel } from "./supplierOptions";
import useSupplierOverview from "./useSupplierOverview";
import "../../inventory/productUnits/productUnitsTable.css";
import "../../../styles/sheet.css";

// Filas que se listan por sección; las demás se consultan en su módulo
const MAX_SHOWN = 100;
const quantityFormatter = new Intl.NumberFormat("es-CO");

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

const LinkButton = ({ onClick, children }) =>
  onClick ? (
    <button type="button" className="sheet__link" onClick={onClick}>
      {children}
    </button>
  ) : null;

/* ---------- Compras ---------- */
const PurchasesSection = ({ purchases, onViewOrders }) => (
  <Section title="Compras" count={purchases.total}>
    {purchases.total === 0 ? (
      <p className="sheet__empty">Aún no le hemos comprado.</p>
    ) : (
      <ul className="sheet__rows">
        {purchases.items.map((order) => (
          <li className="sheet__row" key={order.id}>
            <div className="sheet__row-main">
              <span className="sheet__row-title">
                {order.number}
                {order.invoiceNumber && ` · Factura ${order.invoiceNumber}`}
              </span>
              <span className="sheet__row-meta">
                {formatDay(order.orderDate)} · {order.paymentTerm === "credito" ? `Crédito ${order.creditDays ?? ""} días` : "Contado"}
                {order.branches.length > 0 && ` · ${order.branches.map((branch) => branch.name).join(", ")}`}
              </span>
            </div>
            <div className="sheet__row-side">
              <span className="sheet__number">{formatCurrency(order.total)}</span>
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
          </li>
        ))}
      </ul>
    )}
    {purchases.total > purchases.items.length && (
      <p className="sheet__more">Se muestran las {purchases.items.length} más recientes de {purchases.total}.</p>
    )}
    {purchases.total > 0 && <LinkButton onClick={onViewOrders}>Ver sus compras en Compras</LinkButton>}
  </Section>
);

/* ---------- Cuenta por pagar y abonos ---------- */
const PayablesSection = ({ payables, onViewPayables }) => (
  <Section title="Cuenta por pagar" count={payables.openCount}>
    {payables.openCount === 0 ? (
      <p className="sheet__empty">No le debemos nada.</p>
    ) : (
      <ul className="sheet__rows">
        {payables.open.map((order) => (
          <li className="sheet__row" key={order.id}>
            <div className="sheet__row-main">
              <span className="sheet__row-title">{order.number}</span>
              <span className="sheet__row-meta">
                Total {formatCurrency(order.total)} · Abonado {formatCurrency(order.paidAmount)} · Vence {formatDay(order.dueDate)}
              </span>
              {dueLabel(order.dueDate, order.balance) && <span className="sheet__row-meta">{dueLabel(order.dueDate, order.balance)}</span>}
            </div>
            <div className="sheet__row-side">
              <span className="sheet__number">{formatCurrency(order.balance)}</span>
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
          </li>
        ))}
      </ul>
    )}

    <h4 className="sheet__section-title">
      Pagos realizados
      <span className="sheet__section-count">{payables.payments.length}</span>
    </h4>
    {payables.payments.length === 0 ? (
      <p className="sheet__empty">Aún no hay abonos registrados.</p>
    ) : (
      <ul className="sheet__rows">
        {payables.payments.map((payment) => (
          <li className="sheet__row" key={payment.id}>
            <div className="sheet__row-main">
              <span className="sheet__row-title">
                {formatDay(payment.paidAt)} · {getMethodLabel(payment.method)}
                {payment.reference && ` · ${payment.reference}`}
              </span>
              <span className="sheet__row-meta">
                Compra {payment.orderNumber}
                {payment.createdBy && ` · Registró ${payment.createdBy}`}
                {payment.status === "anulado" && ` · Anulado: ${payment.cancelReason}`}
              </span>
            </div>
            <div className="sheet__row-side">
              <span className="sheet__number">{formatCurrency(payment.amount)}</span>
              {payment.status === "anulado" && <span className="sheet__badge">Anulado</span>}
            </div>
          </li>
        ))}
      </ul>
    )}
    <LinkButton onClick={onViewPayables}>Abonar o ver sus cuentas en Cuentas por pagar</LinkButton>
  </Section>
);

/* ---------- Productos que le compramos ---------- */
const ProductsSection = ({ products }) => {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const term = normalizeText(query.trim());
    return products.filter((product) => !term || normalizeText(`${product.name} ${product.sku}`).includes(term));
  }, [products, query]);
  const shown = filtered.slice(0, MAX_SHOWN);

  return (
    <Section title="Productos que le compramos" count={products.length}>
      {products.length === 0 ? (
        <p className="sheet__empty">Aún no hay compras confirmadas de este proveedor.</p>
      ) : (
        <>
          {products.length > 5 && (
            <SearchInput label="Buscar producto" placeholder="Buscar por nombre o SKU" value={query} onChange={setQuery} />
          )}
          {filtered.length === 0 ? (
            <p className="sheet__empty">Ningún producto coincide con la búsqueda.</p>
          ) : (
            <ul className="sheet__rows">
              {shown.map((product) => (
                <li className="sheet__row" key={product.productId}>
                  <div className="sheet__row-main">
                    <span className="sheet__row-title">{product.name}</span>
                    <span className="sheet__row-meta">
                      {product.sku}
                      {product.hasSerial && " · Con serial"} · {product.orders} {product.orders === 1 ? "compra" : "compras"} · última el{" "}
                      {formatDay(product.lastDate)}
                    </span>
                  </div>
                  <div className="sheet__row-side sheet__row-side--stack">
                    <span className="sheet__number">
                      {quantityFormatter.format(product.quantity)} {getUnitShort(product.unit)}
                    </span>
                    <span className="sheet__row-meta">Último costo {formatCurrency(product.lastCost)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Section>
  );
};

/* ---------- Unidades con serial y garantías ---------- */
const WARRANTY_FILTERS = [
  { value: "", label: "Todas" },
  { value: "active", label: "Garantía vigente" },
  { value: "expired", label: "Garantía vencida" },
];

const UnitsSection = ({ units }) => {
  const [query, setQuery] = useState("");
  const [warranty, setWarranty] = useState("");
  const counts = { "": units.total, active: units.warrantyActive, expired: units.warrantyExpired };

  const filtered = useMemo(() => {
    const term = normalizeText(query.trim()).replace(/\s+/g, "");
    return units.items.filter(
      (unit) =>
        (!warranty || (warranty === "active") === unit.warrantyActive) &&
        (!term || normalizeText(`${unit.serial}${unit.imei2 ?? ""}${unit.productName}${unit.branchName}`).replace(/\s+/g, "").includes(term))
    );
  }, [units.items, query, warranty]);
  const shown = filtered.slice(0, MAX_SHOWN);
  const statusSummary = UNIT_STATUSES.filter((status) => units.counts[status.value] > 0)
    .map((status) => `${status.label}: ${units.counts[status.value]}`)
    .join(" · ");

  return (
    <Section title="Unidades que nos vendió (IMEI / serial)" count={units.total}>
      {units.total === 0 ? (
        <p className="sheet__empty">No hay unidades con serial de este proveedor en tus sucursales.</p>
      ) : (
        <>
          <p className="sheet__more">{statusSummary}</p>
          <div className="sheet__chips" role="group" aria-label="Filtrar unidades por garantía">
            {WARRANTY_FILTERS.filter((filter) => filter.value === "" || counts[filter.value] > 0).map((filter) => (
              <button
                type="button"
                key={filter.value}
                className={`sheet__chip ${warranty === filter.value ? "sheet__chip--on" : ""}`.trim()}
                aria-pressed={warranty === filter.value}
                onClick={() => setWarranty(filter.value)}
              >
                {filter.label} · {counts[filter.value]}
              </button>
            ))}
          </div>
          <SearchInput label="Buscar IMEI o serial" placeholder="Buscar IMEI, serial, producto o sucursal" value={query} onChange={setQuery} />
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
                      {unit.productName} · {unit.branchName} · Ingresó {formatDate(unit.receivedAt)}
                    </span>
                  </div>
                  <div className="sheet__row-side sheet__row-side--stack">
                    <span className={`unit-cell__status unit-cell__status--${unit.status}`}>{getStatusLabel(unit.status)}</span>
                    <Warranty unit={unit} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {filtered.length > shown.length && <p className="sheet__more">Se muestran {shown.length} de {filtered.length}.</p>}
        </>
      )}
    </Section>
  );
};

/* ---------- Ficha ---------- */
const SupplierSheet = ({ listed, onClose, onEdit, onViewOrders, onViewPayables }) => {
  const { overview, loading, error, reload } = useSupplierOverview(listed.id);
  const supplier = overview?.supplier ?? listed;
  const { purchases, payables, products, units } = overview ?? {};
  const identification = supplier.nitcc
    ? `${supplier.typeidentification} ${formatIdentification(
        supplier.nitcc,
        supplier.typeidentification === NIT_TYPE ? supplier.digitoverification : null
      )}`
    : "";
  const place = [supplier.address, supplier.city, supplier.department].filter(Boolean).join(", ");

  return (
    <div className="sheet">
      <header className="sheet__head">
        <p className="sheet__name">{supplier.companyname}</p>
        <ul className="sheet__facts">
          {supplier.typeorganization && <li>{getOrganizationLabel(supplier.typeorganization)}</li>}
          {identification && <li>{identification}</li>}
          <li>
            <span className={`sheet__badge ${supplier.isActive ? "sheet__badge--ok" : ""}`.trim()}>
              {supplier.isActive ? "Activo" : "Inactivo"}
            </span>
          </li>
        </ul>
        <ul className="sheet__facts">
          {supplier.contact && <li>Contacto: {supplier.contact}</li>}
          {supplier.phone && (
            <li>
              <a href={`tel:${supplier.phone.replace(/[^\d+]/g, "")}`}>{supplier.phone}</a>
            </li>
          )}
          {supplier.email && (
            <li>
              <a href={`mailto:${supplier.email}`}>{supplier.email}</a>
            </li>
          )}
          {place && <li>{place}</li>}
        </ul>
      </header>

      {overview && (
        <div className="sheet__kpis">
          {purchases && <Kpi label="Comprado (confirmado)" value={formatCurrency(purchases.purchased)} tone="money" />}
          {purchases && <Kpi label="Compras" value={purchases.confirmed} />}
          {purchases && <Kpi label="Última compra" value={purchases.lastPurchase ? formatDay(purchases.lastPurchase) : "—"} tone="money" />}
          {payables && (
            <Kpi label="Le debemos" value={formatCurrency(payables.openBalance)} tone="money" />
          )}
          {payables && payables.overdueBalance > 0 && (
            <Kpi label={`Vencido (${payables.overdueCount})`} value={formatCurrency(payables.overdueBalance)} tone="empty" />
          )}
          {payables && <Kpi label="Pagado" value={formatCurrency(payables.paidTotal)} tone="money" />}
          {units && <Kpi label="Garantías vigentes" value={`${units.warrantyActive} de ${units.total}`} tone={units.warrantyActive > 0 ? "ok" : undefined} />}
        </div>
      )}

      {loading && (
        <div className="sheet__loading" role="status" aria-live="polite">
          Cargando compras, cuentas, productos y unidades…
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

      {payables && <PayablesSection payables={payables} onViewPayables={onViewPayables} />}
      {purchases && <PurchasesSection purchases={purchases} onViewOrders={onViewOrders} />}
      {products && <ProductsSection products={products} />}
      {units && <UnitsSection units={units} />}

      {overview && !purchases && !payables && !products && !units && (
        <p className="sheet__empty">No tienes permisos para ver las compras, las cuentas ni las unidades de este proveedor.</p>
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
 * Ficha completa de un proveedor: datos y contacto, lo que se le debe y lo pagado, sus compras,
 * los productos que le compramos y las unidades con serial que nos vendió (con su garantía).
 * Cada sección sale solo si el servidor la envía (según los permisos y sucursales del usuario).
 * supplier: el de la lista (se muestra mientras carga). onEdit, onViewOrders(supplier) y
 * onViewPayables(supplier) son opcionales.
 */
const SupplierDetailModal = ({ supplier, onClose, onEdit, onViewOrders, onViewPayables }) => (
  <Modal open={Boolean(supplier)} title="Ficha del proveedor" size="wide" onClose={onClose}>
    {supplier && (
      <SupplierSheet
        key={supplier.id}
        listed={supplier}
        onClose={onClose}
        onEdit={onEdit}
        onViewOrders={onViewOrders && (() => onViewOrders(supplier))}
        onViewPayables={onViewPayables && (() => onViewPayables(supplier))}
      />
    )}
  </Modal>
);

export default SupplierDetailModal;
