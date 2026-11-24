import { useMemo } from "react";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal, stripNonDigits } from "../../../utils/validators";
import TransferProductPicker from "../transfers/TransferProductPicker";
import usePermissions from "../../auth/usePermissions";

const unitsText = (count) => `${count} ${count === 1 ? "unidad" : "unidades"}`;
const amountOf = (value) => Number(String(value ?? "").replace(",", ".")) || 0;

/** Nueva línea desde una fila de lo libre de la sucursal (warehouseApi.getBranchStock). */
export const lineFrom = (row, serial = null) => {
  const unit = serial ? row.units?.find((candidate) => candidate.serial === serial) : null;
  return { ...row, selected: unit ? [unit.id] : [], quantity: row.hasserial ? "" : "1", discount: "" };
};

/** Cuántas unidades lleva la línea. */
export const quantityOf = (line) => (line.hasserial ? line.selected.length : Math.round(amountOf(line.quantity)));

/** Precio especial de una línea: precio de venta − descuento (por unidad). */
export const priceOf = (line) => {
  const listprice = line.saleprice ?? 0;
  const discount = Math.min(amountOf(line.discount), listprice);
  return { listprice, discount, unitprice: listprice - discount };
};

/** Totales de las líneas: subtotal, descuento, total, costo (si se conoce) y ganancia. */
export const totalsOf = (lines) =>
  lines.reduce(
    (sum, line) => {
      const quantity = quantityOf(line);
      const { listprice, discount, unitprice } = priceOf(line);
      const cost = line.cost ?? line.unitcost;
      return {
        subtotal: sum.subtotal + listprice * quantity,
        discount: sum.discount + discount * quantity,
        total: sum.total + unitprice * quantity,
        cost: cost === undefined || sum.cost === null ? null : sum.cost + cost * quantity,
      };
    },
    { subtotal: 0, discount: 0, total: 0, cost: 0 }
  );

/** Errores de las líneas antes de enviar ("" si todo está bien). */
export const linesError = (lines, { pricing = false } = {}) => {
  if (lines.length === 0) return "Agrega al menos un producto.";
  for (const line of lines) {
    const quantity = quantityOf(line);
    if (line.hasserial && quantity === 0) return `${line.name}: marca al menos un IMEI.`;
    if (!line.hasserial && !(quantity >= 1 && quantity <= line.available)) return `${line.name}: la cantidad debe estar entre 1 y ${line.available}.`;
    if (pricing && amountOf(line.discount) > (line.saleprice ?? 0)) return `${line.name}: el descuento no puede pasar el precio de venta.`;
  }
  return "";
};

/** Precio de venta, descuento, precio especial y ganancia de una línea (al vender). */
export const PriceBlock = ({ line, onDiscount, costKnown }) => {
  // Fase 48: «Ganas / Pierdes» y el aviso de por debajo del costo, solo con «Ver ganancias»
  const { can } = usePermissions();
  const showGain = costKnown && can("profits.read");
  const { listprice, discount, unitprice } = priceOf(line);
  const cost = line.cost ?? line.unitcost;
  const gain = showGain ? unitprice - cost : null;
  return (
    <>
      <div className="wh-prices">
        {costKnown && (
          <span className="wh-price">
            Precio de compra
            <strong>{formatCurrency(cost)}</strong>
          </span>
        )}
        <span className="wh-price">
          Precio de venta
          <strong>{formatCurrency(listprice)}</strong>
        </span>
        <span className="wh-price wh-price--special">
          Precio especial
          <strong>{formatCurrency(unitprice)}</strong>
        </span>
        {showGain && (
          <span className={`wh-price ${gain < 0 ? "wh-price--loss" : "wh-price--gain"}`}>
            {gain < 0 ? "Pierdes por unidad" : "Ganas por unidad"}
            <strong>{formatCurrency(Math.abs(gain))}</strong>
          </span>
        )}
      </div>
      <Field
        label="Descuento por unidad"
        prefix="$"
        inputMode="decimal"
        autoComplete="off"
        maxLength={15}
        onInput={sanitizeDecimal}
        value={line.discount}
        error={amountOf(line.discount) > listprice ? `Máximo ${formatCurrency(listprice)}.` : undefined}
        hint={discount > 0 && listprice > 0 ? `${Math.round((discount / listprice) * 100)} % menos que el precio de venta.` : "El precio especial es el de venta menos este descuento."}
        onChange={(event) => onDiscount(event.target.value)}
      />
      {showGain && gain < 0 && (
        <p className="wh-warning" role="alert">
          <Icon name="alert" /> Por debajo del costo: pierdes {formatCurrency(Math.abs(gain) * Math.max(quantityOf(line), 1))}. Se puede, pero queda en la auditoría.
        </p>
      )}
    </>
  );
};

