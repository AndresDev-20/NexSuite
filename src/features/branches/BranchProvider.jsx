import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { unwrap } from "../../utils/apiResponse";
import { getUser } from "../../utils/session";
import BranchContext from "./BranchContext";

const ALL = "all";

/** Se recuerda por usuario y por navegador: al volver a entrar sigue en la misma sucursal. */
const storageKey = () => `nexsuite.activeBranch.${getUser()?.id ?? "anon"}`;

const readStored = () => {
  try {
    return localStorage.getItem(storageKey());
  } catch {
    return null;
  }
};

const store = (value) => {
  try {
    localStorage.setItem(storageKey(), value);
  } catch {
    // Sin almacenamiento (modo privado): la elección dura lo que dure la pestaña
  }
};

/**
 * Elige la sucursal inicial: la guardada si sigue siendo del usuario; con una sola, esa;
 * con varias, "Todas mis sucursales".
 */
const initialActive = (branches) => {
  const stored = readStored();
  if (stored === ALL && branches.length > 1) return null;
  const storedId = Number(stored);
  if (branches.some((branch) => branch.id === storedId)) return storedId;
  return branches.length === 1 ? branches[0].id : null;
};

/**
 * Sucursales con las que trabaja el usuario (GET /users/me) y la sucursal activa.
 * Es comodidad de la interfaz: el backend solo deja ver y operar en las sucursales del usuario.
 */
const BranchProvider = ({ children }) => {
  const [state, setState] = useState({ status: "loading", branches: [], allBranches: false, activeId: null });

  const load = useCallback(async () => {
    try {
      const me = unwrap(await api.get("/users/me"));
      const branches = (me?.branches ?? []).map((branch) => ({ id: Number(branch.id), name: branch.nameBranch }));
      setState({ status: "ready", branches, allBranches: Boolean(me?.allBranches), activeId: initialActive(branches) });
    } catch {
      setState((current) => ({ ...current, status: "error" }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** id de sucursal, o null para "Todas mis sucursales". */
  const setActiveBranch = useCallback((id) => {
    store(id === null ? ALL : String(id));
    setState((current) => ({ ...current, activeId: id }));
  }, []);

  const value = useMemo(() => {
    const activeBranch = state.branches.find((branch) => branch.id === state.activeId) ?? null;
    return {
      status: state.status,
      branches: state.branches,
      allBranches: state.allBranches,
      hasBranches: state.branches.length > 0,
      activeBranchId: activeBranch?.id ?? null,
      activeBranch,
      setActiveBranch,
      reload: load,
    };
  }, [state, setActiveBranch, load]);

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
};

export default BranchProvider;
