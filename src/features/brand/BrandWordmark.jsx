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
 * Letras sueltas para la animación del inicio de sesión. Cada palabra va junta (no se parte a mitad) y
 * cada letra lleva su número (--i) para entrar una tras otra. Los lectores de pantalla leen el texto
 * completo (wordmark__sr), no letra por letra.
 */
const Letters = ({ text, start = 0 }) => {
  let index = start;
  return text.split(/(\s+)/).map((part, partIndex) => {
    if (!part) return null;
    if (/^\s+$/.test(part)) return " ";
    return (
      <span key={partIndex} className="wordmark__word" aria-hidden="true">
        {[...part].map((char) => (
          <span key={index} className="wordmark__char" style={{ "--i": index++ }}>
            {char}
          </span>
        ))}
      </span>
    );
  });
};

/**
 * Nombre de la empresa con dos estilos (Fase 29, pedido del 2026-11-14):
 *  · con eslogan → «letrero»: el nombre en MAYÚSCULAS, grueso y rojo con brillo, y el eslogan debajo
 *    entre dos líneas finas;
 *  · solo el nombre → «como NexSuite»: cursiva elegante, la primera palabra en rojo y gruesa.
 * size: login | header | shop | preview (el tamaño lo pone cada lugar con su CSS).
 * onAccent: sobre un fondo rojo (inicio de sesión en computador, encabezado de la tienda): todo en blanco.
 * showTagline=false: solo el nombre (por ejemplo el encabezado en celular), pero con el estilo de letrero.
 * animated: las letras entran una por una y luego pasa una ola de brillo (inicio de sesión). El nombre
 *   se acomoda en dos líneas si no cabe, en vez de cortarse con «…».
 */
const BrandWordmark = ({ name, tagline, size = "header", onAccent = false, showTagline = true, animated = false, className = "" }) => {
  const sign = Boolean(tagline?.trim());
  const trimmed = name.trim();
  const classes = [
    "wordmark",
    `wordmark--${size}`,
    sign ? "wordmark--sign" : "wordmark--script",
    onAccent && "wordmark--on-accent",
    animated && "wordmark--animated",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (sign) {
    return (
      <span className={classes} title={`${trimmed} · ${tagline.trim()}`} style={animated ? { "--letters": [...trimmed].length } : undefined}>
        {animated ? (
          <span className="wordmark__name">
            <span className="wordmark__sr">{trimmed}</span>
            <Letters text={trimmed} />
          </span>
        ) : (
          <span className="wordmark__name">{trimmed}</span>
        )}
        {showTagline && <span className="wordmark__tagline">{tagline.trim()}</span>}
      </span>
    );
  }

  const [first, rest] = splitName(trimmed);
  if (animated) {
    return (
      <span className={classes} title={trimmed} style={{ "--letters": [...trimmed].length }}>
        <span className="wordmark__name">
          <span className="wordmark__sr">{trimmed}</span>
          <span className="wordmark__first">
            <Letters text={first} />
          </span>
          <Letters text={rest} start={[...first].length} />
        </span>
      </span>
    );
  }
  return (
    <span className={classes} title={trimmed}>
      <span className="wordmark__name">
        <span className="wordmark__first">{first}</span>
        {rest}
      </span>
    </span>
  );
};

export default BrandWordmark;
