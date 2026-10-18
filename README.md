# Stasera tutto è possibile... dopo la Cresima! - Web App Realtime

Web app per game show con tre interfacce che comunicano in tempo reale tramite **Firebase Realtime Database** e **Cloud Firestore**.

## Struttura file

| File | Descrizione |
|------|-------------|
| `firebase-config.js` | Configurazione Firebase (da compilare) |
| `app.js` | Inizializzazione Firebase SDK v10, giochi di default, audio |
| `controller.js` | Logica interfaccia presentatore/regia (tablet) |
| `gestione.js` | Logica pagina di configurazione (squadre + giochi) |
| `display.js` | Logica interfaccia proiezione (Fire TV) |
| `style.css` | Design system comune (regia + TV) |
| `controller.html` | `/controller` - interfaccia tablet (solo regia live) |
| `gestione.html` | `/gestione` - configurazione squadre e giochi |
| `display.html` | `/display` - interfaccia TV |

## Funzioni principali

- **Squadre illimitate**: aggiungi/elimina squadre dalla pagina **Gestione**, modifica il nome e inserisci i **componenti** di ogni squadra. I punteggi si regolano sia dalla **Gestione** sia in diretta dal **Controller** (pannello Punteggi: −1 / +1 / +5 oppure valore esatto).
- **Giochi creabili e modificabili**: dalla pagina **Gestione** crea nuovi giochi, rinominali, cambia l'**emoji** proiettata in TV, scrivi la **spiegazione** e aggiungi **frasi opzionali** (Prossimo / Casuale).
- **Regia “in onda”**: dalla Regia mandi in onda lobby, giochi, classifica e standby, gestisci timer e audio e correggi i **punteggi** al volo; l'elenco di squadre e giochi si cura dalla pagina **Gestione**.
- **Regia**: manda in onda Lobby, un gioco, la **Classifica** o lo **Standby**.
- **Audio completo**: effetti per risposta **corretta** ed **errata**, oltre a Sirena, Buzz e Applausi; sigla e canzoni (**Sigla**, **WATC**, …) avviabili e fermabili dalla Regia e riprodotte anche in TV.
- **Sincronizzazione TV**: ogni modifica appare istantaneamente sul display.
- **Standby con logo animato**: la TV mostra il badge del gioco con anelli rotanti, stella pulsante e logo del gruppo (Barca di Pietro) a tutto schermo.
- **Grafica TV rinnovata**: tabellone dinamico, spiegazione a schermo, classifica con medaglie e animazioni.

## 1. Configura Firebase

