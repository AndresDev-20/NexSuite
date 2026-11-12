import { useSeason } from "./seasonContext";
import "./seasonScene.css";

/*
 * El espíritu de cada temporada (Fase 25, segunda versión): todo dibujado en SVG, sin imágenes.
 * - SeasonSky: en la barra de arriba, un viajero que la cruza cada tanto (Papá Noel con sus renos, la
 *   bruja en su escoba, el cóndor con la bandera…) y adornos colgando en el espacio vacío.
 * - SeasonScene: una escena grande (el árbol con regalos y el muñeco de nieve, calabazas y fantasma…)
 *   debajo del menú, en el anuncio de NexStore y en el inicio de sesión.
 * Nada se puede tocar; con animaciones reducidas queda quieto (y el viajero no sale).
 */

const BRAND_FONT = "var(--font-brand), Georgia, serif";

// Año que se celebra: de julio en adelante ya se piensa en el que viene
const newYearOf = () => {
  const today = new Date();
  return today.getMonth() >= 6 ? today.getFullYear() + 1 : today.getFullYear();
};

const HEART = "M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.6 0 5.7 3.8 4.2 7.2C19.5 16.4 12 21 12 21z";
const STAR = "M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z";

/* ---------------------------------------------------------------------------------------------
   Viajeros que cruzan la barra
   --------------------------------------------------------------------------------------------- */

const Reindeer = ({ x, y, delay, lead = false }) => (
  <g transform={`translate(${x} ${y})`}>
    <g className="season-bob" style={{ "--d": delay }}>
      <path d="M-10 5l-9 5M-13 4l-9 2M9 5l9 6M6 6l6 8" stroke="#6b4423" strokeWidth="2.6" strokeLinecap="round" className="season-gallop" />
      <ellipse cx="0" cy="0" rx="16" ry="7.5" fill="#8b5a2b" />
      <ellipse cx="1" cy="3" rx="11" ry="3.4" fill="#c79a63" />
      <circle cx="-16" cy="-2.5" r="2.4" fill="#fff" />
      <path d="M10 -3L18 -12" stroke="#8b5a2b" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="22" cy="-13.5" rx="6.5" ry="4.4" fill="#8b5a2b" />
      <path d="M19 -17l-3 -8M17.5 -22l-4 -2.5M23 -17.5l2 -8M24.5 -22.5l4 -2" stroke="#5a3a1a" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx="23.5" cy="-15" r="1" fill="#1a1a1a" />
      <circle cx="28.4" cy="-12.6" r={lead ? 2.6 : 1.8} fill={lead ? "#ff2a3d" : "#3a2410"} className={lead ? "season-glow" : undefined} />
      <path d="M8 -3q3 4 0 7" stroke="#f5c542" strokeWidth="1.6" fill="none" />
    </g>
  </g>
);

const SantaSleigh = () => (
  <svg viewBox="0 -6 300 80" className="season-flyer__art">
    {/* Estela de estrellitas */}
    {[8, 22, 36, 14, 30].map((cx, index) => (
      <path key={index} d={STAR} transform={`translate(${cx} ${30 + (index % 3) * 9}) scale(${0.32 + (index % 2) * 0.14})`} fill="#f5c542" className="season-twinkle" style={{ "--d": `${index * -0.3}s` }} />
    ))}
    <path d="M118 44Q150 34 182 36Q202 40 222 40Q242 36 262 36" stroke="#f5c542" strokeWidth="1.3" fill="none" />
    <Reindeer x={182} y={40} delay="-0.4s" />
    <Reindeer x={222} y={42} delay="-0.2s" />
    <Reindeer x={262} y={38} delay="0s" lead />
    <g className="season-bob" style={{ "--d": "-0.6s" }}>
      {/* Bulto de regalos */}
      <path d="M48 34q-8 -16 6 -22q14 -2 16 10z" fill="#7a4b1e" />
      <rect x="54" y="18" width="10" height="9" rx="1.5" fill="#2f6fd6" />
      <path d="M59 18v9" stroke="#f5c542" strokeWidth="1.6" />
      {/* Papá Noel */}
      <path d="M74 36q2 -18 17 -18q15 0 17 18z" fill="#d6182e" />
      <g className="season-wave season-wave--santa">
        <path d="M100 25q8 -3 10 -12" stroke="#d6182e" strokeWidth="4.4" strokeLinecap="round" fill="none" />
        <circle cx="110.5" cy="11.5" r="2.8" fill="#1f1f24" />
      </g>
      <circle cx="91.5" cy="13.5" r="6.4" fill="#f6c7a1" />
      <path d="M85 14q0 10 6.5 11q6.5 -1 6.5 -11q-3 3 -6.5 3q-3.5 0 -6.5 -3z" fill="#fff" />
      <circle cx="89.3" cy="12.4" r=".9" fill="#1a1a1a" />
      <circle cx="94" cy="12.4" r=".9" fill="#1a1a1a" />
      <circle cx="91.6" cy="15" r="1.3" fill="#e9967a" />
      <path d="M84.5 9.5Q91 -3 104 5L98 8.5Q92 6 84.5 9.5z" fill="#d6182e" />
      <rect x="84" y="8" width="15" height="3.6" rx="1.8" fill="#fff" />
      <circle cx="104.5" cy="5.5" r="2.6" fill="#fff" />
      {/* Trineo */}
      <path d="M50 34H112q10 0 10 10v6q0 8 -10 8H62q-14 0 -16 -14z" fill="#c8102e" />
      <path d="M52 40H120" stroke="#f5c542" strokeWidth="2" />
      <path d="M66 47q6 -6 12 0t12 0" stroke="#f5c542" strokeWidth="1.4" fill="none" />
      <path d="M62 58v6M104 58v6" stroke="#f5c542" strokeWidth="2.4" />
      <path d="M44 64H118q10 0 13 -9" stroke="#f5c542" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  </svg>
);

