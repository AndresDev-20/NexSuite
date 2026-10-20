import { useCallback, useState } from "react";
import api from "../../../api/client";
import getErrorMessage from "../../../utils/getErrorMessage";

/**
 * Deja solo lo que la interfaz necesita. Así datos sensibles
 * (como el hash de la contraseña) nunca quedan en el estado de React.
 */
const normalizeBranch = (branch) => ({
  id: branch.id,
  nameBranch: branch.nameBranch,
  address: branch.address ?? "",
  email: branch.email ?? "",
  number: branch.number ?? "",
  web: branch.web ?? "",
  users: (branch.users ?? []).map(({ id, firstNames, lastNames }) => ({
    id,
    firstNames,
    lastNames,
  })),
});

const useBranches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /** silent: refresca la lista sin mostrar la carga ni reemplazarla por un error. */
  const getAllBranches = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const { data } = await api.get("/branches");
      const list = Array.isArray(data?.data) ? data.data : [];
      setBranches(list.map(normalizeBranch));
    } catch (err) {
      if (!silent) setError(getErrorMessage(err, "No se pudieron cargar las sucursales."));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  /* Las tres acciones de escritura refrescan la lista y, si fallan,
     lanzan el error para que lo muestre el formulario o el diálogo. */

  const createBranch = useCallback(
    async (payload) => {
      const { data } = await api.post("/branches", payload);
      await getAllBranches({ silent: true });
      return data;
    },
    [getAllBranches]
  );

  // Contrato asumido: PUT /branches/:id con el mismo cuerpo que el de crear
  const updateBranch = useCallback(
    async (id, payload) => {
      const { data } = await api.put(`/branches/${id}`, payload);
      await getAllBranches({ silent: true });
      return data;
    },
    [getAllBranches]
  );

  // Contrato asumido: DELETE /branches/:id
  const deleteBranch = useCallback(
    async (id) => {
      await api.delete(`/branches/${id}`);
      await getAllBranches({ silent: true });
    },
    [getAllBranches]
  );

  return { branches, loading, error, getAllBranches, createBranch, updateBranch, deleteBranch };
};

export default useBranches;