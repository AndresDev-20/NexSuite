import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import { toNumber } from "../../../utils/money";

/* Ofertas (Fase 31, docs/PLAN-OFERTAS.md). El servidor revisa las reglas de cada tipo y las aplica al vender. */
const PATH = "/offers";

/** Los 4 tipos, con su ícono, color y una explicación corta. */
export const OFFER_TYPES = [
  { value: "regalo", label: "Regalo", icon: "sparkles", tone: "gift", hint: "Por la compra de un producto, el cliente se lleva otro gratis (elige uno de una lista)." },
  { value: "precio", label: "Precio especial", icon: "wallet", tone: "price", hint: "Uno o varios productos a otro precio mientras dure la oferta." },
  { value: "segundo", label: "Descuento en el segundo", icon: "plus", tone: "second", hint: "2x1, el segundo a mitad de precio… por cada grupo que lleve." },
  { value: "combo", label: "Combo", icon: "box", tone: "combo", hint: "Varios productos juntos a un precio fijo." },
];
export const typeOf = (value) => OFFER_TYPES.find((type) => type.value === value) ?? OFFER_TYPES[0];

export const OFFER_STATES = [
  { value: "vigente", label: "Vigentes", tone: "success" },
  { value: "programada", label: "Programadas", tone: "info" },
  { value: "pausada", label: "Pausadas", tone: "muted" },
  { value: "agotada", label: "Agotadas", tone: "warning" },
  { value: "vencida", label: "Vencidas", tone: "muted" },
];
export const STATE_LABELS = { vigente: "Vigente", programada: "Programada", pausada: "Pausada", agotada: "Agotada", vencida: "Vencida" };

const normalizeProduct = (row) => ({ ...row, listprice: toNumber(row.listprice), ...(row.price !== undefined && { price: toNumber(row.price) }) });

export const normalizeOffer = (offer) => ({
  ...offer,
  price: offer.price === null ? null : toNumber(offer.price),
  triggers: offer.triggers.map(normalizeProduct),
  gifts: offer.gifts.map(normalizeProduct),
  items: offer.items.map(normalizeProduct),
});

export const listOffers = async (params) => {
  const data = unwrap(await api.get(PATH, { params }));
  return { items: data.items.map(normalizeOffer), counts: data.counts ?? {} };
};

const send = async (request) => {
  const { data } = await request;
  return { message: data.message, data: data.data ? normalizeOffer(data.data) : null };
};
export const createOffer = (body) => send(api.post(PATH, body));
export const updateOffer = (id, body) => send(api.put(`${PATH}/${id}`, body));
export const setOfferStatus = (id, status) => send(api.post(`${PATH}/${id}/status`, { status }));
export const deleteOffer = async (id) => (await api.delete(`${PATH}/${id}`)).data;

/** «Del 1 al 31 de dic.», «Desde el 1 de dic.», «Sin fecha de fin». */
export const periodText = (offer) => {
  const day = (value) => new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00Z`));
  if (offer.startsat && offer.endsat) return `Del ${day(offer.startsat)} al ${day(offer.endsat)}`;
  if (offer.endsat) return `Hasta el ${day(offer.endsat)}`;
  if (offer.startsat) return `Desde el ${day(offer.startsat)}`;
  return "Sin fecha de fin";
};
