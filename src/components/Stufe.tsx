import { STUFEN, fristinfo, type Ankaufsstufe, type Objekt } from "../lib/objekte";
import { cn } from "../lib/utils";

/**
 * Statusplakette. Nimmt die gedämpfte Variante der Stufenfarbe als Fläche und
 * die tiefe als Schrift — so trägt die Plakette die Ampel mit, bleibt aber
 * kontrastreich genug zum Lesen.
 */
export function Stufenzeichen({
  stufe,
  gross,
  className,
}: {
  stufe: Ankaufsstufe;
  gross?: boolean;
  className?: string;
}) {
  const s = STUFEN[stufe];
  return (
    <span
      style={{ background: s.weich, color: s.tief }}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium tracking-[0.14em] uppercase",
        gross ? "px-3 py-1.5 text-[0.65rem]" : "px-2.5 py-1 text-[0.58rem]",
        className,
      )}
    >
      <span
        aria-hidden
        className="size-[6px] shrink-0 rounded-full"
        style={{ background: s.farbe }}
      />
      {s.titel}
    </span>
  );
}

/**
 * Die 48-Stunden-Uhr. Revest verspricht öffentlich eine verbindliche Prüfung
 * binnen zwei Tagen — hier wird daraus ein Arbeitswerkzeug.
 */
export function Fristzeichen({
  objekt,
  jetzt,
  className,
}: {
  objekt: Objekt;
  jetzt?: Date;
  className?: string;
}) {
  const info = fristinfo(objekt, jetzt);
  if (!info) return null;

  const knapp = info.laeuft && info.stundenRest < 12;

  return (
    <span
      className={cn(
        "zahl inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.58rem] font-medium tracking-[0.12em] uppercase",
        info.gerissen
          ? "border-tinte bg-tinte text-grund"
          : knapp
            ? "border-grau-stark bg-flaeche text-tinte"
            : "border-linie bg-flaeche text-grau",
        className,
      )}
      title={info.gerissen ? "48-Stunden-Prüffrist überschritten" : "Rest der 48-Stunden-Prüffrist"}
    >
      {/* „48 Std 35 Std" las sich wie zwei Zahlen. Es ist eine: der Rest. */}
      {info.gerissen ? "Frist" : "Rest"}
      <span className="font-semibold">{info.text}</span>
    </span>
  );
}