const BAT = "M12 9.2c.8-1.4 1.6-1.8 2-1.2.3-.7.9-1 1.3-.6-.1 1.2.6 2 1.8 2.1 1.6.1 3.1-1.1 4.9-.7-1.4.6-2.4 2-2.4 3.6-1.2-.9-2.6-.7-3.4.3-.8-.8-2.1-.9-2.9-.1-.5-.7-1-1-1.3-1s-.8.3-1.3 1c-.8-.8-2.1-.7-2.9.1-.8-1-2.2-1.2-3.4-.3 0-1.6-1-3-2.4-3.6 1.8-.4 3.3.8 4.9.7 1.2-.1 1.9-.9 1.8-2.1.4-.4 1 0 1.3.6.4-.6 1.2-.2 2 1.2z";

const Bat = ({ x, y, scale = 1, delay = "0s" }) => (
  <g transform={`translate(${x} ${y}) scale(${scale * 1.4})`}>
    <g className="season-flap" style={{ "--d": delay }}>
      <path d={BAT} transform="translate(-12 -10)" fill="#2b1840" />
    </g>
  </g>
);

const WitchBroom = () => (
  <svg viewBox="0 -16 230 96" className="season-flyer__art">
    {[6, 18, 30].map((cx, index) => (
      <circle key={cx} cx={cx} cy={58 + (index % 2) * 8} r={2.2 - index * 0.4} fill={index % 2 ? "#f5a623" : "#b48be8"} className="season-twinkle" style={{ "--d": `${index * -0.4}s` }} />
    ))}
    <Bat x={196} y={0} scale={1.1} />
    <Bat x={214} y={22} scale={0.8} delay="-0.2s" />
    <g className="season-bob" style={{ "--d": "0s" }}>
      <path d="M104 30Q80 32 62 52Q86 52 104 46z" fill="#5b2a86" className="season-cape" />
      <path d="M40 60L190 46" stroke="#7a4b1e" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M44 60L12 48L6 62L14 74z" fill="#d9a531" />
      <path d="M14 52L42 60M10 62L42 61M14 70L42 62" stroke="#a87b1e" strokeWidth="1" />
      <path d="M40 56l4 8" stroke="#7a4b1e" strokeWidth="3" />
      <path d="M100 56Q108 20 128 22Q140 26 142 52Z" fill="#3b1a5a" />
      <path d="M126 52l14 9" stroke="#1f1f24" strokeWidth="4.4" strokeLinecap="round" />
      <path d="M138 58l6 6l-8 1z" fill="#1f1f24" />
      <path d="M132 30q8 6 18 6" stroke="#3b1a5a" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="151" cy="36" r="2.4" fill="#8fd16a" />
      <path d="M129 14q-9 8 -7 20q4 -7 7 -9z" fill="#f5a623" />
      <circle cx="136" cy="20" r="7.4" fill="#8fd16a" />
      <path d="M142.5 19.5l6 2.6l-6.2.8z" fill="#74b552" />
      <circle cx="138.6" cy="18" r="1.1" fill="#1a1a1a" />
      <path d="M135 24.5q3 1.6 5 -.4" stroke="#1a1a1a" strokeWidth=".9" fill="none" />
      <ellipse cx="134" cy="13" rx="14" ry="3.2" fill="#2b0f45" />
      <path d="M125 12.5L143 12.5L152 -12Q141 -2 125 12.5z" fill="#3b1a5a" />
      <path d="M126 10.4L142 10.4" stroke="#f5a623" strokeWidth="2.2" />
      {/* Gato en la escoba */}
      <ellipse cx="172" cy="44" rx="9" ry="6" fill="#1f1f24" />
      <circle cx="181" cy="38" r="5" fill="#1f1f24" />
      <path d="M177.5 35l.5 -5l3 3.5M181.5 33.5l3 -4l1 4.5" fill="#1f1f24" />
      <path d="M163 44q-8 -2 -6 -12" stroke="#1f1f24" strokeWidth="2.2" fill="none" strokeLinecap="round" className="season-tail" />
      <circle cx="180" cy="37.6" r=".9" fill="#ffd23f" />
      <circle cx="183.4" cy="37.6" r=".9" fill="#ffd23f" />
    </g>
  </svg>
);

const BANNERS = {
  newyear: { fill: "#fff3c4", stroke: "#d4a017", ink: "#8a6410" },
  lovefriendship: { fill: "#ffe4ee", stroke: "#e8457a", ink: "#c2185b" },
  mothers: { fill: "#fde8f2", stroke: "#e07aa8", ink: "#b5487e" },
  fathers: { fill: "#e4eeff", stroke: "#2f6fd6", ink: "#1d3f9a" },
};

