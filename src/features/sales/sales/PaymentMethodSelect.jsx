import { forwardRef } from "react";
import Select from "../../../components/forms/Select/Select";
import { usePaymentMethods } from "./paymentMethods";

/**
 * Lista de medios de pago configurados (Fase 40). use: "pay" (abonos y cuota inicial: Efectivo y los activos que no
 * son financieras) o "sale" (venta: también financieras y Crédito). Compatible con register().
 */
const PaymentMethodSelect = forwardRef(function PaymentMethodSelect({ use = "pay", ...props }, ref) {
  const { payMethods, saleMethods } = usePaymentMethods();
  return <Select ref={ref} options={use === "sale" ? saleMethods : payMethods} {...props} />;
});

export default PaymentMethodSelect;
