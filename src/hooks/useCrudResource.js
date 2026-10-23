import { useCallback, useState } from "react";
import api from "../api/client";
import getErrorMessage from "../utils/getErrorMessage";
import { toList } from "../utils/apiResponse";

/**
 * CRUD genérico sobre una ruta REST (GET / · POST / · PUT /:id · DELETE /:id).
 *
 * path:      ruta base, ej. "/categories".
 * normalize: convierte cada elemento del backend en lo que usa la interfaz.
 *            Deja fuera datos sensibles. Debe estar definida FUERA del componente.
 * compare:   opcional, para ordenar la lista. También fuera del componente.
 * loadError: mensaje cuando falla la carga.
 *
 * Las acciones de escritura refrescan la lista y, si fallan, lanzan el error
 * para que lo muestre el formulario o el diálogo que las llamó.
 */
const useCrudResource = ({ path, normalize, compare, loadError = "No se pudo cargar la lista." }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /** silent: refresca sin mostrar la carga ni reemplazar la lista por un error. */
  const getAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
        setError("");
      }

      try {
        const list = toList(await api.get(path)).map(normalize);
        setItems(compare ? list.sort(compare) : list);
      } catch (err) {
        if (!silent) setError(getErrorMessage(err, loadError));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [path, normalize, compare, loadError]
  );

  const create = useCallback(
    async (payload) => {
      const { data } = await api.post(path, payload);
      await getAll({ silent: true });
      return data;
    },
    [path, getAll]
  );

  const update = useCallback(
    async (id, payload) => {
      const { data } = await api.put(`${path}/${id}`, payload);
      await getAll({ silent: true });
      return data;
    },
    [path, getAll]
  );

  const remove = useCallback(
    async (id) => {
      await api.delete(`${path}/${id}`);
      await getAll({ silent: true });
    },
    [path, getAll]
  );

  return { items, loading, error, getAll, create, update, remove };
};

export default useCrudResource;