const Airplane = () => (
  <g>
    <path d="M250 30Q290 21 314 32Q290 41 250 36z" fill="#e53a4e" />
    <path d="M276 32L264 52L282 52L292 33z" fill="#b1122a" />
    <path d="M252 31L242 16L256 20L264 30z" fill="#b1122a" />
    <circle cx="296" cy="30" r="2.6" fill="#cfe8ff" />
    <ellipse cx="315" cy="32" rx="1.6" ry="9" fill="#555" className="season-propeller" />
  </g>
);

const PaperPlane = () => (
  <g>
    <path d="M246 34L314 12L276 50z" fill="#ffffff" stroke="#2f6fd6" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M276 50L282 30L314 12" fill="#cfdcf7" stroke="#2f6fd6" strokeWidth="1.4" strokeLinejoin="round" />
  </g>
);

const WingedHeart = () => (
  <g>
    <path d="M276 30q-14 -16 -26 -8q8 2 10 8q-8 0 -12 6q12 2 24 -2z" fill="#fff" stroke="#f3b3c8" className="season-flap" />
    <path d={HEART} transform="translate(270 14) scale(1.7)" fill="#e8457a" />
    <path d="M296 30q14 -16 26 -8q-8 2 -10 8q8 0 12 6q-12 2 -24 -2z" fill="#fff" stroke="#f3b3c8" className="season-flap" />
  </g>
);

const Butterfly = ({ x, y, color, scale = 1, delay = "0s" }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <g className="season-flutter" style={{ "--d": delay }}>
      <ellipse cx="-7" cy="-5" rx="7" ry="9" fill={color} transform="rotate(-25)" />
      <ellipse cx="7" cy="-5" rx="7" ry="9" fill={color} transform="rotate(25)" />
      <ellipse cx="-5" cy="7" rx="4.5" ry="6" fill={color} opacity=".75" />
      <ellipse cx="5" cy="7" rx="4.5" ry="6" fill={color} opacity=".75" />
    </g>
    <rect x="-1.2" y="-9" width="2.4" height="20" rx="1.2" fill="#3a2a4a" />
  </g>
);

