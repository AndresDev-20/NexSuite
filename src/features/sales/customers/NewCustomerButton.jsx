import { useState } from "react";
import api from "../../../api/client";
import Button from "../../../components/ui/Button/Button";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../auth/usePermissions";
import CustomerFormModal from "./CustomerFormModal";

/**
 * «+ Nuevo cliente» al vender (Fase 19): lo crea ahí mismo. Solo con «Crear clientes»; el cupo y el
 * plazo solo aparecen con «Asignar cupo de crédito» (si no, queda de contado).
 * onCreated(customer) recibe el cliente como lo devuelve el servidor (para elegirlo en la venta).
 */
const NewCustomerButton = ({ onCreated, label = "Nuevo cliente", variant = "outline" }) => {
  const { can } = usePermissions();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  if (!can("customers.create")) return null;

  const create = async (payload) => {
    const { data } = await api.post("/customers", payload);
    toast.success(`Cliente ${data.data.name} creado.`);
    setOpen(false);
    await onCreated?.(data.data);
  };

  return (
    <>
      <Button variant={variant} icon="plus" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <CustomerFormModal open={open} canCredit={can("customers.credit")} onClose={() => setOpen(false)} onSubmit={create} />
    </>
  );
};

export default NewCustomerButton;
