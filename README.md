# STAB Bonsai — App gestione collezioni bonsai

PWA offline per i soci STAB. Fase 1 (MVP) completata.

## Avvio in sviluppo

```bash
npm install
npm run dev      # http://localhost:5173
```

> Node.js è già installato su questa macchina (`C:\Program Files\nodejs`).
> Se `node`/`npm` non vengono trovati nel terminale, aprine uno nuovo (il PATH
> viene aggiornato all'installazione).

## Build di produzione

```bash
npm run build    # genera /dist (statico, hostabile ovunque)
npm run preview  # anteprima della build
```

## Stack

- **React + Vite** — UI e dev server
- **Tailwind v4** — utility di layout (colori/font restano inline, palette washi/hanko)
- **Dexie.js (IndexedDB)** — persistenza locale, offline di default
- **browser-image-compression** — compressione foto lato client (max 1600px, q80, → JPEG)
- **vite-plugin-pwa** — manifest + service worker (installabile su home screen)

## Struttura

```
src/
  lib/
    constants.js   Palette, font, tipi di intervento, default, helper date
    db.js          Schema Dexie + MIGRAZIONI + seed iniziale
    repo.js        CRUD piante, logica interventi, pianificazione, opzioni
    photos.js      Compressione + storage foto
    backup.js      Export/Import JSON (foto in base64)
  components/
    common.jsx        TopBar, TabBar, Seal (hanko), Ring (timeline), Toast
    Home.jsx          Collezione + filtri + copertine
    PlantDetail.jsx   Scheda: tag, foto, misure, date, note, storico, elimina
    PhotoGallery.jsx  Striscia foto + LIGHTBOX a schermo intero
    InterventoForm.jsx Form intervento condiviso + modali Nuovo/Pianifica
    NewPlantModal.jsx  Creazione scheda
    PlanScreen.jsx     Pianificazione
    OpzioniScreen.jsx  Tag dinamici + Backup + versione
  App.jsx          Orchestratore, query reattive (useLiveQuery)
```

## Cosa è incluso in Fase 1

- Scheda pianta completa con **CRUD reale** su IndexedDB
- **Nuovo intervento** su scheda singola (target tag/tutte già predisposto per Fase 2)
- **Storico automatico**: ogni intervento aggiorna data e tag di stato automatici
- **Foto con compressione** client-side e **galleria a schermo intero** (swipe, frecce,
  tastiera, contatore, elimina)
- **Persistenza offline** via IndexedDB
- **Export/Import backup** in un unico file JSON (schede + foto + storico)

### Fase 2
- Interventi di **gruppo** (per tag / tutte) con anteprima del numero di piante
- Import foto da **fotocamera / galleria / Google Drive** (Drive opzionale, vedi sotto)

### Fase 3
- **Promemoria interventi in scadenza**: banner in Home, badge sul tab
  Pianificazione, evidenziazione (in ritardo / in scadenza) nell'elenco
- **Promemoria di backup periodico** (avviso se mai fatto o più vecchio di un mese)
- **Statistiche di collezione** (in Opzioni)
- **Avviso "nuova versione disponibile"** con refresh (service worker) e
  **changelog in-app**

> Nota promemoria: essendo una PWA senza server, i promemoria sono mostrati
> all'apertura dell'app (banner + badge). Le notifiche di sistema in background
> richiederebbero un server push e non sono incluse.

## ⚠️ Migrazioni dati (requisito hard, spec §8)

La strategia di versionamento del DB è in [`src/lib/db.js`](src/lib/db.js).
**Ogni** modifica allo schema deve aggiungere un nuovo blocco
`db.version(N).stores({...}).upgrade(...)` senza toccare le versioni precedenti,
così i dati dei soci sopravvivono agli aggiornamenti. Vedi i commenti nel file.

## Deploy su GitHub Pages

Il repo include un workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml))
che **ad ogni push su `main` compila e pubblica** l'app automaticamente. Il percorso
base viene ricavato dal nome del repo, quindi non serve configurare nulla a mano.

Setup una tantum:

1. Crea un repo su GitHub e fai il push di questo progetto (vedi comandi sotto).
2. Sul repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Il repo deve essere **pubblico** (GitHub Pages gratuito non copre i repo privati).
   Nessun dato sensibile finisce nel repo: le foto e le schede restano solo sui
   dispositivi dei soci.
4. Al primo push il workflow gira da solo; l'URL finale sarà
   `https://<utente>.github.io/<nome-repo>/`.

Aggiornamenti successivi: basta un `git push`. All'apertura successiva i soci
vedranno l'avviso "Nuova versione disponibile".

> Google Drive in produzione: se vuoi l'import da Drive, aggiungi
> `VITE_GOOGLE_CLIENT_ID` e `VITE_GOOGLE_API_KEY` in **Settings → Secrets and
> variables → Actions** (il workflow li legge già), e autorizza l'URL Pages tra
> le origini OAuth.

## Import foto da Google Drive (Fase 2, opzionale)

L'opzione "Da Google Drive" nell'aggiunta foto usa **Google Picker + OAuth**: il
login Google avviene solo al momento dell'import, non è un account dell'app.

Per abilitarla servono due credenziali dalla [Google Cloud Console](https://console.cloud.google.com/):

1. Crea un progetto → abilita **Google Picker API** e **Google Drive API**.
2. **Credenziali → Chiave API** → copiala in `VITE_GOOGLE_API_KEY`.
3. **Credenziali → ID client OAuth** (tipo "Applicazione web") → aggiungi le origini
   autorizzate (es. `http://localhost:5173` e il dominio di produzione) → copia
   l'ID in `VITE_GOOGLE_CLIENT_ID`.
4. Copia `.env.example` in `.env`, incolla i valori, riavvia `npm run dev`.

Senza `.env` l'opzione resta disabilitata con un avviso; fotocamera e galleria
funzionano comunque.

## Note

- Le 3 piante di esempio (Kentaro, Hana, Ryu) sono un **seed** che parte solo su
  database nuovo. Si possono eliminare dall'app.
- Icone PWA generate da `scripts/gen-icons.mjs` (placeholder "hanko" — sostituibili
  con il logo STAB definitivo).
- **Fase 2** (da fare): interventi di gruppo attivi in UI, tab Opzioni completo,
  import foto da Google Drive. **Fase 3**: promemoria, statistiche, prompt "nuova
  versione disponibile".
