import "./brandWordmark.css";

/** «NexSuite» → ["Nex", "Suite"]; «Mundo Celumóvil» → ["Mundo", " Celumóvil"]. La primera parte va resaltada. */
const splitName = (name) => {
  const trimmed = name.trim();
  const space = trimmed.indexOf(" ");
  if (space > 0) return [trimmed.slice(0, space), trimmed.slice(space)];
  const cut = Math.max(1, Math.round(trimmed.length * 0.4));
  return [trimmed.slice(0, cut), trimmed.slice(cut)];
};

/**
 * Nombre de la empresa con dos estilos (Fase 29, pedido del 2026-11-14):
 *  · con eslogan → «letrero»: el nombre en MAYÚSCULAS, grueso y rojo con brillo, y el eslogan debajo
 *    entre dos líneas finas;
 *  · solo el nombre → «como NexSuite»: cursiva elegante, la primera palabra en rojo y gruesa.
 * size: login | header | shop | preview (el tamaño lo pone cada lugar con su CSS).
 * onAccent: sobre un fondo rojo (inicio de sesión en computador, encabezado de la tienda): todo en blanco.
 * showTagline=false: solo el nombre (por ejemplo el encabezado en celular), pero con el estilo de letrero.
 */
const BrandWordmark = ({ name, tagline, size = "header", onAccent = false, showTagline = true, className = "" }) => {
  const sign = Boolean(tagline?.trim());
  const classes = ["wordmark", `wordmark--${size}`, sign ? "wordmark--sign" : "wordmark--script", onAccent && "wordmark--on-accent", className]
    .filter(Boolean)
    .join(" ");

  if (sign) {
    return (
      <span className={classes} title={`${name} · ${tagline.trim()}`}>
        <span className="wordmark__name">{name.trim()}</span>
        {showTagline && <span className="wordmark__tagline">{tagline.trim()}</span>}
      </span>
    );
  }

  const [first, rest] = splitName(name);
  return (
    <span className={classes} title={name.trim()}>
      <span className="wordmark__name">
        <span className="wordmark__first">{first}</span>
        {rest}
      </span>
    </span>
  );
};

export default BrandWordmark;
