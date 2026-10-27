import { useContext } from "react";
import BranchContext from "./BranchContext";

/**
 * Sucursales del usuario y la sucursal activa.
 * const { branches, activeBranchId, activeBranch, setActiveBranch, hasBranches, status } = useActiveBranch();
 * activeBranchId null = "Todas mis sucursales".
 */
const useActiveBranch = () => {
  const context = useContext(BranchContext);
  if (!context) throw new Error("useActiveBranch debe usarse dentro de <BranchProvider>");
  return context;
};

export default useActiveBranch;
