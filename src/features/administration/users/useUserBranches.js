import { useCallback } from "react";
import api from "../../../api/client";

// Contrato asumido (mismo patrón que role-permissions): ajústalo aquí si tus rutas son otras
const USER_BRANCHES_PATH = "/branch-users";

/** Las dos acciones lanzan el error si fallan, para que lo muestre quien las llama. */
const useUserBranches = () => {
  const addBranch = useCallback(async (userId, branchId) => {
    await api.post(USER_BRANCHES_PATH, { userId, branchId });
  }, []);

  const removeBranch = useCallback(async (userId, branchId) => {
    await api.delete(`${USER_BRANCHES_PATH}/${userId}/${branchId}`);
  }, []);

  return { addBranch, removeBranch };
};

export default useUserBranches;