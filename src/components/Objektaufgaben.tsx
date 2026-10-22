/**
 * Aufgaben eines einzelnen Objekts.
 *
 * Die Aufgabenseite zeigt alles über alle Objekte — das ist der Blick am
 * Morgen. Hier ist der umgekehrte Weg: man steht im Objekt, telefoniert, und
 * das Ergebnis des Gesprächs ist eine neue Aufgabe. Deshalb ist das Anlegen
 * hier eine Zeile und kein Formular: Titel tippen, Frist daneben, Enter.
 *
 * Alles, was die große Liste sonst noch kann — Art, Dringlichkeit, Beschreibung
 * — fehlt absichtlich. Wer das braucht, legt die Aufgabe dort an. Eine Aufgabe,
 * die im Gespräch nicht in acht Sekunden erfasst ist, wird nicht erfasst.
 */
import { Check, ListChecks, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  AUFGABENARTEN,
  DRINGLICHKEITEN,
  faelligkeit,
  fristText,
  sortiereOffen,
  type Aufgabe,
} from "../lib/aufgaben";
import { useAufgaben } from "../lib/aufgabenStore";
import { f, type Objekt } from "../lib/objekte";
import { cn } from "../lib/utils";

/** Morgen als Vorschlag — „heute“ ist beim Anlegen fast immer gelogen. */
function morgen() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function Objektaufgaben({ objekt }: { objekt: Objekt }) {
  const { aufgaben, anlegen, umschalten, loeschen } = useAufgaben();
  const [titel, setTitel] = useState("");
  const [frist, setFrist] = useState(morgen);
  const [erledigteOffen, setErledigteOffen] = useState(false);

  const eigene = useMemo(
    () => aufgaben.filter((a) => a.objektId === objekt.id),
    [aufgaben, objekt.id],
  );
  const offen = useMemo(() => eigene.filter((a) => !a.erledigtAm).sort(sortiereOffen), [eigene]);
  const erledigt = useMemo(
    () =>
      eigene
        .filter((a) => a.erledigtAm)
        .sort((a, b) => (b.erledigtAm ?? "").localeCompare(a.erledigtAm ?? "")),
    [eigene],
  );

  function absenden(e: React.FormEvent) {
    e.preventDefault();
    const t = titel.trim();
    if (!t) return;
    anlegen({
      titel: t,
      beschreibung: null,
      objektId: objekt.id,
      art: "sonst",
      dringlichkeit: "normal",
      faelligAm: frist || null,
    });
    setTitel("");
  }

  return (
    <div className="pb-24">
      {/* Das Anlegen steht oben, nicht unter der Liste: es ist der Grund, warum
          man diesen Reiter öffnet. */}
      <form onSubmit={absenden} className="border-b border-linie px-6 py-7 md:px-9">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 basis-56 block">
            <span className="mini-label">Was ist zu tun?</span>
            <input
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="Verwalter wegen Protokollen anrufen"
              className="-mx-2 mt-2 w-[calc(100%+1rem)] rounded-lg bg-transparent px-2 py-2 text-[0.88rem] text-tinte placeholder:text-grau/70 hover:bg-flaeche focus:bg-flaeche-hoch focus:ring-1 focus:ring-linie-stark focus:outline-none"
            />
          </label>
          <label className="block shrink-0">
            <span className="mini-label">Bis</span>
            <input
              type="date"
              value={frist}
              onChange={(e) => setFrist(e.target.value)}
              className="zahl mt-2 rounded-lg border border-linie bg-flaeche px-2.5 py-2 text-[0.78rem] text-grau-stark focus:border-linie-stark focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={titel.trim() === ""}
            className="druckbar flex shrink-0 items-center gap-2 rounded-full bg-tinte px-4 py-2.5 text-[0.66rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte disabled:bg-flaeche-aktiv disabled:text-grau disabled:shadow-none"
          >
            <Plus size={12} strokeWidth={2.5} />
            Anlegen
          </button>
        </div>
      </form>

      {offen.length === 0 ? (
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center md:px-9">
          <ListChecks size={18} strokeWidth={1.5} className="text-linie-stark" />
          <p className="max-w-xs text-[0.82rem] leading-relaxed text-grau">
            {erledigt.length > 0
              ? "Nichts offen."
              : "Noch keine Aufgabe."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-linie">
          {offen.map((a) => (
            <Zeile
              key={a.id}
              aufgabe={a}
              umschalten={() => umschalten(a.id)}
              loeschen={() => loeschen(a.id)}
            />
          ))}
        </ul>
      )}

      {erledigt.length > 0 && (
        <div className="border-t border-linie">
          <button
            type="button"
            onClick={() => setErledigteOffen((v) => !v)}
            aria-expanded={erledigteOffen}
            className="druckbar flex w-full items-center gap-2 px-6 py-4 text-left md:px-9"
          >
            <Check size={12} strokeWidth={2.5} className="shrink-0 text-grau" />
            <span className="mini-label">Erledigt</span>
            <span className="zahl text-[0.66rem] text-grau">{erledigt.length}</span>
          </button>
          {erledigteOffen && (
            <ul className="eintritt divide-y divide-linie border-t border-linie">
              {erledigt.map((a) => (
                <Zeile
                  key={a.id}
                  aufgabe={a}
                  umschalten={() => umschalten(a.id)}
                  loeschen={() => loeschen(a.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Eine Zeile.
 *
 * Der Haken links, weil er die einzige Handlung ist, die man hier oft macht.
 * Löschen liegt rechts und erscheint erst beim Darüberfahren — eine Aufgabe
 * wird abgehakt, nicht entsorgt.
 */
function Zeile({
  aufgabe,
  umschalten,
  loeschen,
}: {
  aufgabe: Aufgabe;
  umschalten: () => void;
  loeschen: () => void;
}) {
  const erledigt = aufgabe.erledigtAm !== null;
  const stufe = faelligkeit(aufgabe);
  const dringt = !erledigt && (stufe === "ueberfaellig" || stufe === "heute");

  return (
    <li className="group flex items-start gap-3.5 px-6 py-4 md:px-9">
      <button
        type="button"
        onClick={umschalten}
        role="checkbox"
        aria-checked={erledigt}
        aria-label={erledigt ? `${aufgabe.titel} wieder öffnen` : `${aufgabe.titel} abhaken`}
        className={cn(
          "druckbar mt-px flex size-[22px] shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ease-out",
          erledigt
            ? "border-tinte bg-tinte text-grund"
            : "border-linie-stark text-transparent hover:border-tinte",
        )}
      >
        <Check size={12} strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[0.86rem] leading-snug",
            erledigt ? "text-grau line-through" : "text-tinte",
          )}
        >
          {aufgabe.titel}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.7rem] text-grau">
          <span className={cn("zahl", dringt && "font-semibold")} style={dringt ? { color: "#8A2822" } : undefined}>
            {erledigt ? `erledigt ${f.datum(aufgabe.erledigtAm!)}` : fristText(aufgabe.faelligAm)}
          </span>
          {aufgabe.art !== "sonst" && (
            <>
              <span aria-hidden className="size-[3px] rounded-full bg-linie-stark" />
              <span>{AUFGABENARTEN[aufgabe.art]}</span>
            </>
          )}
          {!erledigt && aufgabe.dringlichkeit !== "normal" && (
            <>
              <span aria-hidden className="size-[3px] rounded-full bg-linie-stark" />
              <span style={{ color: DRINGLICHKEITEN[aufgabe.dringlichkeit].farbe }}>
                {DRINGLICHKEITEN[aufgabe.dringlichkeit].titel}
              </span>
            </>
          )}
        </div>
        {aufgabe.beschreibung && (
          <p className="mt-2 max-w-lg text-[0.74rem] leading-relaxed text-grau">
            {aufgabe.beschreibung}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={loeschen}
        aria-label={`${aufgabe.titel} löschen`}
        className="druckbar shrink-0 rounded-lg p-2 text-transparent group-hover:text-linie-stark hover:bg-flaeche hover:text-tinte focus-visible:text-linie-stark"
      >
        <Trash2 size={13} strokeWidth={1.75} />
      </button>
    </li>
  );
}
