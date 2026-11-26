import { createContext, useContext, useEffect, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import { loadPaymentMethods } from "../../sales/sales/paymentMethods";
import { formatDateTime, formatValue, getFieldLabel } from "./auditOptions";
import "./auditDetailModal.css";

/*
 * Ficha de un evento de auditoría: qué se hizo, quién, cuándo, dónde y con qué datos. Solo lectura.
 * Los datos del evento llegan como el servidor los guardó (listas de productos, pagos, IMEI…): aquí se dibujan
 * como tablas y etiquetas legibles, nunca como «[object Object]».
 */

// Nombres de los productos del evento ({ 33: "Samsung A15" }); si no se pueden consultar, queda «#33»
const ProductNames = createContext({});
const MAX_PRODUCT_LOOKUPS = 25;

/** Todos los idproduct que aparecen en los datos del evento (también dentro de listas). */
const productIdsOf = (value, found = new Set()) => {
  if (Array.isArray(value)) value.forEach((item) => productIdsOf(item, found));
  else if (value && typeof value === "object")
    Object.entries(value).forEach(([key, item]) => {
      if (key === "idproduct" && /^\d+$/.test(String(item))) found.add(String(item));
      else productIdsOf(item, found);
    });
  return found;
};

const useProductNames = (details) => {
  const [names, setNames] = useState({});
  useEffect(() => {
    setNames({});
    const ids = [...productIdsOf(details ?? {})].slice(0, MAX_PRODUCT_LOOKUPS);
    if (ids.length === 0) return undefined;
    let active = true;
    Promise.all(
      ids.map((id) =>
        api
          .get(`/products/${id}`)
          .then((response) => [id, unwrap(response)?.nameproduct])
          .catch(() => [id, null])
      )
    ).then((pairs) => {
      if (active) setNames(Object.fromEntries(pairs.filter(([, name]) => name)));
    });
    return () => {
      active = false;
    };
  }, [details]);
  return names;
};

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isObjectList = (value) => Array.isArray(value) && value.length > 0 && value.every(isPlainObject);
const isSerialField = (field) => /serial|imei/i.test(field);

/** Lista de valores simples: IMEI, permisos, números… como etiquetas. */
const Chips = ({ field, values, area }) => (
  <ul className={`audit-detail__chips ${isSerialField(field) ? "audit-detail__chips--mono" : ""}`.trim()}>
    {values.map((item, index) => (
      <li className="audit-detail__chip" key={`${String(item)}-${index}`}>
        {formatValue(field, item, area)}
      </li>
    ))}
  </ul>
);

/** Un valor cualquiera: simple, lista simple o un objeto pequeño dentro de una celda. */
const Value = ({ field, value, area }) => {
  const productNames = useContext(ProductNames);
  if (field === "idproduct" && productNames[String(value)])
    return (
      <span className="audit-detail__product">
        {productNames[String(value)]} <small>#{value}</small>
      </span>
    );
  if (Array.isArray(value) && value.length > 0 && !value.some((item) => isPlainObject(item) || Array.isArray(item)))
    return <Chips field={field} values={value} area={area} />;
  return formatValue(field, value, area);
};

/** Lista de registros (productos, pagos, ajustes…) como tabla: una columna por dato. */
const RecordsTable = ({ field, rows, area }) => {
  // Primero qué es (producto, nombre), luego cantidades y valores, al final los IMEI
  const rank = (key) => (/^(idproduct|product|name|to|method)$/.test(key) ? 0 : isSerialField(key) ? 2 : 1);
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort((a, b) => rank(a) - rank(b));
  return (
    <div className="audit-detail__table-wrap">
      <table className="audit-detail__records">
        <caption className="audit-detail__sr">{getFieldLabel(field)}</caption>
        <thead>
          <tr>
            {keys.map((key) => (
              <th scope="col" key={key}>
                {getFieldLabel(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {keys.map((key) => (
                <td key={key}>
                  <Value field={key} value={row[key]} area={area} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** Datos de un registro o del evento: lo simple en una grilla y lo compuesto (listas, objetos) a todo el ancho. */
const ValuesSection = ({ title, icon, values, area }) => {
  const entries = Object.entries(values);
  const simple = entries.filter(([, value]) => !isObjectList(value) && !isPlainObject(value));
  const complex = entries.filter(([, value]) => isObjectList(value) || isPlainObject(value));

  return (
    <section className="audit-detail__section">
      <h3 className="audit-detail__section-title">
        <Icon name={icon} className="audit-detail__section-icon" />
        {title}
      </h3>
      {simple.length > 0 && (
        <dl className="audit-detail__grid">
          {simple.map(([field, value]) => (
            <div className="audit-detail__item" key={field}>
              <dt className="audit-detail__label">{getFieldLabel(field)}</dt>
              <dd className="audit-detail__value">
                <Value field={field} value={value} area={area} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      {complex.map(([field, value]) => (
        <div className="audit-detail__block" key={field}>
          <p className="audit-detail__block-title">
            {getFieldLabel(field)}
            {Array.isArray(value) && <span className="audit-detail__count">{value.length}</span>}
          </p>
          {Array.isArray(value) ? (
            <RecordsTable field={field} rows={value} area={area} />
          ) : (
            <dl className="audit-detail__grid audit-detail__grid--nested">
              {Object.entries(value).map(([key, item]) => (
                <div className="audit-detail__item" key={key}>
                  <dt className="audit-detail__label">{getFieldLabel(key)}</dt>
                  <dd className="audit-detail__value">
                    <Value field={key} value={item} area={area} />
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ))}
    </section>
  );
};

/** Cambios de una edición: { campo: { from, to } } (o "[protegido]" para contraseñas). */
const ChangesSection = ({ changes, area }) => (
  <section className="audit-detail__section">
    <h3 className="audit-detail__section-title">
      <Icon name="edit" className="audit-detail__section-icon" />
      Qué cambió
    </h3>
    <ul className="audit-detail__changes">
      {Object.entries(changes).map(([field, change]) => {
        const protectedChange = !isPlainObject(change) || !("from" in change || "to" in change);
        return (
          <li className="audit-detail__change" key={field}>
            <span className="audit-detail__change-field">{getFieldLabel(field)}</span>
            {protectedChange ? (
              <span className="audit-detail__change-to">{field === "password" ? "Se cambió" : <Value field={field} value={change} area={area} />}</span>
            ) : (
              <span className="audit-detail__change-values">
                <span className="audit-detail__change-from">
                  <Value field={field} value={change.from} area={area} />
                </span>
                <Icon name="chevron" className="audit-detail__change-arrow" />
                <span className="audit-detail__change-to">
                  <Value field={field} value={change.to} area={area} />
                </span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  </section>
);

const DetailBody = ({ details, area }) => {
  const { changes, after, before, ...rest } = details ?? {};
  const hasRest = Object.keys(rest).length > 0;

  if (!changes && !after && !before && !hasRest) {
    return <p className="audit-detail__empty">Este evento no guardó datos adicionales: basta con quién, qué y cuándo.</p>;
  }

  return (
    <>
      {changes && Object.keys(changes).length > 0 && <ChangesSection changes={changes} area={area} />}
      {after && <ValuesSection title="Datos registrados" icon="plus" values={after} area={area} />}
      {before && <ValuesSection title="Datos que tenía antes de eliminarse" icon="trash" values={before} area={area} />}
      {hasRest && <ValuesSection title="Detalles" icon="inbox" values={rest} area={area} />}
    </>
  );
};

const MetaItem = ({ icon, label, children }) => (
  <div className="audit-detail__meta-item">
    <span className="audit-detail__meta-icon" aria-hidden="true">
      <Icon name={icon} />
    </span>
    <div className="audit-detail__meta-text">
      <span className="audit-detail__meta-label">{label}</span>
      <span className="audit-detail__meta-value">{children}</span>
    </div>
  </div>
);

const AuditDetailModal = ({ log, onClose }) => {
  // Para mostrar el nombre de los medios de pago creados por el administrador («m8» → «Bancolombia»)
  useEffect(() => {
    if (log) loadPaymentMethods();
  }, [log]);

  const area = log?.action?.split(".")[0] ?? "";
  const reference = log?.reference ?? null;
  const productNames = useProductNames(log?.details);

  return (
    <Modal icon="shield" open={Boolean(log)} title="Detalle del evento" size="wide" onClose={onClose}>
      {log && (
        <div className="audit-detail">
          <header className={`audit-detail__hero audit-detail__hero--${log.tone}`}>
            <span className={`audit-cell__badge audit-cell__badge--${log.tone}`}>{log.areaLabel}</span>
            <p className="audit-detail__title">{log.actionLabel}</p>
            <p className="audit-detail__subject">
              {log.entityLabel}
              {log.entityId && <span className="audit-detail__id"> #{log.entityId}</span>}
              {reference && <span className="audit-detail__ref">{reference}</span>}
            </p>
          </header>

          <div className="audit-detail__meta">
            <MetaItem icon="bell" label="Cuándo">
              {formatDateTime(log.createdAt)}
            </MetaItem>
            <MetaItem icon="users" label="Quién">
              {log.userName ?? "Sin sesión"}
              {log.userCc && <small> · CC {log.userCc}</small>}
            </MetaItem>
            <MetaItem icon="store" label="Sucursal">
              {log.branchName || "Todo el negocio"}
            </MetaItem>
            <MetaItem icon="globe" label="Desde (IP)">
              {log.ip || "—"}
            </MetaItem>
          </div>

          <ProductNames.Provider value={productNames}>
            <DetailBody details={log.details} area={area} />
          </ProductNames.Provider>

          <p className="audit-detail__code">
            Código interno: <code>{log.action}</code>
          </p>

          <FormActions>
            <Button variant="outline" data-autofocus onClick={onClose}>
              Cerrar
            </Button>
          </FormActions>
        </div>
      )}
    </Modal>
  );
};

export default AuditDetailModal;
