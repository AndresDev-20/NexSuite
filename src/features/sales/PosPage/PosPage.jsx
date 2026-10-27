import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api/client";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../auth/usePermissions";
import useActiveBranch from "../../branches/useActiveBranch";
import { normalizeProduct } from "../../inventory/products/useProducts";
import useCustomers from "../customers/useCustomers";
import useOpenRegisters, { pickSession, rememberSession, sessionOptions } from "../sales/useOpenRegisters";
import useSales, { PAYMENT_METHODS, newSaleKey } from "../sales/useSales";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import normalizeText from "../../../utils/normalizeText";
import { sanitizeDecimal } from "../../../utils/validators";
import SaleDoneModal from "./SaleDoneModal";
import UnitPickerModal from "./UnitPickerModal";
import "../../../styles/listPage.css";
import "./pos.css";

const MAX_RESULTS = 8;
// Pesos con 2 decimales exactos: se calcula en centavos
const cents = (value) => Math.round(Number(value || 0) * 100);
const pesos = (value) => value / 100;

const emptyPayment = (method = "efectivo", amount = "") => ({ key: newSaleKey(), method, amount, received: "", reference: "" });

/** Una línea del carrito: con serial, la cantidad son los IMEI elegidos. */
const lineQuantity = (line) => (line.hasSerial ? line.units.length : Number(line.quantity) || 0);
const lineGross = (line) => cents(line.price) * lineQuantity(line);
const lineTotal = (line) => Math.max(lineGross(line) - cents(line.discount), 0);

