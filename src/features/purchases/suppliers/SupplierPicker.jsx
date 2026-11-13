import Button from "../../../components/ui/Button/Button";
import Select from "../../../components/forms/Select/Select";
import "../orders/orderFormModal.css";

/*
 * Proveedor habitual de un producto (Fase 27). useSupplierChoices (useSupplierChoices.js) carga los proveedores y revisa los
 * permisos; SupplierPicker es el campo con «Nuevo proveedor». El formulario del proveedor lo dibuja quien
 * lo usa, por fuera de su <form> (un formulario dentro de otro mandaría a guardar el de afuera).
 * Sin «Consultar proveedores» no se muestra (el servidor tampoco deja cambiarlo).
 */

/** El campo: value es el id como texto ("" = sin proveedor). onNew abre el formulario del proveedor. */
const SupplierPicker = ({ choices, value, current = null, onChange, onNew, error }) => {
  if (!choices.canRead) return null;
  const inactiveChosen = current && current.isactive === false && value === String(current.id);
  const hint = choices.loadError
    ? "No se pudieron cargar los proveedores."
    : choices.loading
      ? "Cargando proveedores…"
      : inactiveChosen
        ? "Este proveedor está inactivo: las compras nuevas no lo proponen."
        : "Opcional. La compra y la carga inicial lo traen ya elegido.";

  return (
    <div className="purchase-form__supplier">
      <Select
        label="Proveedor habitual"
        placeholder="Sin proveedor"
        options={choices.options}
        value={value}
        hint={hint}
        error={error}
        onChange={(event) => onChange(event.target.value)}
      />
      {choices.canCreate && (
        <Button variant="outline" icon="plus" className="purchase-form__inline" onClick={onNew}>
          Nuevo proveedor
        </Button>
      )}
    </div>
  );
};

export default SupplierPicker;
