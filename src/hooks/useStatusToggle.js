import { useState } from "react";
import useToast from "../components/feadback/Toast/useToast";
import getErrorMessage from "../utils/getErrorMessage";

/**
 * Activar/desactivar un registro (usuarios, productos, categorías, proveedores…).
 * Desactivar pide confirmación (deactivating → ConfirmDialog); activar se hace al instante.
 *
 * setActive(item, isActive): async; guarda el cambio, avisa el éxito y lanza el error si falla.
 * activateError: mensaje si falla la activación (la desactivación la muestra el diálogo).
 */
const useStatusToggle = ({ setActive, activateError = "No se pudo activar." }) => {
  const toast = useToast();
  const [deactivating, setDeactivating] = useState(null);

  const toggle = async (item) => {
    if (item.isActive) {
      setDeactivating(item);
      return;
    }
    try {
      await setActive(item, true);
    } catch (error) {
      toast.error(getErrorMessage(error, activateError));
    }
  };

  const confirmDeactivate = async () => {
    await setActive(deactivating, false);
    setDeactivating(null);
  };

  return { deactivating, toggle, confirmDeactivate, cancelDeactivate: () => setDeactivating(null) };
};

export default useStatusToggle;
