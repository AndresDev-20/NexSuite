import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../../api/client";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import Modal from "../../../components/feadback/Modal/Modal";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import useActiveBranch from "../../branches/useActiveBranch";
import { normalizeProduct } from "../../inventory/products/useProducts";
import UnitPickerModal from "../../sales/PosPage/UnitPickerModal";
import NewCustomerButton from "../../sales/customers/NewCustomerButton";
import { newSaleKey } from "../../sales/sales/useSales";
import useSaleOrders, { ORDER_STATUS_LABELS, formatLeft, useReservedQuantities, useSecondsLeft } from "../useSaleOrders";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import normalizeText from "../../../utils/normalizeText";
import "../../../styles/listPage.css";
import "../../sales/PosPage/pos.css";
import "../saleOrders.css";

const MAX_RESULTS = 8;
const REFRESH_MS = 20000;
const cents = (value) => Math.round(Number(value || 0) * 100);

const lineQuantity = (line) => (line.hasSerial ? line.units.length : Number(line.quantity) || 0);

/** Un pedido propio en la lista: lo que le queda y cancelar. */
const MyOrder = ({ order, onCancel }) => {
  const left = useSecondsLeft(order.expiresAt);
  const pending = order.status === "pendiente";
  return (
    <li className={`orders-mine__item orders-mine__item--${order.status}`}>
      <div className="orders-mine__head">
        <strong className="orders-number">#{order.id}</strong>
        <span className="orders-status">{pending && left === 0 ? "Vencido" : ORDER_STATUS_LABELS[order.status]}</span>
      </div>
      <p className="pos__hint">
        {order.items.map((item) => `${item.quantity} × ${item.name}`).join(" · ")}
      </p>
      <div className="orders-mine__foot">
        <strong>{formatCurrency(order.total)}</strong>
        {pending && left > 0 && <span className="orders-left">Vence en {formatLeft(left)}</span>}
        {order.status === "cobrado" && order.saleNumber && <span className="pos__hint">Venta {order.saleNumber}</span>}
        {order.status === "rechazado" && order.reason && <span className="pos__hint">Motivo: {order.reason}</span>}
      </div>
      {pending && left > 0 && (
        <Button variant="outline" icon="x" onClick={() => onCancel(order)}>
          Cancelar pedido
        </Button>
      )}
    </li>
  );
};

/** Pedido enviado: el número grande para decírselo al cliente. */
const SentModal = ({ order, onClose }) => {
  const left = useSecondsLeft(order?.expiresAt ?? 0);
  return (
    <Modal open={Boolean(order)} title="Pedido enviado a caja" onClose={onClose}>
      {order && (
        <div className="orders-sent">
          <p className="orders-sent__label">Dile al cliente que pase a caja con el</p>
          <p className="orders-sent__number">Pedido #{order.id}</p>
          <p className="orders-sent__total">{formatCurrency(order.total)}</p>
          <p className="pos__hint">Las unidades quedan apartadas{left > 0 ? ` (vence en ${formatLeft(left)})` : ""}. Si nadie lo cobra a tiempo, se cancela solo.</p>
          <FormActions>
            <Button icon="plus" data-autofocus onClick={onClose}>
              Nuevo pedido
            </Button>
          </FormActions>
        </div>
      )}
    </Modal>
  );
};

/**
 * Pedido a caja desde la tablet (Fase 18): el vendedor busca los productos, elige cantidades o
 * IMEI y lo envía a las cajas de su sucursal. La caja lo cobra y la venta queda a su nombre.
 */
