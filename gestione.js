// ============================================================
// gestione.js - Pagina di configurazione (Squadre + Giochi)
// Squadre, giochi e frasi salvati su Cloud Firestore (persistenti).
// La regia live resta nella pagina Controller.
// ============================================================

import {
  firestoreDb, db, teamsCollection, gamesCollection, DEFAULT_GAMES,
  playSoundEffect, isConfigPlaceholder, initConnectionBadge, seedDefaultsIfEmpty
} from "./app.js";

import { ref, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
  doc, addDoc, deleteDoc, updateDoc, increment, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- Elementi DOM ----------
const elConnDot = document.getElementById("connDot");
const elConnText = document.getElementById("connText");
const elCfgWarn = document.getElementById("cfgWarn");

// Squadre
const elTeamsList = document.getElementById("teamsList");
const elTeamCount = document.getElementById("teamCount");
const elBtnAddTeam = document.getElementById("btnAddTeam");

// Giochi (editor)
const elGameEditGrid = document.getElementById("gameEditGrid");
const elGameEditor = document.getElementById("gameEditor");
const elGameLabelInput = document.getElementById("gameLabelInput");
const elGameEmojiInput = document.getElementById("gameEmojiInput");
const elEmojiQuick = document.getElementById("emojiQuick");
const elGameExplanationInput = document.getElementById("gameExplanationInput");
const elBtnSaveGame = document.getElementById("btnSaveGame");
const elBtnDeleteGame = document.getElementById("btnDeleteGame");
const elBtnAddGame = document.getElementById("btnAddGame");
const elBtnMoveGameUp = document.getElementById("btnMoveGameUp");
const elBtnMoveGameDown = document.getElementById("btnMoveGameDown");
const elNewPhraseInput = document.getElementById("newPhraseInput");
const elBtnAddPhrase = document.getElementById("btnAddPhrase");
const elPhraseList = document.getElementById("phraseList");
const elBtnResetPhrases = document.getElementById("btnResetPhrases");

// ---------- Stato locale ----------
let teams = [];                 // array di { id, name, members, score, order }
let games = [];                 // array di { id, key, label, emoji, explanation, phrases, order }
const teamsById = new Map();
const gamesById = new Map();

let editingGameId = null;
let lastPhraseSig = "";

const teamNodes = new Map();    // id -> nodo DOM squadra

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
// SQUADRE (Firestore, illimitate)
// ============================================================
onSnapshot(teamsCollection, (snap) => {
  teams = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  teamsById.clear();
  teams.forEach((t) => teamsById.set(t.id, t));

  renderTeams(teams);
});

function renderTeams(list) {
  const seen = new Set();

  list.forEach((team, idx) => {
    seen.add(team.id);
    let node = teamNodes.get(team.id);
    if (!node) {
      node = createTeamCard(team);
      teamNodes.set(team.id, node);
      elTeamsList.appendChild(node.root);
    }

    if (document.activeElement !== node.nameInput) {
      node.nameInput.value = team.name || "";
    }
    node.scoreEl.textContent = Number(team.score) || 0;
    node.btnUp.disabled = idx === 0;
    node.btnDown.disabled = idx === list.length - 1;
    renderMembers(node, team);
    // riordina le schede nell'ordine corrente (appendChild sposta i nodi già esistenti)
    elTeamsList.appendChild(node.root);
  });

  teamNodes.forEach((node, id) => {
    if (!seen.has(id)) {
      node.root.remove();
      teamNodes.delete(id);
    }
  });

  elTeamCount.textContent = list.length;
}

function createTeamCard(team) {
  const root = document.createElement("div");
  root.className = "team-card";

  // Intestazione: nome + riordino + elimina
  const head = document.createElement("div");
  head.className = "team-head";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "team-name";
  nameInput.placeholder = "Nome squadra";

  const btnUp = document.createElement("button");
  btnUp.type = "button";
  btnUp.className = "btn icon-btn btn-move";
  btnUp.title = "Sposta su";
  btnUp.textContent = "▲";

  const btnDown = document.createElement("button");
  btnDown.type = "button";
  btnDown.className = "btn icon-btn btn-move";
  btnDown.title = "Sposta giù";
  btnDown.textContent = "▼";

  const btnDel = document.createElement("button");
  btnDel.type = "button";
  btnDel.className = "btn icon-btn btn-del-team";
  btnDel.title = "Elimina squadra";
  btnDel.textContent = "🗑";

  head.append(nameInput, btnUp, btnDown, btnDel);

  // Punteggio
  const scoreRow = document.createElement("div");
  scoreRow.className = "score-row";

  const mkDelta = (delta, label, cls) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `btn ${cls}`;
    b.dataset.delta = String(delta);
    b.textContent = label;
    return b;
  };

  const btnMinus = mkDelta(-1, "−1", "btn-minus");
  const btnPlus = mkDelta(1, "+1", "btn-plus");
  const scoreEl = document.createElement("span");
  scoreEl.className = "score";
  scoreEl.textContent = "0";
  const btnPlus5 = mkDelta(5, "+5", "btn-plus5");

  scoreRow.append(btnMinus, btnPlus, scoreEl, btnPlus5);

  // Componenti
  const members = document.createElement("div");
  members.className = "members";

  const mHead = document.createElement("div");
  mHead.className = "members-header";
  const mTitle = document.createElement("span");
  mTitle.textContent = "Componenti";
  const mCount = document.createElement("span");
  mCount.className = "count";
  mHead.append(mTitle, mCount);

  const chips = document.createElement("div");
  chips.className = "member-chips";

  const addRow = document.createElement("div");
  addRow.className = "member-add";
  const memberInput = document.createElement("input");
  memberInput.type = "text";
  memberInput.placeholder = "Aggiungi componente…";
  const btnAddMember = document.createElement("button");
  btnAddMember.type = "button";
  btnAddMember.className = "btn";
  btnAddMember.textContent = "＋";
  addRow.append(memberInput, btnAddMember);

  members.append(mHead, chips, addRow);

  root.append(head, scoreRow, members);

  // Eventi
  const saveName = () => {
    const v = nameInput.value.trim() || "Squadra";
    updateDoc(doc(firestoreDb, "teams", team.id), { name: v });
  };
  nameInput.addEventListener("change", saveName);
  nameInput.addEventListener("blur", saveName);

  scoreRow.querySelectorAll("button[data-delta]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const delta = parseInt(btn.dataset.delta, 10);
      playSoundEffect("click");
      updateDoc(doc(firestoreDb, "teams", team.id), { score: increment(delta) });
    });
  });

  btnDel.addEventListener("click", async () => {
    const t = teamsById.get(team.id);
    if (!confirm(`Eliminare "${t?.name || "questa squadra"}"?`)) return;
    await deleteDoc(doc(firestoreDb, "teams", team.id));
  });

  btnUp.addEventListener("click", () => moveTeam(team.id, -1));
  btnDown.addEventListener("click", () => moveTeam(team.id, 1));

  const addMember = () => {
    const v = memberInput.value.trim();
    if (!v) return;
    const t = teamsById.get(team.id) || { members: [] };
    const arr = Array.isArray(t.members) ? [...t.members] : [];
    arr.push(v);
    updateDoc(doc(firestoreDb, "teams", team.id), { members: arr });
    memberInput.value = "";
    playSoundEffect("click");
  };
  btnAddMember.addEventListener("click", addMember);
  memberInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addMember();
  });

  return { root, nameInput, scoreEl, mCount, chips, memberInput, btnUp, btnDown };
}

