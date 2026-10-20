/** Minúsculas y sin tildes, para que "Bogota" encuentre "Bogotá". */
const normalizeText = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export default normalizeText;