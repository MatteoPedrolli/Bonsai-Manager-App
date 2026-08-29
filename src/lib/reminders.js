// Promemoria interventi pianificati in scadenza (spec §9, Fase 3).
// Serverless: la classificazione avviene all'apertura dell'app sui dati locali.

const DAY = 86400000;

export function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Giorni tra oggi e la data prevista (negativo = già passata).
export function daysUntil(iso) {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - todayStart()) / DAY);
}

// "overdue" = scaduto; "soon" = entro 7 giorni; "future" = oltre.
export function classifyPlanned(item, soonDays = 7) {
  const d = daysUntil(item.data);
  if (d < 0) return "overdue";
  if (d <= soonDays) return "soon";
  return "future";
}

// Riepilogo per banner e badge.
export function dueSummary(planned, soonDays = 7) {
  let overdue = 0;
  let soon = 0;
  for (const p of planned || []) {
    const c = classifyPlanned(p, soonDays);
    if (c === "overdue") overdue++;
    else if (c === "soon") soon++;
  }
  return { overdue, soon, due: overdue + soon, total: (planned || []).length };
}

// Pallino col numero sull'icona dell'app nella schermata home.
// Perché questo e non una notifica: resta visibile anche ad app chiusa, non
// chiede permessi, non interrompe, e non obbliga a mettere le mani nel service
// worker — che è il componente da cui dipende l'app di tutti i soci.
// Dove non è supportato (browser non installato, iOS senza permesso) non
// succede nulla: è un di più, non un meccanismo su cui contare.
export async function aggiornaBadge(quanti) {
  if (typeof navigator === "undefined" || !("setAppBadge" in navigator)) return;
  try {
    if (quanti > 0) await navigator.setAppBadge(quanti);
    else await navigator.clearAppBadge();
  } catch {
    /* su alcune piattaforme richiede il permesso notifiche: se manca, pazienza */
  }
}

export function reminderLabel(item) {
  const d = daysUntil(item.data);
  if (d < 0) return `in ritardo di ${Math.abs(d)} ${Math.abs(d) === 1 ? "giorno" : "giorni"}`;
  if (d === 0) return "oggi";
  if (d === 1) return "domani";
  return `tra ${d} giorni`;
}
