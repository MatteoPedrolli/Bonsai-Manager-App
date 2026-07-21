import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";
import { INK, PAPER, SEAL, MOSS, FONT_BODY } from "../lib/constants.js";

// Avviso "Nuova versione disponibile" + "app pronta offline" (spec §8).
// Reso no-op in dev (il service worker vive solo nella build di produzione).
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;

  const close = () => { setNeedRefresh(false); setOfflineReady(false); };

  return (
    <div
      className="fixed left-1/2 z-50 flex items-center gap-3 px-4 py-3"
      style={{
        bottom: "calc(64px + env(safe-area-inset-bottom))", transform: "translateX(-50%)",
        width: "calc(100% - 24px)", maxWidth: 456,
        background: INK, color: PAPER, borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,.3)",
      }}
    >
      <span className="flex-1" style={{ fontFamily: FONT_BODY, fontSize: 12.5 }}>
        {needRefresh ? "Nuova versione disponibile." : "App pronta per l'uso offline."}
      </span>
      {needRefresh && (
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex items-center gap-1 px-3 py-1.5"
          style={{ background: SEAL, color: PAPER, borderRadius: 6, fontFamily: FONT_BODY, fontSize: 12 }}
        >
          <RefreshCw size={13} /> Aggiorna
        </button>
      )}
      {!needRefresh && offlineReady && (
        <span className="flex items-center gap-1 px-2" style={{ color: MOSS, fontFamily: FONT_BODY, fontSize: 12 }}>
          pronta
        </span>
      )}
      <button onClick={close} aria-label="Chiudi" className="p-1"><X size={16} color={PAPER} /></button>
    </div>
  );
}
