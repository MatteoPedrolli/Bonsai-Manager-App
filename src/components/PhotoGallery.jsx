import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Camera, Images, ImageIcon, Plus, X, ChevronLeft, ChevronRight, Trash2, Pencil,
  CalendarDays, HelpCircle,
} from "lucide-react";
import { db } from "../lib/db.js";
import {
  addPhotos, deletePhoto, updatePhotoCaption, updatePhotoDate, confermaPhotoDate,
  sortPhotosNewestFirst, photoDate,
} from "../lib/photos.js";
import { INK, PAPER, PAPER_DEEP, BARK, SEAL, FONT_DISPLAY, FONT_BODY } from "../lib/constants.js";

// ISO -> "AAAA-MM-GG" per <input type="date"> (in ora locale, non UTC).
function toInputDay(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Etichetta compatta per la miniatura: "set 2019".
function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("it-IT", { month: "short", year: "numeric" });
}

// Crea/revoca gli object URL per i blob delle foto, seguendo l'elenco corrente.
function useObjectUrls(photos) {
  const [urls, setUrls] = useState({});
  useEffect(() => {
    const map = {};
    for (const p of photos) map[p.id] = URL.createObjectURL(p.blob);
    setUrls(map);
    return () => Object.values(map).forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.map((p) => p.id).join(",")]);
  return urls;
}

// =============================================================================
//  Striscia foto cronologica + pulsante aggiungi
// =============================================================================
export function PhotoStrip({ plantId, onNotify }) {
  // Ordine cronologico inverso per data di SCATTO (takenAt), non di caricamento:
  // prima le più recenti, si scorre indietro nel tempo.
  const photos = useLiveQuery(
    () => db.photos.where("plantId").equals(plantId).toArray().then(sortPhotosNewestFirst),
    [plantId],
    []
  );
  const urls = useObjectUrls(photos);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  // Salva un elenco di File (da input o da Drive) attraverso la pipeline foto.
  const ingest = async (files, sourceLabel) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const n = await addPhotos(plantId, files);
      onNotify?.(n > 0 ? `${n} foto aggiunt${n > 1 ? "e" : "a"}` : "Nessuna immagine valida");
    } catch (err) {
      console.error(err);
      onNotify?.(`Errore ${sourceLabel || ""}`.trim());
    } finally {
      setBusy(false);
    }
  };

  const handleInput = async (e) => {
    const files = e.target.files;
    await ingest(files, "nel salvataggio");
    e.target.value = ""; // permette di ri-selezionare lo stesso file
  };

  // Nota: sulla miniatura non c'è il cestino — si eliminava una foto per sbaglio
  // troppo facilmente. L'eliminazione sta solo nel visore, con conferma.

  return (
    <>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {photos.map((photo, idx) => (
          <div
            key={photo.id}
            onClick={() => setLightboxIndex(idx)}
            className="flex-shrink-0 overflow-hidden relative"
            style={{ width: 88, height: 88, borderRadius: 4, background: "#CFC9B8", border: `1px solid ${BARK}44`, cursor: "pointer" }}
          >
            {urls[photo.id] ? (
              <img
                src={urls[photo.id]}
                alt={photo.caption || "Foto pianta"}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <span className="flex flex-col items-center justify-center w-full h-full gap-1" style={{ color: BARK }}>
                <ImageIcon size={18} />
                <span style={{ fontFamily: FONT_BODY, fontSize: 8.5, textAlign: "center", lineHeight: 1.1 }}>
                  non caricata
                </span>
              </span>
            )}
            <span
              className="absolute left-0 right-0 bottom-0 text-center"
              style={{
                background: "linear-gradient(transparent, rgba(28,27,25,.72))",
                color: PAPER, fontFamily: FONT_BODY, fontSize: 9, padding: "8px 2px 2px",
              }}
            >
              {shortDate(photoDate(photo))}
              {photo.dataIncerta && (
                <span title="Data non presente nella foto: da confermare" style={{ opacity: 0.9 }}> ?</span>
              )}
            </span>
          </div>
        ))}

        <button
          onClick={() => setSheet(true)}
          disabled={busy}
          className="flex-shrink-0 flex flex-col items-center justify-center gap-1"
          style={{ width: 88, height: 88, border: `1px dashed ${BARK}`, borderRadius: 4, color: BARK, background: "transparent", opacity: busy ? 0.5 : 1 }}
        >
          {busy ? <ImageIcon size={18} /> : <Plus size={20} />}
          <span style={{ fontFamily: FONT_BODY, fontSize: 10 }}>{busy ? "Salvo…" : "Aggiungi"}</span>
        </button>

        {/* input nascosti: fotocamera (capture) e galleria */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleInput} style={{ display: "none" }} />
        <input ref={galleryRef} type="file" accept="image/*,.heic,.heif" multiple onChange={handleInput} style={{ display: "none" }} />
      </div>

      {sheet && (
        <SourceSheet
          onClose={() => setSheet(false)}
          onCamera={() => { setSheet(false); cameraRef.current?.click(); }}
          onGallery={() => { setSheet(false); galleryRef.current?.click(); }}
        />
      )}

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          urls={urls}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNotify={onNotify}
        />
      )}
    </>
  );
}

