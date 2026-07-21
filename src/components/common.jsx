import { ArrowLeft, Home as HomeIcon, CalendarClock, Settings } from "lucide-react";
import { INK, PAPER, SEAL, BARK, MOSS, FONT_DISPLAY, FONT_BODY, fmtDate } from "../lib/constants.js";

// Sigillo "hanko": piccolo cerchio colorato di stato (spec §3)
export function Seal({ label, color, size = 10 }) {
  return (
    <span
      title={label}
      style={{
        display: "inline-flex", width: size, height: size, borderRadius: "50%",
        background: color, border: `1px solid ${INK}`, marginRight: 4, flexShrink: 0,
      }}
    />
  );
}

export function TopBar({ title, onBack, right }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-4 sticky top-0 z-20"
      style={{ background: INK, color: PAPER }}
    >
      {onBack && (
        <button onClick={onBack} className="p-1 -ml-1" aria-label="Indietro">
          <ArrowLeft size={20} />
        </button>
      )}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: SEAL, flexShrink: 0 }} />
        <span
          className="truncate"
          style={{ fontFamily: FONT_DISPLAY, fontSize: 20, letterSpacing: 1 }}
        >
          {title}
        </span>
      </div>
      {right}
    </div>
  );
}

export function TabBar({ active, onSelect, badges = {} }) {
  const tabs = [
    { key: "home", label: "Collezione", icon: HomeIcon },
    { key: "plan", label: "Pianificazione", icon: CalendarClock },
    { key: "opzioni", label: "Opzioni", icon: Settings },
  ];
  return (
    <div
      className="fixed bottom-0 left-1/2 flex w-full z-30"
      style={{
        maxWidth: 480, transform: "translateX(-50%)",
        background: INK, borderTop: `1px solid ${BARK}`,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative"
          style={{ color: active === key ? SEAL : PAPER, opacity: active === key ? 1 : 0.75 }}
        >
          <span className="relative">
            <Icon size={18} />
            {badges[key] > 0 && (
              <span
                className="absolute flex items-center justify-center"
                style={{
                  top: -6, right: -10, minWidth: 15, height: 15, padding: "0 3px",
                  borderRadius: 8, background: SEAL, color: PAPER,
                  fontFamily: FONT_BODY, fontSize: 9.5, fontWeight: 600,
                }}
              >
                {badges[key]}
              </span>
            )}
          </span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 10.5 }}>{label}</span>
        </button>
      ))}
    </div>
  );
}

// Banner informativo/di avviso riutilizzabile (promemoria scadenze, backup…)
export function Banner({ tone = "info", icon: Icon, children, onClick, actionLabel }) {
  const colors = {
    warn: { bg: `${SEAL}14`, border: SEAL, text: INK },
    info: { bg: `${MOSS}16`, border: MOSS, text: INK },
  }[tone] || { bg: `${MOSS}16`, border: MOSS, text: INK };
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 mb-3"
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: onClick ? "pointer" : "default" }}
    >
      {Icon && <Icon size={18} color={colors.border} style={{ flexShrink: 0 }} />}
      <div className="flex-1 min-w-0" style={{ fontFamily: FONT_BODY, fontSize: 12, color: colors.text }}>{children}</div>
      {actionLabel && (
        <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: colors.border, fontWeight: 600, flexShrink: 0 }}>{actionLabel}</span>
      )}
    </div>
  );
}

// Nodo della timeline storico ("anello di crescita", spec §3)
export function Ring({ item, isLast }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: SEAL, border: `2px solid ${PAPER}`, boxShadow: `0 0 0 1px ${INK}` }} />
        {!isLast && <div style={{ width: 1, flex: 1, background: `${BARK}66`, minHeight: 28 }} />}
      </div>
      <div className="pb-5">
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: BARK }}>{fmtDate(item.data)}</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: INK }}>{item.tipo}</div>
        {item.note && (
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: INK, opacity: 0.75 }}>{item.note}</div>
        )}
      </div>
    </div>
  );
}

// Toast leggero per feedback (backup, foto salvate…)
export function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      className="fixed left-1/2 z-50 px-4 py-2 text-center"
      style={{
        bottom: 78, transform: "translateX(-50%)", maxWidth: 360,
        background: INK, color: PAPER, borderRadius: 6, fontFamily: FONT_BODY, fontSize: 12.5,
        boxShadow: "0 6px 20px rgba(0,0,0,.28)",
      }}
    >
      {message}
    </div>
  );
}
