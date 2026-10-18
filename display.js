// ============================================================
// display.js - Interfaccia Proiezione (TV)
// Stato live da Realtime Database.
// Squadre e giochi letti in tempo reale da Cloud Firestore.
// ============================================================

import {
  db, teamsCollection, gamesCollection, formatTime, playSoundEffect, getAudioCtx,
  watchConnection, playBackgroundMusic, stopBackgroundMusic,
  getMusicTrack
} from "./app.js";

import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const roomRef = ref(db, "roomState");

// Nome dello show, usato nelle scritte della TV
const SHOW_NAME = "Stasera tutto è possibile... dopo la Cresima!";

// ---------- Elementi DOM ----------
const elScoreboard = document.getElementById("tvScoreboard");
const elViewLobby = document.getElementById("viewLobby");
const elViewGame = document.getElementById("viewGame");
const elViewLeaderboard = document.getElementById("viewLeaderboard");
const elViewStandby = document.getElementById("viewStandby");
const elLobbyTeams = document.getElementById("lobbyTeams");
const elLeaderboard = document.getElementById("leaderboard");
const elTvGameEmoji = document.getElementById("tvGameEmoji");
const elTvGameTag = document.getElementById("tvGameTag");
const elTvTimer = document.getElementById("tvTimer");
const elTvExplanation = document.getElementById("tvExplanation");
const elTvExplanationText = document.getElementById("tvExplanationText");
const elTvPhraseWrap = document.getElementById("tvPhraseWrap");
const elTvPhrase = document.getElementById("tvPhrase");
const elTvHint = document.getElementById("tvHint");
const elConnDot = document.getElementById("connDot");
const elConnText = document.getElementById("connText");
const elOffline = document.getElementById("tvOffline");

// ---------- Stato ----------
let teams = [];
let games = [];
let roomState = {};
let pendingSound = null;
let currentTvMusicKey = null;
let lastPhrase = null;
const scoreById = new Map();       // id team -> ultimo punteggio noto (per animazioni)
const scoreboardNodes = new Map(); // id team -> { root, name, pts }

// Anima un valore quando cambia (riavvia l'animazione CSS)
function pop(el) {
  if (!el) return;
  el.classList.remove("score-pop");
  void el.offsetWidth;
  el.classList.add("score-pop");
}

// ---------- Squadre da Firestore (ascolto live) ----------
onSnapshot(teamsCollection, (snap) => {
  teams = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Calcola quali squadre hanno cambiato punteggio (solo dopo il primo render)
  const changed = new Set();
  teams.forEach((t) => {
    const s = Number(t.score) || 0;
    if (scoreById.has(t.id) && scoreById.get(t.id) !== s) changed.add(t.id);
  });
  const ids = new Set(teams.map((t) => t.id));
  scoreById.forEach((_, id) => { if (!ids.has(id)) scoreById.delete(id); });
  teams.forEach((t) => scoreById.set(t.id, Number(t.score) || 0));

  renderScoreboard(changed);
  renderLobby(changed);
  renderLeaderboard(changed);
});

// ---------- Giochi da Firestore ----------
onSnapshot(gamesCollection, (snap) => {
  games = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  renderState();
});

// ---------- Stato stanza (RTDB) ----------
// Il Display è in sola lettura sullo stato: non scrive mai su roomState,
// così si evitano conflitti con la Regia (l'unica che comanda).
onValue(roomRef, (snap) => {
  roomState = snap.val() || {};

  const sound = roomState.activeSound || null;
  if (sound && sound !== pendingSound) {
    pendingSound = sound;
    playSoundEffect(sound);
    setTimeout(() => { if (pendingSound === sound) pendingSound = null; }, 1000);
  }

  syncTvMusic(roomState.activeMusic || null);

  renderState();
});

// ---------- Connessione Firebase ----------
// Badge nel footer + overlay a tutto schermo quando la TV perde la connessione.
watchConnection((online) => {
  if (elConnDot) elConnDot.classList.toggle("online", online);
  if (elConnText) elConnText.textContent = online ? "Connesso a Firebase" : "Sconnesso";
  if (elOffline) elOffline.classList.toggle("hidden", online);
  document.body.classList.toggle("is-offline", !online);
});

// ---------- Render dello stato live ----------
function renderState() {
  const view = roomState.view || "lobby";
  const gameKey = roomState.currentGame;
  const game = gameKey ? findByKey(gameKey) : null;

  const effectiveView = view === "game" && !game ? "lobby" : view;

  elViewLobby.classList.toggle("hidden", effectiveView !== "lobby");
  elViewGame.classList.toggle("hidden", effectiveView !== "game");
  elViewLeaderboard.classList.toggle("hidden", effectiveView !== "leaderboard");
  elViewStandby.classList.toggle("hidden", effectiveView !== "standby");

  // In standby la TV mostra solo il logo animato a tutto schermo
  document.body.classList.toggle("is-standby", effectiveView === "standby");

  renderGame(game);
  renderHint(effectiveView, game);
}

