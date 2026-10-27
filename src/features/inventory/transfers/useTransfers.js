import { useCallback, useRef, useState } from "react";
import api from "../../../api/client";
import { toList, unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { toNumber } from "../../../utils/money";
import { getFullName } from "../../../utils/userDisplay";

const TRANSFERS_PATH = "/transfers";

const normalizeItem = (item) => ({
  id: item.id,
  productId: item.idproduct,
  productName: item.product?.nameproduct ?? "",
  productSku: item.product?.sku ?? "",
  hasSerial: Boolean(item.product?.hasserial),
  quantity: toNumber(item.quantity),
  serials: (item.serials ?? []).map((unit) => unit.serial),
});

/** Sirve para la lista (nº de productos y unidades) y para el detalle (con productos). */
export const normalizeTransfer = (transfer) => ({
  id: transfer.id,
  number: transfer.number,
  date: transfer.transferdate,
  notes: transfer.notes ?? "",
  fromId: transfer.idbranchfrom,
  fromName: transfer.from?.nameBranch ?? "",
  toId: transfer.idbranchto,
  toName: transfer.to?.nameBranch ?? "",
  createdBy: transfer.user ? getFullName(transfer.user) : null,
  createdAt: transfer.createdat,
  productCount: transfer.productCount ?? transfer.items?.length ?? 0,
  unitCount: transfer.unitCount ?? (transfer.items ?? []).reduce((sum, item) => sum + toNumber(item.quantity), 0),
  items: (transfer.items ?? []).map(normalizeItem),
});

const EMPTY = { items: [], total: 0, page: 1, pages: 1 };

/** Traslados: lista paginada, detalle, registrar y sucursales de destino. */
const useTransfers = () => {
  const [result, setResult] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);
  const lastParams = useRef(undefined);

  /** params: { search, idbranch, idproduct, from, to, page, limit }. Descarta respuestas viejas. */
  const getTransfers = useCallback(async (params = lastParams.current, { silent = false } = {}) => {
    lastParams.current = params;
    const request = ++lastRequest.current;
    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const data = unwrap(await api.get(TRANSFERS_PATH, { params }));
      if (request !== lastRequest.current) return;
      setResult({ items: data.items.map(normalizeTransfer), total: data.total, page: data.page, pages: data.pages });
    } catch (err) {
      if (request !== lastRequest.current || silent) return;
      setResult(EMPTY);
      setError(getErrorMessage(err, "No se pudieron cargar los traslados."));
    } finally {
      if (request === lastRequest.current && !silent) setLoading(false);
    }
  }, []);

  const getTransfer = useCallback(async (id) => normalizeTransfer(unwrap(await api.get(`${TRANSFERS_PATH}/${id}`))), []);

  /** Registra el traslado (la mercancía se mueve en el acto) y refresca la lista sin parpadeo. */
  const createTransfer = useCallback(
    async (payload) => {
      const transfer = normalizeTransfer(unwrap(await api.post(TRANSFERS_PATH, payload)));
      await getTransfers(undefined, { silent: true });
      return transfer;
    },
    [getTransfers]
  );

  /** Todas las sucursales (id y nombre): el destino puede ser cualquiera. */
  const getDestinations = useCallback(
    async () => toList(await api.get(`${TRANSFERS_PATH}/branches`)).map((branch) => ({ id: branch.id, name: branch.nameBranch })),
    []
  );

  return { ...result, loading, error, getTransfers, getTransfer, createTransfer, getDestinations };
};

export default useTransfers;
