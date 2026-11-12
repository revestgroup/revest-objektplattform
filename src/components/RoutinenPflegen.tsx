/**
 * Einstellungen · Backoffice-Routine: Tages- und Wochenroutine pflegen.
 * Minuten und Kategorie speisen die Zeiterfassung „Zeit Backoffice“ — beim
 * Abhaken festgeschrieben, spätere Änderungen gelten nur für neue Haken.
 */
import { Plus, RotateCcw, Trash2 } from "lucide-react";

import { useCockpit } from "../lib/cockpitStore";
import {
  STANDARD_ROUTINEN,
  WOCHENTAGE,
  ZEITKATEGORIEN,
  type Routinen,
  type Routinepunkt,
} from "../lib/routine";

const feld =
  "h-9 w-full min-w-0 rounded-xl border border-linie bg-flaeche px-3 text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none";

let zaehler = Date.now();
const neueId = (p: string) => `${p}-${(++zaehler).toString(36)}`;

export function RoutinenPflegen() {
  const { routinen, routinenSetzen } = useCockpit();

  function liste(art: keyof Routinen, bauen: (l: Routinepunkt[]) => Routinepunkt[]) {
    routinenSetzen({ ...routinen, [art]: bauen(routinen[art]) });
  }

  return (
    <div className="mt-5 flex max-w-4xl flex-col gap-6">
      <datalist id="zeitkategorien">
        {ZEITKATEGORIEN.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      {(["tag", "woche"] as const).map((art) => (
        <div key={art} className="flex flex-col gap-2">
          <span className="text-[0.78rem] font-medium text-tinte">
            {art === "tag" ? "Tagesroutine" : "Wochenroutine"}
            <span className="zahl ml-2 text-[0.7rem] font-normal text-grau">
              {routinen[art].reduce((s, p) => s + p.minuten, 0)} min
            </span>
          </span>
          {routinen[art].map((p) => {
            const setze = (teil: Partial<Routinepunkt>) =>
              liste(art, (l) => l.map((x) => (x.id === p.id ? { ...x, ...teil } : x)));
            return (
              <div
                // Neu montieren, wenn sich der Punkt von außen ändert (Standard wiederherstellen).
                key={JSON.stringify(p)}
                className={
                  art === "tag"
                    ? "grid grid-cols-2 gap-2 rounded-xl border border-linie p-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_6rem_minmax(0,1.4fr)_auto] sm:border-0 sm:p-0"
                    : "grid grid-cols-2 gap-2 rounded-xl border border-linie p-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_6rem_minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:border-0 sm:p-0"
                }
              >
                <input
                  defaultValue={p.titel}
                  onBlur={(e) => setze({ titel: e.target.value.trim() || p.titel })}
                  aria-label="Titel"
                  className={`${feld} col-span-2 sm:col-span-1`}
                />
                <input
                  defaultValue={p.hinweis}
                  onBlur={(e) => setze({ hinweis: e.target.value.trim() })}
                  placeholder="Hinweis"
                  aria-label={`Hinweis ${p.titel}`}
                  className={`${feld} col-span-2 sm:col-span-1`}
                />
                <label className="relative">
                  <input
                    type="number"
                    min={0}
                    step={5}
                    defaultValue={p.minuten}
                    onBlur={(e) => setze({ minuten: Math.max(0, Number(e.target.value) || 0) })}
                    aria-label={`Minuten ${p.titel}`}
                    className={`${feld} zahl pr-9 text-right`}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[0.66rem] text-grau">
                    min
                  </span>
                </label>
                <input
                  defaultValue={p.kategorie}
                  list="zeitkategorien"
                  onBlur={(e) => setze({ kategorie: e.target.value.trim() || p.kategorie })}
                  aria-label={`Kategorie ${p.titel}`}
                  className={feld}
                />
                {art === "woche" && (
                  <select
                    value={p.wochentag ?? 1}
                    onChange={(e) => setze({ wochentag: Number(e.target.value) })}
                    aria-label={`Wochentag ${p.titel}`}
                    className={feld}
                  >
                    {WOCHENTAGE.map((t, i) =>
                      i === 0 ? null : (
                        <option key={t} value={i}>
                          {t}
                        </option>
                      ),
                    )}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => liste(art, (l) => l.filter((x) => x.id !== p.id))}
                  aria-label={`${p.titel} entfernen`}
                  className="druckbar flex size-9 items-center justify-center justify-self-end rounded-full text-grau hover:text-[#9A2727]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() =>
              liste(art, (l) => [
                ...l,
                {
                  id: neueId(art === "tag" ? "r" : "w"),
                  titel: "Neuer Punkt",
                  hinweis: "",
                  minuten: 10,
                  kategorie: ZEITKATEGORIEN[0],
                  ...(art === "woche" ? { wochentag: 5 } : {}),
                },
              ])
            }
            className="druckbar flex w-fit items-center gap-1.5 rounded-full border border-linie-stark px-3.5 py-1.5 text-[0.68rem] font-semibold text-tinte"
          >
            <Plus size={12} />
            Punkt hinzufügen
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => routinenSetzen(STANDARD_ROUTINEN)}
        className="druckbar flex w-fit items-center gap-1.5 text-[0.68rem] text-grau hover:text-tinte"
      >
        <RotateCcw size={12} />
        Standardliste wiederherstellen
      </button>
    </div>
  );
}
