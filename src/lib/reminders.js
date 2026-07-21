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

export function reminderLabel(item) {
  const d = daysUntil(item.data);
  if (d < 0) return `in ritardo di ${Math.abs(d)} ${Math.abs(d) === 1 ? "giorno" : "giorni"}`;
  if (d === 0) return "oggi";
  if (d === 1) return "domani";
  return `tra ${d} giorni`;
}
