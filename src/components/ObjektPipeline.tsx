/**
 * Der Ankauf als Pipeline.
 *
 * Dieselben Objekte wie in der Liste, nur nach Stufe gestapelt — der Stapel
 * zeigt sofort, wo sich etwas sammelt.
 *
 * Verschoben wird auf zwei Wegen, weil ein Zeigegerät und ein Finger
 * verschiedene Dinge gut können:
 *
 *  - Mit der Maus: die Karte anfassen und in die andere Spalte ziehen.
 *  - Mit dem Finger: die Stufenknöpfe am Kartenfuß. Ziehen über eine seitwärts
 *    scrollende Fläche ist auf dem Telefon unzumutbar — man trifft die Spalte
 *    nicht und scrollt stattdessen die halbe Pipeline weg.
 *
 * Auf den Knöpfen steht der volle Name der Zielstufe, nicht ein Kürzel: wer
 * „No Deal“ antippt, muss vorher gelesen haben, was passiert. Und eine
 * Richtung, die es nicht gibt, bekommt keinen blassen Knopf, sondern gar
 * keinen — ein ausgegrauter Knopf ist eine Frage, die niemand gestellt hat.
 *
 * Beides schreibt dasselbe: `stufeSetzen`. Es gibt keinen zweiten Zustand,
 * den man synchron halten müsste.
 *
 * Die Ablage (Watchlist, Unqualifiziert, No Deal) steht rechts und schmal
 * eingeklappt: sie soll erreichbar sein, aber die aktive Pipeline nicht
 * verdrängen. Auch eine zugeklappte Spalte nimmt Karten an.
 */
import { ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { useState } from "react";

import {
  KONTAKTROLLEN,
  STUFEN,
  ansprechpartnerVon,
  f,
  type Ankaufsstufe,
  type Objekt,
} from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { cn } from "../lib/utils";
import { Bildflaeche } from "./Bilder";

export function ObjektPipeline({
  objekte,
  stufen,
  oeffnen,
}: {
  /** Schon gefiltert und sortiert — die Pipeline stapelt nur noch. */
  objekte: Objekt[];
  stufen: Ankaufsstufe[];
  oeffnen: (id: string) => void;
}) {
  const { stufeSetzen } = useObjekte();
  // Was gerade in der Hand liegt, und über welcher Spalte. Beides nur für die
  // Dauer des Ziehens — danach zählt allein die Stufe am Objekt.
  const [zieht, setZieht] = useState<string | null>(null);
  const [ueber, setUeber] = useState<Ankaufsstufe | null>(null);
  const [offeneAblage, setOffeneAblage] = useState<Set<Ankaufsstufe>>(new Set());

  // Vor und zurück nur entlang des Ablaufs bis „Gekauft“. In die Ablage
  // kommt man per Ziehen oder über die Stufen im Objekt — ein Knopf
  // „Unqualifiziert“ an jeder Karte wäre eine Einladung zum Fehlgriff.
  const ablauf = stufen.filter((s) => STUFEN[s].bereich !== "ablage");

  function ablageUmschalten(s: Ankaufsstufe) {
    setOffeneAblage((alt) => {
      const neu = new Set(alt);
      if (neu.has(s)) neu.delete(s);
      else neu.add(s);
      return neu;
    });
  }

  function ablegen(stufe: Ankaufsstufe) {
    if (zieht) stufeSetzen(zieht, stufe);
    setZieht(null);
    setUeber(null);
  }

  return (
    <div className="scroll-reihe flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 py-5 sm:gap-4 sm:px-6 md:px-10">
      {stufen.map((s) => {
        const spalte = objekte.filter((o) => o.stufe === s);
        const summe = spalte.reduce((x, o) => x + (o.kaufpreis ?? 0), 0);
        const ziel = ueber === s && zieht !== null;
        const zu = STUFEN[s].bereich === "ablage" && !offeneAblage.has(s);

        if (zu) {
          return (
            <button
              key={s}
              type="button"
              onClick={() => ablageUmschalten(s)}
              onDragOver={(e) => {
                e.preventDefault();
                setUeber(s);
              }}
              onDragLeave={() => setUeber((alt) => (alt === s ? null : alt))}
              onDrop={() => ablegen(s)}
              aria-label={`${STUFEN[s].titel} aufklappen, ${spalte.length} Objekte`}
              className={cn(
                "druckbar flex w-12 shrink-0 flex-col items-center gap-3 self-stretch overflow-hidden rounded-2xl bg-flaeche-hoch pb-4 transition-colors duration-150 ease-out",
                ziel && "bg-flaeche-aktiv",
              )}
            >
              <span aria-hidden className="h-1 w-full" style={{ background: STUFEN[s].farbe }} />
              <span className="zahl rounded-full bg-flaeche px-2 py-0.5 text-[0.64rem] font-semibold text-grau-stark tabular-nums">
                {spalte.length}
              </span>
              <span className="text-[0.66rem] font-semibold tracking-[0.1em] whitespace-nowrap uppercase text-grau-stark [writing-mode:vertical-rl]">
                {STUFEN[s].titel}
              </span>
            </button>
          );
        }

        return (
          <section
            key={s}
            onDragOver={(e) => {
              // Ohne preventDefault lehnt der Browser das Ablegen ab.
              e.preventDefault();
              setUeber(s);
            }}
            onDragLeave={() => setUeber((alt) => (alt === s ? null : alt))}
            onDrop={() => ablegen(s)}
            className={cn(
              // Auf dem Telefon füllt eine Spalte den Blick und rastet ein;
              // darüber feste Breite. Fünf Stufen passen auf keinen Schirm,
              // ohne dass die Karten unlesbar werden — also wird gescrollt.
              "flex w-[80vw] max-w-[19rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-flaeche-hoch transition-colors duration-150 ease-out sm:w-[17.5rem]",
              ziel && "bg-flaeche-aktiv",
            )}
          >
            {/* Der farbige Streifen trägt die Stufe. Dadurch bleibt im Kopf
                Platz für Namen und Zahl, und die Spalte ist beim Wischen auch
                dann erkennbar, wenn nur ihr Rand im Bild steht. */}
            <span aria-hidden className="h-1 w-full" style={{ background: STUFEN[s].farbe }} />

            <header className="flex items-center gap-2 px-3.5 pt-3.5 pb-2">
              <h3 className="min-w-0 flex-1 truncate text-[0.72rem] font-semibold tracking-[0.1em] uppercase text-tinte">
                {STUFEN[s].titel}
              </h3>
              <span className="zahl shrink-0 rounded-full bg-flaeche px-2 py-0.5 text-[0.64rem] font-semibold text-grau-stark tabular-nums">
                {spalte.length}
              </span>
              {STUFEN[s].bereich === "ablage" && (
                <button
                  type="button"
                  onClick={() => ablageUmschalten(s)}
                  aria-label={`${STUFEN[s].titel} zuklappen`}
                  className="druckbar flex size-6 shrink-0 items-center justify-center rounded-full text-grau hover:text-tinte"
                >
                  <ChevronRight size={13} strokeWidth={2.2} />
                </button>
              )}
            </header>

            <p className="zahl px-3.5 pb-3 text-[0.66rem] text-grau tabular-nums">
              {summe > 0 ? f.eurKurz(summe) : "—"}
            </p>

            {/* ----- Stapel ----- */}
            {spalte.length === 0 ? (
              <div className="px-2.5 pb-2.5">
                <p
                  className={cn(
                    "rounded-xl border border-dashed px-3 py-10 text-center text-[0.7rem]",
                    ziel ? "border-tinte text-tinte" : "border-linie-stark text-grau",
                  )}
                >
                  {ziel ? "Hier ablegen" : "Leer"}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5 px-2.5 pb-2.5">
                {spalte.map((o, i) => (
                  <Pipelinekarte
                    key={o.id}
                    objekt={o}
                    stufen={ablauf}
                    verzoegerung={Math.min(i, 8) * 20}
                    haengt={zieht === o.id}
                    beiKlick={() => oeffnen(o.id)}
                    beiAnfassen={() => setZieht(o.id)}
                    beiLoslassen={() => {
                      setZieht(null);
                      setUeber(null);
                    }}
                    beiStufe={(neu) => stufeSetzen(o.id, neu)}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Karte                                                                */
/* ------------------------------------------------------------------ */

/**
 * Die Karte zeigt nur, was beim Durchgehen der Pipeline zählt: Bild,
 * Bezeichnung, Adresse, Fläche, Angebotspreis und wen man anruft. Kennzahlen
 * stehen in der Liste und im Objekt — hier würden sie den Stapel aufblähen.
 * Das Bild bleibt flach, damit trotzdem mehrere Karten auf den Schirm passen.
 */
function Pipelinekarte({
  objekt,
  stufen,
  verzoegerung,
  haengt,
  beiKlick,
  beiAnfassen,
  beiLoslassen,
  beiStufe,
}: {
  objekt: Objekt;
  /** Der Ablauf ohne Ablage — daraus kommen die Vor- und Zurück-Knöpfe. */
  stufen: Ankaufsstufe[];
  verzoegerung: number;
  haengt: boolean;
  beiKlick: () => void;
  beiAnfassen: () => void;
  beiLoslassen: () => void;
  beiStufe: (neu: Ankaufsstufe) => void;
}) {
  const stelle = stufen.indexOf(objekt.stufe);
  // Aus der Ablage führt der Weg zurück an den Anfang.
  const zurueck = stelle > 0 ? stufen[stelle - 1] : stelle === -1 ? stufen[0] : null;
  const vor = stelle >= 0 && stelle < stufen.length - 1 ? stufen[stelle + 1] : null;
  const kontakt = ansprechpartnerVon(objekt);
  const titel = objekt.bezeichnung?.trim() || objekt.strasse;

  return (
    <li
      draggable
      onDragStart={beiAnfassen}
      onDragEnd={beiLoslassen}
      className={cn(
        // Weiß auf der getönten Spalte, dazu ein feiner Schatten: so liegt die
        // Karte sichtbar im Stapel statt mit ihm zu verschwimmen.
        "eintritt kachel overflow-hidden rounded-xl border border-linie bg-flaeche shadow-karte",
        haengt && "opacity-40",
      )}
      style={{ animationDelay: `${verzoegerung}ms` }}
    >
      <button
        type="button"
        onClick={beiKlick}
        className="block w-full cursor-grab text-left active:cursor-grabbing"
      >
        <div className="h-[5.5rem] w-full overflow-hidden bg-flaeche-hoch">
          <Bildflaeche eintrag={objekt.bilder[0] ?? "Kein Bild"} />
        </div>

        <span className="block px-3.5 pt-3">
          <span className="block truncate text-[0.84rem] font-semibold text-tinte">{titel}</span>
          <span className="mt-0.5 block truncate text-[0.68rem] text-grau">
            {objekt.strasse}, {objekt.plz} {objekt.stadt}
          </span>
        </span>

        <span className="flex items-baseline justify-between gap-2 px-3.5 pt-2.5 pb-3">
          <span className="zahl text-[0.84rem] font-semibold text-tinte tabular-nums">
            {f.eur(objekt.kaufpreis)}
          </span>
          <span className="zahl shrink-0 text-[0.68rem] text-grau-stark tabular-nums">
            {f.qm(objekt.wohnflaeche)}
          </span>
        </span>
      </button>

      {/* Der Ansprechpartner liegt außerhalb des Kartenknopfs: die Nummer
          antippen soll anrufen, nicht das Objekt öffnen. */}
      {kontakt && (
        <div className="flex items-center gap-2 border-t border-linie px-3.5 py-2">
          <span className="min-w-0 flex-1 truncate text-[0.68rem] text-grau-stark">
            {kontakt.name}
            <span className="text-grau"> · {KONTAKTROLLEN[kontakt.rolle]}</span>
          </span>
          {kontakt.telefon && (
            <a
              href={`tel:${kontakt.telefon.replace(/\s+/g, "")}`}
              aria-label={`${kontakt.name} anrufen`}
              className="druckbar flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[0.64rem] text-tinte hover:bg-flaeche-hoch"
            >
              <Phone size={11} strokeWidth={2} />
              <span className="zahl tabular-nums">{kontakt.telefon}</span>
            </a>
          )}
        </div>
      )}

      {/* ----- Stufe wechseln ----- */}
      {/* `gap-px` über dem Linienton zeichnet die Trenner zwischen den Knöpfen
          mit — ohne eigenes Element, und es bleibt richtig, wenn nur ein Knopf
          übrig ist. */}
      {(zurueck || vor) && (
        <div className="flex gap-px border-t border-linie bg-linie">
          {zurueck && <Stufenknopf richtung="zurueck" ziel={zurueck} beiKlick={beiStufe} strasse={objekt.strasse} />}
          {vor && <Stufenknopf richtung="vor" ziel={vor} beiKlick={beiStufe} strasse={objekt.strasse} />}
        </div>
      )}
    </li>
  );
}

function Stufenknopf({
  richtung,
  ziel,
  beiKlick,
  strasse,
}: {
  richtung: "zurueck" | "vor";
  ziel: Ankaufsstufe;
  beiKlick: (neu: Ankaufsstufe) => void;
  strasse: string;
}) {
  const Pfeil = richtung === "zurueck" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={() => beiKlick(ziel)}
      aria-label={`${strasse} auf ${STUFEN[ziel].titel} setzen`}
      // 40 px hoch: genug Fläche, um es mit dem Daumen sicher zu treffen.
      className="druckbar flex h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-none bg-flaeche text-[0.68rem] font-medium text-grau-stark hover:text-tinte"
    >
      {richtung === "zurueck" && <Pfeil size={13} strokeWidth={2.2} className="shrink-0" />}
      <span className="truncate">{STUFEN[ziel].titel}</span>
      {richtung === "vor" && <Pfeil size={13} strokeWidth={2.2} className="shrink-0" />}
    </button>
  );
}
