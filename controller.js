// ============================================================
// controller.js - Interfaccia Presentatore / Regia (Tablet)
// Regia live + regolazione punteggi al volo.
// Squadre e giochi persistono su Cloud Firestore: la regia può
// modificare i punteggi, mentre nomi/componenti/elenco squadre e
// giochi si configurano dalla pagina Gestione.
// Stato live su Realtime Database, giochi letti da Cloud Firestore.
// ============================================================

import {
  db, firestoreDb, gamesCollection, teamsCollection, formatTime, playSoundEffect,
  playBackgroundMusic, stopBackgroundMusic, MUSIC_TRACKS, getMusicTrack,
  isConfigPlaceholder, initConnectionBadge
} from "./app.js";

import {
  ref, onValue, set, update, get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
  onSnapshot, doc, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- Riferimenti Firebase ----------
const roomRef = ref(db, "roomState");          // RTDB: stato live

// ---------- Elementi DOM ----------
const elConnDot = document.getElementById("connDot");
const elConnText = document.getElementById("connText");
const elCfgWarn = document.getElementById("cfgWarn");

// Regia
const elViewBtns = document.querySelectorAll(".view-btn");
const elGameGrid = document.getElementById("gameGrid");
const elGameGridEmpty = document.getElementById("gameGridEmpty");
const elPhraseArea = document.getElementById("phraseArea");
const elBtnToggleExplanation = document.getElementById("btnToggleExplanation");
const elBtnNext = document.getElementById("btnNext");
const elBtnRandom = document.getElementById("btnRandom");
const elCurrentPhrase = document.getElementById("currentPhraseDisplay");
const elGameHint = document.getElementById("gameHint");

// Audio
const elMusicTracks = document.getElementById("musicTracks");
const elBtnStopAudio = document.getElementById("btnStopAudio");
const elMusicHint = document.getElementById("musicHint");

// Timer
const elTimerDisplay = document.getElementById("timerDisplay");
const elBtnTimerStart = document.getElementById("btnTimerStart");
const elBtnTimerPause = document.getElementById("btnTimerPause");
const elBtnTimerReset = document.getElementById("btnTimerReset");
const elPresetBtns = document.querySelectorAll(".timer-presets .btn[data-preset]");

// Punteggi (squadre)
const elTeamsScoreList = document.getElementById("teamsScoreList");
const elTeamScoreCount = document.getElementById("teamScoreCount");
const elTeamsScoreEmpty = document.getElementById("teamsScoreEmpty");

// ---------- Stato locale ----------
let games = [];                 // array di { id, key, label, emoji, explanation, phrases, order }
let teams = [];                 // array di { id, name, members, score, order }

const teamScoreNodes = new Map(); // id squadra -> { root, name, scoreInput }

let currentView = "lobby";
let currentGame = null;         // key del gioco in onda
let showExplanation = true;
let phraseIndex = 0;

let timerInterval = null;
let isTimerRunningLocal = false;
let currentTimerSeconds = 0;

let currentMusicKey = null;         // traccia musicale in onda (key di MUSIC_TRACKS)
const musicButtons = new Map();     // key traccia -> bottone

// ---------- Verifica configurazione Firebase ----------
function checkConfig() {
  if (isConfigPlaceholder()) {
    elCfgWarn.style.display = "block";
    elConnDot.classList.remove("online");
    elConnText.textContent = "Configura firebase-config.js prima di usare l'app.";
  } else {
    elCfgWarn.style.display = "none";
  }
}

// ---------- Connessione RTDB ----------
initConnectionBadge(elConnDot, elConnText);

// ============================================================
// GIOCHI da Firestore (letti per la regia: griglia e frasi)
// ============================================================
onSnapshot(gamesCollection, (snap) => {
  games = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  renderGameGrid();
  updatePhraseArea();
});

function gameKey(g) {
  return g.key || g.id;
}

function getGame(idOrKey) {
  return games.find((g) => g.id === idOrKey || gameKey(g) === idOrKey) || null;
}

const gameGridButtons = new Map(); // key -> button

function renderGameGrid() {
  elGameGrid.innerHTML = "";
  gameGridButtons.clear();
  elGameGridEmpty.style.display = games.length ? "none" : "block";

  games.forEach((g) => {
    const key = gameKey(g);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `game-btn ${currentGame === key ? "active" : ""}`;
    btn.innerHTML = `<span class="game-emoji">${g.emoji || "🎲"}</span><span class="game-label">${escapeHtml(g.label || "Gioco")}</span>`;
    btn.title = g.label || "";
    btn.addEventListener("click", () => selectGame(g));
    elGameGrid.appendChild(btn);
    gameGridButtons.set(key, btn);
  });
}

function updateGameGridActive() {
  gameGridButtons.forEach((btn, key) => {
    btn.classList.toggle("active", key === currentGame);
  });
}

function selectGame(g) {
  const key = gameKey(g);
  currentGame = key;
  phraseIndex = 0;
  currentView = "game";
  showExplanation = true;

  set(ref(db, "roomState/view"), "game");
  set(ref(db, "roomState/currentGame"), key);
  set(ref(db, "roomState/showExplanation"), true);
  set(ref(db, "roomState/currentPhrase"), "");

  updateGameGridActive();
  updateViewButtons();
  updatePhraseArea();
  playSoundEffect("click");
}

function updatePhraseArea() {
  const g = getGame(currentGame);
  const inGame = currentView === "game" && g;

  if (!inGame) {
    elPhraseArea.classList.add("hidden");
    return;
  }

  elPhraseArea.classList.remove("hidden");
  updatePhraseHint();
}

function updatePhraseHint() {
  const g = getGame(currentGame);
  if (!g) return;
  const list = Array.isArray(g.phrases) ? g.phrases : [];
  if (list.length === 0) {
    elGameHint.textContent = "Questo gioco non ha frasi: in TV va la spiegazione.";
  } else {
    const idx = Math.max(0, Math.min(phraseIndex, list.length - 1));
    elGameHint.textContent = `${list.length} frasi • elemento ${idx + 1}/${list.length}`;
  }
}

function renderExplanationButton() {
  elBtnToggleExplanation.classList.toggle("is-on", showExplanation);
  elBtnToggleExplanation.setAttribute("aria-pressed", String(showExplanation));
  elBtnToggleExplanation.textContent = showExplanation ? "🙈 Nascondi spiegazione" : "👁 Mostra spiegazione";
}

elBtnToggleExplanation.addEventListener("click", () => {
  showExplanation = !showExplanation;
  set(ref(db, "roomState/showExplanation"), showExplanation);
  renderExplanationButton();
  playSoundEffect("click");
});

elBtnNext.addEventListener("click", () => {
  const g = getGame(currentGame);
  const list = g && Array.isArray(g.phrases) ? g.phrases : [];
  if (list.length === 0) return;
  phraseIndex = (phraseIndex + 1) % list.length;
  setCurrentPhrase(list[phraseIndex]);
  updatePhraseHint();
  playSoundEffect("click");
});

elBtnRandom.addEventListener("click", () => {
  const g = getGame(currentGame);
  const list = g && Array.isArray(g.phrases) ? g.phrases : [];
  if (list.length === 0) return;
  phraseIndex = Math.floor(Math.random() * list.length);
  setCurrentPhrase(list[phraseIndex]);
  updatePhraseHint();
  playSoundEffect("click");
});

function setCurrentPhrase(text) {
  set(ref(db, "roomState/currentPhrase"), text);
}

// Cambio vista (lobby / classifica / standby)
elViewBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    currentView = view;
    set(ref(db, "roomState/view"), view);
    updateViewButtons();
    updatePhraseArea();
    playSoundEffect("click");
  });
});

