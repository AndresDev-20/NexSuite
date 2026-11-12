import axios from "axios";
import { unwrap } from "../../utils/apiResponse";

/*
 * API pública de la tienda en línea (Fase 24): sin sesión. Va en su propio cliente para no mandar
 * el token del sistema ni sacar al cliente al login si algo responde 401.
 */
const shopApi = axios.create({ baseURL: import.meta.env.VITE_REACT_APP_URL });

/** { name, phone, email, address, city, whatsapp, categories: [{ id, name, count }] } */
export const getShop = async () => unwrap(await shopApi.get("/shop"));

/** params: { search, category, sort }. [{ id, name, category, price, unit, warrantyMonths, availability, summary }] */
export const getShopProducts = async (params) => unwrap(await shopApi.get("/shop/products", { params }));

/** Un producto con description y features; 404 si no está en la tienda. */
export const getShopProduct = async (id) => unwrap(await shopApi.get(`/shop/products/${id}`));
