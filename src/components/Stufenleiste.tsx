/**
 * Stufenleiste wie in monday: alle Stufen als durchgehende Pfeil-Segmente,
 * die aktuelle dunkel, erledigte kräftiger als kommende. Ein Klick setzt die
 * Stufe. Rechts abgesetzt die beiden Abschlüsse: „Gekauft“ öffnet den
 * Deal-Dialog, „No Deal“ fragt nach dem Grund.
 *
 * Einzige Ausnahme vom sofortigen Wechsel: „Angebot abgegeben“ zeigt den
 * Prüfhinweis, solange Pflichtpunkte der Checkliste offen oder kritisch sind.
 */
import { Check, X } from "lucide-react";
import { useState } from "react";

import { STUFEN, STUFEN_REIHENFOLGE, istAktiv, type Ankaufsstufe, type Objekt } from "../lib/objekte";
import { cn } from "../lib/utils";
import { AbsageDialog, DealDialog } from "./Deal";
import { useStufenwechsel } from "./Pruefung";

/** Gekauft und No Deal stehen als Knöpfe daneben, nicht in der Leiste. */
const SEGMENTE: Ankaufsstufe[] = STUFEN_REIHENFOLGE.filter((s) => s !== "angekauft" && s !== "abgesagt");

export function Stufenleiste({ objekt, zurCheckliste }: { objekt: Objekt; zurCheckliste: () => void }) {
  const wechsel = useStufenwechsel(zurCheckliste);
  const [dialog, setDialog] = useState<"deal" | "absage" | null>(null);
  const aktuell = SEGMENTE.indexOf(objekt.stufe);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-b border-linie px-4 py-2.5 md:flex-nowrap md:px-7">
      {wechsel.dialog}
      {/* Am Telefon wischbar — acht Segmente passen dort nicht nebeneinander. */}
      <div className="scroll-reihe flex min-w-0 basis-full overflow-x-auto md:flex-1 md:basis-auto">
        <div className="flex min-w-[44rem] flex-1 md:min-w-0">
          {SEGMENTE.map((s, i) => {
            const ist = s === objekt.stufe;
            // „Erledigt“ gibt es nur entlang des Ablaufs, nicht in der Ablage.
            const erledigt = istAktiv(s) && istAktiv(objekt.stufe) && aktuell > i;
            return (
              <button
                key={s}
                type="button"
                onClick={() => !ist && wechsel.setze(objekt, s)}
                aria-pressed={ist}
                title={STUFEN[s].titel}
                style={
                  ist
                    ? undefined
                    : erledigt
                      ? { background: STUFEN[s].weich, color: STUFEN[s].tief }
                      : undefined
                }
                className={cn(
                  "druckbar relative -ml-[6px] flex h-8 min-w-0 flex-1 items-center justify-center truncate px-4 text-[0.64rem] font-medium whitespace-nowrap first:ml-0 first:pl-3 [clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%,10px_50%)] first:[clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%)] first:rounded-l-full",
                  ist
                    ? "bg-tinte text-grund"
                    : erledigt
                      ? ""
                      : "bg-flaeche-hoch text-grau hover:text-grau-stark",
                  // Die Ablage etwas abgesetzt, damit der Ablauf als Einheit liest.
                  STUFEN[s].bereich === "ablage" && "ml-1",
                )}
              >
                <span className="truncate">{STUFEN[s].titel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {objekt.stufe !== "abgesagt" && (
        <button
          type="button"
          onClick={() => setDialog("absage")}
          className="druckbar flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#E3BDB9] bg-[#FBE2E2] px-3 text-[0.64rem] font-semibold text-[#9A2727]"
        >
          <X size={12} strokeWidth={2.25} />
          No Deal
        </button>
      )}
      <button
        type="button"
        onClick={() => setDialog("deal")}
        // Inline, weil `.druckbar:hover` ungelayert ist und jede
        // Tailwind-Hintergrundklasse schlägt — grün muss grün bleiben.
        style={{ backgroundColor: "#17935C" }}
        className="druckbar flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.64rem] font-semibold text-white shadow-karte"
      >
        <Check size={12} strokeWidth={2.5} />
        Gekauft
      </button>

      {dialog === "deal" && <DealDialog objekt={objekt} schliessen={() => setDialog(null)} />}
      {dialog === "absage" && <AbsageDialog objekt={objekt} schliessen={() => setDialog(null)} />}
    </div>
  );
}
