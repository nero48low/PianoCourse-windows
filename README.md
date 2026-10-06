# Piano Course (Tauri, Windows)

Provare subito nel browser (senza MIDI, con la tastiera del PC): apri `src/index.html`.
Tasti: A W S E D F T G Y H U J K O L P, Z/X = ottava giù/su.

Compilare l'app: carica la cartella su GitHub, vai su Actions > build > scarica l'artifact "PianoCourse-windows" (installer .exe).
In locale (serve Rust): npm install, npx tauri icon app-icon.png, npx tauri dev

Nuove lezioni: aggiungi oggetti in src/lessons.js (stesso formato della lezione 1).
