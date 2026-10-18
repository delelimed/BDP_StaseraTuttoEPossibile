// ============================================================
// app.js - Inizializzazione Firebase SDK v10 (modulare)
// Usa ENTRAMBI i database:
//   - Realtime Database  -> stato live (vista, gioco, frase, timer, audio)
//   - Cloud Firestore    -> dati persistenti (squadre, giochi, frasi)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getFirestore, collection, doc, getDocs, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);

// Realtime Database: aggiornamenti in tempo reale (bassa latenza)
export const db = getDatabase(app);

// Cloud Firestore: storage persistente di squadre e giochi
export const firestoreDb = getFirestore(app);

// Collezioni condivise dalle pagine (Controller, Gestione, Display)
export const teamsCollection = collection(firestoreDb, "teams");
export const gamesCollection = collection(firestoreDb, "games");

export { firebaseConfig };

// ------------------------------------------------------------------
// Giochi DEFAULT pre-caricati.
// Ogni gioco ha:
//   key         -> identificativo interno
//   label       -> nome mostrato
//   emoji       -> icona per le grafiche
//   explanation -> spiegazione proiettata sul display TV
//   phrases     -> frasi/parole opzionali (usabili con Prossimo/Casuale)
//
// Sono modificabili/eliminabili dal Controller e vengono salvati su
// Firestore: sono solo il punto di partenza al primo avvio.
// ------------------------------------------------------------------
export const DEFAULT_GAMES = [
  {
    key: "LABIALE",
    label: "Segui il labiale",
    emoji: "👄",
    explanation:
      "Un concorrente pronuncia una frase muovendo SOLO le labbra, senza emettere alcun suono. La sua squadra deve indovinare la frase esatta entro il tempo a disposizione. Vietato sussurrare o mimare con le mani!",
    phrases: [
      "HO FAME ANCHE QUANDO STO MANGIANDO.",
      "SONO ALLERGICO AI LUNEDÌ.",
      "HO DIMENTICATO COSA STAVO DIMENTICANDO.",
      "HO PARLATO DA SOLO E HO PERSO LA DISCUSSIONE.",
      "IN ESTATE MANGI PRUGNE, IN AUTUNNO CACHI.",
      "LE MIE SCARPE LITIGANO TRA LORO."
    ]
  },
  {
    key: "MIMO",
    label: "Rumori di mimo",
    emoji: "🎭",
    explanation:
      "Un concorrente riproduce con la voce (o con il corpo) un rumore o una situazione, senza dire parole. La squadra deve riconoscere cosa sta imitando prima che scada il tempo. Un rumore alla volta!",
    phrases: [
      "UN TELEFONO CHE SQUILLA CON VIBRAZIONE",
      "UN CANE CHE FA PIPI E ABBAIA",
      "IL TROMBETTISTA DELLA FANFARA CON IL FIATONE",
      "UN ELEFANTE CHE BEVE",
      "FUOCHI D'ARTIFICIO",
      "GATTO ARRABBIATO CHE SOFFIA E MIAGOLA",
      "SIRENA DELL'AMBULANZA CHE SI AVVICINA E SI ALLONTANA",
      "VENTO FORTISSIMO",
      "PATATINA SUPER CROCCANTE",
      "RUBINETTO CHE GOCCIOLA",
      "LAVATRICE CHE CENTRIFUGA VELOCISSIMA",
      "SCOIATTOLO CHE ROSICCHIA UNA NOCE",
      "CAVALLO CHE TROTTA",
      "TIZIO CHE SOFFIA PER GONFIARE UN PALLONCINO CHE POI SCOPPIA",
      "TARTARUGA CHE DÀ UN MORSO (LENTO MA DECISO)",
      "UNA MACCHINA CHE SUONA IL CLACSON",
      "BAMBINO CHE PIANGE MENTRE FA DEI PETI",
      "IL FUOCO ACCESSO",
      "ONDE DEL MARE"
    ]
  },
  {
    key: "ALPHABODY",
    label: "Alphabody",
    emoji: "🤸",
    explanation:
      "La squadra deve comporre la parola assegnata usando solo i corpi dei propri componenti, come una squadra acrobatica umana. Ogni lettera va rappresentata con il corpo: via libera alla fantasia!",
    phrases: ["HOTEL", "MORICONE", "FRATI", "FIORE", "PALLA", "CUORE", "ALBERO"]
  },
  {
    key: "TELEFONO",
    label: "Telefono difettoso",
    emoji: "📞",
    explanation:
      "La frase viene sussurrata di orecchio in orecchio attraverso la squadra. Più passaggi fa, più si deforma! L'ultimo componente deve dire ad alta voce quello che ha capito.",
    phrases: [
      "TANTO VA LA GATTA AL LARDO CHE CI LASCIA LO ZAMPINO",
      "LA GATTA FRETTOLOSA FECE I FIGLI CIECHI",
      "A CAVAL DONATO NON SI GUARDA IN BOCCA",
      "MEGLIO UN UOVO OGGI CHE UNA GALLINA DOMANI",
      "UNA MELA AL GIORNO TOGLIE IL MEDICO DI TORNO",
      "CHI VA PIANO VA SANO E VA LONTANO"
    ]
  },
  {
    key: "STEP_MARKET",
    label: "Lo Step Market",
    emoji: "🛒",
    explanation:
      "Un percorso a tappe con prove di abilità e velocità. Chi completa lo step nel minor tempo possibile porta punti preziosi alla propria squadra. Attenzione: ogni errore fa perdere secondi!",
    phrases: []
  },
  {
    key: "NE_SI_NE_NO",
    label: "Né Sì, né No",
    emoji: "🚫",
    explanation:
      "Vietato rispondere 'sì' o 'no'! Chi cade nella trappola prende una penalità. Si gioca veloci, uno contro uno: servono sangue freddo e parole alternative.",
    phrases: []
  },
  {
    key: "SPEED_QUIZ",
    label: "Speed Quiz",
    emoji: "⚡",
    explanation:
      "Domande lampo a raffica: la squadra deve rispondere al maggior numero di domande possibile nel tempo a disposizione. Velocità e prontezza fanno la differenza!",
    phrases: [
      "DIMMI 3 COSE PICCOLE PICCOLE",
      "DIMMI 3 COLORI LITURGICI",
      "DIMMI 3 LIBRI DELLA BIBBIA",
      "DIMMI 3 CANTI DI CHIESA",
      "DIMMI 3 SANTI",
      "DIMMI 3 COSE GRANDI GRANDI",
      "DIMMI 3 ANIMALI DI ACQUA",
      "DIMMI 3 COSE CHE SI POSSONO ROMPERE",
      "DIMMI 3 RIONI MENTANESI",
      "FAMMI 3 FACCE DISGUSTATE",
      "DIMMI 3 VERSI CHE FAI QUANDO SOLLEVI PESI",
      "DIMMI 3 BEVANDE FRIZZANTI",
      "DIMMI 3 COSE ARANCIONI",
      "DIMMI 3 NOMI DI EDUCATORI",
      "DIMMI 3 COSE CHE DIRESTI PER NON FARMELE DIRE",
      "DIMMI 3 COSE IN PLAYBACK",
      "DIMMI 3 COSE CHE SI TROVANO IN CUCINA",
      "DIMMI 3 COSE CHE SVEGLIANO",
      "DIMMI 3 PRETI CHE SONO STATI A MENTANA",
      "DIMMI 3 SUPERMERCATI MENTANESI",
      "DIMMI 3 COSE CHE INZUPPI NEL LATTE",
      "DIMMI 3 NOMI FEMMINILI CON LA S",
      "DIMMI 3 NOMI MASCHILI CON LA F",
      "DIMMI 3 COSE CHE SI TROVANO NEL SALONE DELLA PARROCCHIA",
      "FAMMI 3 VERSI DI ANIMALI",
      "DIMMI 3 COSE NON SI POSSONO CUCINARE",
      "DIMMI 3 COSE CHE NON METTERESTI IN LAVATRICE",
      "FAMMI 3 VERSI CHE FAI QUANDO SEI MALATO",
      "DIMMI 3 CIFRE DEL TUO NUMERO DI TELEFONO",
      "DIMMI 3 VIE DI MENTANA",
      "DIMMI 3 MESTIERI",
      "DIMMI 3 COSE FREDDE",
      "DIMMI 3 PREGHIERE",
      "FAMMI 3 MOSSE DA TORERO",
      "FAMMI 3 POSE DA SUPEREROE",
      "DIMMI 3 OGGETTI TECNOLOGICI",
      "FAMMI 3 FACCE RIDICOLE",
      "FAMMI 3 VERSI DI STUPORE",
      "DIMMI 3 ANIMALI CHE TIENI IN GABBIA",
      "DIMMI 3 ANIMALI PICCOLI",
      "DIMMI 3 COSE CHE MANGI IL PRIMO DELL'ANNO",
      "DIMMI 3 GUERRE STORICHE",
      "DIMMI 3 COSE CHE FANNO RUMORE",
      "DIMMI 3 CITTÀ ITALIANE",
      "DIMMI 3 DIALETTI ITALIANI",
      "DIMMI 3 DOLCI"
    ]
  },
  {
    key: "STAFFETTA",
    label: "Staffetta passa pallone",
    emoji: "🏃",
    explanation:
      "Staffetta a squadre con passaggio di pallone: ogni componente corre, supera l'ostacolo e passa la palla al compagno successivo. Chi taglia per primo il traguardo vince il turno.",
    phrases: []
  },
  {
    key: "GOAL_IGIENE",
    label: "Goal Igienico",
    emoji: "🧻",
    explanation:
      "Calci di precisione verso un bersaglio 'igienico': centrare il punto giusto vale punti, sbagliare fa ridere tutti. Precisione prima di potenza!",
    phrases: []
  },
  {
    key: "PRENDO_CAGO",
    label: "Prendo, cago, vado e torno",
    emoji: "🚽",
    explanation:
      "Gioco a sequenza: 'prendo, cago, vado e torno'. Chi sbaglia l'ordine o salta un'azione viene eliminato. Memoria e attenzione sono tutto!",
    phrases: []
  }
];

