/*
 * Canción corta de cada temporada al entrar (Fase 25): 10 a 15 segundos, tocada en vivo por el navegador
 * (Web Audio), sin archivos, sin librerías y sin costo. Melodías de dominio público o compuestas para
 * NexSuite (nada con derechos de autor):
 *   Navidad «Jingle Bells» con cascabeles · Halloween la Tocata en re menor de Bach en órgano, con trueno ·
 *   Año Nuevo «Auld Lang Syne» con campanas · Amor y Amistad «Para Elisa» en caja de música · Madre la
 *   canción de cuna de Brahms · Padre una fanfarria con marcha · Independencia una cumbia con flauta.
 * Los navegadores solo dejan sonar después de un toque en la página (Ingresar, el primer toque en NexStore).
 */

const MAX_SECONDS = 15;

/** ¿Puede sonar? El navegador tiene audio, este equipo no la apagó ni pidió animaciones reducidas. */
export const canPlayMusic = (preferences) =>
  typeof window !== "undefined" &&
  Boolean(window.AudioContext || window.webkitAudioContext) &&
  preferences.voice !== "off" &&
  preferences.motion !== "reduced" &&
  !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// "C#5" → frecuencia
const SEMITONES = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
const freqOf = (note) => {
  const [, letter, accidental, octave] = /^([A-G])([#b]?)(\d)$/.exec(note);
  const semis = SEMITONES[letter] + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0) + (Number(octave) - 4) * 12;
  return 440 * 2 ** (semis / 12);
};

/* ---------- Instrumentos ---------- */

const envelope = (ctx, gain, t, { attack = 0.01, peak = 1, sustain = 0.7, hold, release = 0.12 }) => {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  if (hold === undefined) return;
  gain.gain.exponentialRampToValueAtTime(Math.max(peak * sustain, 0.0001), t + attack + 0.08);
  gain.gain.setValueAtTime(Math.max(peak * sustain, 0.0001), t + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + hold + release);
};

const osc = (ctx, type, frequency, t, stop, destination) => {
  const node = ctx.createOscillator();
  node.type = type;
  node.frequency.setValueAtTime(frequency, t);
  node.connect(destination);
  node.start(t);
  node.stop(stop);
  return node;
};

const noiseOf = (ctx) => {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
};

const noise = (e, t, length, { type = "highpass", frequency = 6000, q = 0.7, peak = 0.3, decay = 0.1 }) => {
  const source = e.ctx.createBufferSource();
  source.buffer = e.noise;
  const filter = e.ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  const gain = e.ctx.createGain();
  gain.gain.setValueAtTime(peak, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  source.connect(filter).connect(gain).connect(e.bus);
  source.start(t);
  source.stop(t + Math.max(length, decay) + 0.05);
};

// Cada instrumento: (motor, frecuencia, inicio, duración, fuerza)
const INSTRUMENTS = {
  // Campana: armónicos que suenan y se apagan despacio
  bell: (e, f, t, d, v) => {
    [
      [1, 0.6],
      [2, 0.25],
      [3.01, 0.12],
      [4.2, 0.06],
    ].forEach(([ratio, level]) => {
      const gain = e.ctx.createGain();
      gain.connect(e.bus);
      envelope(e.ctx, gain, t, { attack: 0.004, peak: level * v });
      gain.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.1);
      osc(e.ctx, "sine", f * ratio, t, t + d + 1.2, gain);
    });
  },
  // Caja de música: brillante y corta
  musicbox: (e, f, t, d, v) => {
    [
      [1, 0.55],
      [3, 0.12],
      [6, 0.04],
    ].forEach(([ratio, level]) => {
      const gain = e.ctx.createGain();
      gain.connect(e.bus);
      envelope(e.ctx, gain, t, { attack: 0.003, peak: level * v });
      gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(d, 0.3) + 0.9);
      osc(e.ctx, ratio === 1 ? "triangle" : "sine", f * ratio, t, t + d + 1, gain);
    });
  },
  // Órgano de iglesia: tubos en octavas, sostenido
  organ: (e, f, t, d, v) => {
    const filter = e.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2600;
    const gain = e.ctx.createGain();
    filter.connect(gain).connect(e.bus);
    envelope(e.ctx, gain, t, { attack: 0.03, peak: 0.16 * v, sustain: 0.9, hold: d, release: 0.25 });
    [
      ["sawtooth", 1],
      ["square", 0.5],
      ["sawtooth", 2],
    ].forEach(([type, ratio]) => osc(e.ctx, type, f * ratio, t, t + d + 0.4, filter));
  },
  // Trompeta: el filtro se abre al soplar
  brass: (e, f, t, d, v) => {
    const filter = e.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.exponentialRampToValueAtTime(3200, t + 0.06);
    filter.frequency.exponentialRampToValueAtTime(1600, t + 0.25);
    const gain = e.ctx.createGain();
    filter.connect(gain).connect(e.bus);
    envelope(e.ctx, gain, t, { attack: 0.035, peak: 0.2 * v, sustain: 0.75, hold: d, release: 0.1 });
    osc(e.ctx, "sawtooth", f, t, t + d + 0.2, filter);
    osc(e.ctx, "sawtooth", f * 1.004, t, t + d + 0.2, filter);
  },
  // Flauta (gaita): suave con vibrato
  flute: (e, f, t, d, v) => {
    const gain = e.ctx.createGain();
    gain.connect(e.bus);
    envelope(e.ctx, gain, t, { attack: 0.05, peak: 0.32 * v, sustain: 0.8, hold: d, release: 0.08 });
    const tone = osc(e.ctx, "sine", f, t, t + d + 0.15, gain);
    const lfo = e.ctx.createOscillator();
    const depth = e.ctx.createGain();
    lfo.frequency.value = 5.5;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(f * 0.012, t + 0.2);
    lfo.connect(depth).connect(tone.frequency);
    lfo.start(t);
    lfo.stop(t + d + 0.15);
    const breath = e.ctx.createGain();
    breath.gain.value = 0.08;
    breath.connect(gain);
    osc(e.ctx, "triangle", f * 2, t, t + d + 0.15, breath);
  },
  bass: (e, f, t, d, v) => {
    const gain = e.ctx.createGain();
    gain.connect(e.bus);
    envelope(e.ctx, gain, t, { attack: 0.01, peak: 0.34 * v, sustain: 0.55, hold: d, release: 0.1 });
    osc(e.ctx, "triangle", f, t, t + d + 0.2, gain);
  },
};

