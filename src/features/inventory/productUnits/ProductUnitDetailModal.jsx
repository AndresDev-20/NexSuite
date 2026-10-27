import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import { formatDate, getStatusLabel } from "./productUnitOptions";
import "./productUnitDetailModal.css";

const EMPTY = "—";

const Item = ({ label, wide = false, children }) => (
  <div className={`unit-detail__item ${wide ? "unit-detail__item--wide" : ""}`.trim()}>
    <dt className="unit-detail__label">{label}</dt>
    <dd className="unit-detail__value">{children || EMPTY}</dd>
  </div>
);

/** Ficha de una unidad: de dónde vino y a quién reclamarle la garantía. */
const ProductUnitDetailModal = ({ unit, canEdit, onClose, onEdit }) => (
  <Modal open={Boolean(unit)} title="Detalle de la unidad" onClose={onClose}>
    {unit && (
      <div className="unit-detail">
        <header className="unit-detail__head">
          <span className="unit-detail__serial">{unit.serial}</span>
          {unit.imei2 && <span className="unit-detail__secondary">IMEI 2: {unit.imei2}</span>}
          <span className="unit-detail__secondary">
            {unit.productName} · {getStatusLabel(unit.status)}
          </span>
        </header>

        <dl className="unit-detail__list">
          <Item label="Sucursal">{unit.branchName}</Item>
          <Item label="Fecha de ingreso">{formatDate(unit.receivedAt)}</Item>
          <Item label="Garantía del proveedor">
            {unit.warrantyUntil
              ? `${unit.warrantyMonths} meses · ${unit.warrantyActive ? "vigente hasta" : "venció el"} ${formatDate(unit.warrantyUntil)}`
              : "Sin garantía"}
          </Item>
          <Item label="Observaciones" wide>
            {unit.notes}
          </Item>
        </dl>

        <section className="unit-detail__supplier" aria-label="Proveedor">
          <p className="unit-detail__supplier-title">Proveedor · para reclamar la garantía</p>
          <p className="unit-detail__supplier-name">{unit.supplierName || EMPTY}</p>
          {unit.supplierContact && <p className="unit-detail__secondary">Contacto: {unit.supplierContact}</p>}
          <div className="unit-detail__links">
            {unit.supplierPhone && (
              <a className="unit-detail__link" href={`tel:${unit.supplierPhone.replace(/[^\d+]/g, "")}`}>
                <Icon name="phone" className="unit-detail__icon" />
                {unit.supplierPhone}
              </a>
            )}
            {unit.supplierEmail && (
              <a className="unit-detail__link" href={`mailto:${unit.supplierEmail}?subject=Garantía ${unit.serial}`}>
                <Icon name="mail" className="unit-detail__icon" />
                {unit.supplierEmail}
              </a>
            )}
          </div>
        </section>

        <FormActions>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {canEdit && (
            <Button icon="edit" data-autofocus onClick={() => onEdit(unit)}>
              Editar
            </Button>
          )}
        </FormActions>
      </div>
    )}
  </Modal>
);

export default ProductUnitDetailModal;
