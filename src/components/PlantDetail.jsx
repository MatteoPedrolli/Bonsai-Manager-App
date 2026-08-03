import { useState, useEffect } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import {
  INK, PAPER, PAPER_DEEP, SEAL, BARK, FONT_DISPLAY, FONT_BODY,
  colorForStato, fmtDate,
} from "../lib/constants.js";
import { Seal, TopBar, Ring } from "./common.jsx";
import { PhotoStrip } from "./PhotoGallery.jsx";
import { getPhotos, photoDate } from "../lib/photos.js";

function blobToDataURL(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

function downloadText(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PlantDetail({ plant, onBack, onUpdate, onDelete, statoOptions, onNotify }) {
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const statoTags = plant.tags?.stato || [];

  // Stato locale editabile (misure + note): sincronizzato al cambio pianta,
  // committato su DB al blur per non scrivere ad ogni tasto.
  const [measures, setMeasures] = useState({ altezza: plant.altezza, profondita: plant.profondita, larghezza: plant.larghezza });
  const [note, setNote] = useState(plant.note || "");
  useEffect(() => {
    setMeasures({ altezza: plant.altezza, profondita: plant.profondita, larghezza: plant.larghezza });
    setNote(plant.note || "");
  }, [plant.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleStato = (tag) => {
    const next = statoTags.includes(tag) ? statoTags.filter((t) => t !== tag) : [...statoTags, tag];
    onUpdate(plant.id, { tags: { ...plant.tags, stato: next } });
  };

  const commitMeasure = (field) => {
    const val = Number(measures[field]) || 0;
    if (val !== plant[field]) onUpdate(plant.id, { [field]: val });
  };

  const commitNote = () => {
    if (note !== (plant.note || "")) onUpdate(plant.id, { note });
  };

  const exportStorico = () => {
    const lines = [
      `Storico interventi — ${plant.nome} (${plant.specie})`, "",
      ...(plant.storico || []).map((i) => `${fmtDate(i.data)} — ${i.tipo}${i.note ? " — " + i.note : ""}`),
    ];
    downloadText(`${plant.nome}_storico.txt`, lines.join("\n"));
    onNotify?.("Storico esportato");
  };

  // Album come singolo file HTML autoconsistente con le foto incorporate.
  const exportAlbum = async () => {
    const photos = await getPhotos(plant.id);
    if (photos.length === 0) return onNotify?.("Nessuna foto da esportare");
    const imgs = [];
    for (const p of photos) {
      const dataUrl = await blobToDataURL(p.blob);
      imgs.push(`<figure><img src="${dataUrl}" alt=""/><figcaption>${fmtDate(photoDate(p))}${p.caption ? " — " + p.caption : ""}</figcaption></figure>`);
    }
    const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Album ${plant.nome}</title>
<style>body{font-family:sans-serif;background:#E6E2D6;color:#1C1B19;margin:0;padding:24px}
h1{font-size:22px}figure{margin:0 0 24px}img{max-width:100%;border-radius:6px;display:block}
figcaption{font-size:13px;color:#8C7B65;margin-top:6px}</style></head>
<body><h1>${plant.nome} — ${plant.specie}</h1>${imgs.join("")}</body></html>`;
    downloadText(`${plant.nome}_album.html`, html, "text/html");
    onNotify?.(`Album esportato (${photos.length} foto)`);
  };

  const inputCard = { background: PAPER_DEEP, borderRadius: 4 };

  return (
    <div style={{ background: PAPER, minHeight: "100dvh" }}>
      <TopBar title={plant.nome} onBack={onBack} />

      <div className="px-4 pt-4">
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: BARK, fontStyle: "italic" }}>
          {plant.specie}{plant.provenienza ? ` — ${plant.provenienza}` : ""}
        </div>

        {/* Tag tipo + stato */}
        <div className="mt-1 mb-4 flex items-center gap-1 flex-wrap">
          {plant.tags?.tipo && (
            <>
              <Seal label={plant.tags.tipo} color={INK} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: INK, marginRight: 8 }}>{plant.tags.tipo}</span>
            </>
          )}
          {statoTags.map((s) => (
            <button key={s} onClick={() => toggleStato(s)} className="flex items-center mr-2">
              <Seal label={s} color={colorForStato(statoOptions, s)} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: INK }}>{s}</span>
              <X size={11} color={BARK} style={{ marginLeft: 2 }} />
            </button>
          ))}
          <button
            onClick={() => setShowTagPicker((v) => !v)}
            className="flex items-center gap-1 px-2 py-0.5"
            style={{ border: `1px dashed ${BARK}`, borderRadius: 12, fontFamily: FONT_BODY, fontSize: 10.5, color: BARK }}
          >
            <Plus size={10} /> tag
          </button>
        </div>

        {showTagPicker && (
          <div className="flex gap-2 flex-wrap mb-4 -mt-2">
            {statoOptions.filter((s) => !statoTags.includes(s.label)).map((s) => (
              <button
                key={s.label}
                onClick={() => { toggleStato(s.label); setShowTagPicker(false); }}
                className="px-2 py-1 flex items-center gap-1"
                style={{ border: `1px solid ${s.color}`, borderRadius: 12, fontFamily: FONT_BODY, fontSize: 10.5, color: INK }}
              >
                <Seal label={s.label} color={s.color} /> {s.label}
              </button>
            ))}
            {statoOptions.filter((s) => !statoTags.includes(s.label)).length === 0 && (
              <span style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: BARK }}>Tutti i tag di stato sono già applicati.</span>
            )}
          </div>
        )}

        {/* Foto: striscia + galleria fullscreen */}
        <PhotoStrip plantId={plant.id} onNotify={onNotify} />

        <div className="flex gap-2 mb-4">
          <button onClick={exportAlbum} className="flex-1 py-2" style={{ border: `1px solid ${BARK}`, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 11.5, color: INK, background: "transparent" }}>
            Esporta album foto
          </button>
          <button onClick={exportStorico} className="flex-1 py-2" style={{ border: `1px solid ${BARK}`, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 11.5, color: INK, background: "transparent" }}>
            Esporta storico
          </button>
        </div>

        {/* Misure */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[["altezza", "Altezza"], ["profondita", "Profondità"], ["larghezza", "Larghezza"]].map(([field, label]) => (
            <div key={field} className="p-2 text-center" style={inputCard}>
              <input
                type="number"
                inputMode="numeric"
                value={measures[field]}
                onChange={(e) => setMeasures((m) => ({ ...m, [field]: e.target.value }))}
                onBlur={() => commitMeasure(field)}
                className="w-full text-center"
                style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: INK, background: "transparent", border: "none", outline: "none" }}
              />
              <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: BARK }}>{label} (cm)</div>
            </div>
          ))}
        </div>

        {/* Date automatiche */}
        <div className="mb-5 p-3" style={inputCard}>
          {[
            ["Ultima concimazione", plant.ultimaConcimazione],
            ["Ultimo rinvaso", plant.ultimoRinvaso],
            ["Ultima lavorazione", plant.ultimaLavorazione],
          ].map(([label, date]) => (
            <div key={label} className="flex justify-between py-1" style={{ fontFamily: FONT_BODY, fontSize: 12 }}>
              <span style={{ color: BARK }}>{label}</span>
              <span style={{ color: INK }}>{fmtDate(date)}</span>
            </div>
          ))}
        </div>

        {/* Note */}
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: INK, marginBottom: 8 }}>Note</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={commitNote}
          placeholder="Annotazioni libere su questa pianta…"
          className="w-full p-2 mb-5"
          rows={3}
          style={{ border: `1px solid ${BARK}55`, borderRadius: 4, background: PAPER_DEEP, fontFamily: FONT_BODY, fontSize: 12.5, color: INK, resize: "vertical" }}
        />

        {/* Storico */}
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: INK, marginBottom: 10 }}>Storico interventi</div>
        <div className="pb-6">
          {(plant.storico || []).length === 0 && (
            <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: BARK }}>Nessun intervento registrato.</div>
          )}
          {(plant.storico || []).map((item, idx) => (
            <Ring key={idx} item={item} isLast={idx === plant.storico.length - 1} />
          ))}
        </div>

        {/* Elimina */}
        <div className="pb-28">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-2.5 flex items-center justify-center gap-2"
              style={{ border: `1px solid ${SEAL}`, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 12.5, color: SEAL, background: "transparent" }}
            >
              <Trash2 size={14} /> Elimina scheda pianta
            </button>
          ) : (
            <div className="p-3" style={{ border: `1px solid ${SEAL}`, borderRadius: 4, background: `${SEAL}12` }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: INK, marginBottom: 8 }}>
                Eliminare definitivamente “{plant.nome}”? Storico e foto andranno persi.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2"
                  style={{ border: `1px solid ${BARK}`, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 12, color: INK, background: "transparent" }}
                >
                  Annulla
                </button>
                <button
                  onClick={() => onDelete(plant.id)}
                  className="flex-1 py-2"
                  style={{ background: SEAL, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 12, color: PAPER }}
                >
                  Conferma eliminazione
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
