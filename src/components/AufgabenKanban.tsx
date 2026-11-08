/**
 * To Do's als Kanban: eine Spalte je Objekt oder je Kategorie (Aufgabenart).
 *
 * Eine Karte in eine andere Spalte ziehen hängt die Aufgabe um — an ein
 * anderes Objekt bzw. in eine andere Kategorie. „+“ im Spaltenkopf legt eine
 * Aufgabe direkt in dieser Spalte an. Erledigte bleiben ausgeblendet, bis man
 * sie einblendet.
 */
import { Link } from "@tanstack/react-router";
import { Check, Plus } from "lucide-react";
import { useState } from "react";

import {
  AUFGABENARTEN,
  AUFGABENART_REIHENFOLGE,
  DRINGLICHKEITEN,
  faelligkeit,
  fristText,
  sortiereOffen,
  type Aufgabe,
  type Aufgabenart,
} from "../lib/aufgaben";
import { useAufgaben } from "../lib/aufgabenStore";
import { type Objekt } from "../lib/objekte";
import { cn } from "../lib/utils";
import { useSeitlichScroll } from "./SeitlichScroll";

export type KanbanSpalten = "objekt" | "art";

/** Was „+“ in einer Spalte vorbelegt. */
export interface AufgabenVorgabe {
  objektId?: string | null;
  art?: Aufgabenart;
}

interface Spalte {
  schluessel: string;
  titel: string;
  unterzeile: string | null;
  objekt: Objekt | null;
  aufgaben: Aufgabe[];
  vorgabe: AufgabenVorgabe;
}

const ALLGEMEIN = "__allgemein";

function objektZiel(o: Objekt) {
  return {
    to: o.stufe === "angekauft" ? ("/projekte" as const) : ("/ankauf" as const),
    search: { objekt: o.id },
  };
}

