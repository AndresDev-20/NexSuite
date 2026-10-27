import Button from "../../../components/ui/Button/Button";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import { formatDateTime, formatValue, getFieldLabel } from "./auditOptions";
import "./auditDetailModal.css";

/** Cambios de una edición: { campo: { from, to } } (o "[protegido]" para contraseñas). */
const ChangesTable = ({ changes }) => (
  <table className="audit-detail__table">
    <caption className="audit-detail__caption">Cambios</caption>
    <thead>
      <tr>
        <th scope="col">Campo</th>
        <th scope="col">Antes</th>
        <th scope="col">Después</th>
      </tr>
    </thead>
    <tbody>
      {Object.entries(changes).map(([field, change]) => {
        const protectedChange = typeof change !== "object" || change === null;
        return (
          <tr key={field}>
            <th scope="row">{getFieldLabel(field)}</th>
            <td>{protectedChange ? formatValue(field, change) : formatValue(field, change.from)}</td>
            <td>{protectedChange ? "Cambiada" : formatValue(field, change.to)}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

/** Datos de un registro (creado o eliminado) u otros datos del evento. */
const ValuesList = ({ title, values }) => (
  <section className="audit-detail__section">
    <h3 className="audit-detail__caption">{title}</h3>
    <dl className="audit-detail__list">
      {Object.entries(values).map(([field, value]) => (
        <div className="audit-detail__item" key={field}>
          <dt className="audit-detail__label">{getFieldLabel(field)}</dt>
          <dd className="audit-detail__value">{formatValue(field, value)}</dd>
        </div>
      ))}
    </dl>
  </section>
);

const DetailBody = ({ details }) => {
  const { changes, after, before, ...rest } = details;
  const hasRest = Object.keys(rest).length > 0;

  if (!changes && !after && !before && !hasRest) {
    return <p className="audit-detail__empty">Este evento no tiene datos adicionales.</p>;
  }

  return (
    <>
      {changes && <ChangesTable changes={changes} />}
      {after && <ValuesList title="Datos registrados" values={after} />}
      {before && <ValuesList title="Datos que tenía antes de eliminarse" values={before} />}
      {hasRest && <ValuesList title="Datos del evento" values={rest} />}
    </>
  );
};

/** Ficha de un evento de auditoría: quién, cuándo, sobre qué y qué cambió. Solo lectura. */
const AuditDetailModal = ({ log, onClose }) => (
  <Modal open={Boolean(log)} title="Detalle del evento" onClose={onClose}>
    {log && (
      <div className="audit-detail">
        <header className="audit-detail__head">
          <p className="audit-detail__title">
            {log.actionLabel} · {log.entityLabel}
            {log.entityId && ` #${log.entityId}`}
          </p>
          <p className="audit-detail__meta">
            {formatDateTime(log.createdAt)} · {log.userName ?? "Sin sesión"}
            {log.userCc && ` (CC ${log.userCc})`}
            {log.branchName && ` · ${log.branchName}`}
            {log.ip && ` · IP ${log.ip}`}
          </p>
        </header>

        <DetailBody details={log.details} />

        <FormActions>
          <Button variant="outline" data-autofocus onClick={onClose}>
            Cerrar
          </Button>
        </FormActions>
      </div>
    )}
  </Modal>
);

export default AuditDetailModal;