const BannerFlyer = ({ season, text }) => {
  const colors = BANNERS[season];
  const leaders = {
    newyear: <Airplane />,
    fathers: <PaperPlane />,
    lovefriendship: <WingedHeart />,
    mothers: (
      <>
        <Butterfly x={282} y={26} color="#f28cb8" scale={1.3} />
        <Butterfly x={308} y={44} color="#c9a0e8" scale={0.9} delay="-0.15s" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 330 70" className="season-flyer__art">
      <path d="M220 33L250 33" stroke={colors.stroke} strokeWidth="1.2" />
      <g className="season-banner">
        <path d="M20 18Q70 12 120 18T220 18V48Q170 54 120 48T20 48z" fill={colors.fill} stroke={colors.stroke} strokeWidth="2" />
        <text x="120" y="39" textAnchor="middle" fontFamily={BRAND_FONT} fontStyle="italic" fontWeight="700" fontSize="17" fill={colors.ink}>
          {text}
        </text>
      </g>
      <g className="season-bob" style={{ "--d": "0s" }}>
        {leaders[season]}
      </g>
    </svg>
  );
};

const CondorFlag = () => (
  <svg viewBox="0 -6 340 80" className="season-flyer__art">
    <path d="M224 40L262 40" stroke="#6b4f2a" strokeWidth="1.4" />
    <g className="season-banner">
      <path d="M24 20Q74 12 124 20T224 20V44Q174 52 124 44T24 44z" fill="#fcd116" />
      <path d="M24 44Q74 36 124 44T224 44V54Q174 62 124 54T24 54z" fill="#003893" />
      <path d="M24 54Q74 46 124 54T224 54V64Q174 72 124 64T24 64z" fill="#ce1126" />
      <text x="124" y="37" textAnchor="middle" fontFamily={BRAND_FONT} fontStyle="italic" fontWeight="700" fontSize="14" fill="#003893">
        ¡Viva Colombia!
      </text>
    </g>
    <g transform="translate(296 44) scale(1.15)">
      <g className="season-bob" style={{ "--d": "0s" }}>
        <path className="season-flap season-flap--wing" d="M0 -2Q-8 -18 -22 -30L-22 -25L-28 -27L-25 -22L-31 -23L-26 -17Q-14 -8 -4 0z" fill="#3a3a40" />
        <path d="M-22 2Q0 -6 22 0Q4 8 -22 6z" fill="#1f1f24" />
        <path d="M-22 2L-34 0L-34 8L-22 6z" fill="#1f1f24" />
        <g className="season-flap season-flap--wing">
          <path d="M-2 -2Q4 -18 18 -30L20 -26L25 -29L24 -24L29 -26L26 -20L31 -21Q20 -10 8 0z" fill="#1f1f24" />
          <path d="M2 -6Q10 -14 18 -21" stroke="#f4f4f4" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
        <ellipse cx="20" cy="-1" rx="5" ry="4" fill="#ffffff" />
        <circle cx="26" cy="-3.4" r="4" fill="#c9867a" />
        <path d="M29 -4.4l6 2q-2 3 -5 2z" fill="#e0c070" />
        <circle cx="27" cy="-4.4" r=".8" fill="#1a1a1a" />
      </g>
    </g>
  </svg>
);

const Flyer = ({ season }) => {
  if (season === "christmas") return <SantaSleigh />;
  if (season === "halloween") return <WitchBroom />;
  if (season === "independence") return <CondorFlag />;
  const text = {
    newyear: `¡Feliz ${newYearOf()}!`,
    lovefriendship: "Feliz Amor y Amistad",
    mothers: "¡Feliz día, mamá!",
    fathers: "¡Feliz día, papá!",
  }[season];
  return <BannerFlyer season={season} text={text} />;
};

/* ---------------------------------------------------------------------------------------------
   Adornos que cuelgan en la barra
   --------------------------------------------------------------------------------------------- */

const ORNAMENTS = {
  ball: (color) => (
    <>
      <rect x="9.5" y="0" width="5" height="4" rx="1" fill="#d4a017" />
      <circle cx="12" cy="14" r="10" fill={color} />
      <path d="M5 13q7 -5 14 0" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" fill="none" />
      <circle cx="8" cy="10" r="2.2" fill="#fff" opacity=".6" />
    </>
  ),
  star: (color) => <path d={STAR} fill={color} transform="translate(0 2)" />,
  cane: () => (
    <>
      <path d="M9 27V9a5 5 0 0 1 10 0" stroke="#fff" strokeWidth="4.4" fill="none" strokeLinecap="round" />
      <path d="M9 27V9a5 5 0 0 1 10 0" stroke="#d6182e" strokeWidth="4.4" fill="none" strokeDasharray="3 3" />
    </>
  ),
  bell: () => (
    <>
      <path d="M12 3q-7 1 -7 11v4h14v-4q0 -10 -7 -11z" fill="#f5c542" />
      <path d="M5 18h14" stroke="#c9971a" strokeWidth="2" />
      <circle cx="12" cy="21" r="2.4" fill="#c9971a" />
      <path d="M9 3q3 -3 6 0" stroke="#d6182e" strokeWidth="2" fill="none" />
    </>
  ),
  pumpkin: () => (
    <>
      <path d="M12 6q0 -4 3 -5" stroke="#3c7a2a" strokeWidth="2.2" fill="none" />
      <ellipse cx="7.5" cy="16" rx="6" ry="8.5" fill="#e8791b" />
      <ellipse cx="16.5" cy="16" rx="6" ry="8.5" fill="#e8791b" />
      <ellipse cx="12" cy="16" rx="6" ry="9" fill="#f5a623" />
      <path className="season-flicker" d="M7.5 13l2 2.6h-4zM16.5 13l2 2.6h-4zM7 19q5 3.4 10 0l-1.6 2-1.6-1.1-1.8 1.3-1.8-1.3-1.6 1.1z" fill="#ffd23f" />
    </>
  ),
  ghost: () => (
    <>
      <path d="M4 27V12a8 8 0 0 1 16 0V27l-2.7-3-2.7 3-2.6-3-2.7 3-2.6-3z" fill="#f4f1fa" />
      <ellipse cx="9" cy="12" rx="1.6" ry="2.3" fill="#2b0f45" />
      <ellipse cx="15" cy="12" rx="1.6" ry="2.3" fill="#2b0f45" />
      <ellipse cx="12" cy="18" rx="2" ry="2.6" fill="#2b0f45" />
    </>
  ),
  spider: () => (
    <g fill="currentColor" stroke="currentColor">
      <path d="M8 14l-6-3M8 17H2M8 20l-6 3M16 14l6-3M16 17h6M16 20l6 3" strokeWidth="1.4" fill="none" />
      <circle cx="12" cy="11" r="4.5" stroke="none" />
      <circle cx="12" cy="18" r="5.5" stroke="none" />
      <circle cx="10.4" cy="10" r="1" fill="#ff4d4d" stroke="none" />
      <circle cx="13.6" cy="10" r="1" fill="#ff4d4d" stroke="none" />
    </g>
  ),
  heart: (color) => <path d={HEART} fill={color} transform="translate(0 2)" />,
  envelope: () => (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" fill="#fff" stroke="#e8457a" />
      <path d="M2 8l10 7l10-7" stroke="#e8457a" fill="none" />
      <path d={HEART} transform="translate(8.4 12.4) scale(.3)" fill="#e8457a" />
    </>
  ),
  balloon: (color) => (
    <>
      <ellipse cx="12" cy="13" rx="8" ry="10" fill={color} />
      <path d="M10.5 23h3l-1.5 2.5z" fill={color} />
      <ellipse cx="9" cy="9" rx="2" ry="3" fill="#fff" opacity=".45" />
    </>
  ),
  clock: () => (
    <>
      <circle cx="12" cy="14" r="10" fill="#fff" stroke="#d4a017" strokeWidth="2.6" />
      <path d="M12 14V6.5M12 14l-.8-5" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="14" r="1.4" fill="#d6182e" />
    </>
  ),
  flower: (color) => (
    <>
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse key={angle} cx="12" cy="8" rx="3.6" ry="5.4" fill={color} transform={`rotate(${angle} 12 14)`} />
      ))}
      <circle cx="12" cy="14" r="3.2" fill="#ffd166" />
    </>
  ),
  tie: (color) => (
    <>
      <path d="M9 2h6l-1.5 4.5L17 21l-5 5-5-5 3.5-14.5z" fill={color} />
      <path d="M9 2h6l-1.5 4.5h-3z" fill="#000" opacity=".25" />
      <path d="M10 12l4 3M9.5 17l5 3" stroke="#fff" strokeOpacity=".5" strokeWidth="1.2" />
    </>
  ),
  medal: () => (
    <>
      <path d="M6 0l4 10h4l4-10z" fill="#2f6fd6" />
      <circle cx="12" cy="17" r="8" fill="#f5c542" stroke="#c9971a" strokeWidth="1.6" />
      <text x="12" y="21" textAnchor="middle" fontSize="10" fontWeight="800" fill="#8a6410">
        1
      </text>
    </>
  ),
  flag: () => (
    <>
      <path d="M4 0v27" stroke="#6b4f2a" strokeWidth="1.6" />
      <rect x="4.8" y="2" width="17" height="6" fill="#fcd116" />
      <rect x="4.8" y="8" width="17" height="3" fill="#003893" />
      <rect x="4.8" y="11" width="17" height="3" fill="#ce1126" />
    </>
  ),
};