function updateViewButtons() {
  elViewBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === currentView);
  });
}

// ============================================================
// SQUADRE / PUNTEGGI (Firestore)
// La Regia può correggere i punteggi al volo: −1 / +1 / +5 oppure
// scrivendo il valore esatto. Nomi e componenti si modificano da Gestione.
// ============================================================
onSnapshot(teamsCollection, (snap) => {
  teams = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  renderScoreControls();
});

function renderScoreControls() {
  elTeamScoreCount.textContent = teams.length;
  elTeamsScoreEmpty.style.display = teams.length ? "none" : "block";

  const seen = new Set();

  teams.forEach((team) => {
    seen.add(team.id);
    let node = teamScoreNodes.get(team.id);
    if (!node) {
      node = createScoreCard(team);
      teamScoreNodes.set(team.id, node);
      elTeamsScoreList.appendChild(node.root);
    }

    node.name.textContent = team.name || "Squadra";
    if (document.activeElement !== node.scoreInput) {
      node.scoreInput.value = Number(team.score) || 0;
    }
    // riordina le schede nell'ordine corrente
    elTeamsScoreList.appendChild(node.root);
  });

  teamScoreNodes.forEach((node, id) => {
    if (!seen.has(id)) {
      node.root.remove();
      teamScoreNodes.delete(id);
    }
  });
}