// Riordino squadre: riscrive l'ordine sequenziale (0,1,2...) sui documenti.
function reorderTeams(newList) {
  return Promise.all(newList.map((t, idx) =>
    updateDoc(doc(firestoreDb, "teams", t.id), { order: idx })
  ));
}

function moveTeam(id, dir) {
  const list = teams.slice();
  const i = list.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  reorderTeams(list);
  playSoundEffect("click");
}

function renderMembers(node, team) {
  const arr = Array.isArray(team.members) ? team.members : [];
  node.mCount.textContent = arr.length;
  node.chips.innerHTML = "";

  arr.forEach((member, idx) => {
    const chip = document.createElement("span");
    chip.className = "member-chip";
    chip.textContent = member;

    const x = document.createElement("button");
    x.type = "button";
    x.className = "chip-x";
    x.title = "Rimuovi";
    x.textContent = "×";
    x.addEventListener("click", () => {
      const t = teamsById.get(team.id) || { members: [] };
      const next = (t.members || []).filter((_, i) => i !== idx);
      updateDoc(doc(firestoreDb, "teams", team.id), { members: next });
    });

    chip.appendChild(x);
    node.chips.appendChild(chip);
  });
}

elBtnAddTeam.addEventListener("click", async () => {
  const n = teams.length + 1;
  await addDoc(teamsCollection, {
    name: `Squadra ${n}`,
    members: [],
    score: 0,
    order: Date.now()
  });
  playSoundEffect("click");
});

