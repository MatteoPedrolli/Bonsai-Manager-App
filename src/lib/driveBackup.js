// =============================================================================
//  BACKUP AUTOMATICO SU GOOGLE DRIVE (facoltativo)
// =============================================================================
//  Perché esiste: i dati vivono sul dispositivo, e un dispositivo si perde, si
//  rompe o si svuota. Una copia sul Drive DEL SOCIO è l'unica rete che
//  sopravvive a tutto questo, senza che noi si debba tenere un server.
//
//  AMBITO: solo `drive.file`. L'app vede unicamente i file che ha creato lei;
//  il resto del Drive del socio le è invisibile, anche in lettura. È anche il
//  motivo per cui Google non richiede alcuna verifica dell'app.
//
//  LIMITE STRUTTURALE, da tenere presente: un'app che gira solo nel browser
//  NON può ottenere un refresh token (servirebbe un server). Gli access token
//  durano un'ora e non si rinnovano in assenza dell'utente. Quindi "automatico"
//  qui significa: alla prima apertura utile dell'app la copia parte da sola,
//  di norma senza chiedere nulla perché il consenso è già stato dato. Non
//  significa "ogni notte alle tre".
// =============================================================================

import { db, setMeta } from "./db.js";
import { buildBackup } from "./backup.js";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPE = "https://www.googleapis.com/auth/drive.file";

// Nome del file su Drive. Resta lo stesso e viene sovrascritto: su Drive si
// può, a differenza del telefono, quindi il socio non si ritrova 40 copie.
const NOME_FILE = "Bonsai Manager — backup.json";

export function isDriveConfigured() {
  return Boolean(CLIENT_ID);
}

// --- Errori riconoscibili, per distinguere "non si può ora" da "è rotto" ----
export class DriveNonAutorizzato extends Error {
  constructor(msg = "Autorizzazione Google non ottenuta") {
    super(msg);
    this.name = "DriveNonAutorizzato";
  }
}