1. Vai su [Firebase Console](https://console.firebase.google.com/) e crea un progetto.
2. Aggiungi un'app web e copia il oggetto `firebaseConfig`.
3. Apri `firebase-config.js` e incolla i valori:

```js
export const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "tuo-progetto.firebaseapp.com",
  databaseURL: "https://tuo-progetto-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tuo-progetto",
  storageBucket: "tuo-progetto.appspot.com",
  messagingSenderId: "...",
  appId: "1:...:web:..."
};
```

4. Attiva il **Realtime Database** (modalità test per sviluppo) con regole:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> ⚠️ Per produzione restringi le regole con l'autenticazione Firebase.

## 2. Avvia in locale

### Landing page
Apri `index.html`: ti chiede se aprire il **Controller** (tablet), la **Gestione** (configurazione) o il **Display** (Fire TV). I link aprono le pagine in una nuova scheda.

### Simulazione completa (senza ricaricare continuamente)
Per vedere l'app completa in azione sul tuo PC senza dover passare da un dispositivo all'altro:

1. Apri `controller.html` in una scheda del browser (questo è il "tablet" del presentatore).
2. Apri `display.html` in un'altra scheda (questo è il "TV").
3. (Opzionale) Apri `gestione.html` in una terza scheda per preparare squadre e giochi.
4. Metti le schede affiancate.
5. Dal Controller cambia gioco, frase, punteggi, timer o audio: vedrai il Display aggiornarsi **istantaneamente** grazie a Firebase. Squadre e giochi si modificano da Gestione e arrivano subito al Display.

> Se apri i file direttamente con `file://`, i moduli ES potrebbero essere bloccati da alcuni browser. Per evitare problemi, usa un server locale veloce:
> - `npx serve` (con Node.js)
> - `python -m http.server 8000`
> - Firebase Hosting / Vercel / GitHub Pages per test online

### Test senza costi (Firebase Emulator)
Se vuoi testare senza scrivere sul database reale, attiva la **Firebase Emulator Suite** (Realtime Database Emulator) nella Firebase Console e punta l'app all'emulator. In `app.js`, dopo `initializeApp`, aggiungi:
```js
import { connectDatabaseEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
connectDatabaseEmulator(db, "localhost", 9000);
```

## 3. Architettura Firebase (Realtime Database + Cloud Firestore)

L'app usa **entrambi i servizi Firebase**:

| Servizio | Raccolta / Nodo | Contenuto | Caratteristica |
|----------|----------------|-----------|----------------|
| **Realtime Database** | `roomState` | `view`, `currentGame`, `showExplanation`, `currentPhrase`, `timerSeconds`, `isTimerRunning`, `activeSound`, `activeMusic` | Stato live in tempo reale (bassa latenza), usato da Controller e Display |
| **Cloud Firestore** | `teams/<id>` | `{ name, members: [...], score, order }` | Squadre (illimitate), componenti e punteggi persistenti |
| **Cloud Firestore** | `games/<id>` | `{ key, label, emoji, explanation, phrases: [...], order }` | Giochi con spiegazione proiettata e frasi opzionali |

`view` può essere `lobby`, `game`, `leaderboard` o `standby`. In `lobby` la TV mostra anche i componenti delle squadre; nei giochi e in classifica mostrano solo i nomi.

### Preparare le impostazioni su Firebase (prima della serata)

Puoi configurare tutto in anticipo dalla pagina **Gestione** oppure direttamente da **Firebase Console**:

| Dove | Cosa impostare |
|------|----------------|
| Gestione → Squadre | Nomi, componenti e punteggi (numero di squadre illimitato) |
| Gestione → Giochi | Crea/modifica giochi: nome, emoji, spiegazione proiettata, frasi opzionali |
| Controller → Punteggi | Regola i punteggi delle squadre al volo (−1 / +1 / +5 o valore esatto) |
| Controller → Regia | Manda in onda Lobby, Gioco, Classifica o Standby; scegli la frase corrente |
| Controller → Timer | Imposta secondi e avvia/pausa |
| Controller → Audio | Effetti Corretto/Errato/Sirena/Buzz/Applausi + tracce musicali (Sigla, WATC, …) e Stop |

Le pagine sono tre e ognuna ha il suo indirizzo: `/controller` (regia), `/gestione` (configurazione), `/display` (TV).

I dati di squadre e giochi restano salvati su **Firestore**, quindi li trovi già pronti alla prossima apertura. Alla **prima apertura della pagina Gestione** vengono creati 10 giochi di default (con spiegazione e frasi del regolamento) e due squadre; il nodo `roomState` su Realtime Database viene inizializzato automaticamente alla prima apertura della **Regia** con i valori predefiniti se non esiste (il Display, se il nodo è vuoto, mostra comunque la lobby).

> La pagina **Regia** non può creare né eliminare squadre e giochi: legge l'elenco giochi per mandarli in onda e può **modificare i punteggi delle squadre** dal pannello Punteggi. Creazione, rinomina, componenti ed eliminazione si fanno dalla pagina **Gestione**.

### Riordinare squadre e giochi

Nella pagina **Gestione** puoi cambiare l'ordine con cui squadre e giochi appaiono in Regia e in TV:
- **Squadre**: le frecce ▲ / ▼ su ogni scheda.
- **Giochi**: le frecce **▲ Su / ▼ Giù** nell'editor del gioco selezionato.

### Stato della connessione

Tutte le pagine mostrano un indicatore di connessione (pallino verde = connesso). In più, il **Display** mostra un avviso a tutto schermo “Connessione persa — riconnessione…” se la TV perde il collegamento a Firebase.

### Regole Firestore (sviluppo)

Le regole sono già nel repo (`firestore.rules` e `database.rules.json`) e limitano l'accesso **solo** alle collezioni/nodo usati dall'app (`teams`, `games` su Firestore e `roomState` su Realtime Database); tutto il resto è negato.

In modalità evento la scrittura è aperta perché non c'è login. Per la produzione, aggiungi Firebase Auth e sostituisci `if true` con `if request.auth != null` (in `firestore.rules`) e `.write` con `auth != null` (in `database.rules.json`). Poi pubblica le regole con:

```bash
firebase deploy --only firestore:rules,database
```

> Senza login, chi conosce l'URL del progetto può comunque scrivere su `teams`, `games` e `roomState`. Usa un progetto privato e non condividere il link pubblico.

## 4. Cartella Media

Vedi la cartella `Media/` per i file audio e immagini. Gli effetti brevi (Sirena, Buzz, Applausi) sono già generati via Web Audio API e non richiedono file esterni.

| File | Dove si vede |
|------|--------------|
| `Media/immagini/logo.svg` | Logo del gioco (badge neon), nella landing e nello standby TV (con anelli rotanti, stella pulsante e glow) |
| `Media/immagini/logo-gruppo.png` | Logo del gruppo "Barca di Pietro - Parrocchia San Nicola da Bari Mentana": nell'header della TV, nello standby e nel fondo della landing |
| `Media/immagini/Logo.jpg` | Originale del logo del gruppo (solo sorgente, non usato dall'app) |
| `Media/sigla.mp3` | Sigla del game show (pulsante **Sigla** in Regia) |
| `Media/watc.mp3` | Seconda traccia musicale (pulsante **WATC** in Regia) |

## 3. Ospitare gratis

### Firebase Hosting (consigliato)

```bash
# Installa la Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inizializza (seleziona Hosting)
firebase init

# Deploy
firebase deploy
```

Durante l'init scegli:
- Hosting: configurare come sito pubblico `public`
- Pagina singola (SPA): `Yes` (opzionale, utile se usi routing)

### Vercel

```bash
npm install -g vercel
vercel
```
Trascina la cartella del progetto o collega il repository GitHub.

### GitHub Pages

1. Carica i file in un repository.
2. Vai su **Settings → Pages**.
3. Sorgente: `Deploy from a branch` → `main` / `/ (root)`.
4. Il sito sarà disponibile su `https://<utente>.github.io/<repo>/`.

> Nota: con GitHub Pages apri `controller.html`, `gestione.html` e `display.html` direttamente (es. `.../controller.html`).

## 4. Suono

Gli effetti (**Corretto**, **Errato**, Sirena, Buzz, Applausi) sono generati con l'**Web Audio API**, quindi non servono file audio aggiuntivi.

Per la **musica**: metti i file MP3 nella cartella `Media/` (es. `Media/sigla.mp3` e `Media/watc.mp3`). La Regia mostra un pulsante per ogni traccia definita in `MUSIC_TRACKS` (`app.js`); premendolo la traccia parte su Regia e TV, ripremerlo la ferma, e **Stop Audio** interrompe tutto. Per aggiungere altre canzoni: copia il file in `Media/` e aggiungi una riga a `MUSIC_TRACKS` in `app.js`.

Se un file non esiste, la Regia mostra un avviso nel pannello Audio invece di restare in silenzio.

> I browser bloccano l'audio finché non c'è un'interazione: sulla TV tocca/clicca una volta la pagina per sbloccare la riproduzione (la Regia si sblocca al primo clic su un pulsante).

## 5. Minigiochi di default

Al primo avvio vengono creati automaticamente (e sono poi modificabili/eliminabili dalla pagina **Gestione**):

1. Segui il labiale (con frasi)
2. Rumori di mimo (con frasi)
3. Alphabody (con frasi)
4. Telefono difettoso (con frasi)
5. Lo Step Market
6. Né Sì, né No
7. Speed Quiz (con frasi)
8. Staffetta passa pallone
9. Goal Igienico
10. Prendo, cago, vado e torno

Ogni gioco ha una **spiegazione** mostrata in TV e, dove serve, delle **frasi** precaricate in `app.js` (`DEFAULT_GAMES`).

## Stato condiviso su Firebase

```json
{
  "roomState": {
    "view": "game",
    "currentGame": "LABIALE",
    "showExplanation": true,
    "currentPhrase": "",
    "timerSeconds": 0,
    "isTimerRunning": false,
    "activeSound": null,
    "activeMusic": null
  }
}
```

```jsonc
// Firestore: docs della collezione "teams"
teams/<id> = { "name": "Squadra 1", "members": ["Anna", "Luca"], "score": 0, "order": 1 }

// Firestore: docs della collezione "games"
games/<id> = {
  "key": "LABIALE",
  "label": "Segui il labiale",
  "emoji": "👄",
  "explanation": "Un concorrente pronuncia una frase muovendo SOLO le labbra...",
  "phrases": ["HO FAME ANCHE QUANDO STO MANGIANDO."],
  "order": 0
}
```

## Licenza

Uso libero a scopo didattico/intrattenimento.