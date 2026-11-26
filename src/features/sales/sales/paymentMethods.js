import { useEffect, useSyncExternalStore } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";

/*
 * Medios de pago (Fase 40): Efectivo y Crédito siempre; los demás los configura el administrador en
 * Configuración → Medios de pago (los del sistema se pueden desactivar y se crean otros, como «Bancolombia»).
 * Se piden una vez al servidor y se comparten entre pantallas; sin conexión (o en la demostración) quedan
 * los del sistema.
 */

const BUILTIN = [
  { code: "transferencia", name: "Transferencia", kind: "transferencia" },
  { code: "nequi", name: "Nequi", kind: "transferencia" },
  { code: "daviplata", name: "Daviplata", kind: "transferencia" },
  { code: "tarjeta", name: "Tarjeta", kind: "tarjeta" },
  { code: "sistecredito", name: "Sistecrédito", kind: "financiado" },
  { code: "addi", name: "Addi", kind: "financiado" },
  { code: "alocredito", name: "Alocrédito", kind: "financiado" },
];
const FIXED_LABELS = { efectivo: "Efectivo", credito: "Crédito (fiado)", apartado: "Abonos del apartado" };

let snapshot = {
  methods: BUILTIN,
  labels: { ...FIXED_LABELS, ...Object.fromEntries(BUILTIN.map((method) => [method.code, method.name])) },
  loaded: false,
};
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

let pending = null;
/** Pide los medios activos al servidor (una sola vez, salvo force). */
export const loadPaymentMethods = ({ force = false } = {}) => {
  if (pending && !force) return pending;
  pending = api
    .get("/payment-methods")
    .then((response) => {
      const data = unwrap(response);
      snapshot = {
        methods: data.methods ?? [],
        labels: { ...snapshot.labels, ...(data.labels ?? {}), ...FIXED_LABELS },
        loaded: true,
      };
      emit();
      return snapshot;
    })
    .catch(() => {
      pending = null; // se vuelve a intentar la próxima vez
      return snapshot;
    });
  return pending;
};

/** Nombre de un medio («m8» → «Bancolombia»). */
export const paymentLabel = (code) => snapshot.labels[code] ?? code;

/** Fase 54: los que nunca llevan recargo. */
export const NO_SURCHARGE = ["efectivo", "credito", "apartado"];
/** Fase 54: % de recargo configurado del medio (0 si no tiene). */
export const surchargeOf = (code) => Number(snapshot.methods.find((method) => method.code === code)?.surchargepercent ?? 0);
/** Fase 54: ¿se le muestra el recargo? Las financieras siempre; los demás, si tienen un % configurado. */
export const takesSurcharge = (code) => {
  if (NO_SURCHARGE.includes(code)) return false;
  const method = snapshot.methods.find((item) => item.code === code);
  return method?.kind === "financiado" || Number(method?.surchargepercent ?? 0) > 0;
};

const toOption = (method) => ({ value: method.code, label: method.name });

/**
 * saleMethods: para vender (Efectivo, los activos y Crédito al final).
 * payMethods: para abonos y la cuota inicial (Efectivo y los activos que no son financieras).
 * outsideMethods: los que no pasan por la caja (filtro de Pagos).
 */
export const usePaymentMethods = () => {
  const current = useSyncExternalStore(subscribe, () => snapshot);
  useEffect(() => {
    loadPaymentMethods();
  }, []);
  const active = current.methods.map(toOption);
  const plain = current.methods.filter((method) => method.kind !== "financiado").map(toOption);
  return {
    saleMethods: [{ value: "efectivo", label: "Efectivo" }, ...active, { value: "credito", label: "Crédito (fiado)" }],
    payMethods: [{ value: "efectivo", label: "Efectivo" }, ...plain],
    outsideMethods: active,
    labelOf: (code) => current.labels[code] ?? code,
  };
};
