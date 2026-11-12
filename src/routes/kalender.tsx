/**
 * Kalender — der Google Kalender eingebettet (Woche, Monat oder Agenda).
 * Phase 2: echte Anbindung, Termine aus Objekten landen dort von selbst.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Seitenkopf } from "../components/AppLayout";
import { KeineId } from "../components/KalenderHinweis";
import { useEinstellungen } from "../lib/einstellungenStore";
import { kalenderAdresse, type Kalendermodus } from "../lib/kalender";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/kalender")({ component: KalenderSeite });

const MODI: [Kalendermodus, string][] = [
  ["WEEK", "Woche"],
  ["MONTH", "Monat"],
  ["AGENDA", "Agenda"],
];

function KalenderSeite() {
  const { kalenderId, bereit } = useEinstellungen();
  const [modus, setModus] = useState<Kalendermodus>("WEEK");
  const adresse = kalenderAdresse(kalenderId, modus);

  return (
    <>
      <Seitenkopf titel="Kalender" />
      <div className="px-4 py-4 sm:px-6 md:px-10">
        {!bereit ? (
          <div className="h-96" />
        ) : !adresse ? (
          <KeineId />
        ) : (
          <>
            <div className="mb-3 flex gap-1 self-start rounded-full border border-linie bg-flaeche-hoch p-1">
              {MODI.map(([m, t]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModus(m)}
                  aria-pressed={modus === m}
                  className={cn(
                    "druckbar rounded-full px-3 py-1 text-[0.7rem] font-medium",
                    modus === m ? "bg-tinte text-grund" : "text-grau-stark",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <iframe
              title="Google Kalender"
              src={adresse}
              className="h-[calc(100dvh-14rem)] min-h-[28rem] w-full rounded-2xl border border-linie bg-flaeche"
            />
          </>
        )}
      </div>
    </>
  );
}
