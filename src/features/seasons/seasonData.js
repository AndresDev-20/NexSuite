/*
 * Diseños de temporada (Fase 25, docs/PLAN-TEMPORADAS.md): qué trae cada una. La temporada activa la
 * decide el servidor (por la fecha de Colombia o la que fuerce el Developer); aquí está cómo se ve,
 * cómo saluda y qué dice NexStore.
 *
 * particles: la forma que cae, flota o vuela (SeasonDecor). La canción de cada una está en seasonMusic.js.
 */

export const SEASONS = {
  christmas: {
    name: "Navidad",
    particles: "snow",
    greeting: (name) => ({ title: `¡Jo, jo, jo! Bienvenido${name ? `, ${name}` : ""}`, text: "¡Feliz Navidad! Que estas fiestas vengan llenas de ventas y alegría." }),
    slide: { eyebrow: "Temporada de Navidad", title: "¡Feliz Navidad!", text: "Encuentra el regalo perfecto y pídelo por WhatsApp en segundos." },
  },
  newyear: {
    name: "Año Nuevo",
    particles: "fireworks",
    greeting: (name) => ({ title: `¡Feliz año nuevo${name ? `, ${name}` : ""}!`, text: "Que este año vendamos mucho y cumplamos todas las metas." }),
    slide: { eyebrow: "Año nuevo", title: "¡Feliz año nuevo!", text: "Empieza el año con lo que te gusta. Arma tu pedido y envíalo por WhatsApp." },
  },
  halloween: {
    name: "Halloween",
    particles: "bats",
    greeting: (name) => ({ title: `Bienvenido${name ? `, ${name}` : ""}… si te atreves`, text: "¡Feliz Halloween! Esta semana los precios dan miedo… de lo buenos." }),
    slide: { eyebrow: "Semana de Halloween", title: "¡Feliz Halloween!", text: "Precios que dan miedo de lo buenos. Pide por WhatsApp, si te atreves." },
  },
  lovefriendship: {
    name: "Amor y Amistad",
    particles: "hearts",
    greeting: (name) => ({ title: `Bienvenido${name ? `, ${name}` : ""}`, text: "¡Feliz amor y amistad! El mejor momento para sorprender a quien quieres." }),
    slide: { eyebrow: "Amor y Amistad", title: "Regala algo especial", text: "Sorprende a tu pareja o a tu amigo secreto. Pídelo por WhatsApp." },
  },
  mothers: {
    name: "Día de la Madre",
    particles: "petals",
    greeting: (name) => ({ title: "¡Feliz día a todas las mamás!", text: `Bienvenido${name ? `, ${name}` : ""}. Una semana para consentirlas.` }),
    slide: { eyebrow: "Día de la Madre", title: "Para la mejor mamá", text: "Encuentra su regalo y pídelo por WhatsApp en segundos." },
  },
  fathers: {
    name: "Día del Padre",
    particles: "stars",
    greeting: (name) => ({ title: "¡Feliz día a todos los papás!", text: `Bienvenido${name ? `, ${name}` : ""}. Una semana para celebrarlos.` }),
    slide: { eyebrow: "Día del Padre", title: "Para el mejor papá", text: "Lo que le gusta, con garantía. Pídelo por WhatsApp." },
  },
  independence: {
    name: "Independencia",
    particles: "confetti",
    greeting: (name) => ({ title: `¡Feliz día de la independencia${name ? `, ${name}` : ""}!`, text: "¡Viva Colombia! Una semana para celebrar lo nuestro." }),
    slide: { eyebrow: "20 de julio", title: "¡Viva Colombia!", text: "Celebra la independencia con lo que te gusta. Pídelo por WhatsApp." },
  },
};

export const SEASON_KEYS = Object.keys(SEASONS);

/** El resto del año: saludo según la hora, sin voz. */
export const normalGreeting = (name, hour = new Date().getHours()) => ({
  title: `${hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches"}${name ? `, ${name}` : ""}`,
  text: "Que tengas un gran día de ventas.",
});

