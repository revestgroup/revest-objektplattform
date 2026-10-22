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
 * „Kein Deal“ antippt, muss vorher gelesen haben, was passiert. Und eine
 * Richtung, die es nicht gibt, bekommt keinen blassen Knopf, sondern gar
 * keinen — ein ausgegrauter Knopf ist eine Frage, die niemand gestellt hat.
 *
 * Beides schreibt dasselbe: `stufeSetzen`. Es gibt keinen zweiten Zustand,
 * den man synchron halten müsste.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import {
  STUFEN,
  berechneKennzahlen,
  f,
  type Ankaufsstufe,
  type Objekt,
} from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { cn } from "../lib/utils";

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
                    stufen={stufen}
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
 * Bewusst ohne Bild. In der Pipeline zählt, wie viele Objekte auf einer Stufe
 * liegen — mit Bild passen zwei Karten auf den Schirm, ohne Bild sechs.
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
  stufen: Ankaufsstufe[];
  verzoegerung: number;
  haengt: boolean;
  beiKlick: () => void;
  beiAnfassen: () => void;
  beiLoslassen: () => void;
  beiStufe: (neu: Ankaufsstufe) => void;
}) {
  const k = berechneKennzahlen(objekt);
  const stelle = stufen.indexOf(objekt.stufe);
  const zurueck = stelle > 0 ? stufen[stelle - 1] : null;
  const vor = stelle >= 0 && stelle < stufen.length - 1 ? stufen[stelle + 1] : null;

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
        className="block w-full cursor-grab px-3.5 pt-3 pb-3 text-left active:cursor-grabbing"
      >
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1 truncate text-[0.84rem] font-semibold text-tinte">
            {objekt.strasse}
          </span>
          {/* Nicht nur „zu teuer“, sondern um wie viel — sonst sieht die halbe
              Spalte gleich aus und das Zeichen nutzt sich ab. */}
          {k.zuTeuer && (
            <span
              title={`Forderung liegt ${f.eur(k.preisAbstand)} über dem Ankaufslimit`}
              className="zahl shrink-0 rounded-full bg-[#FBE2E2] px-2 py-0.5 text-[0.58rem] font-semibold text-[#9A2727] tabular-nums"
            >
              +{f.eurKurz(k.preisAbstand)}
            </span>
          )}
        </span>

        <span className="mt-1 block truncate text-[0.68rem] text-grau">
          {objekt.stadt} · {objekt.stadtteil}
        </span>

        <span className="mt-3 flex items-baseline justify-between gap-2">
          <span className="zahl text-[0.84rem] font-semibold text-tinte tabular-nums">
            {f.eur(objekt.kaufpreis)}
          </span>
          {/* Ohne hinterlegte Miete steht hier nichts statt zweimal einem
              Strich — ein leerer Platz liest sich schneller als eine Zeile,
              die nur sagt, dass sie nichts sagt. */}
          {k.faktor !== null && (
            <span className="zahl shrink-0 text-[0.64rem] text-grau tabular-nums">
              {f.faktor(k.faktor)} · {f.prozent(k.bruttoMietrendite)}
            </span>
          )}
        </span>
      </button>

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
