import { useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import useToast from "../../../components/feadback/Toast/useToast";
import getErrorMessage from "../../../utils/getErrorMessage";
import "./subcategories.css";

const MAX_LENGTH = 100;
const productsLabel = (count) => (count === 0 ? "sin productos" : `${count} ${count === 1 ? "producto" : "productos"}`);

/** Una subcategoría: renombrar, activar/desactivar y eliminar (solo si no tiene productos). */
const SubcategoryRow = ({ subcategory, canEdit, canDelete, onSave, onToggle, onDelete }) => {
  const [name, setName] = useState(subcategory.nameSubcategory);
  const [busy, setBusy] = useState(false);
  const run = async (action) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };
  const changed = name.trim() !== subcategory.nameSubcategory && name.trim().length >= 2;
  const used = subcategory.productCount > 0;

  return (
    <li className={`subcategory-row ${subcategory.isActive ? "" : "subcategory-row--off"}`.trim()}>
      {canEdit ? (
        <Field
          label={`Nombre (${productsLabel(subcategory.productCount)}${subcategory.isActive ? "" : " · inactiva"})`}
          maxLength={MAX_LENGTH}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      ) : (
        <p className="subcategory-row__name">
          <strong>{subcategory.nameSubcategory}</strong>
          <span>
            {productsLabel(subcategory.productCount)}
            {subcategory.isActive ? "" : " · inactiva"}
          </span>
        </p>
      )}
      {(canEdit || canDelete) && (
        <div className="subcategory-row__actions">
          {canEdit && changed && (
            <Button icon="check" disabled={busy} onClick={() => run(() => onSave(subcategory, name.trim()))}>
              Guardar
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" icon={subcategory.isActive ? "lock" : "check"} disabled={busy} onClick={() => run(() => onToggle(subcategory))}>
              {subcategory.isActive ? "Desactivar" : "Activar"}
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              icon="trash"
              disabled={busy || used}
              title={used ? "Tiene productos: desactívala en lugar de eliminarla" : undefined}
              onClick={() => run(() => onDelete(subcategory))}
            >
              Eliminar
            </Button>
          )}
        </div>
      )}
    </li>
  );
};

/**
 * Subcategorías de una categoría (Fase 33): agregar (con «Crear categorías»), renombrar y activar/desactivar (con
 * «Editar categorías») y eliminar las que no tienen productos (con «Eliminar categorías»). Una inactiva ya no se
 * ofrece para productos nuevos; los que la tienen la conservan.
 * category: la categoría con sus subcategorías (se actualiza sola al recargar la lista).
 */
const SubcategoriesModal = ({ category, canCreate, canEdit, canDelete, onClose, createSubcategory, updateSubcategory, deleteSubcategory }) => {
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

  const subcategories = category?.subcategories ?? [];
  const canAdd = canCreate && category?.isActive;

  return (
    <Modal
      icon="bag"
      open={Boolean(category)}
      title={category ? `Subcategorías de ${category.nameCategory}` : "Subcategorías"}
      subtitle="Divide la categoría, por ejemplo por marca o por tipo."
      onClose={onClose}
    >
      {category && (
        <div className="subcategories">
          {canAdd && (
            <form
              className="subcategories__add"
              onSubmit={(event) => {
                event.preventDefault();
                if (newName.trim().length < 2) return setError("Escribe el nombre (mínimo 2 letras).");
                return handle(async () => {
                  await createSubcategory(category.id, { nameSubcategory: newName.trim() });
                  const created = newName.trim();
                  setNewName("");
                  return `Subcategoría ${created} creada.`;
                }, "No se pudo crear la subcategoría.");
              }}
            >
              <Field
                label="Nueva subcategoría"
                maxLength={MAX_LENGTH}
                placeholder="Ej: Samsung, iPhone, Cargadores"
                data-autofocus
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
              <Button type="submit" icon="plus">
                Agregar
              </Button>
            </form>
          )}
          {canCreate && !category.isActive && (
            <p className="subcategories__note">La categoría está inactiva: actívala para agregarle subcategorías.</p>
          )}
          {error && (
            <p className="subcategories__error" role="alert">
              {error}
            </p>
          )}
          {subcategories.length === 0 ? (
            <p className="subcategories__note">Esta categoría aún no tiene subcategorías.</p>
          ) : (
            <ul className="subcategories__list">
              {subcategories.map((subcategory) => (
                <SubcategoryRow
                  key={`${subcategory.id}-${subcategory.nameSubcategory}`}
                  subcategory={subcategory}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onSave={(item, nameSubcategory) =>
                    handle(async () => {
                      await updateSubcategory(item.id, { nameSubcategory });
                      return "Subcategoría actualizada.";
                    }, "No se pudo renombrar la subcategoría.")
                  }
                  onToggle={(item) =>
                    handle(async () => {
                      await updateSubcategory(item.id, { isActive: !item.isActive });
                      return item.isActive ? `${item.nameSubcategory} quedó inactiva.` : `${item.nameSubcategory} vuelve a ofrecerse.`;
                    }, "No se pudo cambiar la subcategoría.")
                  }
                  onDelete={(item) =>
                    handle(async () => {
                      await deleteSubcategory(item.id);
                      return `Subcategoría ${item.nameSubcategory} eliminada.`;
                    }, "No se pudo eliminar la subcategoría.")
                  }
                />
              ))}
            </ul>
          )}
          <FormActions>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </FormActions>
        </div>
      )}
    </Modal>
  );
};

export default SubcategoriesModal;
