/** $1,2 M · $350 mil · $800 (para cifras grandes en poco espacio). */
const formatCompact = (value) => {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1).replace(".", ",")} MM`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1e3) return `$${Math.round(value / 1e3)} mil`;
  return `$${Math.round(value)}`;
};

export default formatCompact;