const HANGERS = {
  christmas: [["ball", "#d6182e"], ["star", "#f5c542"], ["cane"], ["ball", "#1f8a4c"], ["bell"], ["ball", "#2f6fd6"], ["star", "#f5c542"], ["cane"], ["ball", "#d4a017"]],
  halloween: [["pumpkin"], ["spider"], ["ghost"], ["pumpkin"], ["spider"], ["ghost"], ["pumpkin"], ["spider"], ["ghost"]],
  newyear: [["star", "#d4a017"], ["balloon", "#d4a017"], ["clock"], ["balloon", "#c0c0c8"], ["star", "#f5c542"], ["balloon", "#e53a4e"], ["clock"], ["balloon", "#d4a017"], ["star", "#d4a017"]],
  lovefriendship: [["heart", "#e8457a"], ["envelope"], ["balloon", "#ff8fb1"], ["heart", "#d6182e"], ["envelope"], ["heart", "#ff8fb1"], ["balloon", "#e8457a"], ["envelope"], ["heart", "#e8457a"]],
  mothers: [["flower", "#f28cb8"], ["heart", "#e07aa8"], ["flower", "#c9a0e8"], ["balloon", "#f28cb8"], ["flower", "#ff8a8a"], ["heart", "#c9a0e8"], ["flower", "#f28cb8"], ["balloon", "#c9a0e8"], ["flower", "#ffb3c8"]],
  fathers: [["tie", "#2f6fd6"], ["star", "#f5c542"], ["medal"], ["tie", "#d6182e"], ["star", "#2f6fd6"], ["tie", "#1f8a4c"], ["medal"], ["star", "#f5c542"], ["tie", "#2f6fd6"]],
  independence: [["flag"], ["star", "#fcd116"], ["balloon", "#003893"], ["flag"], ["balloon", "#ce1126"], ["star", "#fcd116"], ["flag"], ["balloon", "#fcd116"], ["flag"]],
};

const STRING_LENGTHS = [12, 30, 18, 36, 14, 26, 20, 34, 16];

