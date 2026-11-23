import { useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import Modal from "../../../components/feadback/Modal/Modal";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { formatIdentification } from "../../../utils/nit";
import { NIT_TYPE, getOrganizationLabel } from "../../purchases/suppliers/supplierOptions";
import ThirdPartyFormModal from "./ThirdPartyFormModal";
import "../../../styles/sheet.css";
import "../../purchases/suppliers/suppliersTable.css";
import "../expenses.css";

const STATUS = [
  { value: "activos", label: "Activos" },
  { value: "inactivos", label: "Inactivos" },
  { value: "todos", label: "Todos" },
];

/** El dígito de verificación solo se muestra cuando es un NIT. */
const formatId = (item) => formatIdentification(item.nitcc, item.typeidentification === NIT_TYPE ? item.digitoverification : null);

const usesOf = (item) => {
  const parts = [];
  if (item.expenses > 0) parts.push(`${item.expenses} ${item.expenses === 1 ? "gasto" : "gastos"}`);
  if (item.fixedExpenses > 0) parts.push(`${item.fixedExpenses} ${item.fixedExpenses === 1 ? "gasto fijo" : "gastos fijos"}`);
  return parts.join(" · ") || "Sin gastos";
};
const inUse = (item) => item.expenses > 0 || item.fixedExpenses > 0;

const columns = [
  {
    key: "company",
    header: "Tercero",
    primary: true,
    render: (item) => (
      <div className="supplier-cell">
        <span className="supplier-cell__name">
          {item.companyname}
          {!item.isActive && <span className="supplier-cell__tag">Inactivo</span>}
        </span>
        <span className="supplier-cell__type">{getOrganizationLabel(item.typeorganization)}</span>
      </div>
    ),
  },
  {
    key: "identification",
    header: "Identificación",
    render: (item) => (
      <div className="supplier-cell">
        <span className="supplier-cell__id">{formatId(item)}</span>
        <span className="supplier-cell__type">{item.typeidentification}</span>
      </div>
    ),
  },
  {
    key: "contact",
    header: "Contacto",
    render: (item) => (
      <div className="supplier-cell__contact">
        <span className="supplier-cell__line">
          <Icon name="phone" className="supplier-cell__line-icon" />
          {item.phone}
        </span>
        <span className="supplier-cell__type">{[item.city, item.department].filter(Boolean).join(", ")}</span>
      </div>
    ),
  },
  { key: "uses", header: "Gastos", render: (item) => <span className="supplier-cell__type">{usesOf(item)}</span> },
];

const Fact = ({ label, children }) => (
  <div>
    <dt>{label}</dt>
    <dd>{children || "—"}</dd>
  </div>
);

/** Ficha de un tercero: sus datos y cuántos gastos y gastos fijos tiene. */
const ThirdPartyDetailModal = ({ item, canConfigure, onEdit, onClose }) => (
  <Modal open={Boolean(item)} icon="users" title={item?.companyname ?? "Tercero"} subtitle={item ? `${item.isActive ? "Activo" : "Inactivo"} · ${usesOf(item)}` : ""} onClose={onClose}>
    {item && (
      <>
        <dl className="expense-facts">
          <Fact label="Tipo de organización">{getOrganizationLabel(item.typeorganization)}</Fact>
          <Fact label="Identificación">{`${item.typeidentification} ${formatId(item)}`}</Fact>
          <Fact label="Teléfono">{item.phone}</Fact>
          <Fact label="Correo">{item.email}</Fact>
          <Fact label="Contacto">{item.contact}</Fact>
          <Fact label="Dirección">{[item.address, item.city, item.department].filter(Boolean).join(", ")}</Fact>
          <Fact label="Uso en Gastos">{usesOf(item)}</Fact>
        </dl>
        <FormActions>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {canConfigure && (
            <Button icon="edit" onClick={() => onEdit(item)}>
              Editar
            </Button>
          )}
        </FormActions>
      </>
    )}
  </Modal>
);

/**
 * Fase 41 · Terceros de Gastos: listar, buscar, ver, crear, editar, activar/desactivar y eliminar
 * (solo los que no tienen gastos ni gastos fijos; con ellos se desactivan). Cambiar, con
 * «Configurar gastos» (el servidor lo vuelve a revisar).
 */
const ThirdPartiesModal = ({ open, thirdParties, loading, error, canConfigure, onReload, createThirdParty, updateThirdParty, deleteThirdParty, onClose }) => {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("activos");
  const [form, setForm] = useState({ open: false, item: null });
  const [viewing, setViewing] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const rows = useMemo(() => {
    const text = query.trim().toLowerCase();
    return thirdParties.filter(
      (item) =>
        (status === "todos" || item.isActive === (status === "activos")) &&
        (!text || item.companyname.toLowerCase().includes(text) || item.nitcc.includes(text.replace(/\D/g, "") || "\u0000"))
    );
  }, [thirdParties, query, status]);

  const handleSave = async (payload) => {
    const result = form.item ? await updateThirdParty(form.item.id, payload) : await createThirdParty(payload);
    toast.success(result?.message ?? (form.item ? "Tercero actualizado." : "Tercero creado."));
    setForm({ open: false, item: null });
  };

  const handleToggle = async () => {
    const result = await updateThirdParty(toggling.id, { isactive: !toggling.isActive });
    toast.success(result?.message ?? "Tercero actualizado.");
    setToggling(null);
  };

  const handleDelete = async () => {
    await deleteThirdParty(deleting.id);
    toast.success("Tercero eliminado.");
    setDeleting(null);
  };

  const renderList = () => {
    if (loading && thirdParties.length === 0) return <p className="expense-form__note">Cargando terceros…</p>;
    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los terceros" text={error}>
          <Button variant="outline" icon="refresh" onClick={onReload}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (rows.length === 0) {
      return (
        <StateMessage
          icon="users"
          title={thirdParties.length === 0 ? "Aún no hay terceros" : "Ningún tercero coincide"}
          text={thirdParties.length === 0 ? "Crea a quién se le pagan los gastos: el arrendador, la empresa de energía, el contador…" : "Prueba con otro nombre, documento o estado."}
        />
      );
    }
    return (
      <DataTable
        caption="Terceros de gastos"
        columns={columns}
        rows={rows}
        getRowKey={(item) => item.id}
        renderActions={(item) => (
          <RowActions>
            <RowAction icon="eye" label={`Ver ${item.companyname}`} onClick={() => setViewing(item)} />
            {canConfigure && <RowAction icon="edit" label={`Editar ${item.companyname}`} onClick={() => setForm({ open: true, item })} />}
            {canConfigure && (
              <RowAction
                icon={item.isActive ? "lock" : "check"}
                label={item.isActive ? `Desactivar ${item.companyname}` : `Activar ${item.companyname}`}
                onClick={() => setToggling(item)}
              />
            )}
            {canConfigure && (
              <RowAction
                icon="trash"
                tone="danger"
                label={inUse(item) ? "Ya tiene gastos: desactívalo en lugar de eliminarlo" : `Eliminar ${item.companyname}`}
                disabled={inUse(item)}
                onClick={() => setDeleting(item)}
              />
            )}
          </RowActions>
        )}
      />
    );
  };

  return (
    <>
      <Modal icon="users" open={open} size="wide" title="Terceros" subtitle="A quién se le deben o se le pagan los gastos." onClose={onClose}>
        <div className="third-parties">
          <div className="third-parties__toolbar">
            <SearchInput value={query} onChange={setQuery} placeholder="Nombre o número de documento" />
            <div className="sheet__chips" role="group" aria-label="Estado">
              {STATUS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`sheet__chip ${status === item.value ? "sheet__chip--on" : ""}`.trim()}
                  aria-pressed={status === item.value}
                  onClick={() => setStatus(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {canConfigure && (
              <Button icon="plus" onClick={() => setForm({ open: true, item: null })}>
                Nuevo tercero
              </Button>
            )}
          </div>
          {renderList()}
          <FormActions>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </FormActions>
        </div>
      </Modal>

      <ThirdPartyFormModal open={form.open} thirdParty={form.item} onClose={() => setForm({ open: false, item: null })} onSubmit={handleSave} />
      <ThirdPartyDetailModal
        item={viewing}
        canConfigure={canConfigure}
        onEdit={(item) => {
          setViewing(null);
          setForm({ open: true, item });
        }}
        onClose={() => setViewing(null)}
      />
      <ConfirmDialog
        open={Boolean(toggling)}
        title={toggling?.isActive ? "Desactivar tercero" : "Activar tercero"}
        message={
          toggling && (
            <>
              ¿{toggling.isActive ? "Desactivar" : "Activar"} a <strong>{toggling.companyname}</strong>?
              {toggling.isActive ? " Ya no se podrá elegir en gastos ni gastos fijos nuevos." : " Se podrá elegir de nuevo en los gastos."}
            </>
          )
        }
        detail={toggling?.isActive ? "Sus gastos se conservan. Puedes activarlo cuando quieras." : undefined}
        confirmLabel={toggling?.isActive ? "Desactivar" : "Activar"}
        confirmIcon={toggling?.isActive ? "lock" : "check"}
        confirmVariant={toggling?.isActive ? "danger" : "primary"}
        errorFallback="No se pudo cambiar el tercero."
        onConfirm={handleToggle}
        onClose={() => setToggling(null)}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar tercero"
        message={
          deleting && (
            <>
              ¿Seguro que quieres eliminar a <strong>{deleting.companyname}</strong>? Esta acción no se puede deshacer.
            </>
          )
        }
        confirmLabel="Eliminar tercero"
        errorFallback="No se pudo eliminar el tercero. Puede tener gastos."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
};

export default ThirdPartiesModal;