// ---------------------------------------------------------------------------
//  Token
// ---------------------------------------------------------------------------
// Il token sta SOLO in memoria: scade in un'ora e non ha senso persisterlo.
// Se l'app viene chiusa se ne chiede un altro, di norma senza interazione.
let tokenCorrente = null; // { value, scadeIl }
let tokenClient = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Impossibile caricare ${src}`));
    document.head.appendChild(s);
  });
}

function creaClient() {
  if (!tokenClient && window.google?.accounts?.oauth2) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: () => {}, // sostituita ad ogni richiesta
    });
  }
  return tokenClient;
}

// Va chiamata all'avvio. Motivo: la finestra di Google può aprirsi solo se la
// richiesta parte DENTRO il gesto dell'utente. Aspettare qui il caricamento
// della libreria consumerebbe quel gesto, e il browser bloccherebbe la
// finestra — con l'utente che vede "annullato" senza aver annullato niente.
export async function precaricaGis() {
  if (!isDriveConfigured()) return;
  try {
    await loadScript("https://accounts.google.com/gsi/client");
    creaClient();
  } catch {
    /* senza rete si riproverà al momento del clic */
  }
}

async function ensureTokenClient() {
  if (tokenClient) return tokenClient;
  await loadScript("https://accounts.google.com/gsi/client");
  return creaClient();
}

function tokenValido() {
  return tokenCorrente && tokenCorrente.scadeIl - 60000 > Date.now();
}

// Traduce i codici di Google in qualcosa di azionabile: "annullato" detto a chi
// non ha annullato nulla manda solo fuori strada.
function spiegaErrore(codice) {
  const c = String(codice || "");
  if (c.includes("popup_failed_to_open")) {
    return "Il browser blocca la finestra di Google: consenti i popup per questo sito (icona nella barra degli indirizzi) e riprova.";
  }
  if (c.includes("popup_closed")) return "Finestra di Google chiusa prima di concedere l’accesso.";
  if (c.includes("access_denied")) return "Accesso a Drive non concesso.";
  if (c.includes("permesso di Drive")) return "Hai lasciato disattivata la spunta di Drive: senza quella l’app non può salvare.";
  return c ? `Autorizzazione non riuscita (${c})` : "Autorizzazione non riuscita.";
}

// Chiede un access token. Con prompt "" Google non mostra nulla se il consenso
// è già stato dato e la sessione è attiva; altrimenti apre la finestra, e per
// questo va invocata da un gesto dell'utente: senza, il popup viene bloccato.
async function richiediToken() {
  // Il client di norma è già pronto (precaricaGis all'avvio): così la richiesta
  // parte nello stesso gesto del clic e la finestra non viene bloccata.
  // creaClient() è sincrona: se la libreria c'è già non si perde il gesto.
  const client = tokenClient || creaClient() || (await ensureTokenClient());
  if (!client) throw new DriveNonAutorizzato("Libreria di Google non disponibile.");

  // Dopo un fallimento il client di Google resta con una richiesta "in corso"
  // che non si chiude mai, e ignora in silenzio i tentativi successivi: il
  // secondo tocco non produrrebbe nulla. Si butta via e se ne fa uno nuovo.
  const fallito = (errore) => {
    tokenClient = null;
    return errore;
  };

  return new Promise((resolve, reject) => {
    client.callback = (resp) => {
      if (resp.error || !resp.access_token) {
        return reject(fallito(new DriveNonAutorizzato(spiegaErrore(resp.error_description || resp.error))));
      }
      // Consenso granulare: si può accedere con Google lasciando però la
      // spunta di Drive disattivata. Senza questo controllo il collegamento
      // risulterebbe riuscito e poi ogni salvataggio fallirebbe con un 403.
      // Si controlla la stringa `scope` della risposta, che è il dato di fatto.
      // (hasGrantedAllScopes di Google, su alcune versioni, dà falsi negativi.)
      const concessi = String(resp.scope || "").split(/\s+/);
      if (resp.scope && !concessi.includes(SCOPE)) {
        return reject(fallito(new DriveNonAutorizzato(spiegaErrore("permesso di Drive"))));
      }
      tokenCorrente = {
        value: resp.access_token,
        scadeIl: Date.now() + Number(resp.expires_in || 3600) * 1000,
      };
      resolve(tokenCorrente.value);
    };
    client.error_callback = (err) => {
      reject(fallito(new DriveNonAutorizzato(spiegaErrore(err?.type))));
    };
    try {
      client.requestAccessToken({ prompt: "" });
    } catch (e) {
      reject(fallito(new DriveNonAutorizzato(spiegaErrore(e.message))));
    }
  });
}

async function getToken() {
  if (tokenValido()) return tokenCorrente.value;
  return richiediToken();
}

// ---------------------------------------------------------------------------
//  Stato del collegamento (persistito in meta)
// ---------------------------------------------------------------------------
export async function statoDrive() {
  const [collegato, fileId, ultimo] = await Promise.all([
    db.meta.get("driveCollegato"),
    db.meta.get("driveFileId"),
    db.meta.get("lastDriveBackupAt"),
  ]);
  return {
    configurato: isDriveConfigured(),
    collegato: Boolean(collegato?.value),
    fileId: fileId?.value || null,
    ultimoBackup: ultimo?.value || null,
  };
}

// Collega Drive: va invocata da un gesto dell'utente (pulsante).
export async function collegaDrive() {
  if (!isDriveConfigured()) throw new Error("Google Drive non configurato.");
  await getToken(); // apre il consenso se serve
  await setMeta("driveCollegato", true);
}

export async function scollegaDrive() {
  // Revoca il token corrente, così l'accesso cessa subito e non solo alla
  // scadenza. Il file già su Drive resta al socio: è roba sua.
  try {
    if (tokenCorrente?.value) {
      window.google?.accounts?.oauth2?.revoke?.(tokenCorrente.value, () => {});
    }
  } catch {
    /* la revoca è un di più: se fallisce si prosegue comunque */
  }
  tokenCorrente = null;
  await setMeta("driveCollegato", false);
}

// ---------------------------------------------------------------------------
//  Caricamento
// ---------------------------------------------------------------------------
async function driveFetch(url, opts, token) {
  const res = await fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) {
    tokenCorrente = null; // token morto: la prossima volta se ne chiede uno nuovo
    throw new DriveNonAutorizzato(`Drive ha rifiutato la richiesta (${res.status})`);
  }
  return res;
}

// Cerca il file di backup già creato dall'app. Con l'ambito drive.file questa
// ricerca vede SOLO i file dell'app, non il Drive del socio.
// Ordinata per data di creazione: se per qualche motivo esistono più copie si
// tiene sempre la stessa (la più vecchia), invece di alternarle a caso.
async function cercaFileEsistente(token) {
  const q = encodeURIComponent(`name = '${NOME_FILE}' and trashed = false`);
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id)&orderBy=createdTime&pageSize=10`,
    { method: "GET" },
    token
  );
  if (!res.ok) return { id: null, quanti: 0 };
  const data = await res.json();
  const files = data.files || [];
  return { id: files[0]?.id || null, quanti: files.length };
}

