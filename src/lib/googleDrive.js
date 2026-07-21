// =============================================================================
//  Import foto da Google Drive (spec §2, §7) — Google Picker + GIS OAuth.
//  Il login Google avviene SOLO al momento dell'import: non è un account
//  dell'app, non viene salvato nulla. Le foto scelte vengono scaricate e passate
//  alla stessa pipeline di compressione delle altre (addPhotos).
//
//  CONFIGURAZIONE (senza queste l'opzione resta disabilitata):
//    .env  →  VITE_GOOGLE_CLIENT_ID=...   VITE_GOOGLE_API_KEY=...
//  Vedi README per come ottenerle dalla Google Cloud Console.
// =============================================================================

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SCOPE = "https://www.googleapis.com/auth/drive.readonly";

export function isDriveConfigured() {
  return Boolean(CLIENT_ID && API_KEY);
}

// Carica uno script esterno una sola volta.
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

let pickerLoaded = false;
async function ensurePicker() {
  await loadScript("https://apis.google.com/js/api.js");
  if (!pickerLoaded) {
    await new Promise((resolve) => window.gapi.load("picker", { callback: resolve }));
    pickerLoaded = true;
  }
}

async function ensureGis() {
  await loadScript("https://accounts.google.com/gsi/client");
}

// Richiede un access token via Google Identity Services (popup di consenso).
function requestAccessToken() {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) reject(new Error(resp.error));
        else resolve(resp.access_token);
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

// Apre il Picker filtrato sulle immagini, ritorna gli id dei file scelti.
function openPicker(accessToken) {
  return new Promise((resolve) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS_IMAGES)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false)
      .setMimeTypes("image/png,image/jpeg,image/jpg,image/webp,image/heic");

    const picker = new window.google.picker.PickerBuilder()
      .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
      .setOAuthToken(accessToken)
      .setDeveloperKey(API_KEY)
      .addView(view)
      .setCallback((data) => {
        const action = data[window.google.picker.Response.ACTION];
        if (action === window.google.picker.Action.PICKED) {
          const docs = data[window.google.picker.Response.DOCUMENTS] || [];
          resolve(docs.map((d) => d[window.google.picker.Document.ID]));
        } else if (action === window.google.picker.Action.CANCEL) {
          resolve([]);
        }
      })
      .build();
    picker.setVisible(true);
  });
}

async function downloadFile(fileId, accessToken) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Download fallito (${res.status})`);
  const blob = await res.blob();
  return new File([blob], `drive-${fileId}.jpg`, { type: blob.type || "image/jpeg" });
}

// Flusso completo: consenso → picker → download. Ritorna un array di File.
export async function pickFromDrive() {
  if (!isDriveConfigured()) {
    throw new Error("Google Drive non configurato (mancano VITE_GOOGLE_CLIENT_ID / VITE_GOOGLE_API_KEY).");
  }
  await Promise.all([ensurePicker(), ensureGis()]);
  const token = await requestAccessToken();
  const ids = await openPicker(token);
  const files = [];
  for (const id of ids) files.push(await downloadFile(id, token));
  return files;
}