// Action sheet: scelta sorgente foto (spec §7).
// Il selettore di sistema ("Da galleria") espone già le foto del cloud
// (Google Foto), quindi non serve un'integrazione dedicata.
function SourceSheet({ onClose, onCamera, onGallery }) {
  const Row = ({ icon: Icon, label, hint, onClick, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 p-3 mb-2 text-left"
      style={{ background: PAPER_DEEP, borderRadius: 6, opacity: disabled ? 0.5 : 1 }}
    >
      <span className="flex items-center justify-center flex-shrink-0" style={{ width: 38, height: 38, borderRadius: "50%", background: PAPER, color: INK }}>
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block" style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: INK }}>{label}</span>
        {hint && <span className="block" style={{ fontFamily: FONT_BODY, fontSize: 11, color: BARK }}>{hint}</span>}
      </span>
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center" style={{ background: "#00000055" }} onClick={onClose}>
      <div
        className="w-full p-5"
        style={{ maxWidth: 480, background: PAPER, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: INK }}>Aggiungi foto</span>
          <button onClick={onClose} aria-label="Chiudi"><X size={20} color={INK} /></button>
        </div>
        <Row icon={Camera} label="Scatta foto" hint="Fotocamera del dispositivo" onClick={onCamera} />
        <Row icon={Images} label="Da galleria" hint="Foto del telefono e Google Foto" onClick={onGallery} />
      </div>
    </div>,
    document.body
  );
}

// =============================================================================
//  Lightbox a schermo intero — swipe (touch), frecce (desktop), tastiera, elimina.
//  Renderizzata in un portale su document.body per uscire dal contenitore 480px.
// =============================================================================
function Lightbox({ photos, urls, startIndex, onClose, onNotify }) {
  const [index, setIndex] = useState(startIndex);
  const [confirmDel, setConfirmDel] = useState(false);
  const touch = useRef({ x: 0, y: 0, active: false });
  const keepFollowingId = useRef(null);

  const count = photos.length;
  const current = photos[index];

  // Bozze didascalia e data, sincronizzate al cambio foto; salvate al blur.
  const [caption, setCaption] = useState(current?.caption || "");
  const [day, setDay] = useState(toInputDay(photoDate(current)));
  useEffect(() => {
    setCaption(current?.caption || "");
    setDay(toInputDay(photoDate(current)));
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveCaption = () => {
    if (current && caption !== (current.caption || "")) {
      updatePhotoCaption(current.id, caption.trim());
    }
  };

  // Cambiando la data la foto si riposiziona da sola nell'ordine cronologico:
  // seguiamo l'immagine per non ritrovarci su un'altra foto.
  const saveDay = async () => {
    if (!current || !day || day === toInputDay(photoDate(current))) return;
    // Il segnalibro va messo PRIMA della scrittura: l'elenco può aggiornarsi
    // subito dopo il commit, anche prima che la update() ritorni.
    keepFollowingId.current = current.id;
    try {
      await updatePhotoDate(current.id, day);
      onNotify?.("Data aggiornata");
    } catch (e) {
      // Un salvataggio fallito in silenzio è peggio di un errore: chi prova a
      // correggere la data non capirebbe perché non cambia nulla.
      console.error(e);
      keepFollowingId.current = null;
      setDay(toInputDay(photoDate(current)));
      onNotify?.("Non sono riuscito a salvare la data");
    }
  };

  const go = useCallback(
    (dir) => {
      setConfirmDel(false);
      setIndex((i) => (i + dir + count) % count);
    },
    [count]
  );

  // Se l'elenco si svuota o cambia lunghezza (foto eliminata), chiudi/aggiusta.
  useEffect(() => {
    if (count === 0) onClose();
    else if (index >= count) setIndex(count - 1);
  }, [count, index, onClose]);

  // Dopo un cambio data l'ordine si aggiorna: resta sulla stessa foto.
  useEffect(() => {
    const id = keepFollowingId.current;
    if (id == null) return;
    const pos = photos.findIndex((p) => p.id === id);
    if (pos >= 0 && pos !== index) setIndex(pos);
    keepFollowingId.current = null;
  }, [photos, index]);

  // Tastiera + blocco scroll di fondo
  useEffect(() => {
    const onKey = (e) => {
      // Se si sta scrivendo la didascalia, non intercettare le frecce.
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        if (e.key === "Escape") e.target.blur();
        return;
      }
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [go, onClose]);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, active: true };
  };
  const onTouchEnd = (e) => {
    if (!touch.current.active) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current.active = false;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) onClose(); // swipe giù per chiudere
  };

  const handleDelete = async () => {
    const id = current.id;
    await deletePhoto(id);
    onNotify?.("Foto eliminata");
    setConfirmDel(false);
    // l'effetto su [count] richiuderà o riposizionerà automaticamente
  };

  if (!current) return null;

  const btn = {
    background: "rgba(0,0,0,.45)", color: PAPER, border: "none",
    borderRadius: "50%", width: 44, height: 44,
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex flex-col"
      style={{ background: "rgba(12,11,10,.96)" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Barra superiore: contatore + chiudi */}
      <div className="flex items-center justify-between px-4 py-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
        <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: PAPER, opacity: 0.85 }}>
          {index + 1} / {count}
        </span>
        <button onClick={onClose} style={btn} aria-label="Chiudi">
          <X size={22} />
        </button>
      </div>

      {/* Immagine */}
      <div className="flex-1 flex items-center justify-center px-2 relative select-none">
        {count > 1 && (
          <button onClick={() => go(-1)} style={{ ...btn, position: "absolute", left: 8 }} aria-label="Precedente">
            <ChevronLeft size={24} />
          </button>
        )}
        <img
          src={urls[current.id]}
          alt={current.caption || "Foto pianta"}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          draggable={false}
        />
        {count > 1 && (
          <button onClick={() => go(1)} style={{ ...btn, position: "absolute", right: 8 }} aria-label="Successiva">
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Barra inferiore: didascalia editabile + data + elimina */}
      <div className="px-4 py-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 14px)" }}>
        {/* Didascalia */}
        <div
          className="flex items-center gap-2 mb-3 px-3 py-2"
          style={{ background: "rgba(255,255,255,.08)", borderRadius: 8 }}
        >
          <Pencil size={14} color={PAPER} style={{ opacity: 0.6, flexShrink: 0 }} />
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={saveCaption}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            placeholder="Aggiungi una didascalia…"
            maxLength={140}
            className="flex-1 min-w-0"
            style={{ background: "transparent", border: "none", outline: "none", color: PAPER, fontFamily: FONT_BODY, fontSize: 13.5 }}
          />
        </div>

        {/* Quando la data non era nei dati della foto, l'app ha dovuto tirare a
            indovinare: dirlo, invece di presentarla come certa. */}
        {current.dataIncerta && (
          <div
            className="flex items-center gap-2 mb-2 px-3 py-2"
            style={{ background: "rgba(255,255,255,.08)", borderRadius: 8 }}
          >
            <HelpCircle size={14} color={PAPER} style={{ opacity: 0.7, flexShrink: 0 }} />
            <span className="flex-1 min-w-0" style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: PAPER, opacity: 0.85 }}>
              Questa foto non conteneva la data: quella qui sotto è solo una stima.
            </span>
            <button
              onClick={async () => { await confermaPhotoDate(current.id); onNotify?.("Data confermata"); }}
              className="flex-shrink-0 px-2.5 py-1"
              style={{ background: "transparent", border: `1px solid ${PAPER}66`, borderRadius: 5, color: PAPER, fontFamily: FONT_BODY, fontSize: 11 }}
            >
              È giusta
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          {/* Data dello scatto: modificabile, riordina le foto */}
          <label
            className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
            style={{ background: "rgba(255,255,255,.08)", borderRadius: 8, cursor: "pointer" }}
            title="Data della foto — determina l'ordine cronologico"
          >
            <CalendarDays size={14} color={PAPER} style={{ opacity: day ? 0.6 : 1 }} />
            {!day && (
              <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: PAPER, opacity: 0.75 }}>
                senza data —
              </span>
            )}
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              onBlur={saveDay}
              style={{
                background: "transparent", border: "none", outline: "none",
                color: PAPER, fontFamily: FONT_BODY, fontSize: 12.5, colorScheme: "dark",
              }}
            />
          </label>

          {!confirmDel ? (
          <button
            onClick={() => setConfirmDel(true)}
            className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
            style={{ background: "transparent", border: `1px solid ${PAPER}66`, borderRadius: 6, color: PAPER, fontFamily: FONT_BODY, fontSize: 12 }}
          >
            <Trash2 size={15} /> Elimina
          </button>
        ) : (
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setConfirmDel(false)}
              className="px-3 py-2"
              style={{ background: "transparent", border: `1px solid ${PAPER}66`, borderRadius: 6, color: PAPER, fontFamily: FONT_BODY, fontSize: 12 }}
            >
              Annulla
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-2"
              style={{ background: SEAL, border: "none", borderRadius: 6, color: PAPER, fontFamily: FONT_BODY, fontSize: 12 }}
            >
              Conferma
            </button>
          </div>
        )}
        </div>
      </div>
    </div>,
    document.body
  );
}
