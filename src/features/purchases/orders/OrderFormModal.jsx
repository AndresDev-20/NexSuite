import { useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions, FormLayout, FormSection } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import Icon from "../../../components/ui/Icon/Icon";
import ProductFormModal from "../../inventory/products/ProductFormModal";
import SupplierFormModal from "../suppliers/SupplierFormModal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { dayInColombia, todayInColombia } from "../../../utils/dates";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal, stripNonDigits } from "../../../utils/validators";
import { PAYMENT_TERMS, SERIAL_TYPES, itemsTotal } from "./orderOptions";
import {
  allocationsOf,
  hasLoaded,
  initialState,
  lineQuantity,
  loadedCount,
  newProductLine,
  parseSerials,
  purchaseTotal,
  toPayload,
  validate,
} from "./purchaseForm";
import { fetchLoadedStock } from "./useOrders";
import "./orderFormModal.css";

const MAX_QUANTITY_LENGTH = 7; // hasta 1.000.000
const MAX_COST_LENGTH = 13;

const toOptions = (list, getLabel) => list.map((item) => ({ value: String(item.id), label: getLabel(item) }));
const unitsText = (count) => `${count} ${count === 1 ? "unidad" : "unidades"}`;

/* ---------- Un producto de la compra: costo, reparto por sucursal e IMEIs ---------- */
const ProductLine = ({ line, index, leaving = false, branches, errors, onChange, onRemove }) => {
  const quantity = lineQuantity(line);
  const set = (changes) => onChange({ ...line, ...changes });
  const setQuantity = (branchId, value) => set({ quantities: { ...line.quantities, [branchId]: value } });
  const setSerials = (branchId, value) => set({ serials: { ...line.serials, [branchId]: value } });
  const serialLabel = line.serialType === "imei" ? "IMEI" : "Seriales";

  return (
    <li className={`purchase-line ${leaving ? "purchase-line--leaving" : ""}`.trim()}>
      <header className="purchase-line__head">
        <span className={`purchase-line__index ${line.hasSerial ? "purchase-line__index--serial" : ""}`.trim()} aria-hidden="true">
          {index + 1}
        </span>
        <div className="purchase-line__name">
          <strong>{line.name}</strong>
          <span className="purchase-line__sku">
            {line.sku}
            {line.hasSerial && " · con serial"}
          </span>
        </div>
        <button type="button" className="purchase-line__remove" aria-label={`Quitar ${line.name}`} onClick={onRemove}>
          <Icon name="trash" className="purchase-line__remove-icon" />
        </button>
      </header>

      {hasLoaded(line) && (
        <div className={`purchase-line__loaded ${line.useLoaded ? "" : "purchase-line__loaded--off"}`.trim()}>
          <label className="purchase-line__loaded-toggle">
            <input
              type="checkbox"
              checked={line.useLoaded}
              onChange={(event) => {
                const useLoaded = event.target.checked;
                if (!useLoaded) return set({ useLoaded });
                // Al volver a usarlo, cada sucursal tiene al menos lo cargado
                const quantities = { ...line.quantities };
                Object.keys(line.loaded).forEach((id) => {
                  const loaded = loadedCount({ ...line, useLoaded }, id);
                  quantities[id] = String(Math.max(Number(quantities[id]) || 0, loaded));
                });
                set({ useLoaded, quantities });
              }}
            />
            <span>Documentar lo ya cargado</span>
          </label>
          <p className="purchase-line__loaded-text">
            Ya se cargó al crear el producto:{" "}
            {Object.entries(line.loaded)
              .map(([id, value]) => `${line.hasSerial ? value.units.length : value.count} en ${branches.find((branch) => String(branch.id) === String(id))?.name ?? "otra sucursal"}`)
              .join(", ")}
            .{" "}
            {line.useLoaded
              ? "Se autocompletó: esta compra lo documenta y al confirmar no suma esas unidades otra vez. Si compraste más, súbele la cantidad."
              : "Sin documentarlo, todo lo de esta compra se suma como mercancía nueva."}
          </p>
        </div>
      )}

      <div className="purchase-line__fields">
        <Field
          label="Costo unitario"
          required
          prefix="$"
          inputMode="decimal"
          autoComplete="off"
          maxLength={MAX_COST_LENGTH}
          value={line.unitCost}
          onInput={sanitizeDecimal}
          onChange={(event) => set({ unitCost: event.target.value })}
        />
        {line.hasSerial && (
          <>
            <Select
              label="Identificador"
              options={SERIAL_TYPES}
              value={line.serialType}
              onChange={(event) => set({ serialType: event.target.value })}
            />
            <Field
              label="Garantía (meses)"
              inputMode="numeric"
              maxLength={3}
              placeholder="0"
              value={line.warrantyMonths}
              onInput={stripNonDigits}
              onChange={(event) => set({ warrantyMonths: event.target.value })}
            />
          </>
        )}
      </div>

      <fieldset className="purchase-line__split">
        <legend className="purchase-line__legend">
          {branches.length > 1 ? "¿Cuántas van a cada sucursal?" : "Cantidad"}
        </legend>
        <div className="purchase-line__branches">
          {branches.map((branch) => (
            <Field
              key={branch.id}
              label={branch.name}
              inputMode="numeric"
              autoComplete="off"
              maxLength={MAX_QUANTITY_LENGTH}
              placeholder="0"
              value={line.quantities[branch.id] ?? ""}
              onInput={stripNonDigits}
              onChange={(event) => setQuantity(branch.id, event.target.value)}
            />
          ))}
        </div>
      </fieldset>

      {line.hasSerial &&
        allocationsOf(line).map(({ branchId, quantity: branchQuantity }) => {
          const branch = branches.find((candidate) => candidate.id === branchId);
          const count = parseSerials(line.serials[branchId]).length;
          const loaded = loadedCount(line, branchId);
          const fresh = Math.max(branchQuantity - loaded, 0);
          return (
            <div className="purchase-line__serial-group" key={branchId}>
              {loaded > 0 && (
                <div className="purchase-line__loaded-units">
                  <span className="purchase-line__legend">
                    {serialLabel} ya cargados en {branch?.name ?? "la sucursal"} ({loaded})
                  </span>
                  <ul>
                    {line.loaded[branchId].units.map((unit) => (
                      <li key={unit.idunit}>
                        {unit.serial}
                        {unit.imei2 && ` · ${unit.imei2}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {fresh > 0 && (
                <Field
                  className="purchase-line__serials"
                  label={`${serialLabel} ${loaded > 0 ? "nuevos " : ""}para ${branch?.name ?? "la sucursal"} (${count} de ${fresh})`}
                  multiline
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={line.serialType === "imei" ? "Uno por línea. IMEI 2 en la misma línea: 35…, 35…" : "Uno por línea"}
                  hint={count < fresh ? "Puedes guardar sin todos; para confirmar la compra deben estar completos." : undefined}
                  value={line.serials[branchId] ?? ""}
                  onChange={(event) => setSerials(branchId, event.target.value)}
                />
              )}
            </div>
          );
        })}

      {!line.hasSerial && line.useLoaded && hasLoaded(line) && (
        <p className="purchase-line__loaded-note">
          {allocationsOf(line)
            .map(({ branchId, quantity: branchQuantity }) => {
              const loaded = Math.min(loadedCount(line, branchId), branchQuantity);
              const branch = branches.find((candidate) => candidate.id === branchId);
              return `${branch?.name ?? "Sucursal"}: ${loaded} ya ${loaded === 1 ? "cargada" : "cargadas"}${branchQuantity > loaded ? ` + ${branchQuantity - loaded} ${branchQuantity - loaded === 1 ? "nueva" : "nuevas"}` : ""}`;
            })
            .join(" · ")}
        </p>
      )}

      <footer className="purchase-line__foot">
        <span className="purchase-line__units">{unitsText(quantity)}</span>
        <strong className="purchase-line__total" key={itemsTotal([{ quantity, unitCost: line.unitCost }])}>
          {formatCurrency(itemsTotal([{ quantity, unitCost: line.unitCost }]))}
        </strong>
      </footer>

      {errors?.length > 0 && (
        <ul className="purchase-line__errors" role="alert">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </li>
  );
};

/* ---------- Formulario (solo existe mientras el modal está abierto) ---------- */
const OrderForm = ({ order, suppliers, branches, defaultBranchId, products, hint, creation, busy, onCancel, onSubmit }) => {
  const [state, setState] = useState(() => initialState(order));
  const [errors, setErrors] = useState({ header: {}, products: {} });
  const [serverError, setServerError] = useState("");
  const [creating, setCreating] = useState(null); // "product" | "supplier"
  const [extraProducts, setExtraProducts] = useState([]); // creados aquí (la lista de la página aún no los trae)
  const [supplierNote, setSupplierNote] = useState(""); // «Proveedor de este producto» cuando se elige solo
  const today = todayInColombia();
  const { header } = state;

  const setHeader = (changes) => setState((current) => ({ ...current, header: { ...current.header, ...changes } }));
  const setLine = (line) =>
    setState((current) => ({ ...current, products: current.products.map((item) => (item.productId === line.productId ? line : item)) }));
  // Quitar: primero sale con su animación y luego se borra de la compra
  const [leaving, setLeaving] = useState([]);
  const removeLine = (productId) => {
    setLeaving((current) => [...current, productId]);
    setTimeout(() => {
      setState((current) => ({ ...current, products: current.products.filter((item) => item.productId !== productId) }));
      setLeaving((current) => current.filter((id) => id !== productId));
    }, 220);
  };
  // Si el producto ya tiene existencias cargadas sin compra, la línea se autocompleta con ellas
  const addLine = async (product) => {
    if (state.products.some((item) => item.productId === product.id)) return;
    // Fase 27: sin proveedor todavía, la compra toma el habitual del producto (si se puede elegir)
    if (!state.header.idsupplier && product.supplierId && suppliers.some((supplier) => supplier.id === product.supplierId)) {
      setHeader({ idsupplier: String(product.supplierId) });
      setSupplierNote(`Proveedor de ${product.name}. Puedes cambiarlo.`);
    }
    let loadedStock = null;
    try {
      loadedStock = await fetchLoadedStock(product.id, order?.id);
    } catch {
      // Sin poder consultarlo, se agrega como mercancía nueva (el servidor revisa igual al guardar)
    }
    setState((current) =>
      current.products.some((item) => item.productId === product.id)
        ? current
        : { ...current, products: [...current.products, newProductLine(product, defaultBranchId, loadedStock)] }
    );
  };

  const catalog = [...products, ...extraProducts.filter((extra) => !products.some((product) => product.id === extra.id))];
  const chosen = new Set(state.products.map((line) => line.productId));
  // Los productos del proveedor elegido salen primero (Fase 27)
  const supplierId = Number(header.idsupplier) || null;
  const ofSupplier = (product) => supplierId !== null && product.supplierId === supplierId;
  const available = catalog
    .filter((product) => !chosen.has(product.id))
    .sort((a, b) => Number(ofSupplier(b)) - Number(ofSupplier(a)));

  // "Creados hoy": los productos que se crearon hoy (en Colombia) y aún no están en la compra
  const createdToday = available.filter((product) => dayInColombia(product.createdAt) === today);
  const [onlyToday, setOnlyToday] = useState(false);
  const shown = onlyToday ? createdToday : available;
  const addAllToday = () => createdToday.forEach(addLine);

  const handleAddProduct = (event) => {
    const product = catalog.find((item) => item.id === Number(event.target.value));
    event.target.value = "";
    if (product) addLine(product);
  };

  const handleCreateProduct = async (payload) => {
    const product = await creation.createProduct(payload);
    setExtraProducts((current) => [...current, product]);
    addLine(product);
    setCreating(null);
  };

  const handleCreateSupplier = async (payload) => {
    const supplier = await creation.createSupplier(payload);
    setSupplierNote("");
    setHeader({ idsupplier: String(supplier.id) });
    setCreating(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setServerError("");
    const result = validate(state);
    setErrors(result.errors);
    if (!result.valid) return;

    try {
      await onSubmit(toPayload(state));
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo guardar la compra. Inténtalo de nuevo."));
    }
  };

  // Resumen: unidades, total y cuándo vence si es a crédito
  const units = state.products.reduce((sum, line) => sum + lineQuantity(line), 0);
  const total = purchaseTotal(state.products);
  const creditDays = Number(header.creditdays);
  const dueText =
    header.paymentterm === "credito" && creditDays > 0 && header.orderdate
      ? new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
          new Date(Date.parse(`${header.orderdate}T00:00:00Z`) + creditDays * 86400000)
        )
      : "";
  const supplierName = suppliers.find((supplier) => String(supplier.id) === header.idsupplier)?.companyname ?? "";

  return (
    <>
      <FormLayout onSubmit={submit} error={serverError}>
        <div className="purchase-form">
          {/* Productos: lo principal de la compra */}
          <section className="purchase-form__main order-items" aria-labelledby="purchase-products-title">
            <header className="order-items__head">
              <span className="order-items__icon" aria-hidden="true">
                <Icon name="box" />
              </span>
              <div className="order-items__heading">
                <h3 className="order-items__title" id="purchase-products-title">
                  Productos
                </h3>
                <span className="order-items__subtitle">Lo que llegó, cuánto costó y a qué sucursal va.</span>
              </div>
              <span className="order-items__count" key={state.products.length}>
                {state.products.length}
              </span>
            </header>

            <div className="purchase-form__picker">
              <div className="purchase-form__supplier">
                <Select
                  label="Agregar producto"
                  placeholder={
                    shown.length ? "Elige un producto para agregarlo" : onlyToday ? "No quedan productos creados hoy" : "No quedan productos por agregar"
                  }
                  options={toOptions(shown, (product) => `${product.name} · ${product.sku}${ofSupplier(product) ? " · de este proveedor" : ""}`)}
                  disabled={shown.length === 0}
                  hint={hint}
                  defaultValue=""
                  onChange={handleAddProduct}
                />
                {creation.canCreateProduct && (
                  <Button variant="outline" icon="plus" className="purchase-form__inline" onClick={() => setCreating("product")}>
                    Producto nuevo
                  </Button>
                )}
              </div>

              <div className="purchase-form__today">
                <label className="purchase-form__today-filter">
                  <input type="checkbox" checked={onlyToday} onChange={(event) => setOnlyToday(event.target.checked)} />
                  <span>Solo los creados hoy ({createdToday.length})</span>
                </label>
                {createdToday.length > 0 && (
                  <Button variant="outline" icon="plus" onClick={addAllToday}>
                    Agregar los {createdToday.length} creados hoy
                  </Button>
                )}
              </div>
            </div>

            {state.products.length > 0 ? (
              <ul className="purchase-form__lines">
                {state.products.map((line, index) => (
                  <ProductLine
                    key={line.productId}
                    line={line}
                    index={index}
                    leaving={leaving.includes(line.productId)}
                    branches={branches}
                    errors={errors.products[line.productId]}
                    onChange={setLine}
                    onRemove={() => removeLine(line.productId)}
                  />
                ))}
              </ul>
            ) : (
              <div className="purchase-form__empty">
                <span className="purchase-form__empty-art" aria-hidden="true">
                  <Icon name="cart" />
                </span>
                <strong>Todavía no hay productos</strong>
                <span>Elige arriba lo que llegó. Si no existe, créalo con «Producto nuevo».</span>
              </div>
            )}

            {errors.form && (
              <p className="order-items__error" role="alert">
                {errors.form}
              </p>
            )}
          </section>

          {/* Columna derecha: datos de la compra y resumen */}
          <aside className="purchase-form__side">
            <FormSection icon="users" title="Datos de la compra" description="A quién se le compró y cómo se paga.">
              <div className="purchase-form__supplier purchase-form__supplier--stack">
                <Select
                  label="Proveedor"
                  required
                  placeholder="Selecciona el proveedor"
                  options={toOptions(suppliers, (supplier) => supplier.companyname)}
                  value={header.idsupplier}
                  data-autofocus
                  hint={supplierNote || undefined}
                  error={errors.header.idsupplier}
                  onChange={(event) => {
                    setSupplierNote("");
                    setHeader({ idsupplier: event.target.value });
                  }}
                />
                {creation.canCreateSupplier && (
                  <Button variant="outline" icon="plus" className="purchase-form__inline" onClick={() => setCreating("supplier")}>
                    Nuevo proveedor
                  </Button>
                )}
              </div>

              <div className="form-layout__row">
                <Field
                  label="Fecha de la compra"
                  type="date"
                  required
                  max={today}
                  value={header.orderdate}
                  error={errors.header.orderdate}
                  onChange={(event) => setHeader({ orderdate: event.target.value })}
                />
                <Field
                  label="Factura del proveedor"
                  maxLength={50}
                  placeholder="Opcional"
                  value={header.invoicenumber}
                  onChange={(event) => setHeader({ invoicenumber: event.target.value })}
                />
              </div>

              <div className="purchase-form__terms" role="radiogroup" aria-label="Forma de pago">
                {PAYMENT_TERMS.map((term) => (
                  <button
                    key={term.value}
                    type="button"
                    role="radio"
                    aria-checked={header.paymentterm === term.value}
                    className={`purchase-form__term ${header.paymentterm === term.value ? "purchase-form__term--on" : ""}`.trim()}
                    onClick={() => setHeader({ paymentterm: term.value })}
                  >
                    <Icon name={term.value === "credito" ? "refresh" : "wallet"} />
                    {term.label}
                  </button>
                ))}
              </div>
              {header.paymentterm === "credito" && (
                <Field
                  label="Días de crédito"
                  required
                  inputMode="numeric"
                  maxLength={3}
                  placeholder="30"
                  value={header.creditdays}
                  error={errors.header.creditdays}
                  hint={dueText ? `Vence el ${dueText}.` : undefined}
                  onInput={stripNonDigits}
                  onChange={(event) => setHeader({ creditdays: event.target.value })}
                />
              )}

              <Field
                label="Notas"
                multiline
                maxLength={500}
                placeholder="Ej: llegó en el carro el sábado"
                value={header.notes}
                onChange={(event) => setHeader({ notes: event.target.value })}
              />
            </FormSection>

            <div className="purchase-summary" aria-live="polite">
              <span className="purchase-summary__label">Resumen</span>
              <dl className="purchase-summary__list">
                <div>
                  <dt>Proveedor</dt>
                  <dd>{supplierName || "—"}</dd>
                </div>
                <div>
                  <dt>Productos</dt>
                  <dd>{state.products.length}</dd>
                </div>
                <div>
                  <dt>Unidades</dt>
                  <dd>{units.toLocaleString("es-CO")}</dd>
                </div>
                <div>
                  <dt>Pago</dt>
                  <dd>{header.paymentterm === "credito" ? (dueText ? `Crédito · vence ${dueText}` : "Crédito") : "Contado"}</dd>
                </div>
              </dl>
              <div className="purchase-summary__total">
                <span>Total de la compra</span>
                <strong key={total}>{formatCurrency(total)}</strong>
              </div>
            </div>
          </aside>
        </div>

        <FormActions>
          <span className="purchase-form__footer-total" aria-hidden="true">
            <span>Total</span>
            <strong key={total}>{formatCurrency(total)}</strong>
          </span>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" icon={order ? "check" : "plus"} disabled={busy}>
            {busy ? "Guardando…" : order ? "Guardar cambios" : "Guardar borrador"}
          </Button>
        </FormActions>
      </FormLayout>

      <ProductFormModal
        open={creating === "product"}
        categories={creation.categories}
        categoryHint={creation.categoryHint}
        showCost={creation.showCost}
        onClose={() => setCreating(null)}
        onSubmit={handleCreateProduct}
      />
      <SupplierFormModal open={creating === "supplier"} onClose={() => setCreating(null)} onSubmit={handleCreateSupplier} />
    </>
  );
};

/**
 * Crear (order null) o editar una compra en borrador.
 * suppliers: proveedores que se pueden elegir · branches: [{ id, name }] sucursales del usuario ·
 * defaultBranchId: dónde se pone la primera unidad de cada producto · products: productos activos.
 * creation: { canCreateProduct, canCreateSupplier, categories, categoryHint, createProduct, createSupplier }
 *   para crear un producto o un proveedor sin salir de la compra.
 * onSubmit(payload) debe ser async y lanzar el error si algo falla.
 */
const OrderFormModal = ({ open, order = null, onClose, onSubmit, ...formProps }) => {
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (payload) => {
    setBusy(true);
    try {
      await onSubmit(payload);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      icon="cart"
      open={open}
      size="xl"
      title={order ? `Editar ${order.number}` : "Nueva compra"}
      subtitle={order ? "Borrador: cámbialo hasta que confirmes la compra." : "Lo que llegó del proveedor, repartido entre tus sucursales."}
      onClose={onClose}
      busy={busy}
    >
      <OrderForm order={order} busy={busy} onCancel={onClose} onSubmit={handleSubmit} {...formProps} />
    </Modal>
  );
};

export default OrderFormModal;
