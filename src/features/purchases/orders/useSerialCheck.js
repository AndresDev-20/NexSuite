import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../api/client";
import { toList } from "../../../utils/apiResponse";
import { serialLineErrors } from "../../../utils/serial";
import { parseSerials } from "./purchaseForm";

const CHECK_DELAY_MS = 400;

/**
 * Revisión en vivo de los IMEI/seriales de un producto de la compra (pedido del 2026-11-26: «que vaya
 * saliendo si el IMEI pasa o no pasa o ya está creado, como en Asignar a sucursales»):
 * - formato (IMEI de 15 dígitos con su dígito de control; serial de 3 a 100) y IMEI 2;
 * - repetidos dentro de la misma compra (entre líneas y entre sucursales del producto);
 * - ya registrados en el sistema: se pregunta al servidor por cada identificador válido, una vez.
 * line: la línea del formulario; branchIds: las sucursales con cantidad. Devuelve { [branchId]: [mensajes] }.
 * El servidor vuelve a revisar todo al guardar y al confirmar: esto es solo para avisar a tiempo.
 */
const useSerialCheck = (line, branchIds) => {
  const known = useRef(new Map()); // identificador → true (ya existe) | false (libre)
  const [, setVersion] = useState(0);

  const parsed = useMemo(
    () => Object.fromEntries(branchIds.map((branchId) => [branchId, line.hasSerial ? parseSerials(line.serials[branchId]) : []])),
    [line.hasSerial, line.serials, branchIds]
  );

  // Formato y repetidos (un solo «visto» para todas las sucursales del producto)
  const formatErrors = useMemo(() => {
    const seen = new Map();
    return Object.fromEntries(
      branchIds.map((branchId) => [branchId, serialLineErrors(parsed[branchId], line.serialType, seen, "esta compra")])
    );
  }, [parsed, branchIds, line.serialType]);

  // Los identificadores con buen formato que aún no se han preguntado
  const valid = useMemo(() => {
    const values = new Set();
    branchIds.forEach((branchId) =>
      parsed[branchId].forEach((unit) => {
        const units = [unit.serial, unit.imei2].filter(Boolean);
        if (line.serialType === "imei" ? units.every((value) => /^\d{15}$/.test(value)) : unit.serial?.length >= 3) units.forEach((value) => values.add(value));
      })
    );
    return [...values];
  }, [parsed, branchIds, line.serialType]);
  const pendingKey = valid.filter((value) => !known.current.has(value)).join(",");

  useEffect(() => {
    if (!pendingKey) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      for (const value of pendingKey.split(",")) {
        if (!active) return;
        try {
          const units = toList(await api.get("/product-units", { params: { search: value } }));
          known.current.set(value, units.some((unit) => unit.serial === value || unit.imei2 === value));
        } catch {
          known.current.set(value, false); // sin permiso de consultar unidades: lo revisa el servidor al guardar
        }
      }
      if (active) setVersion((current) => current + 1);
    }, CHECK_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pendingKey]);

  return Object.fromEntries(
    branchIds.map((branchId) => {
      const taken = [];
      parsed[branchId].forEach((unit, index) =>
        [unit.serial, unit.imei2].filter(Boolean).forEach((value) => {
          if (known.current.get(value)) taken.push(`Línea ${index + 1}: ${value} ya está registrado en el sistema.`);
        })
      );
      // En el orden de las líneas («Línea 2…» antes que «Línea 4…»)
      const lineOf = (message) => Number(message.match(/^Línea (\d+)/)?.[1] ?? 0);
      return [branchId, [...formatErrors[branchId], ...taken].sort((a, b) => lineOf(a) - lineOf(b))];
    })
  );
};

export default useSerialCheck;
