# Cartella Media

Inserisci qui i file multimediali per l'app:

- `sigla.mp3` — sigla del game show (pulsante **Sigla** in Regia)
- `watc.mp3` — seconda traccia musicale (pulsante **WATC** in Regia)
- altri file `.mp3` — aggiungili alla lista `MUSIC_TRACKS` in `app.js` per avere un pulsante in Regia
- `immagini/logo.svg` — logo del gioco (badge neon usato nella landing e nello standby della TV)
- `immagini/logo-gruppo.png` — logo del gruppo "Barca di Pietro" (sfondo scontornato, PNG trasparente)
- `immagini/Logo.jpg` — originale del logo del gruppo (sorgente, non usato dall'app)

> Nota: gli effetti sonori brevi (Corretto, Errato, Sirena, Buzz, Applausi, Click) sono generati automaticamente tramite **Web Audio API** in `app.js`, quindi **non servono file audio** per quelli.

Per aggiungere una traccia musicale, copia il file qui e aggiungi una voce a `MUSIC_TRACKS` in `app.js`, ad esempio:

```js
export const MUSIC_TRACKS = [
  { key: "sigla", label: "Sigla", emoji: "🎵", src: "Media/sigla.mp3" },
  { key: "watc",  label: "WATC",  emoji: "🎶", src: "Media/watc.mp3" }
];
```
