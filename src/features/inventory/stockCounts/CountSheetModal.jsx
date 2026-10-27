import { useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import { formatDateTime } from "../../administration/audit/auditOptions";
import getErrorMessage from "../../../utils/getErrorMessage";
import normalizeText from "../../../utils/normalizeText";
import { stripNonDigits } from "../../../utils/validators";
import CountStatusBadge from "./CountStatusBadge";
import { formatDifference, normalizeSerial } from "./countOptions";
import "./stockCounts.css";

/** Lo anotado de cada producto: { [productId]: { counted: "3" } | { serials: [...] } }. */
const draftsFrom = (count) =>
  Object.fromEntries(
    count.items.map((item) => [
      item.productId,
      item.hasSerial ? { serials: item.countedSerials } : { counted: item.counted === null ? "" : String(item.counted) },
    ])
  );

const SerialChips = ({ serials, tone, onRemove }) => (
  <ul className="count-chips">
    {serials.map((serial) => (
      <li key={serial} className={`count-chips__chip ${tone ? `count-chips__chip--${tone}` : ""}`.trim()}>
        {serial}
        {onRemove && (
          <button type="button" className="count-chips__remove" aria-label={`Quitar ${serial}`} onClick={() => onRemove(serial)}>
            ×
          </button>
        )}
      </li>
    ))}
  </ul>
);

/* ---------- Contar (en_conteo): a ciegas, sin mostrar lo que debería haber ---------- */
const CountingSheet = ({ count, busy, onSave, onSubmit }) => {
  const toast = useToast();
  const [drafts, setDrafts] = useState(() => draftsFrom(count));
  const [dirty, setDirty] = useState(() => new Set());
  const [query, setQuery] = useState("");
  const [scan, setScan] = useState("");
  const [scanMessage, setScanMessage] = useState(null); // { tone, text }
  const [serialInputs, setSerialInputs] = useState({});

  const change = (productId, draft) => {
    setDrafts((current) => ({ ...current, [productId]: draft }));
    setDirty((current) => new Set(current).add(productId));
  };

  const addSerial = (item, raw) => {
    const serial = normalizeSerial(raw);
    if (!serial) return false;
    const serials = drafts[item.productId].serials;
    if (serials.includes(serial)) return true;
    change(item.productId, { serials: [...serials, serial] });
    return true;
  };

  /** Lector general: código de barras o SKU suma 1; un IMEI se marca en su producto. */
  const handleScan = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const code = normalizeSerial(scan);
    if (!code) return;
    const byCode = count.items.find((item) => !item.hasSerial && [item.barcode, item.productSku].some((value) => normalizeSerial(value) === code));
    const bySerial = count.items.find((item) => item.hasSerial && item.expectedSerials.includes(code));
    if (byCode) {
      const next = (Number(drafts[byCode.productId].counted) || 0) + 1;
      change(byCode.productId, { counted: String(next) });
      setScanMessage({ tone: "ok", text: `${byCode.productName}: ${next}` });
    } else if (bySerial) {
      addSerial(bySerial, code);
      setScanMessage({ tone: "ok", text: `${bySerial.productName}: ${code}` });
    } else {
      setScanMessage({ tone: "error", text: `${code} no es de este conteo. Si es un IMEI de más, escríbelo en su producto.` });
    }
    setScan("");
  };

  const entries = () =>
    [...dirty].map((productId) => {
      const item = count.items.find((candidate) => candidate.productId === productId);
      const draft = drafts[productId];
      return item.hasSerial
        ? { idproduct: productId, serials: draft.serials }
        : { idproduct: productId, counted: draft.counted === "" ? null : Number(draft.counted) };
    });

  const save = async () => {
    if (dirty.size === 0) return true;
    try {
      await onSave(entries());
      setDirty(new Set());
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo guardar el conteo."));
      return false;
    }
  };

  const submit = async () => {
    if (!(await save())) return;
    try {
      await onSubmit();
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo enviar a revisión."));
    }
  };

  const countedNow = count.items.filter((item) =>
    item.hasSerial ? drafts[item.productId].serials.length > 0 || item.counted !== null : drafts[item.productId].counted !== ""
  ).length;
  const term = normalizeText(query.trim());
  const visible = count.items.filter(
    (item) => !term || normalizeText(`${item.productName} ${item.productSku} ${item.barcode}`).includes(term)
  );

  return (
    <div className="count-sheet">
      {count.reviewNote && (
        <p className="count-sheet__note" role="note">
          Devuelto para recontar: {count.reviewNote}
        </p>
      )}

      <div className="count-sheet__tools">
        <Field
          label="Lector: código de barras, SKU o IMEI"
          autoComplete="off"
          spellCheck={false}
          placeholder="Escanea y presiona Enter"
          value={scan}
          data-autofocus
          onChange={(event) => setScan(event.target.value)}
          onKeyDown={handleScan}
        />
        <SearchInput label="Buscar producto" placeholder="Buscar en la lista" value={query} onChange={setQuery} />
      </div>
      {scanMessage && (
        <p className={`count-sheet__scan count-sheet__scan--${scanMessage.tone}`} role="status">
          {scanMessage.text}
        </p>
      )}

      <p className="count-sheet__progress">
        {countedNow} de {count.items.length} contados{dirty.size > 0 ? ` · ${dirty.size} sin guardar` : ""}
      </p>

      <ul className="count-sheet__list">
        {visible.map((item) => {
          const draft = drafts[item.productId];
          return (
            <li key={item.productId} className="count-row">
              <div className="count-row__name">
                <strong>{item.productName}</strong>
                <span className="count-row__sku">
                  {item.productSku}
                  {item.barcode && ` · ${item.barcode}`}
                </span>
              </div>

              {item.hasSerial ? (
                <div className="count-row__serials">
                  <Field
                    label={`IMEI escaneados (${draft.serials.length})`}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Escanea y presiona Enter"
                    value={serialInputs[item.productId] ?? ""}
                    onChange={(event) => setSerialInputs((current) => ({ ...current, [item.productId]: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      if (addSerial(item, serialInputs[item.productId] ?? "")) {
                        setSerialInputs((current) => ({ ...current, [item.productId]: "" }));
                      }
                    }}
                  />
                  {draft.serials.length > 0 && (
                    <SerialChips
                      serials={draft.serials}
                      onRemove={(serial) => change(item.productId, { serials: draft.serials.filter((value) => value !== serial) })}
                    />
                  )}
                </div>
              ) : (
                <Field
                  label="Contado"
                  className="count-row__qty"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={7}
                  placeholder="—"
                  value={draft.counted}
                  onInput={stripNonDigits}
                  onChange={(event) => change(item.productId, { counted: event.target.value })}
                />
              )}
            </li>
          );
        })}
      </ul>

      <FormActions>
        <Button variant="outline" icon="check" disabled={busy || dirty.size === 0} onClick={save}>
          Guardar
        </Button>
        <Button icon="check" disabled={busy} onClick={submit}>
          Enviar a revisión
        </Button>
      </FormActions>
    </div>
  );
};

/* ---------- Revisar / ver (en_revision, aprobado, anulado) ---------- */
const ReviewSheet = ({ count, canApprove, busy, onApprove, onReturn, onCancel }) => {
  const [onlyDifferences, setOnlyDifferences] = useState(count.differences > 0);
  const rows = useMemo(
    () =>
      count.items.filter(
        (item) => !onlyDifferences || item.difference !== 0 || item.missing.length > 0 || item.extra.length > 0
      ),
    [count.items, onlyDifferences]
  );
  const reviewing = count.status === "en_revision";

  return (
    <div className="count-sheet">
      {count.status === "anulado" && (
        <p className="count-sheet__note count-sheet__note--danger" role="note">
          Anulado el {formatDateTime(count.cancelledAt)}: {count.cancelReason}
        </p>
      )}
      {count.status === "aprobado" && (
        <p className="count-sheet__note count-sheet__note--ok" role="note">
          Aprobado por {count.approvedBy} el {formatDateTime(count.approvedAt)}: las existencias quedaron corregidas.
        </p>
      )}
      {reviewing && (
        <p className="count-sheet__note" role="note">
          Revisa las diferencias. Al aprobar se corrigen las existencias con <strong>contado − lo que había al empezar</strong>; los IMEI
          que faltan quedan de baja.
        </p>
      )}

      <div className="count-sheet__summary">
        <span>
          <strong>{count.differences}</strong> {count.differences === 1 ? "producto con diferencia" : "productos con diferencia"} de{" "}
          {count.items.length}
        </span>
        <label className="count-sheet__toggle">
          <input type="checkbox" checked={onlyDifferences} onChange={(event) => setOnlyDifferences(event.target.checked)} />
          Solo diferencias
        </label>
      </div>

      <div className="count-review__wrap">
        <table className="count-review">
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col" className="count-review__num">
                Había
              </th>
              <th scope="col" className="count-review__num">
                Contado
              </th>
              <th scope="col" className="count-review__num">
                Diferencia
              </th>
              <th scope="col" className="count-review__num">
                Hoy
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.productId}>
                <td>
                  <span className="count-row__name">
                    <strong>{item.productName}</strong>
                    <span className="count-row__sku">{item.productSku}</span>
                  </span>
                  {item.missing.length > 0 && (
                    <div className="count-review__serials">
                      <span className="count-review__label count-review__label--out">No aparecieron (quedarán de baja)</span>
                      <SerialChips serials={item.missing} tone="out" />
                    </div>
                  )}
                  {item.extra.length > 0 && (
                    <div className="count-review__serials">
                      <span className="count-review__label">Aparecieron de más (solo se informan)</span>
                      <SerialChips serials={item.extra} tone="in" />
                    </div>
                  )}
                </td>
                <td className="count-review__num">{item.expected}</td>
                <td className="count-review__num">{item.counted ?? "—"}</td>
                <td className="count-review__num">
                  {item.difference === null ? (
                    "—"
                  ) : (
                    <span
                      className={`count-review__diff ${item.difference > 0 ? "count-review__diff--in" : item.difference < 0 ? "count-review__diff--out" : ""}`.trim()}
                    >
                      {formatDifference(item.difference)}
                    </span>
                  )}
                </td>
                <td className="count-review__num">{item.current}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="count-review__empty">
                  Todo cuadra: no hay diferencias.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {reviewing && canApprove && (
        <FormActions>
          <Button variant="outline" icon="x" className="count-sheet__cancel" disabled={busy} onClick={onCancel}>
            Anular
          </Button>
          <Button variant="outline" icon="refresh" disabled={busy} onClick={onReturn}>
            Devolver para recontar
          </Button>
          <Button icon="check" disabled={busy} onClick={onApprove}>
            Aprobar
          </Button>
        </FormActions>
      )}
    </div>
  );
};

/**
 * Hoja de un conteo. En conteo (con permiso de contar): se anota lo que hay, a ciegas.
 * En revisión, aprobado o anulado: lo que había, lo contado, las diferencias y lo que hay hoy.
 * state: { count, loading, error } · las acciones son async y devuelven el conteo actualizado.
 */
const CountSheetModal = ({ open, state, canCount, canApprove, busy, onClose, onRetry, onSave, onSubmit, onApprove, onReturn, onCancel }) => {
  const { count, loading, error } = state;

  const renderBody = () => {
    if (loading) return <p className="count-sheet__progress">Cargando conteo…</p>;
    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar el conteo" text={error}>
          <Button variant="outline" icon="refresh" onClick={onRetry}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (!count) return null;

    const counting = count.status === "en_conteo";
    return (
      <>
        <header className="count-sheet__head">
          <p className="count-sheet__number">{count.number}</p>
          <CountStatusBadge status={count.status} />
          <span className="count-sheet__meta">
            {count.branchName}
            {count.categoryName ? ` · ${count.categoryName}` : " · toda la sucursal"}
          </span>
        </header>
        {counting && canCount ? (
          // key: al recargar el conteo (p. ej. tras devolverlo) la hoja arranca con lo guardado
          <CountingSheet key={`${count.id}-${count.status}`} count={count} busy={busy} onSave={onSave} onSubmit={onSubmit} />
        ) : counting ? (
          <p className="count-sheet__note" role="note">
            Este conteo está en curso ({count.progress.counted} de {count.progress.total} contados).
          </p>
        ) : (
          <ReviewSheet count={count} canApprove={canApprove} busy={busy} onApprove={onApprove} onReturn={onReturn} onCancel={onCancel} />
        )}
        {/* Un conteo abierto bloquea la sucursal: el encargado puede anularlo también mientras se cuenta */}
        {counting && canApprove && (
          <button type="button" className="count-sheet__cancel-link" disabled={busy} onClick={onCancel}>
            Anular este conteo
          </button>
        )}
      </>
    );
  };

  return (
    <Modal open={open} size="wide" title="Toma física" onClose={onClose} busy={busy}>
      {renderBody()}
    </Modal>
  );
};

export default CountSheetModal;