const OrderPage = () => {
  const toast = useToast();
  const { branches, activeBranchId } = useActiveBranch();
  const { items: mine, getOrders, createOrder, cancelOrder } = useSaleOrders();
  // Los últimos que ya se cerraron: si se cobró, se rechazó (con el motivo), se canceló o venció
  const { items: recent, getOrders: getRecent } = useSaleOrders();

  const [chosenBranch, setChosenBranch] = useState("");
  const branchId = activeBranchId ?? (Number(chosenBranch) || (branches.length === 1 ? branches[0].id : null));
  const branch = branches.find((item) => item.id === branchId) ?? null;
  const { reserved, reloadReserved } = useReservedQuantities(branchId);

  const [products, setProducts] = useState({ items: [], loading: true, error: "" });
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState([]);
  const [picking, setPicking] = useState(null);
  const [notes, setNotes] = useState("");
  const [orderKey, setOrderKey] = useState(newSaleKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(null);
  const searchRef = useRef(null);

  const loadProducts = useCallback(async () => {
    if (!branchId) return;
    try {
      const data = unwrap(await api.get("/products", { params: { idbranch: branchId, isactive: "true" } }));
      setProducts({ items: (data ?? []).map(normalizeProduct), loading: false, error: "" });
    } catch (err) {
      setProducts({ items: [], loading: false, error: getErrorMessage(err, "No se pudieron cargar los productos.") });
    }
  }, [branchId]);

  const loadMine = useCallback(() => {
    if (!branchId) return;
    getOrders({ idbranch: branchId, mine: "true" }, { quiet: true });
    getRecent({ idbranch: branchId, mine: "true", status: "cobrado,rechazado,cancelado,vencido", limit: 5 }, { quiet: true });
  }, [branchId, getOrders, getRecent]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Mis pedidos pendientes: se actualizan solos (la caja los cobra o rechaza)
  useEffect(() => {
    loadMine();
    const timer = setInterval(() => {
      loadMine();
      reloadReserved();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadMine, reloadReserved]);

  /** Lo libre de un producto: lo de la sucursal menos lo apartado en otros pedidos. */
  const freeOf = useCallback((product) => Math.max((product.branchQuantity ?? 0) - (reserved[product.id] ?? 0), 0), [reserved]);

  const results = useMemo(() => {
    const term = normalizeText(query.trim());
    if (!term) return [];
    return products.items.filter((product) => normalizeText(`${product.name} ${product.sku} ${product.barcode}`).includes(term)).slice(0, MAX_RESULTS);
  }, [products.items, query]);

  const updateLine = (productId, changes) => setLines((current) => current.map((line) => (line.productId === productId ? { ...line, ...changes } : line)));
  const removeLine = (productId) => setLines((current) => current.filter((line) => line.productId !== productId));

  const addProduct = (product) => {
    setError("");
    const existing = lines.find((line) => line.productId === product.id);
    const free = freeOf(product);
    if (product.hasSerial) {
      const line = existing ?? { productId: product.id, name: product.name, price: product.salePrice, hasSerial: true, available: free, units: [] };
      if (!existing) setLines((current) => [...current, line]);
      setPicking(line);
    } else if (existing) {
      updateLine(product.id, { quantity: String(Math.min(Number(existing.quantity || 0) + 1, existing.available)) });
    } else {
      setLines((current) => [...current, { productId: product.id, name: product.name, price: product.salePrice, hasSerial: false, available: free, quantity: "1", units: [] }]);
    }
    setQuery("");
  };

  const handleSearchKey = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const text = query.trim();
    const exact = products.items.find((product) => [product.barcode, product.sku].some((code) => code && code.toUpperCase() === text.toUpperCase()));
    if (exact) return addProduct(exact);
    if (results.length === 1) return addProduct(results[0]);
  };

  const step = (line, delta) => updateLine(line.productId, { quantity: String(Math.min(Math.max(lineQuantity(line) + delta, 1), line.available)) });

  const total = lines.reduce((sum, line) => sum + cents(line.price) * lineQuantity(line), 0);

  const problems = [];
  if (lines.length === 0) problems.push("Agrega al menos un producto.");
  lines.forEach((line) => {
    const quantity = lineQuantity(line);
    if (quantity < 1) problems.push(`${line.name}: ${line.hasSerial ? "elige los IMEI" : "escribe la cantidad"}.`);
    else if (!line.hasSerial && quantity > line.available) problems.push(`${line.name}: solo hay ${line.available} libres.`);
  });

  const reset = () => {
    setLines([]);
    setNotes("");
    setOrderKey(newSaleKey());
    setError("");
  };

  const send = async () => {
    if (problems.length > 0) return setError(problems[0]);
    setBusy(true);
    setError("");
    try {
      const { order, message } = await createOrder({
        idempotencykey: orderKey,
        idbranch: branchId,
        items: lines.map((line) => ({ idproduct: line.productId, ...(line.hasSerial ? { unitIds: line.units.map((unit) => unit.id) } : { quantity: Number(line.quantity) }) })),
        ...(notes.trim() && { notes: notes.trim() }),
      });
      toast.success(message ?? `Pedido #${order.id} enviado a caja.`);
      setSent(order);
      reset();
      loadMine();
      reloadReserved();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo enviar el pedido. Inténtalo de nuevo."));
      reloadReserved();
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (order) => {
    try {
      const { message } = await cancelOrder(order.id);
      toast.success(message ?? `Pedido #${order.id} cancelado.`);
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo cancelar el pedido."));
    }
    loadMine();
    reloadReserved();
  };

  if (!branchId) {
    return (
      <section className="list-page">
        <header className="list-page__header">
          <div>
            <h1 className="list-page__title">Pedido a caja</h1>
          </div>
        </header>
        <div className="list-page__card orders-branch">
          {branches.length === 0 ? (
            <StateMessage icon="store" title="No tienes sucursales asignadas" text="Pídele a un administrador que te asigne a tu sucursal." />
          ) : (
            <Select
              label="Sucursal"
              required
              placeholder="¿En qué sucursal estás?"
              options={branches.map((item) => ({ value: String(item.id), label: item.name }))}
              value={chosenBranch}
              hint="El pedido llega a las cajas abiertas de esta sucursal."
              onChange={(event) => setChosenBranch(event.target.value)}
            />
          )}
        </div>
      </section>
    );
  }

  const pendingMine = mine.filter((order) => order.status === "pendiente");

  return (
    <section className="list-page pos orders-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Pedido a caja</h1>
          <p className="list-page__subtitle">{branch?.name} · arma el pedido y el cliente lo paga en caja</p>
        </div>
        {/* Fase 19: el vendedor registra al cliente nuevo; en caja lo eligen al cobrar */}
        <NewCustomerButton />
      </header>

      <div className="pos__grid">
        <div className="list-page__card pos__search">
          <label className="pos__label" htmlFor="order-search">
            Buscar producto
          </label>
          <div className="pos__search-box">
            <Icon name="search" className="pos__search-icon" />
            <input
              id="order-search"
              ref={searchRef}
              className="pos__search-input"
              autoComplete="off"
              placeholder="Nombre, SKU o código de barras"
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
          {query.trim() && !products.loading && results.length === 0 && <p className="pos__hint">Ningún producto coincide.</p>}
          {results.length > 0 && (
            <ul className="pos__results">
              {results.map((product) => {
                const free = freeOf(product);
                const held = reserved[product.id] ?? 0;
                return (
                  <li key={product.id}>
                    <button type="button" className="pos__result orders-result" disabled={free <= 0} onClick={() => addProduct(product)}>
                      <span className="pos__result-main">
                        <span className="pos__result-name">{product.name}</span>
                        <span className="pos__hint">
                          {product.hasSerial && "Con IMEI · "}
                          {free > 0 ? `${free} libres` : "Agotado"}
                          {held > 0 && ` · ${held} ${held === 1 ? "apartada" : "apartadas"}`}
                        </span>
                      </span>
                      <strong>{formatCurrency(product.salePrice)}</strong>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!query.trim() && <p className="pos__hint">Escribe para buscar. Lo apartado en otros pedidos no se puede pedir.</p>}

          <div className="orders-mine">
            <h2 className="pos__section-title">
              Mis pedidos en caja <span className="pos__count">{pendingMine.length}</span>
            </h2>
            <ul className="orders-mine__list">
              {pendingMine.map((order) => (
                <MyOrder key={order.id} order={order} onCancel={cancel} />
              ))}
            </ul>
            {pendingMine.length === 0 && <p className="pos__hint">No tienes pedidos esperando en caja.</p>}
            {recent.length > 0 && (
              <>
                <h2 className="pos__section-title">Últimos pedidos</h2>
                <ul className="orders-mine__list">
                  {recent.map((order) => (
                    <MyOrder key={order.id} order={order} onCancel={cancel} />
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="list-page__card pos__sale">
          <h2 className="pos__section-title">
            Pedido <span className="pos__count">{lines.length}</span>
          </h2>
          {lines.length === 0 ? (
            <p className="pos__hint">Aún no hay productos en el pedido.</p>
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
                  {line.hasSerial ? (
                    <div className="pos__units">
                      {line.units.map((unit) => (
                        <span className="pos__unit" key={unit.id}>
                          {unit.serial}
                          <button type="button" aria-label={`Quitar ${unit.serial}`} onClick={() => updateLine(line.productId, { units: line.units.filter((item) => item.id !== unit.id) })}>
                            <Icon name="x" />
                          </button>
                        </span>
                      ))}
                      <Button variant="outline" icon="barcode" onClick={() => setPicking(line)}>
                        {line.units.length ? "Cambiar IMEI" : "Elegir IMEI"}
                      </Button>
                    </div>
                  ) : (
                    <div className="orders-stepper" role="group" aria-label={`Cantidad de ${line.name}`}>
                      <button type="button" className="orders-stepper__button" aria-label="Uno menos" disabled={lineQuantity(line) <= 1} onClick={() => step(line, -1)}>
                        −
                      </button>
                      <input
                        className="orders-stepper__value"
                        inputMode="numeric"
                        aria-label="Cantidad"
                        maxLength={6}
                        value={line.quantity}
                        onChange={(event) => updateLine(line.productId, { quantity: event.target.value.replace(/\D/g, "") })}
                      />
                      <button type="button" className="orders-stepper__button" aria-label="Uno más" disabled={lineQuantity(line) >= line.available} onClick={() => step(line, 1)}>
                        +
                      </button>
                      <span className="pos__hint">de {line.available} libres</span>
                    </div>
                  )}
                  <p className="pos__line-total">
                    {lineQuantity(line)} × {formatCurrency(line.price)} = <strong>{formatCurrency((cents(line.price) * lineQuantity(line)) / 100)}</strong>
                  </p>
                </li>
              ))}
            </ul>
          )}

          <dl className="pos__totals">
            <div className="pos__grand">
              <dt>Total</dt>
              <dd>{formatCurrency(total / 100)}</dd>
            </div>
          </dl>
          <p className="pos__hint">El cliente elige en caja cómo paga (también fiado). La venta queda a tu nombre.</p>

          <Field label="Nota para la caja" multiline maxLength={255} placeholder="Opcional. Ej: cliente de camisa azul" value={notes} onChange={(event) => setNotes(event.target.value)} />

          {error && (
            <p className="pos__error" role="alert">
              {error}
            </p>
          )}

          <div className="pos__charge">
            <Button variant="outline" onClick={reset} disabled={busy || lines.length === 0}>
              Borrar
            </Button>
            <Button icon="check" className="pos__charge-button" onClick={send} disabled={busy || lines.length === 0}>
              {busy ? "Enviando…" : `Enviar a caja · ${formatCurrency(total / 100)}`}
            </Button>
          </div>
        </div>
      </div>

      <UnitPickerModal
        line={picking}
        branchId={branchId}
        verb="Apartar"
        onClose={() => {
          if (picking && !lines.find((line) => line.productId === picking.productId)?.units.length) removeLine(picking.productId);
          setPicking(null);
        }}
        onConfirm={(units) => {
          updateLine(picking.productId, { units });
          setPicking(null);
        }}
      />

      <SentModal order={sent} onClose={() => setSent(null)} />
    </section>
  );
};

export default OrderPage;
