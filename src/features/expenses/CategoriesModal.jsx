import { useState } from "react";
import Button from "../../components/ui/Button/Button";
import Field from "../../components/forms/Field/Field";
import { FormActions } from "../../components/forms/FormLayout/FormLayout";
import Modal from "../../components/feadback/Modal/Modal";
import useToast from "../../components/feadback/Toast/useToast";
import getErrorMessage from "../../utils/getErrorMessage";
import "./expenses.css";

/** Una categoría: renombrar, activar/desactivar y eliminar (solo si no tiene gastos). */
const CategoryRow = ({ category, onSave, onToggle, onDelete }) => {
  const [name, setName] = useState(category.name);
  const [busy, setBusy] = useState(false);
  const run = async (action) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };
  const changed = name.trim() !== category.name && name.trim().length >= 2;

  return (
    <li className={`expense-category ${category.isActive ? "" : "expense-category--off"}`.trim()}>
      <Field label={`Nombre (${category.expenses} ${category.expenses === 1 ? "gasto" : "gastos"})`} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} />
      <div className="expense-category__actions">
        {changed && (
          <Button icon="check" disabled={busy} onClick={() => run(() => onSave(category, name.trim()))}>
            Guardar
          </Button>
        )}
        <Button variant="outline" icon={category.isActive ? "lock" : "check"} disabled={busy} onClick={() => run(() => onToggle(category))}>
          {category.isActive ? "Desactivar" : "Activar"}
        </Button>
        <Button
          variant="outline"
          icon="trash"
          disabled={busy || category.expenses > 0}
          title={category.expenses > 0 ? "Ya tiene gastos: desactívala en lugar de eliminarla" : undefined}
          onClick={() => run(() => onDelete(category))}
        >
          Eliminar
        </Button>
      </div>
    </li>
  );
};

/**
 * Categorías de gastos (con «Configurar gastos»): agregar, renombrar, activar/desactivar y eliminar
 * las que no tienen gastos. Una inactiva ya no se elige al registrar.
 */
const CategoriesModal = ({ open, categories, onClose, createCategory, updateCategory, deleteCategory }) => {
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const handle = async (action, fallback) => {
    setError("");
    try {
      const message = await action();
      if (message) toast.success(message);
    } catch (err) {
      setError(getErrorMessage(err, fallback));
    }
  };

  return (
    <Modal open={open} title="Categorías de gastos" onClose={onClose}>
      <div className="expense-categories">
        <form
          className="expense-categories__add"
          onSubmit={(event) => {
            event.preventDefault();
            if (newName.trim().length < 2) return setError("Escribe el nombre (mínimo 2 letras).");
            return handle(async () => {
              const message = await createCategory(newName.trim());
              setNewName("");
              return message;
            }, "No se pudo crear la categoría.");
          }}
        >
          <Field label="Nueva categoría" maxLength={60} placeholder="Ej: Aseo, Seguridad" value={newName} onChange={(event) => setNewName(event.target.value)} />
          <Button type="submit" icon="plus">
            Agregar
          </Button>
        </form>
        {error && (
          <p className="expense-form__error" role="alert">
            {error}
          </p>
        )}
        <ul className="expense-categories__list">
          {categories.map((category) => (
            <CategoryRow
              key={`${category.id}-${category.name}`}
              category={category}
              onSave={(item, name) => handle(() => updateCategory(item.id, { name }), "No se pudo renombrar.")}
              onToggle={(item) => handle(() => updateCategory(item.id, { isactive: !item.isActive }), "No se pudo cambiar.")}
              onDelete={(item) => handle(() => deleteCategory(item.id), "No se pudo eliminar.")}
            />
          ))}
        </ul>
        <FormActions>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </FormActions>
      </div>
    </Modal>
  );
};

export default CategoriesModal;
