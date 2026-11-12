/**
 * Google Kalender als eingebettete Ansicht (SAMMLUNG 10). Phase 1 nur
 * Anzeige: Ein privater Kalender erscheint, wenn man im selben Browser bei
 * Google angemeldet ist und Zugriff hat. Phase 2: echte Anbindung —
 * Termine aus dem Objekt in den Kalender, Kalendertermine mit Kürzel in
 * „Mail & Aktivitäten“ (`quelle: "kalender"`, `externeId`).
 */
export type Kalendermodus = "WEEK" | "MONTH" | "AGENDA";

export function kalenderAdresse(id: string, modus: Kalendermodus = "WEEK"): string | null {
  const sauber = id.trim();
  if (!sauber) return null;
  const q = new URLSearchParams({
    src: sauber,
    ctz: "Europe/Berlin",
    mode: modus,
    hl: "de",
    // Woche beginnt am Montag (1 = Sonntag, 2 = Montag).
    wkst: "2",
    showPrint: "0",
    showTitle: "0",
  });
  return `https://calendar.google.com/calendar/embed?${q.toString()}`;
}