const PosPage = () => {
  const { can } = usePermissions();
  const toast = useToast();
  // Caja compartida: se vende en cualquier caja abierta de la sucursal y se elige el vendedor
  const { sessions, sellers, me, loading: sessionLoading, error: sessionError, getRegisters } = useOpenRegisters();
  const { activeBranchId } = useActiveBranch();
  const { customers, getAllCustomers } = useCustomers();
  const { createSale } = useSales();

  const canDiscount = can("sales.discount");
  const canReadCustomers = can("customers.read");

  const [products, setProducts] = useState({ items: [], loading: true, error: "" });
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState([]);
  const [picking, setPicking] = useState(null); // línea con serial a la que se le eligen IMEI
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("");
  const [payments, setPayments] = useState([emptyPayment()]);
  const [notes, setNotes] = useState("");
  const [saleKey, setSaleKey] = useState(newSaleKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null); // venta registrada
  const searchRef = useRef(null);

  const [chosenSession, setChosenSession] = useState(null);
  const [chosenSeller, setChosenSeller] = useState("");

  const refreshRegisters = useCallback(() => getRegisters({ idbranch: activeBranchId }), [getRegisters, activeBranchId]);
  useEffect(() => {
    refreshRegisters();
  }, [refreshRegisters]);

  // La caja elegida; si no, la recordada en el equipo, el turno propio o la única abierta
  const session = sessions.find((item) => item.id === chosenSession) ?? pickSession(sessions, me);
  const branchSellers = useMemo(() => (session ? sellers[session.branchId] ?? [] : []), [session, sellers]);
  // El vendedor elegido; por defecto quien inició sesión (si puede vender en esa sucursal)
  const sellerId = branchSellers.some((seller) => String(seller.id) === chosenSeller)
    ? chosenSeller
    : branchSellers.some((seller) => seller.id === me)
      ? String(me)
      : "";

  useEffect(() => {
    if (canReadCustomers) getAllCustomers();
  }, [canReadCustomers, getAllCustomers]);

  // Productos de la sucursal del turno, con su cantidad allí (los de otras sucursales no se venden aquí)
  const branchId = session?.branchId;
  const loadProducts = useCallback(async () => {
    if (!branchId) return;
    try {
      const data = unwrap(await api.get("/products", { params: { idbranch: branchId, isactive: "true" } }));
      setProducts({ items: (data ?? []).map(normalizeProduct), loading: false, error: "" });
    } catch (err) {
      setProducts({ items: [], loading: false, error: getErrorMessage(err, "No se pudieron cargar los productos.") });
    }
  }, [branchId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  /* ---------- Buscar y agregar ---------- */
  const results = useMemo(() => {
    const term = normalizeText(query.trim());
    if (!term) return [];
    return products.items
      .filter((product) => normalizeText(`${product.name} ${product.sku} ${product.barcode}`).includes(term))
      .slice(0, MAX_RESULTS);
  }, [products.items, query]);

  const inCart = (productId) => lines.find((line) => line.productId === productId);

  const addProduct = (product, units = null) => {
    setError("");
    const existing = inCart(product.id);
    if (product.hasSerial) {
      const line = existing ?? { productId: product.id, name: product.name, sku: product.sku, price: product.salePrice, hasSerial: true, available: product.branchQuantity ?? 0, units: [], discount: "" };
      if (units) {
        const merged = [...line.units, ...units.filter((unit) => !line.units.some((current) => current.id === unit.id))];
        setLines((current) => (existing ? current.map((item) => (item.productId === product.id ? { ...item, units: merged } : item)) : [...current, { ...line, units: merged }]));
      } else {
        if (!existing) setLines((current) => [...current, line]);
        setPicking(line);
      }
    } else if (existing) {
      updateLine(product.id, { quantity: String(Math.min(Number(existing.quantity || 0) + 1, existing.available)) });
    } else {
      setLines((current) => [
        ...current,
        { productId: product.id, name: product.name, sku: product.sku, price: product.salePrice, hasSerial: false, available: product.branchQuantity ?? 0, quantity: "1", units: [], discount: "" },
      ]);
    }
    setQuery("");
    searchRef.current?.focus();
  };

  /** Enter en el buscador: código de barras o SKU exacto, o un IMEI escaneado. */
  const handleSearchKey = async (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const text = query.trim();
    if (!text) return;
    const exact = products.items.find((product) => [product.barcode, product.sku].some((code) => code && code.toUpperCase() === text.toUpperCase()));
    if (exact) return addProduct(exact);
    if (results.length === 1) return addProduct(results[0]);

    // ¿Un IMEI? Se busca la unidad disponible en la sucursal y se agrega con su producto
    try {
      const units = unwrap(await api.get("/product-units", { params: { search: text.replace(/\s+/g, ""), idbranch: branchId, status: "disponible" } })) ?? [];
      const unit = units.find((candidate) => candidate.serial === text.replace(/\s+/g, "").toUpperCase() || candidate.imei2 === text.replace(/\s+/g, ""));
      const product = unit && products.items.find((item) => item.id === unit.idproduct);
      if (product) return addProduct(product, [{ id: unit.id, serial: unit.serial, imei2: unit.imei2 ?? null }]);
    } catch {
      // Sin permiso de consultar unidades: se queda la búsqueda por nombre
    }
    setError(`No se encontró "${text}" en esta sucursal.`);
  };

  const updateLine = (productId, changes) =>
    setLines((current) => current.map((line) => (line.productId === productId ? { ...line, ...changes } : line)));
  const removeLine = (productId) => setLines((current) => current.filter((line) => line.productId !== productId));

  /* ---------- Totales ---------- */
  const subtotal = lines.reduce((sum, line) => sum + lineGross(line), 0);
  const lineDiscounts = lines.reduce((sum, line) => sum + Math.min(cents(line.discount), lineGross(line)), 0);
  const total = Math.max(subtotal - lineDiscounts - cents(discount), 0);
  // Con un solo pago, su valor es el total (se calcula al mostrar, no se guarda aparte)
  const singlePayment = payments.length === 1;
  const effectivePayments = singlePayment ? [{ ...payments[0], amount: total > 0 ? String(pesos(total)) : "" }] : payments;
  const paid = effectivePayments.reduce((sum, payment) => sum + cents(payment.amount), 0);
  const pending = total - paid;

  const customer = customers.find((item) => String(item.id) === customerId) ?? null;
  const canCredit = Boolean(customer && customer.creditLimit > 0);
  const methods = PAYMENT_METHODS.filter((method) => method.value !== "credito" || canCredit);

  const updatePayment = (key, changes) => setPayments((current) => current.map((payment) => (payment.key === key ? { ...payment, ...changes } : payment)));
  // Al pasar de uno a varios medios, el primero conserva el total para que se reparta a mano
  const addPayment = () => setPayments([...effectivePayments, emptyPayment("transferencia", pending > 0 ? String(pesos(pending)) : "")]);
  const removePayment = (key) => setPayments((current) => current.filter((payment) => payment.key !== key));

  const cashPayment = effectivePayments.find((payment) => payment.method === "efectivo");
  const change = cashPayment && cashPayment.received ? cents(cashPayment.received) - cents(cashPayment.amount) : 0;

  /* ---------- Revisión antes de cobrar (el servidor vuelve a revisar todo) ---------- */
  const problems = [];
  if (lines.length === 0) problems.push("Agrega al menos un producto.");
  lines.forEach((line) => {
    const quantity = lineQuantity(line);
    if (quantity < 1) problems.push(`${line.name}: ${line.hasSerial ? "elige los IMEI" : "escribe la cantidad"}.`);
    else if (!line.hasSerial && quantity > line.available) problems.push(`${line.name}: solo hay ${line.available}.`);
    if (cents(line.discount) > lineGross(line)) problems.push(`${line.name}: el descuento supera su valor.`);
  });
  if (total > 0 && pending !== 0) problems.push(pending > 0 ? `Faltan ${formatCurrency(pesos(pending))} por pagar.` : `Los pagos pasan el total por ${formatCurrency(pesos(-pending))}.`);
  if (payments.some((payment) => payment.method === "credito") && !canCredit) problems.push("Para fiar elige un cliente con cupo.");
  if (cashPayment && cashPayment.received && change < 0) problems.push("Lo recibido en efectivo no alcanza.");
  if (!sellerId) problems.push("Elige quién hizo la venta (vendedor).");

  const resetSale = () => {
    setLines([]);
    setCustomerId("");
    setDiscount("");
    setPayments([emptyPayment()]);
    setNotes("");
    setSaleKey(newSaleKey());
    setError("");
    searchRef.current?.focus();
  };

  const charge = async () => {
    if (problems.length > 0) {
      setError(problems[0]);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { sale, message } = await createSale({
        idempotencykey: saleKey,
        idsession: session.id,
        iduser: Number(sellerId),
        ...(customer && { idcustomer: customer.id }),
        items: lines.map((line) => ({
          idproduct: line.productId,
          ...(line.hasSerial ? { unitIds: line.units.map((unit) => unit.id) } : { quantity: Number(line.quantity) }),
          ...(canDiscount && cents(line.discount) > 0 && { discount: Number(line.discount) }),
        })),
        ...(canDiscount && cents(discount) > 0 && { discount: Number(discount) }),
        payments: effectivePayments
          .filter((payment) => cents(payment.amount) > 0)
          .map((payment) => ({
            method: payment.method,
            amount: Number(payment.amount),
            ...(payment.method === "efectivo" && payment.received && { received: Number(payment.received) }),
            ...(payment.reference.trim() && { reference: payment.reference.trim() }),
          })),
        ...(notes.trim() && { notes: notes.trim() }),
      });
      toast.success(message ?? `Venta ${sale.number} registrada.`);
      setDone({ sale, change: change > 0 ? pesos(change) : 0 });
      rememberSession(session.id);
      resetSale();
      loadProducts();
      refreshRegisters();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo registrar la venta. Inténtalo de nuevo."));
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Sin turno ---------- */
  if (sessionLoading) {
    return (
      <section className="list-page">
        <p className="pos__hint" role="status">
          Buscando cajas abiertas…
        </p>
      </section>
    );
  }
  if (sessionError || !session) {
    return (
      <section className="list-page">
        <header className="list-page__header">
          <div>
            <h1 className="list-page__title">Vender</h1>
          </div>
        </header>
        <div className="list-page__card">
          {sessionError ? (
            <StateMessage icon="alert" tone="error" title="No pudimos buscar las cajas abiertas" text={sessionError}>
              <Button variant="outline" icon="refresh" onClick={refreshRegisters}>
                Reintentar
              </Button>
            </StateMessage>
          ) : sessions.length === 0 ? (
            <StateMessage
              icon="wallet"
              title="No hay cajas abiertas"
              text="Para vender, alguien de la sucursal debe abrir el turno de una caja (Caja → Mi caja). Después todos pueden vender en ella."
            >
              {can("cash-sessions.operate") && (
                <Link className="pos__link-button" to="/caja/mi-caja">
                  Abrir una caja
                </Link>
              )}
            </StateMessage>
          ) : (
            <div className="pos__choose">
              <p className="pos__hint">Hay varias cajas abiertas: elige en cuál vas a cobrar. Este equipo la recordará.</p>
              <div className="pos__choose-list">
                {sessions.map((item) => (
                  <button key={item.id} type="button" className="pos__choose-item" onClick={() => setChosenSession(item.id)}>
                    <strong>{item.registerName}</strong>
                    <span>
                      {item.branchName} · turno de {item.userName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="list-page pos">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Vender</h1>
          <p className="list-page__subtitle">
            {session.branchName} · {session.registerName} · turno de {session.userName}
          </p>
        </div>
      </header>

      <div className="list-page__card pos__context">
        <Select
          label="Caja"
          options={sessionOptions(sessions)}
          value={String(session.id)}
          hint="El efectivo entra a esta caja."
          onChange={(event) => {
            const next = sessions.find((item) => String(item.id) === event.target.value);
            // Otra sucursal: los productos y existencias cambian, el carrito empieza de nuevo
            if (next && next.branchId !== session.branchId && lines.length > 0) {
              resetSale();
              toast.success("Cambiaste de sucursal: la venta empezó de nuevo.");
            }
            setChosenSession(next?.id ?? null);
            if (next) rememberSession(next.id);
          }}
        />
        <Select
          label="Vendedor"
          required
          placeholder="Elige quién vendió"
          options={branchSellers.map((seller) => ({ value: String(seller.id), label: seller.id === me ? `${seller.name} (tú)` : seller.name }))}
          value={sellerId}
          hint={branchSellers.length === 0 ? "Nadie con permiso «Vender» está asignado a esta sucursal." : "La venta queda a su nombre."}
          onChange={(event) => setChosenSeller(event.target.value)}
        />
      </div>

      <div className="pos__grid">
        {/* ---------- Productos ---------- */}
        <div className="list-page__card pos__search">
          <label className="pos__label" htmlFor="pos-search">
            Buscar o escanear
          </label>
          <div className="pos__search-box">
            <Icon name="barcode" className="pos__search-icon" />
            <input
              id="pos-search"
              ref={searchRef}
              className="pos__search-input"
              autoComplete="off"
              autoFocus
              placeholder="Nombre, SKU, código de barras o IMEI y Enter"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setError("");
              }}
              onKeyDown={handleSearchKey}
            />
          </div>

          {products.loading && <p className="pos__hint">Cargando productos…</p>}
          {products.error && <p className="pos__error">{products.error}</p>}
          {query.trim() && !products.loading && results.length === 0 && <p className="pos__hint">Ningún producto coincide. Si es un IMEI, presiona Enter.</p>}

          {results.length > 0 && (
            <ul className="pos__results">
              {results.map((product) => {
                const stock = product.branchQuantity ?? 0;
                return (
                  <li key={product.id}>
                    <button type="button" className="pos__result" disabled={stock <= 0} onClick={() => addProduct(product)}>
                      <span className="pos__result-main">
                        <span className="pos__result-name">{product.name}</span>
                        <span className="pos__hint">
                          {product.sku}
                          {product.hasSerial && " · con serial"} · {stock > 0 ? `${stock} disponibles` : "Agotado"}
                        </span>
                      </span>
                      <strong>{formatCurrency(product.salePrice)}</strong>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!query.trim() && <p className="pos__hint">Escribe para buscar o escanea el código de barras o el IMEI con el lector.</p>}
        </div>

        {/* ---------- Venta ---------- */}
        <div className="list-page__card pos__sale">
          <h2 className="pos__section-title">
            Venta <span className="pos__count">{lines.length}</span>
          </h2>

          {lines.length === 0 ? (
            <p className="pos__hint">Aún no hay productos en la venta.</p>
          ) : (
            <ul className="pos__lines">
              {lines.map((line) => (
                <li className="pos__line" key={line.productId}>
                  <div className="pos__line-head">
                    <span className="pos__result-name">{line.name}</span>
                    <button type="button" className="pos__remove" aria-label={`Quitar ${line.name}`} onClick={() => removeLine(line.productId)}>
                      <Icon name="x" />
                    </button>
                  </div>
                  <div className="pos__line-body">
                    {line.hasSerial ? (
                      <div className="pos__units">
                        {line.units.map((unit) => (
                          <span className="pos__unit" key={unit.id}>
                            {unit.serial}
                            <button
                              type="button"
                              aria-label={`Quitar ${unit.serial}`}
                              onClick={() => updateLine(line.productId, { units: line.units.filter((item) => item.id !== unit.id) })}
                            >
                              <Icon name="x" />
                            </button>
                          </span>
                        ))}
                        <Button variant="outline" icon="barcode" onClick={() => setPicking(line)}>
                          {line.units.length ? "Cambiar IMEI" : "Elegir IMEI"}
                        </Button>
                      </div>
                    ) : (
                      <Field
                        label={`Cantidad (hay ${line.available})`}
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={6}
                        value={line.quantity}
                        onChange={(event) => updateLine(line.productId, { quantity: event.target.value.replace(/\D/g, "") })}
                      />
                    )}
                    {canDiscount && (
                      <Field
                        label="Descuento ($)"
                        inputMode="decimal"
                        autoComplete="off"
                        maxLength={12}
                        placeholder="0"
                        onInput={sanitizeDecimal}
                        value={line.discount}
                        onChange={(event) => updateLine(line.productId, { discount: event.target.value })}
                      />
                    )}
                  </div>
                  <p className="pos__line-total">
                    {lineQuantity(line)} × {formatCurrency(line.price)}
                    {cents(line.discount) > 0 && ` − ${formatCurrency(Number(line.discount))}`} ={" "}
                    <strong>{formatCurrency(pesos(lineTotal(line)))}</strong>
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="pos__row">
            {canReadCustomers ? (
              <Select
                label="Cliente"
                placeholder="Consumidor final"
                options={customers.filter((item) => item.isActive).map((item) => ({ value: String(item.id), label: `${item.name}${item.document ? ` · ${item.document}` : ""}` }))}
                value={customerId}
                hint={customer && customer.creditLimit > 0 ? `Cupo de crédito ${formatCurrency(customer.creditLimit)} a ${customer.creditDays} días` : undefined}
                onChange={(event) => {
                  setCustomerId(event.target.value);
                  setPayments((current) => current.map((payment) => (payment.method === "credito" ? { ...payment, method: "efectivo" } : payment)));
                }}
              />
            ) : (
              <p className="pos__hint">Cliente: consumidor final.</p>
            )}
            {canDiscount && (
              <Field
                label="Descuento a la venta ($)"
                inputMode="decimal"
                autoComplete="off"
                maxLength={12}
                placeholder="0"
                onInput={sanitizeDecimal}
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
              />
            )}
          </div>

          <dl className="pos__totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCurrency(pesos(subtotal))}</dd>
            </div>
            {lineDiscounts + cents(discount) > 0 && (
              <div>
                <dt>Descuentos</dt>
                <dd>− {formatCurrency(pesos(lineDiscounts + cents(discount)))}</dd>
              </div>
            )}
            <div className="pos__grand">
              <dt>Total</dt>
              <dd>{formatCurrency(pesos(total))}</dd>
            </div>
          </dl>

          {/* ---------- Pagos ---------- */}
          <h2 className="pos__section-title">Pago</h2>
          <ul className="pos__payments">
            {effectivePayments.map((payment) => (
              <li className="pos__payment" key={payment.key}>
                <Select
                  label="Medio"
                  options={methods}
                  value={payment.method}
                  onChange={(event) => updatePayment(payment.key, { method: event.target.value, received: "", reference: "" })}
                />
                <Field
                  label="Valor"
                  inputMode="decimal"
                  autoComplete="off"
                  maxLength={12}
                  readOnly={singlePayment}
                  onInput={sanitizeDecimal}
                  value={payment.amount}
                  onChange={(event) => updatePayment(payment.key, { amount: event.target.value })}
                />
                {payment.method === "efectivo" ? (
                  <Field
                    label="Recibido"
                    inputMode="decimal"
                    autoComplete="off"
                    maxLength={12}
                    placeholder="Con cuánto paga"
                    onInput={sanitizeDecimal}
                    value={payment.received}
                    onChange={(event) => updatePayment(payment.key, { received: event.target.value })}
                  />
                ) : payment.method !== "credito" ? (
                  <Field
                    label="Referencia"
                    autoComplete="off"
                    maxLength={100}
                    placeholder="Nº de la transacción"
                    value={payment.reference}
                    onChange={(event) => updatePayment(payment.key, { reference: event.target.value })}
                  />
                ) : (
                  <p className="pos__hint">Queda fiado a {customer?.name}.</p>
                )}
                {!singlePayment && (
                  <button type="button" className="pos__remove" aria-label="Quitar este pago" onClick={() => removePayment(payment.key)}>
                    <Icon name="x" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="pos__pay-actions">
            <Button variant="outline" icon="plus" onClick={addPayment} disabled={payments.length >= 6}>
              Otro medio de pago
            </Button>
            {change > 0 && (
              <p className="pos__change" role="status">
                Vueltas: <strong>{formatCurrency(pesos(change))}</strong>
              </p>
            )}
            {!singlePayment && pending !== 0 && (
              <p className={`pos__pending ${pending < 0 ? "pos__pending--over" : ""}`.trim()}>
                {pending > 0 ? `Falta ${formatCurrency(pesos(pending))}` : `Sobra ${formatCurrency(pesos(-pending))}`}
              </p>
            )}
          </div>

          <Field label="Notas" multiline maxLength={255} placeholder="Opcional" value={notes} onChange={(event) => setNotes(event.target.value)} />

          {error && (
            <p className="pos__error" role="alert">
              {error}
            </p>
          )}

          <div className="pos__charge">
            <Button variant="outline" onClick={resetSale} disabled={busy || lines.length === 0}>
              Cancelar venta
            </Button>
            <Button icon="check" className="pos__charge-button" onClick={charge} disabled={busy || lines.length === 0}>
              {busy ? "Registrando…" : `Cobrar ${formatCurrency(pesos(total))}`}
            </Button>
          </div>
        </div>
      </div>

      <UnitPickerModal
        line={picking}
        branchId={branchId}
        onClose={() => {
          // Si no eligió ninguno, la línea con serial vacía se quita
          if (picking && !lines.find((line) => line.productId === picking.productId)?.units.length) removeLine(picking.productId);
          setPicking(null);
        }}
        onConfirm={(units) => {
          updateLine(picking.productId, { units });
          setPicking(null);
          searchRef.current?.focus();
        }}
      />

      <SaleDoneModal result={done} onClose={() => setDone(null)} />
    </section>
  );
};

export default PosPage;