function renderScoreboard(changed = new Set()) {
  elScoreboard.style.setProperty("--teams", Math.max(teams.length, 1));

  if (teams.length === 0) {
    scoreboardNodes.clear();
    elScoreboard.innerHTML = `<div class="team-score empty">Nessuna squadra</div>`;
    return;
  }
  if (elScoreboard.querySelector(".team-score.empty")) elScoreboard.innerHTML = "";

  const seen = new Set();
  teams.forEach((t) => {
    seen.add(t.id);
    let node = scoreboardNodes.get(t.id);
    if (!node) {
      const root = document.createElement("div");
      root.className = "team-score";
      const name = document.createElement("span");
      name.className = "name";
      const pts = document.createElement("span");
      pts.className = "pts";
      pts.dataset.team = t.id;
      root.append(name, pts);
      node = { root, name, pts };
      scoreboardNodes.set(t.id, node);
      elScoreboard.appendChild(root);
    }
    node.name.textContent = t.name || "Squadra";
    node.pts.textContent = Number(t.score) || 0;
    if (changed.has(t.id)) pop(node.pts);
    // riordina in base all'ordine corrente (appendChild sposta i nodi esistenti)
    elScoreboard.appendChild(node.root);
  });

  scoreboardNodes.forEach((node, id) => {
    if (!seen.has(id)) { node.root.remove(); scoreboardNodes.delete(id); }
  });
}

function renderLobby(changed = new Set()) {
  elLobbyTeams.innerHTML = "";

  if (teams.length === 0) {
    elLobbyTeams.innerHTML = `<p class="tv-subtitle">Nessuna squadra configurata</p>`;
    return;
  }

  teams.forEach((t) => {
    const card = document.createElement("div");
    card.className = "lobby-team";
    card.dataset.team = t.id;
    const members = Array.isArray(t.members) ? t.members : [];

    card.innerHTML = `
      <div class="lobby-team-name">${escapeHtml(t.name || "Squadra")}</div>
      <div class="lobby-team-score">${Number(t.score) || 0}</div>
      <ul class="lobby-members">
        ${members.length
          ? members.map((m) => `<li>${escapeHtml(m)}</li>`).join("")
          : `<li class="muted">Nessun componente</li>`}
      </ul>`;
    elLobbyTeams.appendChild(card);
    if (changed.has(t.id)) pop(card.querySelector(".lobby-team-score"));
  });
}

function renderLeaderboard(changed = new Set()) {
  elLeaderboard.innerHTML = "";
  const ranked = [...teams].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));

  if (ranked.length === 0) {
    elLeaderboard.innerHTML = `<li class="lb-empty">Nessuna squadra</li>`;
    return;
  }

  ranked.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = `lb-row pos-${i + 1}`;
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}°`;
    li.innerHTML = `
      <span class="lb-pos">${medal}</span>
      <span class="lb-name">${escapeHtml(t.name || "Squadra")}</span>
      <span class="lb-pts">${Number(t.score) || 0}</span>`;
    elLeaderboard.appendChild(li);
    if (changed.has(t.id)) pop(li.querySelector(".lb-pts"));
  });
}

function renderGame(game) {
  if (!game) return;

  elTvGameEmoji.textContent = game.emoji || "🎲";
  elTvGameTag.textContent = game.label || "Gioco";

  // Timer
  const seconds = typeof roomState.timerSeconds === "number" ? roomState.timerSeconds : 0;
  const running = roomState.isTimerRunning === true;
  const showTimer = seconds > 0;
  elTvTimer.classList.toggle("hidden", !showTimer);
  if (showTimer) {
    elTvTimer.textContent = formatTime(seconds);
    elTvTimer.classList.toggle("timer-active", running);
  }

  // Spiegazione vs Frase
  const showExplanation = roomState.showExplanation !== false;
  const phrase = roomState.currentPhrase || "";
  const hasPhrase = phrase.trim() !== "";

  if (showExplanation || !hasPhrase) {
    elTvExplanation.classList.remove("hidden");
    elTvExplanationText.textContent = game.explanation || "—";
    elTvPhraseWrap.classList.add("hidden");
    lastPhrase = null;
  } else {
    elTvExplanation.classList.add("hidden");
    elTvPhraseWrap.classList.remove("hidden");
    if (phrase !== lastPhrase) {
      lastPhrase = phrase;
      elTvPhrase.textContent = phrase;
      elTvPhrase.classList.remove("phrase-change");
      void elTvPhrase.offsetWidth; // riavvia l'animazione
      elTvPhrase.classList.add("phrase-change");
    }
  }
}

function renderHint(view, game) {
  if (view === "lobby") elTvHint.textContent = "In attesa della regia… seleziona un gioco dal tablet";
  else if (view === "leaderboard") elTvHint.textContent = `Classifica • ${SHOW_NAME}`;
  else if (view === "standby") elTvHint.textContent = "Standby";
  else elTvHint.textContent = `${SHOW_NAME}  •  ${game?.label || ""}`;
}

// ---------- Audio TV ----------
// Allinea la musica di sottofondo alla traccia richiesta dalla Regia.
function syncTvMusic(key) {
  const next = key || null;
  if (next === currentTvMusicKey) return;
  currentTvMusicKey = next;

  if (!next) {
    stopBackgroundMusic();
    return;
  }
  const track = getMusicTrack(next);
  if (!track) {
    stopBackgroundMusic();
    return;
  }
  try { getAudioCtx().resume(); } catch (e) {}
  playBackgroundMusic(track.src);
}

// ---------- Utility ----------
function findByKey(key) {
  return games.find((g) => (g.key || g.id) === key) || null;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ---------- Sblocco audio ----------
// I browser bloccano l'audio finché non c'è un'interazione: al primo
// tocco/tasto sblocchiamo il contesto e, se una traccia è già in onda, la avviamo.
function unlockAudio() {
  try { getAudioCtx().resume(); } catch (e) {}
  if (roomState.activeMusic) {
    const key = roomState.activeMusic;
    currentTvMusicKey = null; // forza il (ri)avvio della traccia corrente
    syncTvMusic(key);
  }
}
document.addEventListener("pointerdown", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });
