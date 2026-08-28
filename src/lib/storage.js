// =============================================================================
//  STORAGE PERSISTENTE — protezione dei dati locali
// =============================================================================
//  Di default IndexedDB è "best-effort": il browser è AUTORIZZATO a cancellarla
//  quando ha bisogno di spazio, senza avvisare. Installare l'app sulla home NON
//  basta: rende solo automatica la concessione del permesso, ma il permesso va
//  comunque chiesto. Non chiedendolo mai, l'app ha perso l'intera collezione di
//  un socio (agosto 2026, Android installato sulla home).
//
//  navigator.storage.persist() promuove i dati a "persistent": da lì in poi si
//  cancellano solo se è l'utente a farlo esplicitamente (disinstallazione,
//  "cancella dati del sito"). Su app installata il permesso arriva senza
//  mostrare nulla; da scheda del browser può essere negato, e in quel caso
//  l'unica rete di sicurezza restano i backup.
// =============================================================================

export function persistSupported() {
  return typeof navigator !== "undefined" && typeof navigator.storage?.persist === "function";
}

// Chiede lo storage persistente se non lo è già.
// Idempotente e non lancia mai: in caso di dubbio riporta "non protetto".
export async function ensurePersisted() {
  if (!persistSupported()) return { supported: false, persisted: false };
  try {
    if (await navigator.storage.persisted()) {
      return { supported: true, persisted: true, justGranted: false };
    }
    const granted = await navigator.storage.persist();
    return { supported: true, persisted: granted, justGranted: granted };
  } catch {
    return { supported: false, persisted: false };
  }
}

// Quanto pesa la collezione e quanto spazio resta.
export async function storageEstimate() {
  if (typeof navigator === "undefined" || typeof navigator.storage?.estimate !== "function") return null;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { usage: usage || 0, quota: quota || 0 };
  } catch {
    return null;
  }
}

export function formatBytes(n) {
  if (!n) return "0 KB";
  const kb = n / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  const mb = kb / 1024;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}