/** Un producto elegido: IMEI marcables o cantidad; al vender, también el precio especial. */
const Line = ({ line, pricing, costKnown, onChange, onRemove }) => {
  const set = (changes) => onChange({ ...line, ...changes });
  const toggle = (id) => set({ selected: line.selected.includes(id) ? line.selected.filter((value) => value !== id) : [...line.selected, id] });
  return (
    <li className="wh-line">
      <header className="wh-line__head">
        <span>
          <strong>{line.name}</strong>
          <small>
            {[line.sku, `libres ${unitsText(line.available)}`].filter(Boolean).join(" · ")}
          </small>
        </span>
        <button type="button" className="wh-line__remove" aria-label={`Quitar ${line.name}`} onClick={onRemove}>
          <Icon name="trash" />
        </button>
      </header>
      {line.hasserial ? (
        <ul className="wh-units" aria-label={`IMEI de ${line.name}`}>
          {line.units.map((unit) => {
            const on = line.selected.includes(unit.id);
            return (
              <li key={unit.id}>
                <label className={`wh-unit ${on ? "wh-unit--on" : ""}`.trim()}>
                  <input type="checkbox" checked={on} onChange={() => toggle(unit.id)} />
                  {on && <Icon name="check" />}
                  {unit.serial}
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <Field
          label="Cantidad"
          className="wh-line__quantity"
          inputMode="numeric"
          autoComplete="off"
          maxLength={7}
          value={line.quantity}
          hint={`Máximo ${line.available}.`}
          onInput={stripNonDigits}
          onChange={(event) => set({ quantity: event.target.value })}
        />
      )}
      {pricing && <PriceBlock line={line} costKnown={costKnown} onDiscount={(discount) => set({ discount })} />}
    </li>
  );
};

/**
 * Productos que salen de la sucursal (préstamo o venta directa). stock: lo libre de la sucursal; lines y
 * onChange(lines). pricing: muestra precios y descuento (vender). costKnown: con «Ver precio de costo» (la ganancia, además con «Ver ganancias»).
 */
const ProductLines = ({ branchId, stock, lines, onChange, pricing = false, costKnown = false }) => {
  const rows = useMemo(
    () => stock.map((row) => ({ ...row, productId: row.idproduct, hasSerial: row.hasserial })),
    [stock]
  );
  const chosenIds = useMemo(() => new Set(lines.filter((line) => !line.hasserial).map((line) => line.idproduct)), [lines]);

  const add = (row) => {
    if (lines.some((line) => line.idproduct === row.idproduct)) return;
    onChange([...lines, lineFrom(row)]);
  };
  const addUnit = (row, serial) => {
    const unit = row.units?.find((candidate) => candidate.serial === serial);
    if (!unit) return;
    const existing = lines.find((line) => line.idproduct === row.idproduct);
    if (existing) {
      if (!existing.selected.includes(unit.id)) onChange(lines.map((line) => (line === existing ? { ...line, selected: [...line.selected, unit.id] } : line)));
      return;
    }
    onChange([...lines, lineFrom(row, serial)]);
  };

  return (
    <>
      <TransferProductPicker
        fromId={branchId}
        rows={rows}
        chosenIds={chosenIds}
        disabled={rows.length === 0}
        hint={rows.length === 0 ? "No hay nada libre en esta sucursal." : "Solo sale lo libre: lo apartado o prestado no aparece."}
        onPickProduct={add}
        onPickUnit={addUnit}
      />
      {lines.length > 0 && (
        <ul className="wh-lines">
          {lines.map((line) => (
            <Line
              key={line.idproduct}
              line={line}
              pricing={pricing}
              costKnown={costKnown}
              onChange={(next) => onChange(lines.map((candidate) => (candidate.idproduct === line.idproduct ? next : candidate)))}
              onRemove={() => onChange(lines.filter((candidate) => candidate.idproduct !== line.idproduct))}
            />
          ))}
        </ul>
      )}
    </>
  );
};

export default ProductLines;