const PERCUSSION = {
  sleigh: (e, t, v = 1) => noise(e, t, 0.15, { frequency: 7500, peak: 0.16 * v, decay: 0.14 }),
  shaker: (e, t, v = 1) => noise(e, t, 0.08, { type: "bandpass", frequency: 5000, q: 1.2, peak: 0.12 * v, decay: 0.06 }),
  snare: (e, t, v = 1) => noise(e, t, 0.2, { type: "bandpass", frequency: 2200, q: 0.8, peak: 0.22 * v, decay: 0.16 }),
  crash: (e, t, v = 1) => noise(e, t, 1.4, { frequency: 4000, peak: 0.2 * v, decay: 1.3 }),
  thunder: (e, t, v = 1) => noise(e, t, 2.6, { type: "lowpass", frequency: 300, q: 0.5, peak: 0.9 * v, decay: 2.5 }),
  kick: (e, t, v = 1) => {
    const gain = e.ctx.createGain();
    gain.connect(e.bus);
    gain.gain.setValueAtTime(0.7 * v, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    const node = osc(e.ctx, "sine", 150, t, t + 0.3, gain);
    node.frequency.exponentialRampToValueAtTime(45, t + 0.15);
  },
};

/* ---------- Canciones (notas: [nota | [acorde] | "R", tiempos]) ---------- */

const repeat = (times, list) => Array.from({ length: times }, () => list).flat();

const JINGLE_A = [["E5", 1], ["E5", 1], ["E5", 2], ["E5", 1], ["E5", 1], ["E5", 2], ["E5", 1], ["G5", 1], ["C5", 1.5], ["D5", 0.5], ["E5", 4]];

const SONGS = {
  christmas: {
    beat: 0.215,
    parts: [
      {
        instrument: "bell",
        notes: [
          ...JINGLE_A,
          ["F5", 1], ["F5", 1], ["F5", 1.5], ["F5", 0.5], ["F5", 1], ["E5", 1], ["E5", 1], ["E5", 0.5], ["E5", 0.5],
          ["E5", 1], ["D5", 1], ["D5", 1], ["E5", 1], ["D5", 2], ["G5", 2],
          ...JINGLE_A,
          ["F5", 1], ["F5", 1], ["F5", 1.5], ["F5", 0.5], ["F5", 1], ["E5", 1], ["E5", 1], ["E5", 0.5], ["E5", 0.5],
          ["G5", 1], ["G5", 1], ["F5", 1], ["D5", 1], ["C5", 4],
        ],
      },
      {
        instrument: "bass",
        volume: 0.8,
        notes: [
          ...repeat(4, [["C3", 2], ["G2", 2]]), ["F2", 2], ["C3", 2], ["C3", 2], ["G2", 2], ["D3", 2], ["A2", 2], ["G2", 2], ["D3", 2],
          ...repeat(4, [["C3", 2], ["G2", 2]]), ["F2", 2], ["C3", 2], ["C3", 2], ["G2", 2], ["G2", 2], ["D3", 2], ["C3", 4],
        ],
      },
    ],
    // Cascabeles del trineo en cada tiempo, más suaves en el medio tiempo
    percussion: (e, t0, beat, beats) => {
      for (let b = 0; b < beats; b += 0.5) PERCUSSION.sleigh(e, t0 + b * beat, b % 1 === 0 ? 1 : 0.5);
    },
  },
  halloween: {
    beat: 0.2,
    parts: [
      {
        instrument: "organ",
        notes: [
          ["A5", 0.5], ["G5", 0.5], ["A5", 3], ["R", 1], ["G5", 0.5], ["F5", 0.5], ["E5", 0.5], ["D5", 0.5], ["C#5", 2], ["D5", 4], ["R", 1],
          ["A4", 0.5], ["G4", 0.5], ["A4", 3], ["R", 1], ["E4", 1], ["F4", 1], ["C#4", 1], ["D4", 4], ["R", 1],
          ["A3", 0.5], ["G3", 0.5], ["A3", 3], ["R", 1], ["G3", 0.5], ["F3", 0.5], ["E3", 0.5], ["D3", 0.5], ["C#3", 2], ["D3", 4],
          [["C#3", "E3", "G3", "A#3"], 6], [["D3", "F3", "A3", "D4"], 9],
        ],
      },
      { instrument: "organ", volume: 0.7, notes: [["R", 40], [["A1", "A2"], 6], [["D2", "D1"], 9]] },
    ],
    percussion: (e, t0) => PERCUSSION.thunder(e, t0),
  },
  newyear: {
    beat: 0.4,
    parts: [
      {
        instrument: "bell",
        notes: [
          ["C4", 1], ["F4", 1.5], ["F4", 0.5], ["F4", 1], ["A4", 1], ["G4", 1.5], ["F4", 0.5], ["G4", 1], ["A4", 0.5], ["G4", 0.5],
          ["F4", 1.5], ["F4", 0.5], ["A4", 1], ["C5", 1], ["D5", 3], ["D5", 1], ["C5", 1.5], ["A4", 0.5], ["A4", 1], ["F4", 1],
          ["G4", 1.5], ["F4", 0.5], ["G4", 1], ["A4", 0.5], ["G4", 0.5], ["F4", 1.5], ["D4", 0.5], ["D4", 1], ["C4", 1], ["F4", 3],
        ],
      },
      {
        instrument: "bass",
        notes: [["R", 1], ["F2", 2], ["F2", 2], ["C3", 2], ["C3", 2], ["F2", 2], ["F2", 2], ["A#2", 4], ["F2", 2], ["F2", 2], ["C3", 2], ["C3", 2], ["D3", 2], ["A#2", 2], ["F2", 3]],
      },
    ],
    // Pólvora al final
    percussion: (e, t0, beat, beats) => {
      PERCUSSION.crash(e, t0 + (beats - 3) * beat);
      [0, 0.18, 0.4, 0.55].forEach((delay, index) => INSTRUMENTS.bell(e, freqOf(["C6", "E6", "G6", "C7"][index]), t0 + (beats - 3) * beat + delay, 0.2, 0.5));
    },
  },
  lovefriendship: {
    beat: 0.24,
    parts: [
      {
        instrument: "musicbox",
        notes: [
          ["E5", 1], ["D#5", 1], ["E5", 1], ["D#5", 1], ["E5", 1], ["B4", 1], ["D5", 1], ["C5", 1], ["A4", 3],
          ["C4", 1], ["E4", 1], ["A4", 1], ["B4", 3], ["E4", 1], ["G#4", 1], ["B4", 1], ["C5", 3],
          ["E4", 1], ["E5", 1], ["D#5", 1], ["E5", 1], ["D#5", 1], ["E5", 1], ["B4", 1], ["D5", 1], ["C5", 1], ["A4", 3],
          ["C4", 1], ["E4", 1], ["A4", 1], ["B4", 3], ["E4", 1], ["C5", 1], ["B4", 1], ["A4", 4],
        ],
      },
      {
        instrument: "musicbox",
        volume: 0.6,
        notes: [
          ["R", 8], ["A2", 1], ["E3", 1], ["A3", 1], ["R", 3], ["E2", 1], ["E3", 1], ["G#3", 1], ["R", 3], ["A2", 1], ["E3", 1], ["A3", 1],
          ["R", 9], ["A2", 1], ["E3", 1], ["A3", 1], ["R", 3], ["E2", 1], ["E3", 1], ["G#3", 1], ["R", 3], ["A2", 4],
        ],
      },
    ],
  },
  mothers: {
    beat: 0.44,
    parts: [
      {
        instrument: "musicbox",
        notes: [
          ["E4", 0.5], ["E4", 0.5], ["G4", 2], ["E4", 0.5], ["E4", 0.5], ["G4", 2], ["E4", 0.5], ["G4", 0.5], ["C5", 1], ["B4", 1.5], ["A4", 0.5], ["A4", 1], ["G4", 1],
          ["D4", 0.5], ["E4", 0.5], ["F4", 1], ["D4", 1], ["D4", 0.5], ["E4", 0.5], ["F4", 2], ["D4", 0.5], ["F4", 0.5], ["B4", 0.5], ["A4", 0.5], ["G4", 1], ["B4", 1], ["C5", 3],
        ],
      },
      { instrument: "bass", volume: 0.6, notes: [["C3", 3], ["C3", 3], ["C3", 3], ["G2", 3], ["G2", 3], ["G2", 3], ["G2", 3], ["C3", 4]] },
    ],
  },
  fathers: {
    beat: 0.39,
    parts: [
      {
        instrument: "brass",
        notes: [
          ["G4", 0.5], ["C5", 0.5], ["E5", 0.5], ["G5", 1.5], ["E5", 0.5], ["G5", 2], ["R", 0.5], ["F5", 0.5], ["E5", 0.5], ["D5", 0.5], ["C5", 1], ["D5", 1], ["G4", 1.5],
          ["R", 0.5], ["G4", 0.5], ["C5", 0.5], ["E5", 0.5], ["G5", 1.5], ["A5", 0.5], ["G5", 1], ["F5", 1], ["E5", 0.5], ["F5", 0.5], ["G5", 1], ["E5", 1], ["C5", 1], ["D5", 1], [["C5", "E5", "G5"], 3],
        ],
      },
      { instrument: "bass", notes: [...repeat(7, [["C3", 1], ["G2", 1]]), ["C3", 1], ["G2", 1], ["F2", 1], ["G2", 1], ["C3", 1], ["G2", 1], ["G2", 1], ["G2", 1], ["C3", 3]] },
    ],
    // Marcha: bombo en 1 y 3, redoblante en 2 y 4
    percussion: (e, t0, beat, beats) => {
      for (let b = 0; b < beats - 3; b += 1) (b % 2 === 0 ? PERCUSSION.kick : PERCUSSION.snare)(e, t0 + b * beat);
      PERCUSSION.crash(e, t0 + (beats - 3) * beat, 0.8);
    },
  },
  independence: {
    beat: 0.36,
    parts: [
      {
        instrument: "flute",
        notes: [
          ["D5", 1], ["B4", 0.5], ["D5", 0.5], ["E5", 1], ["D5", 1], ["B4", 1], ["G4", 1], ["A4", 2], ["R", 1], ["A4", 0.5], ["B4", 0.5], ["C5", 1], ["B4", 1], ["A4", 1], ["F#4", 1], ["G4", 2],
          ["R", 1], ["D5", 1], ["B4", 0.5], ["D5", 0.5], ["G5", 1], ["F#5", 1], ["E5", 1], ["D5", 1], ["C5", 1], ["B4", 1], ["A4", 1], ["B4", 0.5], ["A4", 0.5], ["G4", 3],
        ],
      },
      { instrument: "bass", notes: [...repeat(4, [["G2", 1], ["D3", 1]]), ...repeat(2, [["D3", 1], ["A2", 1]]), ...repeat(2, [["G2", 1], ["D3", 1]]), ...repeat(2, [["G2", 1], ["D3", 1]]), ...repeat(2, [["C3", 1], ["G2", 1]]), ["D3", 1], ["A2", 1], ["D3", 1], ["A2", 1], ["G2", 3]] },
    ],
    // Cumbia: bombo en el tiempo y guacharaca «chi-ki-chi» en cada medio tiempo
    percussion: (e, t0, beat, beats) => {
      for (let b = 0; b < beats - 3; b += 0.5) {
        PERCUSSION.shaker(e, t0 + b * beat, b % 1 === 0 ? 1 : 0.6);
        if (b % 1 === 0) PERCUSSION.kick(e, t0 + b * beat, b % 2 === 0 ? 0.8 : 0.45);
      }
    },
  },
};

/* ---------- Motor ---------- */

const reverbOf = (ctx, seconds = 1.8) => {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.6;
  }
  return buffer;
};

