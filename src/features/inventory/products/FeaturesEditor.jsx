import { useFieldArray } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { MAX_FEATURES } from "./productOptions";
import "./featuresEditor.css";

// Mismos límites del backend (validators/inventory.schemas.js)
const MAX_NAME = 60;
const MAX_VALUE = 200;

/**
 * Características que ve el cliente en la tienda (Fase 24): pares nombre y valor que se agregan,
 * quitan y ordenan. Va dentro del formulario del producto (name = "features").
 */
const FeaturesEditor = ({ control, register, errors }) => {
  const { fields, append, remove, move } = useFieldArray({ control, name: "features" });

  // Las filas sin terminar o con un nombre repetido no se guardan: se avisa en la misma fila
  const rules = (index, key) => ({
    validate: (value, values) => {
      const row = values.features[index];
      const name = row.name.trim().toLowerCase();
      if (key === "name" && !name && row.value.trim()) return "Escribe el nombre.";
      if (key === "value" && name && !row.value.trim()) return "Escribe el valor.";
      if (key === "name" && name && values.features.some((other, position) => position < index && other.name.trim().toLowerCase() === name)) {
        return "Ya está en la lista.";
      }
      return true;
    },
  });

  return (
    <fieldset className="features-editor">
      <legend className="features-editor__title">Características</legend>
      <p className="features-editor__hint">Lo que ve el cliente en la tienda, por ejemplo «Memoria: 128 GB» o «Color: negro».</p>

      {fields.length > 0 && (
        <ol className="features-editor__list">
          {fields.map((field, index) => (
            <li key={field.id} className="features-editor__row">
              <Field
                label="Nombre"
                autoComplete="off"
                maxLength={MAX_NAME}
                placeholder="Ej: Memoria"
                error={errors.features?.[index]?.name?.message}
                {...register(`features.${index}.name`, rules(index, "name"))}
              />
              <Field
                label="Valor"
                autoComplete="off"
                maxLength={MAX_VALUE}
                placeholder="Ej: 128 GB"
                error={errors.features?.[index]?.value?.message}
                {...register(`features.${index}.value`, rules(index, "value"))}
              />
              <RowActions>
                <RowAction icon="chevron" label="Subir" disabled={index === 0} onClick={() => move(index, index - 1)} />
                <RowAction icon="chevron" label="Bajar" disabled={index === fields.length - 1} onClick={() => move(index, index + 1)} />
                <RowAction icon="trash" label="Quitar" tone="danger" onClick={() => remove(index)} />
              </RowActions>
            </li>
          ))}
        </ol>
      )}

      <Button variant="outline" icon="plus" disabled={fields.length >= MAX_FEATURES} onClick={() => append({ name: "", value: "" })}>
        {fields.length >= MAX_FEATURES ? `Máximo ${MAX_FEATURES}` : "Agregar característica"}
      </Button>
    </fieldset>
  );
};

export default FeaturesEditor;