export function AufgabenKanban({
  aufgaben,
  objekte,
  nach,
  mitErledigten,
  neu,
}: {
  /** Schon gefiltert (Objekt-/Kategoriefilter der Seite). */
  aufgaben: Aufgabe[];
  objekte: Objekt[];
  nach: KanbanSpalten;
  mitErledigten: boolean;
  neu: (vorgabe: AufgabenVorgabe) => void;
}) {
  const { aendern, umschalten } = useAufgaben();
  const [zieht, setZieht] = useState<string | null>(null);
  const [ueber, setUeber] = useState<string | null>(null);

  const sichtbar = aufgaben.filter((a) => mitErledigten || !a.erledigtAm);
  const sortiert = [...sichtbar].sort((a, b) => {
    // Erledigte unten, offene nach Dringlichkeit und Frist.
    if (!!a.erledigtAm !== !!b.erledigtAm) return a.erledigtAm ? 1 : -1;
    return sortiereOffen(a, b);
  });

  let spalten: Spalte[];
  if (nach === "art") {
    spalten = AUFGABENART_REIHENFOLGE.map((art) => ({
      schluessel: art,
      titel: AUFGABENARTEN[art],
      unterzeile: null,
      objekt: null,
      aufgaben: sortiert.filter((a) => a.art === art),
      vorgabe: { art },
    }));
  } else {
    // Objekte mit Aufgaben, das dringlichste zuerst; „Allgemein“ am Ende.
    const ids: string[] = [];
    for (const a of sortiert) if (a.objektId && !ids.includes(a.objektId)) ids.push(a.objektId);
    spalten = ids
      .map((id) => objekte.find((o) => o.id === id))
      .filter((o): o is Objekt => Boolean(o))
      .map((o) => ({
        schluessel: o.id,
        titel: o.kuerzel ? `${o.kuerzel} · ${o.strasse}` : o.strasse,
        unterzeile: o.stadtteil ? `${o.stadt} · ${o.stadtteil}` : o.stadt,
        objekt: o,
        aufgaben: sortiert.filter((a) => a.objektId === o.id),
        vorgabe: { objektId: o.id },
      }));
    spalten.push({
      schluessel: ALLGEMEIN,
      titel: "Allgemein",
      unterzeile: "ohne Objekt",
      objekt: null,
      aufgaben: sortiert.filter((a) => !a.objektId || !objekte.some((o) => o.id === a.objektId)),
      vorgabe: { objektId: null },
    });
  }

  const seitlich = useSeitlichScroll([spalten.length, nach]);

  function ablegen(s: Spalte) {
    const a = zieht ? aufgaben.find((x) => x.id === zieht) : undefined;
    setZieht(null);
    setUeber(null);
    if (!a) return;
    if (nach === "art" && s.vorgabe.art && a.art !== s.vorgabe.art)
      aendern(a.id, { art: s.vorgabe.art });
    if (nach === "objekt" && a.objektId !== (s.vorgabe.objektId ?? null))
      aendern(a.id, { objektId: s.vorgabe.objektId ?? null });
  }

  return (
    <div className="relative">
      {seitlich.pfeile}
      <div
        {...seitlich.leisteProps}
        onDragOver={(e) => zieht && seitlich.randScroll(e)}
        className="scroll-reihe flex items-start gap-3 overflow-x-auto px-6 py-6 md:px-10"
      >
        {spalten.map((s) => {
          const offen = s.aufgaben.filter((a) => !a.erledigtAm).length;
          const ueberfaellig = s.aufgaben.filter(
            (a) => !a.erledigtAm && faelligkeit(a) === "ueberfaellig",
          ).length;
          return (
            <section
              key={s.schluessel}
              aria-label={`Spalte ${s.titel}`}
              onDragOver={(e) => {
                if (!zieht) return;
                e.preventDefault();
                setUeber(s.schluessel);
              }}
              onDragLeave={() => setUeber((u) => (u === s.schluessel ? null : u))}
              onDrop={(e) => {
                e.preventDefault();
                ablegen(s);
              }}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-2xl border bg-flaeche-hoch p-2.5 transition-colors duration-150",
                ueber === s.schluessel ? "border-tinte" : "border-linie",
              )}
            >
              <header className="flex items-start gap-2 px-1.5 pt-1 pb-2.5">
                <div className="min-w-0 flex-1">
                  {s.objekt ? (
                    <Link
                      {...objektZiel(s.objekt)}
                      className="block truncate text-[0.78rem] font-semibold text-tinte hover:underline"
                    >
                      {s.titel}
                    </Link>
                  ) : (
                    <div className="truncate text-[0.78rem] font-semibold text-tinte">
                      {s.titel}
                    </div>
                  )}
                  <div className="mt-0.5 flex items-center gap-1.5 text-[0.62rem] text-grau">
                    <span className="zahl">{offen} offen</span>
                    {ueberfaellig > 0 && (
                      <span className="zahl rounded-full bg-[#FBE2E2] px-1.5 text-[#8A2822]">
                        {ueberfaellig} überfällig
                      </span>
                    )}
                    {s.unterzeile && <span className="truncate">· {s.unterzeile}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => neu(s.vorgabe)}
                  aria-label={`To Do in ${s.titel} anlegen`}
                  className="druckbar flex size-7 shrink-0 items-center justify-center rounded-full text-grau-stark hover:bg-flaeche hover:text-tinte"
                >
                  <Plus size={14} strokeWidth={2.2} />
                </button>
              </header>

              <ul className="flex min-h-16 flex-col gap-2">
                {s.aufgaben.map((a) => {
                  const fl = faelligkeit(a);
                  const o = nach === "art" ? objekte.find((x) => x.id === a.objektId) : null;
                  return (
                    <li
                      key={a.id}
                      draggable={!a.erledigtAm}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", a.id);
                        setZieht(a.id);
                      }}
                      onDragEnd={() => {
                        setZieht(null);
                        setUeber(null);
                      }}
                      className={cn(
                        "flex gap-2.5 rounded-xl border border-linie bg-flaeche p-2.5 shadow-karte",
                        !a.erledigtAm && "cursor-grab active:cursor-grabbing",
                        zieht === a.id && "opacity-40",
                        a.erledigtAm && "opacity-60",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => umschalten(a.id)}
                        aria-label={a.erledigtAm ? "Wieder öffnen" : "Erledigt"}
                        aria-pressed={Boolean(a.erledigtAm)}
                        className={cn(
                          "druckbar mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border",
                          a.erledigtAm
                            ? "border-tinte bg-tinte text-grund"
                            : "border-linie-stark text-transparent hover:text-grau",
                        )}
                      >
                        <Check size={11} strokeWidth={3} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "text-[0.76rem] leading-snug text-tinte",
                            a.erledigtAm && "line-through",
                          )}
                        >
                          {a.titel}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.62rem] text-grau">
                          <span
                            aria-label={`Dringlichkeit ${DRINGLICHKEITEN[a.dringlichkeit].titel}`}
                            className="size-[6px] shrink-0 rounded-full"
                            style={{ background: DRINGLICHKEITEN[a.dringlichkeit].farbe }}
                          />
                          {!a.erledigtAm && (
                            <span
                              className={cn(
                                fl === "ueberfaellig" && "font-medium text-[#8A2822]",
                                fl === "heute" && "font-medium text-tinte",
                              )}
                            >
                              {fristText(a.faelligAm)}
                            </span>
                          )}
                          {nach === "objekt" && <span>{AUFGABENARTEN[a.art]}</span>}
                          {o && (
                            <Link {...objektZiel(o)} className="truncate hover:text-tinte">
                              {o.kuerzel ?? o.strasse}
                            </Link>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
                {s.aufgaben.length === 0 && (
                  <li className="px-2 py-4 text-center text-[0.66rem] text-grau">
                    {zieht ? "Hierher ziehen" : "Nichts offen"}
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