// ------------------------------------------------------------------
// Utility condivise dalle pagine
// ------------------------------------------------------------------
export function isConfigPlaceholder(cfg = firebaseConfig) {
  return (
    cfg.apiKey === "TUA_API_KEY" ||
    cfg.databaseURL === "https://TUO_PROGETTO-default-rtdb.europe-west1.firebasedatabase.app" ||
    cfg.projectId === "TUO_PROGETTO"
  );
}

// Ascolta lo stato della connessione al Realtime Database.
// cb(online) viene chiamata subito e ad ogni cambio di stato.
// Ritorna la funzione per annullare l'ascolto.
export function watchConnection(cb) {
  return onValue(ref(db, ".info/connected"), (snap) => cb(snap.val() === true));
}

// Mostra lo stato della connessione RTDB nel badge della pagina.
export function initConnectionBadge(dotEl, textEl, opts = {}) {
  const onlineText = opts.onlineText || "Connesso a Firebase";
  const offlineText = opts.offlineText || "Sconnesso";
  return watchConnection((online) => {
    if (dotEl) dotEl.classList.toggle("online", online);
    if (textEl) textEl.textContent = online ? onlineText : offlineText;
  });
}

// Al primo avvio crea giochi e squadre di default su Firestore.
// È idempotente: se qualcosa esiste già non tocca nulla.
export async function seedDefaultsIfEmpty() {
  const gamesSnap = await getDocs(gamesCollection);
  if (gamesSnap.empty) {
    let order = 0;
    for (const g of DEFAULT_GAMES) {
      await setDoc(doc(gamesCollection, g.key), {
        key: g.key,
        label: g.label,
        emoji: g.emoji || "🎲",
        explanation: g.explanation || "",
        phrases: [...(g.phrases || [])],
        order: order++
      });
    }
  }

  const teamsSnap = await getDocs(teamsCollection);
  if (teamsSnap.empty) {
    await setDoc(doc(teamsCollection, "teamA"), {
      name: "Squadra 1", members: [], score: 0, order: 1
    });
    await setDoc(doc(teamsCollection, "teamB"), {
      name: "Squadra 2", members: [], score: 0, order: 2
    });
  }
}