function createScoreCard(team) {
  const root = document.createElement("div");
  root.className = "team-card";

  // Intestazione: nome squadra
  const head = document.createElement("div");
  head.className = "team-head";

  const name = document.createElement("span");
  name.className = "team-name-static";
  name.textContent = team.name || "Squadra";
  head.appendChild(name);

  // Riga punteggio: −1 / +1 / valore esatto / +5
  const scoreRow = document.createElement("div");
  scoreRow.className = "score-row";

  const mkDelta = (delta, label, cls) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `btn ${cls}`;
    b.textContent = label;
    b.addEventListener("click", () => {
      updateDoc(doc(firestoreDb, "teams", team.id), { score: increment(delta) });
      playSoundEffect("click");
    });
    return b;
  };

  const btnMinus = mkDelta(-1, "−1", "btn-minus");
  const btnPlus = mkDelta(1, "+1", "btn-plus");
  const btnPlus5 = mkDelta(5, "+5", "btn-plus5");

  const scoreInput = document.createElement("input");
  scoreInput.type = "number";
  scoreInput.className = "score score-input";
  scoreInput.inputMode = "numeric";
  scoreInput.value = Number(team.score) || 0;

  const commitScore = () => {
    const v = Number.parseInt(scoreInput.value, 10);
    const next = Number.isFinite(v) ? v : 0;
    scoreInput.value = next;
    updateDoc(doc(firestoreDb, "teams", team.id), { score: next });
  };
  scoreInput.addEventListener("change", commitScore);
  scoreInput.addEventListener("blur", commitScore);
  scoreInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") scoreInput.blur();
  });

  scoreRow.append(btnMinus, btnPlus, scoreInput, btnPlus5);

  // Azzera punteggio
  const btnReset = document.createElement("button");
  btnReset.type = "button";
  btnReset.className = "btn btn-reset-score";
  btnReset.title = "Azzera punteggio";
  btnReset.textContent = "⟲ Azzera";
  btnReset.addEventListener("click", () => {
    updateDoc(doc(firestoreDb, "teams", team.id), { score: 0 });
    playSoundEffect("click");
  });

  root.append(head, scoreRow, btnReset);

  return { root, name, scoreInput };
}

// ============================================================
// STATO LIVE su RTDB
// ============================================================
async function initRoomDefaults() {
  const snap = await get(roomRef);
  const defaults = {
    view: "lobby",
    currentGame: null,
    showExplanation: true,
    currentPhrase: "",
    timerSeconds: 0,
    isTimerRunning: false,
    activeSound: null,
    activeMusic: null
  };

  if (!snap.exists()) {
    await set(roomRef, defaults);
    return;
  }

  const cur = snap.val() || {};
  const missing = {};
  Object.keys(defaults).forEach((k) => {
    if (!(k in cur)) missing[k] = defaults[k];
  });
  if (Object.keys(missing).length) await update(roomRef, missing);
}

onValue(roomRef, (snap) => {
  const s = snap.val() || {};
  currentView = s.view || "lobby";
  currentGame = s.currentGame || null;
  showExplanation = s.showExplanation !== false;

  updateViewButtons();
  updateGameGridActive();
  renderExplanationButton();
  renderActiveSound(s.activeSound || null);
  syncMusic(s.activeMusic || null);

  if (currentView === "game") {
    updatePhraseArea();
  } else {
    elPhraseArea.classList.add("hidden");
  }
});

onValue(ref(db, "roomState/currentPhrase"), (snap) => {
  elCurrentPhrase.textContent = snap.val() || "—";
});

// ============================================================
// AUDIO
// Stato live su RTDB:
//  - `roomState/activeSound` -> effetto breve (corretto/errato/sirena/buzz/applausi)
//  - `roomState/activeMusic` -> traccia musicale in riproduzione (key di MUSIC_TRACKS) o null
// ============================================================
function renderActiveSound(sound) {
  document.querySelectorAll(".sfx").forEach((b) => {
    b.classList.toggle("is-on", b.dataset.sound === sound);
  });
}

function renderMusicButtons() {
  musicButtons.forEach((btn, key) => {
    btn.classList.toggle("is-on", key === currentMusicKey);
  });
}

function setMusicHint(text) {
  if (elMusicHint) elMusicHint.textContent = text;
}

// Avvia/ferma localmente la traccia richiesta e allinea i pulsanti.
// L'id passato è il valore di `roomState/activeMusic`.
async function syncMusic(key) {
  const next = key || null;
  if (next === currentMusicKey) return;

  const prev = currentMusicKey;
  currentMusicKey = next;

  if (!next) {
    stopBackgroundMusic();
    renderMusicButtons();
    return;
  }

  const track = getMusicTrack(next);
  const ok = await playBackgroundMusic(track?.src || "");
  if (!ok) {
    currentMusicKey = prev;
    stopBackgroundMusic();
    renderMusicButtons();
    setMusicHint(
      track
        ? `⚠️ Traccia "${track.label}" non trovata: aggiungi il file ${track.src}.`
        : `⚠️ Traccia sconosciuta: ${next}.`
    );
    return;
  }

  setMusicHint("");
  renderMusicButtons();
}