/** Barra de arriba con el espíritu de la temporada: adornos colgando y el viajero que la cruza. */
export const SeasonSky = ({ variant = "app" }) => {
  const { shown } = useSeason();
  if (!shown) return null;
  return (
    <div className={`season-sky season-sky--${variant} season-sky--${shown}`} aria-hidden="true">
      {/* En NexStore el buscador ocupa el centro de la barra: ahí solo pasa el viajero */}
      {variant === "app" && (
        <div className="season-hangers">
          {HANGERS[shown].map(([kind, color], index) => (
            <span key={index} className="season-hanger" style={{ "--len": `${STRING_LENGTHS[index]}px`, "--i": index }}>
              <svg viewBox="0 0 24 28">{ORNAMENTS[kind](color)}</svg>
            </span>
          ))}
        </div>
      )}
      <div className="season-flyer">
        <Flyer season={shown} />
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------------------------------------
   Escenas grandes
   --------------------------------------------------------------------------------------------- */

const ChristmasScene = () => (
  <>
    <path d="M0 150Q60 132 118 146Q176 160 240 140V190H0z" className="season-scene__snow" />
    {/* Árbol */}
    <rect x="144" y="138" width="12" height="16" fill="#7a4b1e" />
    <path d="M150 44L116 96H184z" fill="#2a9a58" />
    <path d="M150 66L108 124H192z" fill="#1f8a4c" />
    <path d="M150 90L100 150H200z" fill="#1b6b3a" />
    <path d="M124 92Q150 104 178 90M114 120Q150 134 188 118M106 146Q150 158 196 144" stroke="#f5c542" strokeWidth="1.6" fill="none" />
    {[
      [138, 84, "#e53a4e"], [162, 80, "#4f8df5"], [150, 98, "#f5c542"], [126, 112, "#2ecc71"], [174, 112, "#e53a4e"], [150, 122, "#4f8df5"],
      [116, 138, "#f5c542"], [140, 140, "#e53a4e"], [164, 142, "#2ecc71"], [186, 136, "#f5c542"],
    ].map(([cx, cy, fill], index) => (
      <circle key={index} cx={cx} cy={cy} r="3.4" fill={fill} className="season-blink" style={{ "--d": `${(index % 4) * -0.45}s` }} />
    ))}
    <path d={STAR} transform="translate(137 26) scale(1.1)" fill="#f5c542" className="season-shine" />
    {/* Regalos */}
    <rect x="98" y="138" width="26" height="22" rx="2" fill="#d6182e" />
    <path d="M111 138v22M98 149h26" stroke="#f5c542" strokeWidth="3" />
    <path d="M111 138q-8 -9 -10 -2q4 3 10 2q8 -9 10 -2q-4 3 -10 2" fill="none" stroke="#f5c542" strokeWidth="2" />
    <rect x="182" y="142" width="26" height="18" rx="2" fill="#2f6fd6" />
    <path d="M195 142v18M182 151h26" stroke="#fff" strokeWidth="3" />
    <rect x="160" y="150" width="20" height="12" rx="2" fill="#f5c542" />
    <path d="M170 150v12" stroke="#d6182e" strokeWidth="2.6" />
    {/* Muñeco de nieve */}
    <g className="season-sway" style={{ "--d": "0s" }}>
      <circle cx="50" cy="142" r="22" className="season-scene__snowball" />
      <circle cx="50" cy="110" r="16" className="season-scene__snowball" />
      <circle cx="50" cy="84" r="12" className="season-scene__snowball" />
      <path d="M36 108L16 96M64 108L84 94" stroke="#7a4b1e" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M20 98l-4 -6M80 96l4 -6" stroke="#7a4b1e" strokeWidth="2" strokeLinecap="round" />
      <circle cx="45.5" cy="81" r="1.8" fill="#1a1a1a" />
      <circle cx="54.5" cy="81" r="1.8" fill="#1a1a1a" />
      <path d="M50 85l11 2.5l-11 2z" fill="#f28c28" />
      <path d="M44 90q6 4 12 0" stroke="#1a1a1a" strokeWidth="1.4" fill="none" strokeDasharray="1.5 2" />
      <path d="M37 95q13 6 26 0v5q-13 6 -26 0z" fill="#d6182e" />
      <path d="M56 99l4 16l6 -2l-4 -14z" fill="#d6182e" />
      <circle cx="50" cy="106" r="2" fill="#1a1a1a" />
      <circle cx="50" cy="115" r="2" fill="#1a1a1a" />
      <rect x="36" y="70" width="28" height="4" rx="2" fill="#1f1f24" />
      <rect x="41" y="54" width="18" height="17" rx="2" fill="#1f1f24" />
      <rect x="41" y="64" width="18" height="4" fill="#d6182e" />
    </g>
  </>
);

const HalloweenScene = () => (
  <>
    <circle cx="186" cy="42" r="30" fill="#fdf1c7" opacity=".25" className="season-shine" />
    <circle cx="186" cy="42" r="24" fill="#fdf1c7" />
    <circle cx="178" cy="36" r="4" fill="#efdfa8" />
    <circle cx="194" cy="50" r="3" fill="#efdfa8" />
    <Bat x={160} y={30} scale={1.3} />
    <Bat x={206} y={60} scale={0.9} delay="-0.2s" />
    <path d="M0 158Q60 140 120 152Q180 164 240 146V190H0z" fill="#2b0f45" />
    {/* Lápida */}
    <path d="M18 160V124a18 18 0 0 1 36 0V160z" fill="#8a8398" />
    <text x="36" y="138" textAnchor="middle" fontSize="11" fontWeight="800" fill="#4a4458">
      RIP
    </text>
    {/* Calabazas */}
    {[
      [94, 150, 1.25],
      [146, 158, 0.85],
    ].map(([x, y, scale], index) => (
      <g key={index} transform={`translate(${x} ${y}) scale(${scale})`}>
        <path d="M0 -20q0 -8 6 -10" stroke="#3c7a2a" strokeWidth="3.4" fill="none" />
        <ellipse cx="-11" cy="0" rx="12" ry="17" fill="#e8791b" />
        <ellipse cx="11" cy="0" rx="12" ry="17" fill="#e8791b" />
        <ellipse cx="0" cy="0" rx="12" ry="18" fill="#f5a623" />
        <path className="season-flicker" style={{ "--d": `${index * -0.3}s` }} d="M-11 -6l5 6h-10zM11 -6l5 6h-10zM-13 6q13 9 26 0l-3 5-3.5-2.4-3.5 3-3.5-3-3.5 2.4z" fill="#ffd23f" />
      </g>
    ))}
    {/* Fantasma */}
    <g className="season-float" style={{ "--d": "0s" }}>
      <path d="M176 140V104a22 22 0 0 1 44 0V140l-7.3-8-7.3 8-7.4-8-7.3 8-7.4-8z" fill="#f4f1fa" />
      <ellipse cx="190" cy="104" rx="3.6" ry="5" fill="#2b0f45" />
      <ellipse cx="206" cy="104" rx="3.6" ry="5" fill="#2b0f45" />
      <ellipse cx="198" cy="118" rx="4.4" ry="5.6" fill="#2b0f45" />
      <path d="M176 116q-10 -2 -12 -12M220 116q10 -2 12 -12" stroke="#f4f1fa" strokeWidth="6" strokeLinecap="round" fill="none" />
    </g>
  </>
);

const Burst = ({ x, y, color, delay }) => (
  <g transform={`translate(${x} ${y})`}>
    <g className="season-pop" style={{ "--d": delay }}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <path key={angle} d="M0 -6V-18" stroke={color} strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${angle})`} />
      ))}
      <circle r="3" fill={color} />
    </g>
  </g>
);

const NewYearScene = () => (
  <>
    <Burst x={40} y={34} color="#f5c542" delay="0s" />
    <Burst x={124} y={22} color="#e53a4e" delay="-0.8s" />
    <Burst x={206} y={40} color="#4f8df5" delay="-1.6s" />
    {/* Reloj */}
    <circle cx="58" cy="96" r="30" fill="#fffaf0" stroke="#d4a017" strokeWidth="5" />
    {Array.from({ length: 12 }, (_, index) => (
      <path key={index} d="M58 70v4" stroke="#8a6410" strokeWidth="2" transform={`rotate(${index * 30} 58 96)`} />
    ))}
    <path d="M58 96V76M58 96V80" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
    <circle cx="58" cy="96" r="3" fill="#d6182e" />
    {/* Copas */}
    <g className="season-clink">
      <path d="M118 96h24l-3 22q-1 8 -9 8t-9 -8z" fill="#fff8dc" opacity=".55" stroke="#d4a017" strokeWidth="1.6" />
      <path d="M120 106h20l-1.6 12q-1 6 -8.4 6t-8.4 -6z" fill="#f5c542" />
      <path d="M130 126v24M120 152h20" stroke="#d4a017" strokeWidth="2.4" strokeLinecap="round" />
    </g>
    <g className="season-clink season-clink--right">
      <path d="M150 96h24l-3 22q-1 8 -9 8t-9 -8z" fill="#fff8dc" opacity=".55" stroke="#d4a017" strokeWidth="1.6" />
      <path d="M152 106h20l-1.6 12q-1 6 -8.4 6t-8.4 -6z" fill="#f5c542" />
      <path d="M162 126v24M152 152h20" stroke="#d4a017" strokeWidth="2.4" strokeLinecap="round" />
    </g>
    {[124, 134, 158, 166].map((cx, index) => (
      <circle key={cx} cx={cx} cy="118" r="1.6" fill="#fff" className="season-bubble" style={{ "--d": `${index * -0.5}s` }} />
    ))}
    {/* Botella */}
    <path d="M204 160V118q0 -10 6 -16V86h10v16q6 6 6 16V160z" fill="#1f5c3a" />
    <rect x="208" y="122" width="14" height="18" rx="2" fill="#f5c542" />
    <rect x="210" y="76" width="10" height="10" rx="2" fill="#c9971a" className="season-cork" />
    <text x="120" y="178" textAnchor="middle" fontFamily={BRAND_FONT} fontStyle="italic" fontWeight="700" fontSize="18" fill="#d4a017">
      ¡Feliz {newYearOf()}!
    </text>
  </>
);

const LoveScene = () => (
  <>
    {[
      [150, 40, "#e8457a", "0s"],
      [182, 30, "#ff8fb1", "-0.7s"],
      [208, 52, "#d6182e", "-1.4s"],
    ].map(([x, y, fill, delay], index) => (
      <g key={index} className="season-sway" style={{ "--d": delay }}>
        <path d={`M${x + 12} ${y + 21}Q${x + 6} 100 190 132`} stroke="#c9a0b4" strokeWidth="1" fill="none" />
        <path d={HEART} transform={`translate(${x} ${y}) scale(1.4)`} fill={fill} />
      </g>
    ))}
    {/* Oso */}
    <g className="season-sway" style={{ "--d": "-0.3s" }}>
      <circle cx="44" cy="96" r="9" fill="#8b5a2b" />
      <circle cx="84" cy="96" r="9" fill="#8b5a2b" />
      <circle cx="44" cy="96" r="4.5" fill="#c79a63" />
      <circle cx="84" cy="96" r="4.5" fill="#c79a63" />
      <ellipse cx="64" cy="146" rx="28" ry="26" fill="#8b5a2b" />
      <circle cx="64" cy="108" r="22" fill="#8b5a2b" />
      <ellipse cx="64" cy="116" rx="10" ry="7.5" fill="#c79a63" />
      <ellipse cx="64" cy="112" rx="3.6" ry="2.6" fill="#3a2410" />
      <circle cx="56" cy="102" r="2.2" fill="#1a1a1a" />
      <circle cx="72" cy="102" r="2.2" fill="#1a1a1a" />
      <g className="season-beat">
        <path d={HEART} transform="translate(46 126) scale(1.5)" fill="#d6182e" />
      </g>
      <ellipse cx="44" cy="168" rx="11" ry="7" fill="#7a4b1e" />
      <ellipse cx="84" cy="168" rx="11" ry="7" fill="#7a4b1e" />
    </g>
    {/* Carta */}
    <rect x="160" y="140" width="50" height="34" rx="3" fill="#fff" stroke="#e8457a" strokeWidth="1.6" />
    <path d="M160 142l25 18l25 -18" stroke="#e8457a" strokeWidth="1.6" fill="none" />
    <path d={HEART} transform="translate(178 152) scale(.6)" fill="#e8457a" />
  </>
);

const MothersScene = () => (
  <>
    <Butterfly x={40} y={40} color="#f28cb8" scale={1.4} />
    <Butterfly x={200} y={30} color="#c9a0e8" scale={1.1} delay="-0.2s" />
    {/* Ramo */}
    {[
      [96, 60, "#f28cb8"], [120, 46, "#ff6b8a"], [144, 58, "#c9a0e8"], [108, 80, "#ffb3c8"], [134, 78, "#f28cb8"],
    ].map(([x, y, color], index) => (
      <g key={index} className="season-sway" style={{ "--d": `${index * -0.35}s` }}>
        <path d={`M${x} ${y + 8}Q${(x + 120) / 2} 120 120 140`} stroke="#3c8a3a" strokeWidth="2.4" fill="none" />
        <path d={`M${x - 9} ${y - 2}q3 14 9 14q6 0 9 -14q-4 4 -6 -2q-3 6 -3 6q0 0 -3 -6q-2 6 -6 2z`} fill={color} />
      </g>
    ))}
    <path d="M100 124h40l-6 18h-28z" fill="#e8457a" />
    <path d="M120 128l-8 -6l8 3l8 -3z" fill="#ffd166" />
    <path d="M96 140h48l-8 36h-32z" fill="#d6688f" />
    <text x="120" y="164" textAnchor="middle" fontFamily={BRAND_FONT} fontStyle="italic" fontWeight="700" fontSize="13" fill="#fff">
      Mamá
    </text>
    <g className="season-beat">
        <path d={HEART} transform="translate(176 120) scale(1.6)" fill="#e07aa8" />
      </g>
    <g className="season-beat" style={{ "--d": "-0.5s" }}>
        <path d={HEART} transform="translate(30 130) scale(1.1)" fill="#c9a0e8" />
      </g>
  </>
);

const FathersScene = () => (
  <>
    {/* Taza */}
    {[64, 76, 88].map((x, index) => (
      <path key={x} d={`M${x} 92q-6 -10 0 -18t0 -18`} stroke="#b8c4d6" strokeWidth="2.4" fill="none" strokeLinecap="round" className="season-steam" style={{ "--d": `${index * -0.6}s` }} />
    ))}
    <path d="M44 100h56v46q0 14 -14 14h-28q-14 0 -14 -14z" fill="#2f6fd6" />
    <path d="M100 110q18 0 18 16t-18 16" stroke="#2f6fd6" strokeWidth="6" fill="none" />
    <text x="72" y="134" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">
      PAPÁ
    </text>
    {/* Trofeo */}
    <path d="M150 60h44v20q0 22 -22 22t-22 -22z" fill="#f5c542" />
    <path d="M150 66q-14 0 -12 12q2 8 12 8M194 66q14 0 12 12q-2 8 -12 8" stroke="#f5c542" strokeWidth="4" fill="none" />
    <rect x="166" y="102" width="12" height="20" fill="#d4a017" />
    <rect x="154" y="122" width="36" height="10" rx="2" fill="#8a6410" />
    <text x="172" y="88" textAnchor="middle" fontSize="16" fontWeight="800" fill="#8a6410">
      #1
    </text>
    <path d={STAR} transform="translate(196 36) scale(.8)" fill="#f5c542" className="season-shine" />
    <path d={STAR} transform="translate(134 30) scale(.55)" fill="#2f6fd6" className="season-shine" style={{ "--d": "-0.8s" }} />
    <text x="120" y="178" textAnchor="middle" fontFamily={BRAND_FONT} fontStyle="italic" fontWeight="700" fontSize="16" fill="#2f6fd6">
      ¡Feliz día, papá!
    </text>
  </>
);

const IndependenceScene = () => (
  <>
    <path d="M40 176V30" stroke="#6b4f2a" strokeWidth="4" strokeLinecap="round" />
    <circle cx="40" cy="28" r="4" fill="#d4a017" />
    <g className="season-wave-flag">
      <path d="M42 34Q73 26 104 34T166 34V62Q135 70 104 62T42 62z" fill="#fcd116" />
      <path d="M42 62Q73 54 104 62T166 62V76Q135 84 104 76T42 76z" fill="#003893" />
      <path d="M42 76Q73 68 104 76T166 76V90Q135 98 104 90T42 90z" fill="#ce1126" />
    </g>
    {/* Sombrero vueltiao */}
    <ellipse cx="160" cy="150" rx="62" ry="15" fill="#f3ead2" />
    <ellipse cx="160" cy="150" rx="62" ry="15" fill="none" stroke="#1a1a1a" strokeWidth="2.4" strokeDasharray="5 4" />
    <ellipse cx="160" cy="150" rx="46" ry="10" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeDasharray="4 4" />
    <path d="M136 148q0 -30 24 -30t24 30z" fill="#f3ead2" />
    <path d="M138 138h44M140 128h40" stroke="#1a1a1a" strokeWidth="2.2" strokeDasharray="4 3" />
    {[[90, 120], [120, 104], [214, 112]].map(([x, y], index) => (
      <path key={index} d={STAR} transform={`translate(${x} ${y}) scale(.6)`} fill="#fcd116" className="season-shine" style={{ "--d": `${index * -0.6}s` }} />
    ))}
    <text x="120" y="182" textAnchor="middle" fontFamily={BRAND_FONT} fontStyle="italic" fontWeight="700" fontSize="16" fill="#003893" className="season-scene__ink">
      ¡Viva Colombia!
    </text>
  </>
);

const SCENES = {
  christmas: ChristmasScene,
  halloween: HalloweenScene,
  newyear: NewYearScene,
  lovefriendship: LoveScene,
  mothers: MothersScene,
  fathers: FathersScene,
  independence: IndependenceScene,
};

/** Escena grande de la temporada (debajo del menú, en NexStore y en el inicio de sesión). */
export const SeasonScene = ({ variant = "menu" }) => {
  const { shown } = useSeason();
  if (!shown) return null;
  const Scene = SCENES[shown];
  return (
    <svg className={`season-scene season-scene--${variant} season-scene--${shown}`} viewBox="0 0 240 190" aria-hidden="true">
      <Scene />
    </svg>
  );
};