async function aggiornaFile(fileId, blob, token) {
  const res = await driveFetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: blob },
    token
  );
  if (res.status === 404) return null; // il socio l'ha cancellato: se ne crea uno nuovo
  if (!res.ok) throw new Error(`Aggiornamento su Drive fallito (${res.status})`);
  return (await res.json()).id;
}

async function creaFile(blob, token) {
  const confine = "bonsai" + Math.random().toString(36).slice(2);
  const metadata = { name: NOME_FILE, mimeType: "application/json" };
  const corpo = new Blob(
    [
      `--${confine}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify(metadata),
      `\r\n--${confine}\r\nContent-Type: application/json\r\n\r\n`,
      blob,
      `\r\n--${confine}--\r\n`,
    ],
    { type: `multipart/related; boundary=${confine}` }
  );
  const res = await driveFetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${confine}` }, body: corpo },
    token
  );
  if (!res.ok) throw new Error(`Creazione su Drive fallita (${res.status})`);
  return (await res.json()).id;
}

// Due caricamenti avviati insieme (per esempio il salvataggio subito dopo il
// collegamento e il tentativo automatico all'apertura) cercherebbero entrambi
// il file prima che l'altro l'abbia creato, e ne creerebbero due. Chi arriva
// mentre un caricamento è in corso aspetta quello, non ne avvia un secondo.
let inCorso = null;

export async function backupSuDrive() {
  if (inCorso) return inCorso;
  inCorso = eseguiBackupSuDrive().finally(() => { inCorso = null; });
  return inCorso;
}

// Salva la collezione su Drive. Ritorna i conteggi del backup.
// Lancia DriveNonAutorizzato se il consenso non è (più) disponibile: chi chiama
// decide se mostrare un pulsante o restare in silenzio.
async function eseguiBackupSuDrive() {
  if (!isDriveConfigured()) throw new Error("Google Drive non configurato.");
  const token = await getToken();
  const { blob, counts } = await buildBackup();

  const stato = await statoDrive();
  let fileId = stato.fileId;
  let quanti = 1;

  // Se l'id manca (o il file non c'è più) si cerca prima di crearne un altro:
  // evita di riempire il Drive del socio di duplicati, per esempio dopo che i
  // dati locali sono stati cancellati e con essi l'id memorizzato.
  if (fileId) fileId = await aggiornaFile(fileId, blob, token);
  if (!fileId) {
    const trovato = await cercaFileEsistente(token);
    quanti = trovato.quanti;
    fileId = trovato.id ? await aggiornaFile(trovato.id, blob, token) : null;
  }
  if (!fileId) fileId = await creaFile(blob, token);

  const adesso = new Date().toISOString();
  await Promise.all([
    setMeta("driveFileId", fileId),
    setMeta("driveCollegato", true),
    setMeta("lastDriveBackupAt", adesso),
    // Un backup su Drive è a tutti gli effetti un backup: azzera anche
    // l'avviso "hai modifiche non salvate".
    setMeta("lastBackupAt", adesso),
  ]);
  // `duplicati` serve solo a segnalarlo all'utente: cancellare file dal Drive
  // di qualcun altro non è una decisione che spetta all'app.
  return { ...counts, duplicati: quanti > 1 ? quanti : 0 };
}

// Tentativo silenzioso all'apertura dell'app: se il consenso non è più valido
// non si insiste e non si disturba: l'interfaccia mostrerà il pulsante.
export async function backupSuDriveSePossibile() {
  const stato = await statoDrive();
  if (!stato.configurato || !stato.collegato) return null;
  try {
    return await backupSuDrive();
  } catch (e) {
    if (e instanceof DriveNonAutorizzato) return null;
    console.warn("Backup su Drive non riuscito:", e);
    return null;
  }
}