// ============================================================
// GIOCHI (Firestore, creabili/modificabili)
// ============================================================
onSnapshot(gamesCollection, (snap) => {
  games = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  gamesById.clear();
  games.forEach((g) => gamesById.set(g.id, g));

  renderGameEditGrid();
  if (editingGameId) renderPhraseEditor(editingGameId);
  updateGameMoveButtons();
});

function gameKey(g) {
  return g?.key || g?.id;
}

// ---------- Editor giochi ----------
function renderGameEditGrid() {
  elGameEditGrid.innerHTML = "";
  games.forEach((g) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `game-btn ${editingGameId === g.id ? "active" : ""}`;
    btn.innerHTML = `<span class="game-emoji">${g.emoji || "🎲"}</span><span class="game-label">${escapeHtml(g.label || "Gioco")}</span>`;
    btn.addEventListener("click", () => selectEditGame(g.id));
    elGameEditGrid.appendChild(btn);
  });
}

function selectEditGame(id, opts = {}) {
  editingGameId = id;
  lastPhraseSig = "";
  renderGameEditGrid();
  updateGameMoveButtons();

  const g = gamesById.get(id) || opts.game || null;
  elGameEditor.classList.remove("hidden");
  elGameLabelInput.value = g?.label || "";
  elGameEmojiInput.value = g?.emoji || "🎲";
  elGameExplanationInput.value = g?.explanation || "";
  renderEmojiQuickActive();
  renderPhraseEditor(id);
  playSoundEffect("click");

  if (opts.focusLabel) {
    elGameLabelInput.focus();
    elGameLabelInput.select();
  }
}

// Abilita/disabilita le frecce di riordino del gioco selezionato
function updateGameMoveButtons() {
  const i = games.findIndex((g) => g.id === editingGameId);
  if (elBtnMoveGameUp) elBtnMoveGameUp.disabled = i <= 0;
  if (elBtnMoveGameDown) elBtnMoveGameDown.disabled = i < 0 || i >= games.length - 1;
}

function reorderGames(newList) {
  return Promise.all(newList.map((g, idx) =>
    updateDoc(doc(firestoreDb, "games", g.id), { order: idx })
  ));
}

function moveEditingGame(dir) {
  const list = games.slice();
  const i = list.findIndex((g) => g.id === editingGameId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  reorderGames(list);
  playSoundEffect("click");
}

if (elBtnMoveGameUp) elBtnMoveGameUp.addEventListener("click", () => moveEditingGame(-1));
if (elBtnMoveGameDown) elBtnMoveGameDown.addEventListener("click", () => moveEditingGame(1));

elBtnSaveGame.addEventListener("click", async () => {
  if (!editingGameId) return;
  const label = elGameLabelInput.value.trim() || "Gioco";
  // tiene i primi 4 "caratteri" (le emoji composte occupano più code point)
  const emoji = Array.from(elGameEmojiInput.value.trim()).slice(0, 4).join("") || "🎲";
  const explanation = elGameExplanationInput.value.trim();
  await updateDoc(doc(firestoreDb, "games", editingGameId), { label, emoji, explanation });
  elGameEmojiInput.value = emoji;
  flash(elBtnSaveGame, "✓ Salvato");
  playSoundEffect("click");
});

elBtnDeleteGame.addEventListener("click", async () => {
  if (!editingGameId) return;
  const g = gamesById.get(editingGameId);
  if (!confirm(`Eliminare il gioco "${g?.label || ""}"?`)) return;

  await deleteDoc(doc(firestoreDb, "games", editingGameId));
  editingGameId = null;
  elGameEditor.classList.add("hidden");
  playSoundEffect("click");
});

elBtnAddGame.addEventListener("click", async () => {
  const data = { label: "Nuovo gioco", emoji: "🎲", explanation: "", phrases: [], order: Date.now() };
  const refDoc = await addDoc(gamesCollection, data);
  await updateDoc(refDoc, { key: refDoc.id });
  selectEditGame(refDoc.id, { focusLabel: true, game: { id: refDoc.id, key: refDoc.id, ...data } });
  playSoundEffect("click");
});

// ---------- Scelta rapida dell'emoji ----------
const QUICK_EMOJI = [
  "🎲", "👄", "🎭", "🤸", "📞", "🛒", "🚫", "⚡", "🏃", "🧻",
  "🚽", "🏆", "🎤", "🎵", "🚨", "👏", "❌", "🎯", "🧠", "💃"
];

QUICK_EMOJI.forEach((emoji) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn emoji-btn";
  btn.textContent = emoji;
  btn.title = `Usa ${emoji}`;
  btn.addEventListener("click", () => {
    elGameEmojiInput.value = emoji;
    renderEmojiQuickActive();
    playSoundEffect("click");
  });
  elEmojiQuick.appendChild(btn);
});