// ------------------------------------------------------------------
// Utility
// ------------------------------------------------------------------
export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ------------------------------------------------------------------
// Tracce musicali proiettabili (Regia + TV).
// Ogni voce diventa un pulsante nel pannello Audio della Regia.
// Per aggiungerne una: copia il file in Media/ e aggiungi una riga qui.
// ------------------------------------------------------------------
export const MUSIC_TRACKS = [
  { key: "sigla", label: "Sigla", emoji: "🎵", src: "Media/sigla.mp3" },
  { key: "watc", label: "WATC", emoji: "🎶", src: "Media/watc.mp3" }
];

export function getMusicTrack(key) {
  return MUSIC_TRACKS.find((t) => t.key === key) || null;
}

// ------------------------------------------------------------------
// Audio manager (Web Audio API per effetti + HTML5 per musica)
// Nessun file esterno richiesto per gli effetti brevi.
// ==================================================================
let audioCtx = null;

export function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

export function playTone({ freq = 440, type = "sine", duration = 0.15, volume = 0.15 } = {}) {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

export function playSoundEffect(soundId) {
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") {
    try { ctx.resume(); } catch (e) {}
  }
  const now = ctx.currentTime;

  // Nota singola con inviluppo (attack rapido + decay morbido).
  // endFreq opzionale crea uno "sweep" di frequenza.
  function tone({ freq, type = "sine", start = 0, duration = 0.15, volume = 0.15, endFreq = null }) {
    const t0 = now + start;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t0 + duration);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + Math.min(0.02, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  // Rumore filtrato: usato per applausi, folla e colpi secchi.
  // sustain=true -> ampiezza costante con fade (folla); altrimenti scoppio.
  function noise({ start = 0, duration = 0.12, volume = 0.2, filterFreq = null, q = 1, sustain = false }) {
    const t0 = now + start;
    const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const x = i / len;
      const env = sustain
        ? Math.max(0, Math.min(1, x / 0.15, (1 - x) / 0.3))
        : Math.pow(1 - x, 2);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    let node = src;
    if (filterFreq) {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = filterFreq;
      bp.Q.value = q;
      src.connect(bp);
      node = bp;
    }
    node.connect(gain);
    gain.connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + duration);
  }

  switch (soundId) {
    // Risposta sbagliata "classica": due note basse e ruvide.
    case "buzz":
      tone({ freq: 165, type: "sawtooth", duration: 0.32, volume: 0.22, endFreq: 120 });
      tone({ freq: 82, type: "square", start: 0.02, duration: 0.34, volume: 0.14, endFreq: 58 });
      break;

    // Risposta ERRATA: jingle discendente "womp womp".
    case "errato":
      tone({ freq: 330, type: "sawtooth", duration: 0.26, volume: 0.2, endFreq: 245 });
      tone({ freq: 247, type: "sawtooth", start: 0.3, duration: 0.6, volume: 0.2, endFreq: 150 });
      tone({ freq: 175, type: "triangle", start: 0.3, duration: 0.6, volume: 0.1, endFreq: 105 });
      break;

    // Risposta CORRETTA: arpeggio maggiore ascendente + scintillio.
    case "corretto":
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        tone({ freq: f, type: "triangle", start: i * 0.085, duration: 0.3, volume: 0.18 });
      });
      tone({ freq: 1568, type: "sine", start: 0.34, duration: 0.55, volume: 0.1 });
      tone({ freq: 2093, type: "sine", start: 0.42, duration: 0.5, volume: 0.06 });
      break;

    // Sirena "ambulanza": sweep continuo su e giù.
    case "sirena":
      tone({ freq: 600, type: "square", duration: 0.5, volume: 0.16, endFreq: 1150 });
      tone({ freq: 1150, type: "square", start: 0.5, duration: 0.5, volume: 0.16, endFreq: 600 });
      tone({ freq: 600, type: "square", start: 1.0, duration: 0.5, volume: 0.16, endFreq: 1150 });
      tone({ freq: 1150, type: "square", start: 1.5, duration: 0.5, volume: 0.16, endFreq: 600 });
      break;

    // Applausi: letto di folla + molti battimani con timbri variabili.
    case "applausi": {
      noise({ start: 0, duration: 1.7, volume: 0.07, filterFreq: 1600, q: 0.7, sustain: true });
      const claps = 26;
      for (let i = 0; i < claps; i++) {
        noise({
          start: 0.03 + Math.random() * 1.45,
          duration: 0.045 + Math.random() * 0.06,
          volume: 0.08 + Math.random() * 0.13,
          filterFreq: 1100 + Math.random() * 2000,
          q: 0.9
        });
      }
      break;
    }

    case "click":
      tone({ freq: 900, type: "sine", duration: 0.06, volume: 0.1 });
      break;

    default:
      break;
  }
}

// Musica di sottofondo (HTML5 Audio). Ritorna una Promise<boolean>:
// true se la riproduzione è partita, false se il file manca o è bloccata.
let bgMusic = null;
export function playBackgroundMusic(src = "") {
  if (!src) return Promise.resolve(false);
  stopBackgroundMusic();
  bgMusic = new Audio(src);
  bgMusic.loop = true;
  bgMusic.volume = 0.6;
  const el = bgMusic;
  return el.play().then(() => true).catch(() => {
    if (bgMusic === el) bgMusic = null;
    return false;
  });
}

export function stopBackgroundMusic() {
  if (bgMusic) {
    bgMusic.pause();
    bgMusic = null;
  }
}

export function isBackgroundMusicPlaying() {
  return !!bgMusic && !bgMusic.paused;
}

export function stopAllAudio() {
  stopBackgroundMusic();
  if (audioCtx) {
    try { audioCtx.close(); } catch (e) {}
    audioCtx = null;
  }
}
