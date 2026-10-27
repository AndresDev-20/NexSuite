import { useEffect, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { toNumber } from "../../../utils/money";
import { normalizeUnit } from "../../inventory/productUnits/useProductUnits";
import { normalizeOrder, normalizePayment } from "../orders/useOrders";
import { normalizeSupplier } from "./useSuppliers";

const normalizePurchases = (purchases) => ({
  total: purchases.total,
  confirmed: purchases.confirmed,
  drafts: purchases.drafts,
  purchased: toNumber(purchases.purchased),
  lastPurchase: purchases.lastPurchase,
  items: purchases.items.map(normalizeOrder),
});

const normalizePayables = (payables) => ({
  openCount: payables.openCount,
  openBalance: toNumber(payables.openBalance),
  overdueCount: payables.overdueCount,
  overdueBalance: toNumber(payables.overdueBalance),
  paidTotal: toNumber(payables.paidTotal),
  open: payables.open.map(normalizeOrder),
  payments: payables.payments.map((payment) => ({
    ...normalizePayment(payment),
    orderId: payment.order?.id ?? null,
    orderNumber: payment.order?.number ?? "",
    invoiceNumber: payment.order?.invoicenumber ?? "",
  })),
});

const normalizeProduct = (product) => ({
  productId: product.idproduct,
  sku: product.sku,
  name: product.nameproduct,
  unit: product.unit,
  hasSerial: Boolean(product.hasserial),
  quantity: product.quantity,
  orders: product.orders,
  lastCost: toNumber(product.lastCost),
  lastDate: product.lastDate,
});

/**
 * El servidor envía cada sección solo con su permiso: purchases, payables, products y units
 * quedan en null cuando no se pueden ver.
 */
const normalizeOverview = ({ supplier, purchases, payables, products, units }) => ({
  supplier: normalizeSupplier(supplier),
  purchases: purchases ? normalizePurchases(purchases) : null,
  payables: payables ? normalizePayables(payables) : null,
  products: products ? products.map(normalizeProduct) : null,
  units: units
    ? {
        total: units.total,
        counts: units.counts,
        warrantyActive: units.warrantyActive,
        warrantyExpired: units.warrantyExpired,
        items: units.items.map(normalizeUnit),
      }
    : null,
});

const LOAD_ERROR = "No se pudo cargar la ficha del proveedor.";

/**
 * Ficha completa de un proveedor (GET /suppliers/:id/overview). Quien la usa se monta de nuevo
 * por cada proveedor (key), así que arranca cargando; reload() la vuelve a pedir.
 */
const useSupplierOverview = (supplierId) => {
  const [state, setState] = useState({ overview: null, loading: true, error: "" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let current = true;
    api
      .get(`/suppliers/${supplierId}/overview`)
      .then((response) => current && setState({ overview: normalizeOverview(unwrap(response)), loading: false, error: "" }))
      .catch((error) => current && setState({ overview: null, loading: false, error: getErrorMessage(error, LOAD_ERROR) }));
    // Si se cierra antes de responder, la respuesta vieja se descarta
    return () => {
      current = false;
    };
  }, [supplierId, retry]);

  const reload = () => {
    setState({ overview: null, loading: true, error: "" });
    setRetry((value) => value + 1);
  };

  return { ...state, reload };
};

export default useSupplierOverview;