// Evidenzia l'emoji rapida corrispondente al valore corrente
function renderEmojiQuickActive() {
  const v = elGameEmojiInput.value.trim();
  elEmojiQuick.querySelectorAll(".emoji-btn").forEach((b) => {
    b.classList.toggle("is-on", b.textContent === v);
  });
}
elGameEmojiInput.addEventListener("input", renderEmojiQuickActive);

// ---------- Editor frasi del gioco selezionato ----------
function renderPhraseEditor(gameId) {
  const g = gamesById.get(gameId);
  if (!g) {
    elPhraseList.innerHTML = "";
    return;
  }
  const list = Array.isArray(g.phrases) ? g.phrases : [];

  // Evita di ridisegnare (e rubare il focus) se le frasi non sono cambiate
  const sig = `${gameId}:${JSON.stringify(list)}`;
  if (sig === lastPhraseSig && elPhraseList.contains(document.activeElement)) return;
  lastPhraseSig = sig;

  elPhraseList.innerHTML = "";

  list.forEach((phrase, idx) => {
    const li = document.createElement("li");
    li.className = "phrase-item";

    const input = document.createElement("input");
    input.type = "text";
    input.value = phrase;
    input.placeholder = "Frase...";
    input.addEventListener("change", async () => {
      const v = input.value.trim();
      if (v === "") return;
      await savePhraseAt(gameId, idx, v);
    });

    const actions = document.createElement("div");
    actions.className = "phrase-item-actions";

    const btnSet = document.createElement("button");
    btnSet.type = "button";
    btnSet.className = "btn btn-set";
    btnSet.textContent = "Usa";
    btnSet.title = "Metti in onda questa frase";
    btnSet.addEventListener("click", () => {
      set(ref(db, "roomState/currentPhrase"), phrase);
      playSoundEffect("click");
      flash(btnSet, "✓");
    });

    const btnDel = document.createElement("button");
    btnDel.type = "button";
    btnDel.className = "btn btn-delete";
    btnDel.textContent = "🗑";
    btnDel.title = "Elimina";
    btnDel.addEventListener("click", async () => {
      const next = list.filter((_, i) => i !== idx);
      await updateDoc(doc(firestoreDb, "games", gameId), { phrases: next });
      playSoundEffect("click");
    });

    actions.append(btnSet, btnDel);
    li.append(input, actions);
    elPhraseList.appendChild(li);
  });

  elNewPhraseInput.value = "";
}

async function savePhraseAt(gameId, idx, value) {
  const g = gamesById.get(gameId);
  const list = Array.isArray(g?.phrases) ? [...g.phrases] : [];
  list[idx] = value;
  await updateDoc(doc(firestoreDb, "games", gameId), { phrases: list });
}

elBtnAddPhrase.addEventListener("click", async () => {
  if (!editingGameId) return;
  const v = elNewPhraseInput.value.trim();
  if (!v) return;
  const g = gamesById.get(editingGameId);
  const list = Array.isArray(g?.phrases) ? [...g.phrases, v] : [v];
  await updateDoc(doc(firestoreDb, "games", editingGameId), { phrases: list });
  playSoundEffect("click");
});

elNewPhraseInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") elBtnAddPhrase.click();
});

elBtnResetPhrases.addEventListener("click", async () => {
  if (!editingGameId) return;
  const g = gamesById.get(editingGameId);
  const def = DEFAULT_GAMES.find((d) => d.key === gameKey(g));
  const fallback = def ? [...(def.phrases || [])] : [];
  if (!confirm(`Ripristinare le frasi predefinite per "${g?.label || ""}"?`)) return;
  await updateDoc(doc(firestoreDb, "games", editingGameId), { phrases: fallback });
  playSoundEffect("click");
});

// ============================================================
// UTILITÀ
// ============================================================
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function flash(btn, text) {
  const old = btn.textContent;
  btn.textContent = text;
  btn.classList.add("flash-ok");
  setTimeout(() => {
    btn.textContent = old;
    btn.classList.remove("flash-ok");
  }, 1200);
}

// ============================================================
// INIZIALIZZAZIONE
// ============================================================
checkConfig();

seedDefaultsIfEmpty();
