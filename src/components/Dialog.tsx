/**
 * Der Dialograhmen für Vorgänge.
 *
 * Ein Vorgang ist etwas anderes als ein Formular: er hat einen Auslöser, eine
 * Frage und ein Ergebnis, und er unterbricht, was man gerade tut. Deshalb liegt
 * er über allem und nicht in der Schublade — wer eine Wohnung verkauft, soll
 * dabei nicht gleichzeitig in der Objektakte blättern.
 *
 * Auf dem Telefon kommt er von unten und ist oben abgerundet; das ist die
 * Bewegung, die der Daumen erwartet. Auf dem Schirm steht er mittig.
 */
import { Check, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { cn } from "../lib/utils";

export function Dialog({
  titel,
  unterzeile,
  schliessen,
  children,
}: {
  titel: string;
  unterzeile: string;
  schliessen: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const beiTaste = (e: KeyboardEvent) => {
      if (e.key === "Escape") schliessen();
    };
    window.addEventListener("keydown", beiTaste);
    return () => window.removeEventListener("keydown", beiTaste);
  }, [schliessen]);

  return (
    // z-60, weil der Dialog auch über einer offenen Schublade stehen muss.
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div
        aria-hidden
        onClick={schliessen}
        className="schleier absolute inset-0 bg-tinte/35 backdrop-blur-[3px]"
      />
      <div
        role="dialog"
        aria-label={titel}
        className="eintritt relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-flaeche shadow-schwebe sm:max-w-[560px] sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4 md:px-8 md:pt-7">
          <div className="min-w-0">
            <h2 className="headline text-[1.25rem] md:text-[1.4rem]">{titel}</h2>
            <p className="mt-1.5 text-[0.74rem] leading-relaxed text-grau">{unterzeile}</p>
          </div>
          <button
            type="button"
            onClick={schliessen}
            aria-label="Schließen"
            className="druckbar -mt-1 -mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-grau hover:text-tinte"
          >
            <X size={17} strokeWidth={2} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 md:px-8">{children}</div>
      </div>
    </div>
  );
}

/** Abschluss-Leiste. Der bestätigende Knopf steht rechts und trägt die Farbe. */
export function Leiste({
  abbrechen,
  bestaetigen,
  titel,
  ton,
  gesperrt,
}: {
  abbrechen: () => void;
  bestaetigen: () => void;
  titel: string;
  ton: "gruen" | "still";
  gesperrt?: boolean;
}) {
  return (
    <div className="mt-7 flex flex-wrap items-center justify-end gap-2.5 border-t border-linie pt-5">
      <button
        type="button"
        onClick={abbrechen}
        className="druckbar rounded-full px-4 py-2.5 text-[0.7rem] font-medium text-grau-stark hover:text-tinte"
      >
        Abbrechen
      </button>
      <button
        type="button"
        onClick={bestaetigen}
        disabled={gesperrt}
        className={cn(
          "druckbar flex items-center gap-2 rounded-full px-5 py-2.5 text-[0.7rem] font-semibold tracking-[0.1em] uppercase shadow-karte disabled:opacity-35",
          ton === "gruen" ? "text-white" : "bg-tinte text-grund",
        )}
        // Inline, weil `.druckbar:hover` ungelayert ist und jede
        // Tailwind-Hintergrundklasse schlägt — grün muss grün bleiben.
        style={ton === "gruen" ? { backgroundColor: "#17935C" } : undefined}
      >
        <Check size={14} strokeWidth={2.5} />
        {titel}
      </button>
    </div>
  );
}