// Crea i pulsanti delle tracce musicali (Sigla, WATC, ...).
MUSIC_TRACKS.forEach((track) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn music-track";
  btn.dataset.track = track.key;
  btn.title = `Riproduci / ferma "${track.label}"`;
  btn.innerHTML = `<span class="music-emoji">${track.emoji || "🎵"}</span><span>${escapeHtml(track.label)}</span>`;
  btn.addEventListener("click", () => {
    playSoundEffect("click");
    const next = currentMusicKey === track.key ? null : track.key;
    set(ref(db, "roomState/activeMusic"), next);
    syncMusic(next);
  });
  elMusicTracks.appendChild(btn);
  musicButtons.set(track.key, btn);
});

elBtnStopAudio.addEventListener("click", () => {
  set(ref(db, "roomState/activeMusic"), null);
  set(ref(db, "roomState/activeSound"), null);
  syncMusic(null);
  renderActiveSound(null);
  setMusicHint("");
});

let sfxResetTimer = null;
document.querySelectorAll(".sfx").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sound = btn.dataset.sound;
    playSoundEffect(sound);
    set(ref(db, "roomState/activeSound"), sound);
    renderActiveSound(sound);
    // dopo l'effetto lo stato torna "nessun suono" (la musica resta indipendente)
    clearTimeout(sfxResetTimer);
    sfxResetTimer = setTimeout(() => {
      set(ref(db, "roomState/activeSound"), null);
      renderActiveSound(null);
    }, 1000);
  });
});

// ============================================================
// TIMER
// ============================================================
function renderTimer(seconds, running) {
  elTimerDisplay.textContent = formatTime(seconds);
  elTimerDisplay.parentElement.classList.toggle("timer-running", running);
  elBtnTimerStart.disabled = running;
  elBtnTimerPause.disabled = !running;
  elPresetBtns.forEach((b) => {
    b.classList.toggle("is-on", !running && parseInt(b.dataset.preset, 10) === seconds);
  });
}

onValue(ref(db, "roomState/timerSeconds"), (snap) => {
  const s = snap.val();
  if (typeof s === "number") {
    currentTimerSeconds = s;
    renderTimer(s, isTimerRunningLocal);
  }
});

onValue(ref(db, "roomState/isTimerRunning"), (snap) => {
  isTimerRunningLocal = snap.val() === true;
  renderTimer(currentTimerSeconds, isTimerRunningLocal);
});

function timerSet(seconds) {
  currentTimerSeconds = seconds;
  clearInterval(timerInterval);
  timerInterval = null;
  isTimerRunningLocal = false;
  set(ref(db, "roomState/timerSeconds"), seconds);
  set(ref(db, "roomState/isTimerRunning"), false);
  renderTimer(seconds, false);
}

function timerStart() {
  if (currentTimerSeconds <= 0 || isTimerRunningLocal) return;
  isTimerRunningLocal = true;
  set(ref(db, "roomState/isTimerRunning"), true);
  renderTimer(currentTimerSeconds, true);
  timerInterval = setInterval(() => {
    currentTimerSeconds--;
    set(ref(db, "roomState/timerSeconds"), currentTimerSeconds);
    renderTimer(currentTimerSeconds, true);
    if (currentTimerSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      isTimerRunningLocal = false;
      set(ref(db, "roomState/isTimerRunning"), false);
      renderTimer(0, false);
      playSoundEffect("sirena");
    }
  }, 1000);
}

function timerPause() {
  isTimerRunningLocal = false;
  clearInterval(timerInterval);
  timerInterval = null;
  set(ref(db, "roomState/isTimerRunning"), false);
  renderTimer(currentTimerSeconds, false);
}

function timerReset() {
  timerSet(0);
}

elPresetBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    timerSet(parseInt(btn.dataset.preset, 10));
    playSoundEffect("click");
  });
});

document.getElementById("btnSetCustom").addEventListener("click", () => {
  const val = parseInt(document.getElementById("timerCustom").value, 10);
  if (val && val > 0) timerSet(val);
  playSoundEffect("click");
});

elBtnTimerStart.addEventListener("click", () => { timerStart(); playSoundEffect("click"); });
elBtnTimerPause.addEventListener("click", () => { timerPause(); playSoundEffect("click"); });
elBtnTimerReset.addEventListener("click", () => { timerReset(); playSoundEffect("click"); });

// ============================================================
// UTILITÀ
// ============================================================
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ============================================================
// INIZIALIZZAZIONE
// La regia non crea/modifica l'elenco di squadre e giochi: quello
// si gestisce dalla pagina Gestione. Dal Controller si regolano
// però i punteggi delle squadre (oltre a vista, timer e audio).
// ============================================================
checkConfig();
updateViewButtons();
renderExplanationButton();
renderActiveSound(null);
renderTimer(0, false);

initRoomDefaults();
