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
import { useEffect, useRef, useState } from "react";

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
import { useStufenwechsel } from "./Pruefung";

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
  // Stufe setzen mit Prüfhinweis; „Zur Prüfung“ öffnet das Objekt.
  const wechsel = useStufenwechsel(oeffnen);
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

  // ----- Seitlich bewegen -----
  // Trackpad und Shift + Mausrad scrollen die Leiste von selbst. Dazu kommen:
  // Greifen auf freier Fläche, Pfeilknöpfe am Rand und Mitscrollen, wenn eine
  // Karte an den Rand gezogen wird.
  const leiste = useRef<HTMLDivElement>(null);
  const greifen = useRef<{ x: number; links: number } | null>(null);
  const [rand, setRand] = useState({ links: false, rechts: false });

  function randPruefen() {
    const el = leiste.current;
    if (!el) return;
    setRand({
      links: el.scrollLeft > 4,
      rechts: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }

  useEffect(() => {
    randPruefen();
    window.addEventListener("resize", randPruefen);
    return () => window.removeEventListener("resize", randPruefen);
  }, [objekte.length, offeneAblage]);

  function blaettern(richtung: -1 | 1) {
    const el = leiste.current;
    if (!el) return;
    el.scrollBy({ left: richtung * el.clientWidth * 0.6, behavior: "smooth" });
    // Nicht jeder Browser meldet das Ende des sanften Scrollens zuverlässig.
    setTimeout(randPruefen, 400);
  }

  function greifenStart(e: React.PointerEvent<HTMLDivElement>) {
    // Nur auf freier Fläche und nur mit der Maus — Karten, Knöpfe und Links
    // behalten ihr eigenes Verhalten, am Telefon wischt der Finger ohnehin.
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("li, button, a, input, select")) return;
    greifen.current = { x: e.clientX, links: e.currentTarget.scrollLeft };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";
  }

  function greifenBewegen(e: React.PointerEvent<HTMLDivElement>) {
    if (!greifen.current) return;
    e.currentTarget.scrollLeft = greifen.current.links - (e.clientX - greifen.current.x);
    randPruefen();
  }

  function greifenEnde(e: React.PointerEvent<HTMLDivElement>) {
    if (!greifen.current) return;
    greifen.current = null;
    e.currentTarget.style.cursor = "";
  }

  /** Eine Karte am Rand der Leiste schiebt die Pipeline weiter. */
  function randScroll(e: React.DragEvent<HTMLDivElement>) {
    const el = leiste.current;
    if (!el || !zieht) return;
    const r = el.getBoundingClientRect();
    if (e.clientX < r.left + 70) el.scrollLeft -= 18;
    else if (e.clientX > r.right - 70) el.scrollLeft += 18;
  }

  function ablegen(stufe: Ankaufsstufe) {
    const o = zieht ? objekte.find((x) => x.id === zieht) : undefined;
    if (o) wechsel.setze(o, stufe);
    setZieht(null);
    setUeber(null);
  }

  return (
    <>
      {wechsel.dialog}
      <div className="relative">
        {rand.links && (
          <button
            type="button"
            onClick={() => blaettern(-1)}
            aria-label="Pipeline nach links"
            className="druckbar absolute top-8 left-1 z-10 hidden size-9 items-center justify-center rounded-full border border-linie bg-flaeche text-grau-stark shadow-karte hover:text-tinte md:flex"
          >
            <ChevronLeft size={16} strokeWidth={2.2} />
          </button>
        )}
        {rand.rechts && (
          <button
            type="button"
            onClick={() => blaettern(1)}
            aria-label="Pipeline nach rechts"
            className="druckbar absolute top-8 right-1 z-10 hidden size-9 items-center justify-center rounded-full border border-linie bg-flaeche text-grau-stark shadow-karte hover:text-tinte md:flex"
          >
            <ChevronRight size={16} strokeWidth={2.2} />
          </button>
        )}
        <div
          ref={leiste}
          onScroll={randPruefen}
          onPointerDown={greifenStart}
          onPointerMove={greifenBewegen}
          onPointerUp={greifenEnde}
          onPointerCancel={greifenEnde}
          onDragOver={randScroll}
          className="scroll-pipeline flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pt-5 pb-3 md:cursor-grab md:snap-none md:gap-2 md:px-6"
        >
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
                  <span
                    aria-hidden
                    className="h-1 w-full"
                    style={{ background: STUFEN[s].farbe }}
                  />
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
                  // Auf dem Telefon füllt eine Spalte den Blick und rastet ein.
                  // Am Rechner schmal genug, dass alle sieben Stufen bis
                  // „Gekauft“ bei 1440 px nebeneinander stehen.
                  "flex w-[80vw] max-w-[19rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-flaeche-hoch transition-colors duration-150 ease-out sm:w-[15rem] md:w-[9.5rem]",
                  ziel && "bg-flaeche-aktiv",
                )}
              >
                {/* Der farbige Streifen trägt die Stufe. Dadurch bleibt im Kopf
                Platz für Namen und Zahl, und die Spalte ist beim Wischen auch
                dann erkennbar, wenn nur ihr Rand im Bild steht. */}
                <span aria-hidden className="h-1 w-full" style={{ background: STUFEN[s].farbe }} />

                <header className="flex items-center gap-1.5 px-3 pt-3 pb-1.5">
                  <h3
                    title={STUFEN[s].titel}
                    className="min-w-0 flex-1 truncate text-[0.64rem] font-semibold tracking-[0.08em] uppercase text-tinte"
                  >
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

                <p className="zahl px-3 pb-2 text-[0.62rem] text-grau tabular-nums">
                  {summe > 0 ? f.eurKurz(summe) : "—"}
                </p>

                {/* ----- Stapel ----- */}
                {spalte.length === 0 ? (
                  // Nur eine dünne Ablagefläche — ein großer „Leer“-Kasten
                  // ließ die halbe Pipeline nach Arbeit aussehen, die es nicht gibt.
                  <div className="px-2 pb-2">
                    <p
                      className={cn(
                        "flex h-8 items-center justify-center rounded-lg border border-dashed text-[0.6rem]",
                        ziel ? "border-tinte text-tinte" : "border-linie-stark text-transparent",
                      )}
                    >
                      Hier ablegen
                    </p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2 px-2 pb-2">
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
                        beiStufe={(neu) => wechsel.setze(o, neu)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </>
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
        <div className="h-16 w-full overflow-hidden bg-flaeche-hoch">
          <Bildflaeche eintrag={objekt.bilder[0] ?? "Kein Bild"} />
        </div>

        <span className="block px-2.5 pt-2">
          <span title={titel} className="block truncate text-[0.74rem] font-semibold text-tinte">
            {titel}
          </span>
          <span className="mt-0.5 block truncate text-[0.62rem] text-grau">
            {objekt.strasse}, {objekt.stadt}
          </span>
        </span>

        <span className="flex items-baseline justify-between gap-1.5 px-2.5 pt-1.5 pb-2">
          <span className="zahl text-[0.74rem] font-semibold text-tinte tabular-nums">
            {f.eur(objekt.kaufpreis)}
          </span>
          <span className="zahl shrink-0 text-[0.6rem] text-grau-stark tabular-nums">
            {f.qm(objekt.wohnflaeche)}
          </span>
        </span>
      </button>

      {/* Der Ansprechpartner liegt außerhalb des Kartenknopfs: die Nummer
          antippen soll anrufen, nicht das Objekt öffnen. */}
      {/* Firma oder Person — bei „Brandt & Partner, Herr Ostermann“ die Firma.
          Das Telefon nur als Symbol, sonst schneidet die schmale Karte den
          Namen ab. Außerhalb des Kartenknopfs: antippen ruft an. */}
      {kontakt && (
        <div className="flex items-center gap-1.5 border-t border-linie py-1 pr-1 pl-2.5">
          <span
            title={`${kontakt.name} · ${KONTAKTROLLEN[kontakt.rolle]}${kontakt.telefon ? ` · ${kontakt.telefon}` : ""}`}
            className="min-w-0 flex-1 truncate text-[0.62rem] text-grau-stark"
          >
            {kontakt.name.split(",")[0].trim()}
          </span>
          {kontakt.telefon && (
            <a
              href={`tel:${kontakt.telefon.replace(/\s+/g, "")}`}
              aria-label={`${kontakt.name} anrufen`}
              title={kontakt.telefon}
              className="druckbar flex size-6 shrink-0 items-center justify-center rounded-full text-tinte hover:bg-flaeche-hoch"
            >
              <Phone size={11} strokeWidth={2} />
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
          {zurueck && (
            <Stufenknopf
              richtung="zurueck"
              ziel={zurueck}
              beiKlick={beiStufe}
              strasse={objekt.strasse}
            />
          )}
          {vor && (
            <Stufenknopf richtung="vor" ziel={vor} beiKlick={beiStufe} strasse={objekt.strasse} />
          )}
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
      // 36 px hoch: am Daumen noch sicher zu treffen, in der schmalen Spalte nicht zu wuchtig.
      className="druckbar flex h-9 min-w-0 flex-1 items-center justify-center gap-0.5 rounded-none bg-flaeche px-1 text-[0.6rem] font-medium text-grau-stark hover:text-tinte"
    >
      {richtung === "zurueck" && <Pfeil size={13} strokeWidth={2.2} className="shrink-0" />}
      <span className="truncate">{STUFEN[ziel].titel}</span>
      {richtung === "vor" && <Pfeil size={13} strokeWidth={2.2} className="shrink-0" />}
    </button>
  );
}
