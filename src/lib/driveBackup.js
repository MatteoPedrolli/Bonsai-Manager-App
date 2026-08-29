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

async function ensureTokenClient() {
  await loadScript("https://accounts.google.com/gsi/client");
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: () => {}, // sostituita ad ogni richiesta
    });
  }
  return tokenClient;
}

function tokenValido() {
  return tokenCorrente && tokenCorrente.scadeIl - 60000 > Date.now();
}

// Chiede un access token. Con prompt "" Google non mostra nulla se il consenso
// è già stato dato e la sessione è attiva; altrimenti apre la finestra, e per
// questo va chiamata da un gesto dell'utente (altrimenti il popup è bloccato).
async function richiediToken() {
  const client = await ensureTokenClient();
  return new Promise((resolve, reject) => {
    client.callback = (resp) => {
      if (resp.error || !resp.access_token) {
        return reject(new DriveNonAutorizzato(resp.error_description || resp.error));
      }
      // Consenso granulare: si può accedere con Google lasciando però la
      // spunta di Drive disattivata. Senza questo controllo il collegamento
      // risulterebbe riuscito e poi ogni salvataggio fallirebbe con un 403.
      const ok = window.google?.accounts?.oauth2?.hasGrantedAllScopes?.(resp, SCOPE);
      if (ok === false) {
        return reject(new DriveNonAutorizzato("permesso di Drive non concesso"));
      }
      tokenCorrente = {
        value: resp.access_token,
        scadeIl: Date.now() + Number(resp.expires_in || 3600) * 1000,
      };
      resolve(tokenCorrente.value);
    };
    client.error_callback = (err) => {
      reject(new DriveNonAutorizzato(err?.type || "popup non disponibile"));
    };
    try {
      client.requestAccessToken({ prompt: "" });
    } catch (e) {
      reject(new DriveNonAutorizzato(e.message));
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
async function cercaFileEsistente(token) {
  const q = encodeURIComponent(`name = '${NOME_FILE}' and trashed = false`);
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name)&pageSize=1`,
    { method: "GET" },
    token
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0]?.id || null;
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

// Salva la collezione su Drive. Ritorna i conteggi del backup.
// Lancia DriveNonAutorizzato se il consenso non è (più) disponibile: chi chiama
// decide se mostrare un pulsante o restare in silenzio.
export async function backupSuDrive() {
  if (!isDriveConfigured()) throw new Error("Google Drive non configurato.");
  const token = await getToken();
  const { blob, counts } = await buildBackup();

  const stato = await statoDrive();
  let fileId = stato.fileId;

  // Se l'id manca (o il file non c'è più) si cerca prima di crearne un altro:
  // evita di riempire il Drive del socio di duplicati, per esempio dopo che i
  // dati locali sono stati cancellati e con essi l'id memorizzato.
  if (fileId) fileId = await aggiornaFile(fileId, blob, token);
  if (!fileId) {
    const trovato = await cercaFileEsistente(token);
    fileId = trovato ? await aggiornaFile(trovato, blob, token) : null;
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
  return counts;
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
