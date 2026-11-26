import { useEffect, useState } from "react";
import api from "../../../api/client";
import Icon from "../../../components/ui/Icon/Icon";
import { unwrap } from "../../../utils/apiResponse";
import { formatCurrency } from "../../../utils/money";
import { formatDateTime } from "../../administration/audit/auditOptions";

/*
 * Cálculo del costo de cada producto de la compra (Fase 51.5, pedido del 2026-11-26: «que se vea si marcaron lo
 * de documentar, los viejos con precio viejo y los nuevos con precio nuevo, el cálculo y todo, así se ve si
 * falló el sistema o el administrador»). Solo con «Ver precio de costo» (el servidor responde 403 sin él).
 */

const units = (count) => `${count} ${count === 1 ? "und" : "und"}`;
const money = (value) => formatCurrency(Number(value));
const plain = (value) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Number(value));

/** Pide el cálculo de la compra (una vez por compra abierta). Devuelve { [idproduct]: datos } o null. */
export const useCostHistory = (order, enabled) => {
  const [state, setState] = useState({ key: null, data: null });
  const key = enabled && order && order.status !== "borrador" ? `${order.id}|${order.total}` : null;

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    api
      .get(`/orders/${order.id}/cost-history`)
      .then((response) => {
        if (!active) return;
        const data = unwrap(response);
        setState({ key, data: Object.fromEntries((data?.products ?? []).map((row) => [row.idproduct, row])) });
      })
      .catch(() => active && setState({ key, data: null }));
    return () => {
      active = false;
    };
  }, [key, order?.id]);

  return key && state.key === key ? state.data : null;
};

/** Una entrada del cálculo: lo que había, lo documentado, lo nuevo y la cuenta. */
const Entry = ({ entry }) => {
  const total = entry.stockbefore + entry.quantityin;
  const old = entry.stockbefore - entry.documented;
  const atCost = entry.documented + entry.quantityin;
  return (
    <div className="cost-calc__entry">
      {entry.kind === "add-items" && <p className="cost-calc__kind">Agregado después de confirmar la compra</p>}
      <dl className="cost-calc__rows">
        <div>
          <dt>Antes de la compra</dt>
          <dd>{entry.stockbefore > 0 ? `${units(entry.stockbefore)} a ${money(entry.costbefore)}` : "No había unidades"}</dd>
        </div>
        <div>
          <dt>Documentar lo ya cargado</dt>
          <dd className={entry.documented > 0 ? "cost-calc__warn" : undefined}>
            {entry.documented > 0
              ? `Sí · ${units(entry.documented)} que ya estaban pasaron de ${money(entry.costbefore)} a ${money(entry.costin)}`
              : "No"}
          </dd>
        </div>
        <div>
          <dt>Esta compra</dt>
          <dd>
            {units(entry.quantityin)} {entry.quantityin === 1 ? "nueva" : "nuevas"} a {money(entry.costin)}
          </dd>
        </div>
      </dl>
      <p className="cost-calc__formula">
        {total > 0 && entry.stockbefore > 0 ? (
          <>
            ({old > 0 ? `${old} × ${plain(entry.costbefore)} + ` : ""}
            {atCost} × {plain(entry.costin)}) ÷ {total} = <strong>{money(entry.costafter)}</strong>
          </>
        ) : (
          <>
            Sin unidades antes: el costo queda en el de la compra, <strong>{money(entry.costafter)}</strong>
          </>
        )}
      </p>
    </div>
  );
};

/** Cuadro «Cálculo del costo» de un producto de la compra. */
const CostCalc = ({ data }) => {
  if (!data) return null;
  const last = data.calc.length > 0 ? data.calc[data.calc.length - 1].costafter : data.legacy.length > 0 ? data.legacy[data.legacy.length - 1].to : null;
  const changed = last !== null && data.current !== null && Math.round(data.current * 100) !== Math.round(last * 100);

  return (
    <section className="cost-calc" aria-label={`Cálculo del costo de ${data.name}`}>
      <h4 className="cost-calc__title">
        <Icon name="sparkles" />
        Cálculo del costo
      </h4>

      {data.calc.map((entry) => (
        <Entry key={`${entry.kind}-${entry.at}`} entry={entry} />
      ))}
      {data.calc.length === 0 &&
        (data.legacy.length > 0 ? (
          data.legacy.map((change) => (
            <p className="cost-calc__formula" key={`${change.at}-${change.to}`}>
              Al confirmar, el costo pasó de {money(change.from)} a <strong>{money(change.to)}</strong>. (Compra anterior al detalle del cálculo.)
            </p>
          ))
        ) : (
          <p className="cost-calc__formula">Esta compra no cambió el costo, o es anterior al detalle del cálculo.</p>
        ))}

      {last !== null && !changed && (
        <p className="cost-calc__now cost-calc__now--ok">
          <Icon name="check" />
          Hoy sigue en {money(data.current)}.
        </p>
      )}
      {changed && (
        <div className="cost-calc__now cost-calc__now--changed" role="note">
          <p>
            <Icon name="alert" />
            Hoy está en <strong>{money(data.current)}</strong>: cambió después de esta compra.
          </p>
          {data.later.length > 0 ? (
            <ul>
              {data.later.map((change) => (
                <li key={`${change.at}-${change.to}`}>
                  {change.kind === "manual" ? "Editado a mano" : `Por la compra ${change.order ?? ""}`}
                  {change.by && ` por ${change.by}`} el {formatDateTime(change.at)}: {money(change.from)} → {money(change.to)}
                </li>
              ))}
            </ul>
          ) : (
            <p>No se encontró quién lo cambió: revisa la Auditoría del producto.</p>
          )}
        </div>
      )}
      {last === null && data.later.length > 0 && (
        <ul className="cost-calc__later">
          {data.later.map((change) => (
            <li key={`${change.at}-${change.to}`}>
              {change.kind === "manual" ? "Editado a mano" : `Por la compra ${change.order ?? ""}`}
              {change.by && ` por ${change.by}`} el {formatDateTime(change.at)}: {money(change.from)} → {money(change.to)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default CostCalc;
