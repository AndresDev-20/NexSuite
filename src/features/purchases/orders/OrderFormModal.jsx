import { useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
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
  initialState,
  lineQuantity,
  newProductLine,
  parseSerials,
  purchaseTotal,
  toPayload,
  validate,
} from "./purchaseForm";
import "./orderFormModal.css";

const MAX_QUANTITY_LENGTH = 7; // hasta 1.000.000
const MAX_COST_LENGTH = 13;

const toOptions = (list, getLabel) => list.map((item) => ({ value: String(item.id), label: getLabel(item) }));
const unitsText = (count) => `${count} ${count === 1 ? "unidad" : "unidades"}`;

/* ---------- Un producto de la compra: costo, reparto por sucursal e IMEIs ---------- */
const ProductLine = ({ line, branches, errors, onChange, onRemove }) => {
  const quantity = lineQuantity(line);
  const set = (changes) => onChange({ ...line, ...changes });
  const setQuantity = (branchId, value) => set({ quantities: { ...line.quantities, [branchId]: value } });
  const setSerials = (branchId, value) => set({ serials: { ...line.serials, [branchId]: value } });
  const serialLabel = line.serialType === "imei" ? "IMEI" : "Seriales";

  return (
    <li className="purchase-line">
      <header className="purchase-line__head">
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

      <div className="purchase-line__fields">
        <Field
          label="Costo unitario"
          required
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
          return (
            <Field
              key={branchId}
              className="purchase-line__serials"
              label={`${serialLabel} para ${branch?.name ?? "la sucursal"} (${count} de ${branchQuantity})`}
              multiline
              autoComplete="off"
              spellCheck={false}
              placeholder={line.serialType === "imei" ? "Uno por línea. IMEI 2 en la misma línea: 35…, 35…" : "Uno por línea"}
              hint={count < branchQuantity ? "Puedes guardar sin todos; para confirmar la compra deben estar completos." : undefined}
              value={line.serials[branchId] ?? ""}
              onChange={(event) => setSerials(branchId, event.target.value)}
            />
          );
        })}

      <footer className="purchase-line__foot">
        <span>{unitsText(quantity)}</span>
        <strong>{formatCurrency(itemsTotal([{ quantity, unitCost: line.unitCost }]))}</strong>
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
  const today = todayInColombia();
  const { header } = state;

  const setHeader = (changes) => setState((current) => ({ ...current, header: { ...current.header, ...changes } }));
  const setLine = (line) =>
    setState((current) => ({ ...current, products: current.products.map((item) => (item.productId === line.productId ? line : item)) }));
  const removeLine = (productId) =>
    setState((current) => ({ ...current, products: current.products.filter((item) => item.productId !== productId) }));
  const addLine = (product) =>
    setState((current) =>
      current.products.some((item) => item.productId === product.id)
        ? current
        : { ...current, products: [...current.products, newProductLine(product, defaultBranchId)] }
    );

  const catalog = [...products, ...extraProducts.filter((extra) => !products.some((product) => product.id === extra.id))];
  const chosen = new Set(state.products.map((line) => line.productId));
  const available = catalog.filter((product) => !chosen.has(product.id));

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

  return (
    <>
      <FormLayout onSubmit={submit} error={serverError}>
        <div className="purchase-form__supplier">
          <Select
            label="Proveedor"
            required
            placeholder="Selecciona el proveedor"
            options={toOptions(suppliers, (supplier) => supplier.companyname)}
            value={header.idsupplier}
            data-autofocus
            error={errors.header.idsupplier}
            onChange={(event) => setHeader({ idsupplier: event.target.value })}
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

        <div className="form-layout__row">
          <Select
            label="Forma de pago"
            required
            options={PAYMENT_TERMS}
            value={header.paymentterm}
            onChange={(event) => setHeader({ paymentterm: event.target.value })}
          />
          {header.paymentterm === "credito" && (
            <Field
              label="Días de crédito"
              required
              inputMode="numeric"
              maxLength={3}
              placeholder="30"
              value={header.creditdays}
              error={errors.header.creditdays}
              onInput={stripNonDigits}
              onChange={(event) => setHeader({ creditdays: event.target.value })}
            />
          )}
        </div>

        <section className="order-items" aria-labelledby="purchase-products-title">
          <header className="order-items__head">
            <h3 className="order-items__title" id="purchase-products-title">
              Productos
            </h3>
            <span className="order-items__count">{state.products.length}</span>
          </header>

          <div className="purchase-form__supplier">
            <Select
              label="Agregar producto"
              placeholder={
                shown.length
                  ? "Elige un producto para agregarlo"
                  : onlyToday
                    ? "No quedan productos creados hoy"
                    : "No quedan productos por agregar"
              }
              options={toOptions(shown, (product) => `${product.name} · ${product.sku}`)}
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

          {state.products.length > 0 && (
            <ul className="purchase-form__lines">
              {state.products.map((line) => (
                <ProductLine
                  key={line.productId}
                  line={line}
                  branches={branches}
                  errors={errors.products[line.productId]}
                  onChange={setLine}
                  onRemove={() => removeLine(line.productId)}
                />
              ))}
            </ul>
          )}

          {errors.form && (
            <p className="order-items__error" role="alert">
              {errors.form}
            </p>
          )}

          <p className="order-items__total">
            Total de la compra <strong>{formatCurrency(purchaseTotal(state.products))}</strong>
          </p>
        </section>

        <Field
          label="Notas"
          multiline
          maxLength={500}
          placeholder="Ej: llegó en el carro el sábado"
          value={header.notes}
          onChange={(event) => setHeader({ notes: event.target.value })}
        />

        <FormActions>
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
    <Modal open={open} size="wide" title={order ? `Editar ${order.number}` : "Nueva compra"} onClose={onClose} busy={busy}>
      <OrderForm order={order} busy={busy} onCancel={onClose} onSubmit={handleSubmit} {...formProps} />
    </Modal>
  );
};

export default OrderFormModal;
