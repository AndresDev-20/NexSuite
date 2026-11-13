import "./cashRegisterArt.css";

/**
 * Caja registradora dibujada y animada (2026-11-13), en SVG. state:
 *  · "open"    vendiendo: sale el recibo, la pantalla muestra «$» y titilan los botones;
 *  · "pending" por contar: el cajón abierto y los billetes se cuentan uno tras otro.
 * Solo adorno (aria-hidden); con «Animaciones reducidas» queda quieta.
 */
const CashRegisterArt = ({ state = "open" }) => (
  <svg className={`cash-art cash-art--${state}`} viewBox="0 0 120 120" aria-hidden="true">
    {/* Sombra */}
    <ellipse cx="60" cy="112" rx="44" ry="5" className="cash-art__shadow" />

    {/* Recibo que sale por arriba (vendiendo) */}
    <g className="cash-art__receipt">
      <path d="M66 30V8h20v22z" fill="#fff" stroke="#d9d9df" strokeWidth="1" />
      <path d="M70 13h12M70 17h9M70 21h12" stroke="#c4c4cc" strokeWidth="1.4" strokeLinecap="round" />
    </g>

    {/* Cuerpo */}
    <path d="M18 58q2-24 18-26h48q16 2 18 26z" className="cash-art__top" />
    <rect x="14" y="56" width="92" height="32" rx="8" className="cash-art__body" />

    {/* Pantalla */}
    <rect x="28" y="38" width="38" height="16" rx="4" className="cash-art__screen" />
    <text x="47" y="50" textAnchor="middle" className="cash-art__screen-text">
      {state === "pending" ? "CONTAR" : "VENTA"}
    </text>

    {/* Botones */}
    {[0, 1, 2, 3].map((col) =>
      [0, 1].map((row) => (
        <rect
          key={`${col}-${row}`}
          x={24 + col * 13}
          y={62 + row * 10}
          width="10"
          height="6"
          rx="2"
          className="cash-art__key"
          style={{ "--k": col + row * 4 }}
        />
      ))
    )}
    <rect x="80" y="62" width="16" height="16" rx="4" className="cash-art__enter" />

    {/* Cajón: se abre al contar */}
    <g className="cash-art__drawer">
      {/* Billetes dentro del cajón */}
      <g className="cash-art__bills">
        {[0, 1, 2].map((index) => (
          <rect key={index} x={30 + index * 20} y="86" width="16" height="10" rx="2" className="cash-art__bill" style={{ "--b": index }} />
        ))}
      </g>
      <rect x="10" y="88" width="100" height="18" rx="6" className="cash-art__drawer-front" />
      <rect x="50" y="94" width="20" height="4" rx="2" className="cash-art__handle" />
    </g>

    {/* Monedas que saltan (vendiendo) */}
    <circle cx="100" cy="46" r="5" className="cash-art__coin" style={{ "--c": 0 }} />
    <circle cx="108" cy="54" r="4" className="cash-art__coin" style={{ "--c": 1 }} />

    {/* Billete que vuela al contarlo (por contar) */}
    <g className="cash-art__flying">
      <rect x="44" y="70" width="22" height="12" rx="2" className="cash-art__bill cash-art__bill--fly" />
      <circle cx="55" cy="76" r="3" fill="rgba(255,255,255,0.6)" />
    </g>
  </svg>
);

export default CashRegisterArt;