let playing = null;

/** Para la canción (con un desvanecido corto). */
export const stopSeasonMusic = () => {
  if (!playing) return;
  const { ctx, master } = playing;
  playing = null;
  try {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    setTimeout(() => ctx.close(), 400);
  } catch {
    // ya estaba cerrada
  }
};

/** Toca la canción de la temporada. Devuelve cuántos segundos dura (0 si no pudo sonar). */
export const playSeasonMusic = (season) => {
  const song = SONGS[season];
  if (!song) return 0;
  try {
    stopSeasonMusic();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    ctx.resume?.();
    const master = ctx.createGain();
    master.gain.value = 0.42;
    const compressor = ctx.createDynamicsCompressor();
    master.connect(compressor).connect(ctx.destination);
    const bus = ctx.createGain();
    const reverb = ctx.createConvolver();
    reverb.buffer = reverbOf(ctx, season === "halloween" ? 3 : 1.8);
    const wet = ctx.createGain();
    wet.gain.value = season === "halloween" ? 0.45 : 0.22;
    bus.connect(master);
    bus.connect(reverb);
    reverb.connect(wet).connect(master);
    const engine = { ctx, bus, noise: noiseOf(ctx) };

    const t0 = ctx.currentTime + 0.08;
    const beats = Math.max(...song.parts.map((part) => part.notes.reduce((sum, [, length]) => sum + length, 0)));
    song.parts.forEach((part) => {
      let at = 0;
      part.notes.forEach(([note, length]) => {
        const start = t0 + at * song.beat;
        at += length;
        if (note === "R" || start - t0 > MAX_SECONDS) return;
        const duration = length * song.beat * (part.instrument === "organ" ? 1 : 0.92);
        (Array.isArray(note) ? note : [note]).forEach((each) => INSTRUMENTS[part.instrument](engine, freqOf(each), start, duration, part.volume ?? 1));
      });
    });
    song.percussion?.(engine, t0, song.beat, beats);

    // Nunca más de 15 segundos: se desvanece al final
    const seconds = Math.min(beats * song.beat + 1.2, MAX_SECONDS);
    master.gain.setValueAtTime(0.42, t0 + seconds - 1);
    master.gain.linearRampToValueAtTime(0, t0 + seconds);
    const current = { ctx, master };
    playing = current;
    setTimeout(() => {
      if (playing === current) playing = null;
      ctx.close().catch(() => {});
    }, (seconds + 0.5) * 1000);
    return seconds;
  } catch {
    return 0;
  }
};
