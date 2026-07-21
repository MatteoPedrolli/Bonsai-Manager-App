// Statistiche di collezione (spec §9, Fase 3). Calcolo puro sui dati locali.

export function computeStats(plants) {
  const list = plants || [];
  const byTipo = {};
  const byStato = {};
  let interventiTotali = 0;
  let interventiAnno = 0;
  let ultimaAttivita = null;
  const currentYear = new Date().getFullYear();

  for (const p of list) {
    const tipo = p.tags?.tipo || "—";
    byTipo[tipo] = (byTipo[tipo] || 0) + 1;
    for (const s of p.tags?.stato || []) byStato[s] = (byStato[s] || 0) + 1;

    for (const ev of p.storico || []) {
      interventiTotali++;
      if (ev.data && new Date(ev.data).getFullYear() === currentYear) interventiAnno++;
      if (ev.data && (!ultimaAttivita || ev.data > ultimaAttivita)) ultimaAttivita = ev.data;
    }
  }

  const sortEntries = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);

  return {
    totale: list.length,
    byTipo: sortEntries(byTipo),
    byStato: sortEntries(byStato),
    interventiTotali,
    interventiAnno,
    ultimaAttivita,
  };
}
