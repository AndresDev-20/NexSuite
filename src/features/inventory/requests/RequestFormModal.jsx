import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import Modal from "../../../components/feadback/Modal/Modal";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import getErrorMessage from "../../../utils/getErrorMessage";
import { stripNonDigits } from "../../../utils/validators";
import { createRequest, searchAvailability } from "./requestsApi";
import "../transfers/transfers.css";
import "./requests.css";

const SEARCH_DELAY_MS = 350;

/**
 * Nuevo pedido (Fase 52): se busca el producto y se ve cuántas hay en cada sucursal; se toca la sucursal que lo
 * tiene para pedírselo. Un pedido va a una sola sucursal (si hace falta de otra, se hace otro pedido).
 * branches: las sucursales del usuario (desde cuál pide) · defaultBranchId: la activa.
 */
const RequestForm = ({ branches, defaultBranchId, onClose, onCreated }) => {
  const [branchId, setBranchId] = useState(String(defaultBranchId ?? branches[0]?.id ?? ""));
  const [query, setQuery] = useState("");
  const [found, setFound] = useState({ key: "", products: [], branches: [] });
  const [lines, setLines] = useState([]); // [{ productId, name, sku, quantity, available }]
  const [source, setSource] = useState(null); // { id, name }
  const [notes, setNotes] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => crypto.randomUUID());

  const term = query.trim();
  useEffect(() => {
    if (!term) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      searchAvailability(term)
        .then((data) => active && setFound({ key: term, products: data.products ?? [], branches: data.branches ?? [] }))
        .catch(() => active && setFound({ key: term, products: [], branches: [] }));
    }, SEARCH_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [term]);
  const results = term && found.key === term ? found : { products: [], branches: [] };
  const searching = Boolean(term) && found.key !== term;
  const others = useMemo(() => results.branches.filter((branch) => String(branch.id) !== branchId), [results.branches, branchId]);

  const add = (product, branch) => {
    setNote("");
    if (source && source.id !== branch.id) {
      setNote(`Este pedido es a ${source.name}. Para pedirle a ${branch.nameBranch}, envía este y haz otro pedido.`);
      return;
    }
    setSource({ id: branch.id, name: branch.nameBranch });
    setLines((current) =>
      current.some((line) => line.productId === product.id)
        ? current
        : [...current, { productId: product.id, name: product.nameproduct, sku: product.sku, hasSerial: product.hasserial, quantity: "1", available: product.stock[branch.id] ?? 0 }]
    );
  };
  const update = (productId, quantity) => setLines((current) => current.map((line) => (line.productId === productId ? { ...line, quantity } : line)));
  const remove = (productId) =>
    setLines((current) => {
      const next = current.filter((line) => line.productId !== productId);
      if (next.length === 0) setSource(null);
      return next;
    });

  const problem =
    !branchId ? "Elige para qué sucursal pides." : lines.length === 0 ? "Busca un producto y toca la sucursal que lo tiene." : lines.some((line) => !(Number(line.quantity) > 0)) ? "Escribe la cantidad de cada producto." : "";

  const submit = async () => {
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    try {
      const { request, message } = await createRequest({
        idbranch: Number(branchId),
        idsource: source.id,
        items: lines.map((line) => ({ idproduct: line.productId, quantity: Number(line.quantity) })),
        ...(notes.trim() && { notes: notes.trim() }),
        idempotencykey: key,
      });
      onCreated(request, message);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No se pudo enviar el pedido."));
      setBusy(false);
    }
  };

  return (
    <div className="request-form">
      <Select
        label="Pido para"
        required
        options={branches.map((branch) => ({ value: String(branch.id), label: branch.name }))}
        value={branchId}
        disabled={lines.length > 0}
        hint={lines.length > 0 ? "Para cambiarla, quita los productos." : "La sucursal que recibe el pedido."}
        onChange={(event) => setBranchId(event.target.value)}
      />

      <div className="transfer-picker">
        <label className="field__label" htmlFor="request-search">
          Buscar producto
        </label>
        <div className="transfer-picker__box">
          <Icon name="search" />
          <input
            id="request-search"
            className="transfer-picker__input"
            type="search"
            autoComplete="off"
            placeholder="Nombre, SKU o código de barras"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {searching && <p className="request-form__hint">Buscando…</p>}
      {term && !searching && results.products.length === 0 && <p className="request-form__hint">Ningún producto coincide con «{term}».</p>}
      {results.products.length > 0 && (
        <ul className="request-results">
          {results.products.map((product) => {
            const mine = product.stock[branchId] ?? 0;
            // Solo las sucursales que lo tienen: a esas se les puede pedir
            const having = others.filter((branch) => (product.stock[branch.id] ?? 0) > 0);
            return (
              <li key={product.id} className="request-results__row">
                <div className="request-results__name">
                  <strong>{product.nameproduct}</strong>
                  <small>
                    {product.sku}
                    {product.hasserial && " · con IMEI"} · en tu sucursal: {mine === 0 ? "no hay" : mine}
                  </small>
                </div>
                <div className="request-results__branches">
                  {having.length === 0 && <span className="request-form__hint">No hay en otras sucursales</span>}
                  {having.map((branch) => {
                    const count = product.stock[branch.id];
                    return (
                      <button
                        type="button"
                        key={branch.id}
                        className="request-chip request-chip--has"
                        title={`Pedírselo a ${branch.nameBranch}`}
                        onClick={() => add(product, branch)}
                      >
                        {branch.nameBranch} <strong>{count}</strong>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {note && (
        <p className="request-form__note" role="note">
          {note}
        </p>
      )}

      {lines.length > 0 && (
        <section className="request-cart" aria-label="Lo que pides">
          <h3 className="request-cart__title">
            Pedido a <strong>{source?.name}</strong>
          </h3>
          <ul>
            {lines.map((line) => (
              <li key={line.productId} className="request-cart__row">
                <div className="request-results__name">
                  <strong>{line.name}</strong>
                  <small>
                    {line.sku} · {source?.name} tiene {line.available}
                  </small>
                </div>
                <Field
                  label="Cantidad"
                  inputMode="numeric"
                  maxLength={5}
                  value={line.quantity}
                  onInput={stripNonDigits}
                  onChange={(event) => update(line.productId, event.target.value)}
                />
                <button type="button" className="request-cart__remove" aria-label={`Quitar ${line.name}`} onClick={() => remove(line.productId)}>
                  <Icon name="trash" />
                </button>
              </li>
            ))}
          </ul>
          <Field label="Nota (opcional)" maxLength={500} placeholder="Ej: es para un cliente que espera hoy" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </section>
      )}

      {error && (
        <p className="request-form__error" role="alert">
          {error}
        </p>
      )}
      <FormActions>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button icon="check" onClick={submit} disabled={busy}>
          {busy ? "Enviando…" : "Enviar pedido"}
        </Button>
      </FormActions>
    </div>
  );
};

const RequestFormModal = ({ open, onClose, ...props }) => (
  <Modal icon="box" open={open} size="wide" title="Nuevo pedido a otra sucursal" subtitle="Busca el producto y pídeselo a la sucursal que lo tiene." onClose={onClose}>
    {open && <RequestForm onClose={onClose} {...props} />}
  </Modal>
);

export default RequestFormModal;
