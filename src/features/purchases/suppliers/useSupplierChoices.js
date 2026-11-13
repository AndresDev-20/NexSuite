import { useCallback, useEffect, useMemo } from "react";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../auth/usePermissions";
import { unwrap } from "../../../utils/apiResponse";
import useSuppliers from "./useSuppliers";

/*
 * Proveedores para elegir el proveedor habitual de un producto (Fase 27): carga los proveedores y
 * revisa los permisos («Consultar proveedores» y «Crear proveedores»). Lo usa SupplierPicker.
 */

/** current: el que ya tenía el producto ({ id, companyname, isactive }); se conserva aunque esté inactivo. */
const useSupplierChoices = (current = null) => {
  const { can } = usePermissions();
  const toast = useToast();
  const canRead = can("suppliers.read");
  const canCreate = can("suppliers.create");
  const { suppliers, loading, error, getAllSuppliers, createSupplier } = useSuppliers();

  useEffect(() => {
    if (canRead) getAllSuppliers();
  }, [canRead, getAllSuppliers]);

  const options = useMemo(() => {
    const list = suppliers
      .filter((supplier) => supplier.isActive || supplier.id === current?.id)
      .map((supplier) => ({ value: String(supplier.id), label: supplier.isActive ? supplier.companyname : `${supplier.companyname} (inactivo)` }));
    // Mientras carga (o si falló), el que ya tenía se sigue viendo
    if (current && !list.some((option) => option.value === String(current.id))) {
      list.unshift({ value: String(current.id), label: current.isactive === false ? `${current.companyname} (inactivo)` : current.companyname });
    }
    return list;
  }, [suppliers, current]);

  /** Registra un proveedor y devuelve su id como texto (para dejarlo elegido). */
  const create = useCallback(
    async (payload) => {
      const created = unwrap({ data: await createSupplier(payload) });
      toast.success(`Proveedor ${created.companyname} creado.`);
      return String(created.id);
    },
    [createSupplier, toast]
  );

  return { canRead, canCreate, options, loading: loading && suppliers.length === 0, loadError: error, create };
};

export default useSupplierChoices;
