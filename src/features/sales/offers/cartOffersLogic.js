import { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";

/*
 * Ofertas en el carrito (Fase 31): las calcula el servidor (POST /offers/evaluate) con lo que se compra; el mismo
 * cálculo se repite al registrar la venta. Lo usan Vender y el cobro de los pedidos a caja.
 */
const cents = (value) => Math.round(Number(value || 0) * 100);
const EMPTY = { lines: new Map(), gifts: [], applied: [], savings: 0 };
const DELAY_MS = 250;

/**
 * items: [{ idproduct, quantity }] (sin los regalos). Devuelve { offers, ready }:
 * offers.lines: Map idproduct → { idoffer, name, type, discount (centavos) } · offers.gifts: [{ idoffer, name, entitled,
 * options }] · offers.savings (centavos, sin regalos) · ready: false mientras se recalcula (no se cobra con datos viejos).
 */
export const useCartOffers = (branchId, items) => {
  const key = useMemo(
    () =>
      JSON.stringify(
        items
          .filter((item) => item.quantity > 0)
          .map((item) => [item.idproduct, item.quantity])
          .sort((a, b) => a[0] - b[0])
      ),
    [items]
  );
  const [state, setState] = useState({ key: null, offers: EMPTY });

  useEffect(() => {
    const list = JSON.parse(key);
    if (!branchId || list.length === 0) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const data = unwrap(await api.post("/offers/evaluate", { idbranch: branchId, items: list.map(([idproduct, quantity]) => ({ idproduct, quantity })) }));
        if (!active) return;
        setState({
          key,
          offers: {
            lines: new Map(data.lines.map((line) => [line.idproduct, { ...line, discount: cents(line.discount) }])),
            gifts: data.gifts,
            applied: data.applied,
            savings: data.lines.reduce((sum, line) => sum + cents(line.discount), 0),
          },
        });
      } catch {
        // Sin ofertas que mostrar: el servidor igual las calcula al registrar
        if (active) setState({ key, offers: EMPTY });
      }
    }, DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [branchId, key]);

  const empty = key === "[]" || !branchId;
  return { offers: empty ? EMPTY : state.offers, ready: empty || state.key === key };
};

/** El regalo elegido de cada oferta: { [idoffer]: { productId | null (no lo quiere), units: [] } }. */
export const giftChoiceOf = (gift, choices, freeOf) => {
  const choice = choices[gift.idoffer];
  if (choice && choice.productId === null) return null;
  const option = gift.options.find((item) => item.idproduct === choice?.productId) ?? gift.options.find((item) => !freeOf || freeOf(item.idproduct) > 0) ?? gift.options[0];
  return { option, units: choice?.productId === option.idproduct ? choice.units ?? [] : [] };
};

/**
 * Las líneas de regalo para enviar a la venta: [{ idproduct, quantity | unitIds, gift }] y sus problemas.
 * freeOf(idproduct): cuántas hay libres (opcional).
 */
export const giftLinesOf = (gifts, choices, freeOf) => {
  const items = [];
  const problems = [];
  gifts.forEach((gift) => {
    const chosen = giftChoiceOf(gift, choices, freeOf);
    if (!chosen) return;
    const { option, units } = chosen;
    if (option.hasserial) {
      if (units.length === 0) problems.push(`Regalo de «${gift.name}»: elige el IMEI de ${option.name} o quita el regalo.`);
      else if (units.length > gift.entitled) problems.push(`Regalo de «${gift.name}»: tocan ${gift.entitled}, elegiste ${units.length}.`);
      else items.push({ idproduct: option.idproduct, unitIds: units.map((unit) => unit.id), gift: gift.idoffer });
      return;
    }
    const quantity = freeOf ? Math.min(gift.entitled, freeOf(option.idproduct)) : gift.entitled;
    if (quantity <= 0) problems.push(`Regalo de «${gift.name}»: no hay ${option.name} en esta sucursal. Elige otro o quítalo.`);
    else items.push({ idproduct: option.idproduct, quantity, gift: gift.idoffer });
  });
  return { items, problems };
};
