/**
 * Kartenseite — das Herz der Plattform.
 *
 * Die Karte liegt randlos darunter, alles andere schwebt darüber.
 *
 * Desktop: alles schwebt am Rand — Bilanz unten links, Ansicht, Filter und
 * „Objekt anlegen" oben rechts. Der Filter ist ein Icon mit Ausklapp-Feld,
 * kein Dauerpanel: die Karte gehört den Objekten. Am Telefon wird daraus
 * eine schmale Leiste oben, eine waagerecht scrollbare Chipreihe und ein
 * Aktionsknopf unten rechts über der Navigationsleiste.
 *
 * Standardansicht ist das Luftbild — Timo denkt in Dächern und Grundstücken,
 * der Plan ist die Ausnahme zum Nachschlagen von Straßennamen.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronDown,
  Layers,
  Map as MapIcon,
  Maximize2,
  Plus,
  SlidersHorizontal,
  Type,
} from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Schublade } from "../components/AppLayout";
import type { NeuesDokument } from "../components/Dokumente";
import {
  Karte,
  type Kartenansicht,
  type KartenSteuerung,
  type KartenZustand,
} from "../components/Karte";
import { ObjektDetail, ObjektSchwebekarte } from "../components/ObjektDetail";
import { ObjektFormular } from "../components/ObjektFormular";
import { STUFEN, STUFEN_REIHENFOLGE, f, type Ankaufsstufe, type Objekt } from "../lib/objekte";
import { useObjekte, type ObjektEntwurf } from "../lib/objekteStore";
import {
  ausschnittVon,
  bilanzJeStadtteil,
  type StadtteilBilanz,
} from "../lib/stadtteile";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/karte")({ component: KarteSeite });

type Modus =
  | { art: "zu" }
  | { art: "detail"; id: string }
  | { art: "bearbeiten"; id: string }
  | { art: "anlegen" };

/** Schwebender Knopf über der Karte. Gleiche Form überall, damit es ruhig wirkt. */
const KNOPF =
  "druckbar flex items-center justify-center gap-2 rounded-full border bg-flaeche/95 shadow-karte backdrop-blur-sm";

function KarteSeite() {
  const { objekte, bereit, anlegen, aendern, dokumenteAnhaengen } = useObjekte();

  const [stufen, setStufen] = useState<Set<Ankaufsstufe>>(new Set());
  // Standardmäßig aus: die Ankaufsarbeit dreht sich um Objekte, nicht um
  // Teilorte. Wer sich orientieren will, blendet die Namen kurz ein.
  const [stadtteileZeigen, setStadtteileZeigen] = useState(false);
  // Luftbild ist der Normalfall — hier zählen Dächer und Grundstücke.
  const [ansicht, setAnsicht] = useState<Kartenansicht>("luftbild");
  const [betont, setBetont] = useState<string | null>(null);
  const [filterOffen, setFilterOffen] = useState(false);
  const [modus, setModus] = useState<Modus>({ art: "zu" });

  const steuerung = useRef<KartenSteuerung | null>(null);

  const gewaehlt =
    modus.art === "detail" || modus.art === "bearbeiten"
      ? (objekte.find((o) => o.id === modus.id) ?? null)
      : null;

  /* ---------------- Schwebekarte ---------------- */
  // Ein Render je Hover-Wechsel, nicht je Mausbewegung: das Objekt steht im
  // State, die Position wird direkt am DOM-Knoten gesetzt.
  const [schwebe, setSchwebe] = useState<Objekt | null>(null);
  const karteRef = useRef<HTMLDivElement>(null);
  const kartenKarteRef = useRef<HTMLDivElement>(null);
  const letztePosition = useRef<{ x: number; y: number } | null>(null);

  const positionieren = useCallback(() => {
    const el = kartenKarteRef.current;
    const rahmen = karteRef.current;
    const p = letztePosition.current;
    if (!el || !rahmen || !p) return;
    const abstand = 18;
    let x = p.x + abstand;
    let y = p.y + abstand;
    if (x + el.offsetWidth > rahmen.clientWidth - 12) x = p.x - el.offsetWidth - abstand;
    if (y + el.offsetHeight > rahmen.clientHeight - 12)
      y = Math.max(12, p.y - el.offsetHeight - abstand);
    el.style.transform = `translate(${Math.max(12, x)}px, ${y}px)`;
  }, []);

  const beiSchweben = useCallback(
    (z: KartenZustand) => {
      if (z.position) letztePosition.current = z.position;
      if ((z.schweben?.id ?? null) !== (schwebe?.id ?? null)) setSchwebe(z.schweben);
      positionieren();
    },
    [schwebe, positionieren],
  );

  // Beim ersten Erscheinen gibt es den Knoten noch nicht — hier nachziehen,
  // damit die Karte nicht eine Bildfolge lang in der Ecke klebt.
  useLayoutEffect(positionieren, [schwebe, positionieren]);

  /* ---------------- Aktionen ---------------- */
  function stufeUmschalten(s: Ankaufsstufe) {
    setStufen((alt) => {
      const neu = new Set(alt);
      if (neu.has(s)) neu.delete(s);
      else neu.add(s);
      return neu;
    });
  }

  function stadtteilWaehlen(schluessel: string) {
    if (betont === schluessel) {
      setBetont(null);
      steuerung.current?.zuruecksetzen();
      return;
    }
    setBetont(schluessel);
    const grenzen = ausschnittVon(schluessel);
    if (grenzen) steuerung.current?.aufAusschnitt(grenzen, 56);
  }

  function speichern(entwurf: ObjektEntwurf, dokumente: NeuesDokument[]) {
    if (modus.art === "bearbeiten") {
      aendern(modus.id, entwurf, "Objektdaten bearbeitet");
      if (dokumente.length > 0) dokumenteAnhaengen(modus.id, dokumente);
      setModus({ art: "detail", id: modus.id });
      return;
    }
    const neu = anlegen(entwurf);
    if (dokumente.length > 0) dokumenteAnhaengen(neu.id, dokumente);
    setModus({ art: "detail", id: neu.id });
  }

  /* ---------------- Ableitungen ---------------- */
  const anzahlJeStufe = useMemo(() => {
    const m = new Map<Ankaufsstufe, number>();
    for (const o of objekte) m.set(o.stufe, (m.get(o.stufe) ?? 0) + 1);
    return m;
  }, [objekte]);

  // Leere Stadtteile verschweigen — die Liste soll zeigen, wo etwas läuft.
  const bilanz = useMemo(
    () =>
      [...bilanzJeStadtteil(objekte).values()]
        .filter((b) => b.anzahl > 0)
        .sort(
          (a, b) =>
            b.angekauft - a.angekauft || b.anzahl - a.anzahl || a.name.localeCompare(b.name),
        ),
    [objekte],
  );

  const sichtbar = useMemo(
    () => (stufen.size === 0 ? objekte : objekte.filter((o) => stufen.has(o.stufe))),
    [objekte, stufen],
  );

  const stufenChips = STUFEN_REIHENFOLGE.map((s) => {
    const aktiv = stufen.size === 0 || stufen.has(s);
    return (
      <button
        key={s}
        type="button"
        onClick={() => stufeUmschalten(s)}
        aria-pressed={stufen.has(s)}
        className={cn(
          "druckbar flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-left transition-opacity duration-150 ease-out md:w-full md:shrink",
          aktiv ? "border-linie bg-flaeche opacity-100" : "border-transparent bg-flaeche opacity-40",
        )}
      >
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ background: STUFEN[s].farbe }}
        />
        <span className="truncate text-[0.72rem] font-medium text-grau-stark md:min-w-0 md:flex-1">
          {STUFEN[s].titel}
        </span>
        <span className="zahl shrink-0 text-[0.64rem] font-semibold tabular-nums text-grau">
          {anzahlJeStufe.get(s) ?? 0}
        </span>
      </button>
    );
  });

  return (
    <div ref={karteRef} className="absolute inset-0 overflow-hidden">
      {bereit && (
        <Karte
          objekte={objekte}
          stufen={stufen}
          stadtteileZeigen={stadtteileZeigen}
          ansicht={ansicht}
          gewaehltesObjekt={gewaehlt?.id ?? null}
          onObjektWaehlen={(id) => setModus(id ? { art: "detail", id } : { art: "zu" })}
          onLeerKlick={() => setModus({ art: "zu" })}
          onSchweben={beiSchweben}
          steuerungRef={steuerung}
        />
      )}

      {/* ================= Telefon: Leiste oben ================= */}
      <div className="absolute inset-x-0 top-0 z-20 md:hidden">
        <div className="flex items-center gap-2 px-3 pt-3">
          <button
            type="button"
            onClick={() => setFilterOffen((a) => !a)}
            aria-pressed={filterOffen}
            className={cn(
              KNOPF,
              "h-11 px-4 text-[0.72rem] font-medium",
              stufen.size > 0 ? "border-tinte bg-tinte text-grund" : "border-linie text-tinte",
            )}
          >
            <SlidersHorizontal size={15} strokeWidth={2} />
            {stufen.size > 0 ? `${stufen.size} Filter` : "Filter"}
          </button>
          <span className={cn(KNOPF, "h-11 border-linie px-4 text-[0.72rem] text-grau-stark")}>
            <span className="zahl font-semibold text-tinte">{sichtbar.length}</span> Objekte
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setAnsicht((a) => (a === "karte" ? "luftbild" : "karte"))}
              aria-pressed={ansicht === "luftbild"}
              aria-label={ansicht === "luftbild" ? "Plan anzeigen" : "Luftbild anzeigen"}
              className={cn(
                KNOPF,
                "size-11",
                ansicht === "luftbild" ? "border-tinte bg-tinte text-grund" : "border-linie text-tinte",
              )}
            >
              {ansicht === "luftbild" ? (
                <MapIcon size={17} strokeWidth={1.75} />
              ) : (
                <Layers size={17} strokeWidth={1.75} />
              )}
            </button>
            <button
              type="button"
              onClick={() => steuerung.current?.zuruecksetzen()}
              aria-label="Gesamtansicht"
              className={cn(KNOPF, "size-11 border-linie text-tinte")}
            >
              <Maximize2 size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Chipreihe fährt aus, statt eine Fläche zu belegen. */}
        {filterOffen && (
          <div className="mt-2 overflow-x-auto overscroll-x-contain px-3 pb-1">
            <div className="flex w-max gap-2">
              {stufenChips}
              <button
                type="button"
                onClick={() => setStadtteileZeigen((a) => !a)}
                aria-pressed={stadtteileZeigen}
                className={cn(
                  KNOPF,
                  "shrink-0 px-3 py-2 text-[0.68rem] tracking-wider uppercase",
                  stadtteileZeigen ? "border-tinte bg-tinte text-grund" : "border-linie text-grau",
                )}
              >
                <Type size={13} strokeWidth={2} />
                Teilorte
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Telefon: Objekt anlegen als Aktionsknopf über der Navigationsleiste. */}
      <button
        type="button"
        onClick={() => setModus({ art: "anlegen" })}
        className={cn(
          KNOPF,
          // bottom misst ab der Main-Kante — die fixe Unterleiste (h-14 + safe
          // area) liegt davor, also darüber hinweg heben.
          "absolute right-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] z-20 h-13 border-tinte bg-tinte px-5 text-[0.7rem] font-semibold tracking-[0.12em] uppercase text-grund md:hidden",
        )}
      >
        <Plus size={16} strokeWidth={2} />
        Objekt anlegen
      </button>

      {/* ================= Desktop: Ansicht, Filter, Anlegen oben rechts ================= */}
      <div className="absolute top-5 right-5 z-20 hidden md:block">
        <div className="flex gap-2">
          {/* Ein Segment, kein Umschalter — man sieht sofort beide Möglichkeiten. */}
          <div className="flex rounded-full border border-linie bg-flaeche/95 p-1 shadow-karte backdrop-blur-sm">
            {(
              [
                ["luftbild", "Luftbild", Layers],
                ["karte", "Plan", MapIcon],
              ] as const
            ).map(([wert, titel, Zeichen]) => (
              <button
                key={wert}
                type="button"
                onClick={() => setAnsicht(wert)}
                aria-pressed={ansicht === wert}
                className={cn(
                  "druckbar flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.66rem] font-medium",
                  ansicht === wert ? "bg-tinte text-grund" : "text-grau-stark",
                )}
              >
                <Zeichen size={13} strokeWidth={1.9} />
                {titel}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => steuerung.current?.zuruecksetzen()}
            title="Gesamtansicht"
            aria-label="Gesamtansicht"
            className={cn(KNOPF, "size-9 border-linie text-grau hover:text-tinte")}
          >
            <Maximize2 size={14} strokeWidth={1.75} />
          </button>

          {/* Filter als Icon — das Feld kommt nur auf Abruf. */}
          <button
            type="button"
            onClick={() => setFilterOffen((a) => !a)}
            aria-pressed={filterOffen}
            aria-label="Filter"
            title="Filter"
            className={cn(
              KNOPF,
              "relative size-9",
              filterOffen || stufen.size > 0
                ? "border-tinte bg-tinte text-grund"
                : "border-linie text-grau hover:text-tinte",
            )}
          >
            <SlidersHorizontal size={14} strokeWidth={2} />
            {stufen.size > 0 && (
              <span className="zahl absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-flaeche text-[0.56rem] font-semibold text-tinte shadow-karte">
                {stufen.size}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setModus({ art: "anlegen" })}
            className={cn(
              KNOPF,
              "border-tinte bg-tinte px-4 py-2 text-[0.66rem] font-semibold tracking-[0.1em] uppercase text-grund",
            )}
          >
            <Plus size={13} strokeWidth={2.25} />
            Objekt anlegen
          </button>
        </div>

        {/* Ausklapp-Feld unter dem Filter-Icon. */}
        {filterOffen && (
          <div className="eintritt absolute top-12 right-0 w-[300px] overflow-hidden rounded-xl border border-linie bg-flaeche/95 shadow-hoch backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2 border-b border-linie px-4 py-2.5">
              <span className="mini-label">Status</span>
              <button
                type="button"
                onClick={() => setStufen(new Set())}
                disabled={stufen.size === 0}
                className="druckbar rounded-full px-2 py-0.5 text-[0.62rem] tracking-wider uppercase text-grau disabled:opacity-0 hover:text-tinte"
              >
                Alle
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-2">{stufenChips}</div>

            <div className="flex items-center justify-between gap-3 border-t border-linie px-4 py-2.5">
              <span className="text-[0.7rem] text-grau">
                <span className="zahl font-semibold text-tinte">{sichtbar.length}</span> von{" "}
                {objekte.length} sichtbar
              </span>
              <button
                type="button"
                onClick={() => setStadtteileZeigen((a) => !a)}
                aria-pressed={stadtteileZeigen}
                title="Namen der Teilorte einblenden"
                className={cn(
                  "druckbar flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6rem] tracking-wider uppercase",
                  stadtteileZeigen
                    ? "border-tinte bg-tinte text-grund"
                    : "border-linie-stark text-grau",
                )}
              >
                <Type size={11} strokeWidth={2} />
                Teilorte
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ----- unten links: Stadtteilbilanz ----- */}
      <Bilanzfeld bilanz={bilanz} betont={betont} waehlen={stadtteilWaehlen} />

      {/* ----- Schwebekarte (nur Zeigergeräte) ----- */}
      <div
        ref={kartenKarteRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 left-0 z-30 hidden transition-opacity duration-150 ease-out md:block",
          schwebe ? "opacity-100" : "opacity-0",
        )}
      >
        {schwebe && <ObjektSchwebekarte objekt={schwebe} />}
      </div>

      {/* ----- Schublade ----- */}
      <Schublade
        offen={modus.art !== "zu"}
        schliessen={() => setModus({ art: "zu" })}
        voll={modus.art === "anlegen" || modus.art === "bearbeiten"}
        titel={
          modus.art === "anlegen"
            ? "Objekt anlegen"
            : modus.art === "bearbeiten"
              ? "Objekt bearbeiten"
              : (gewaehlt?.strasse ?? "Objekt")
        }
      >
        {modus.art === "anlegen" && (
          <ObjektFormular
            onSpeichern={speichern}
            onAbbrechen={() => setModus({ art: "zu" })}
          />
        )}
        {modus.art === "bearbeiten" && gewaehlt && (
          <ObjektFormular
            bestehend={gewaehlt}
            onSpeichern={speichern}
            onAbbrechen={() => setModus({ art: "detail", id: gewaehlt.id })}
          />
        )}
        {modus.art === "detail" && gewaehlt && (
          <ObjektDetail
            objekt={gewaehlt}
            onBearbeiten={() => setModus({ art: "bearbeiten", id: gewaehlt.id })}
            onAufKarte={() => steuerung.current?.aufObjekt(gewaehlt)}
          />
        )}
      </Schublade>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bilanz je Stadtteil                                                  */
/* ------------------------------------------------------------------ */

function Bilanzfeld({
  bilanz,
  betont,
  waehlen,
}: {
  bilanz: StadtteilBilanz[];
  betont: string | null;
  waehlen: (schluessel: string) => void;
}) {
  const [offen, setOffen] = useState(false);

  return (
    <div className="absolute bottom-5 left-5 z-20 hidden w-[300px] overflow-hidden rounded-xl border border-linie bg-flaeche/95 shadow-hoch backdrop-blur-sm md:block">
      <button
        type="button"
        onClick={() => setOffen((a) => !a)}
        aria-expanded={offen}
        className="druckbar flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={cn(
            "shrink-0 text-grau transition-transform duration-200 ease-out-stark",
            !offen && "-rotate-90",
          )}
        />
        <span className="mini-label flex-1">Stadtteile</span>
        <span className="zahl text-[0.62rem] text-grau">{bilanz.length}</span>
      </button>

      {offen && (
        <ul className="max-h-[42vh] overflow-y-auto overscroll-contain border-t border-linie">
          {bilanz.map((b, i) => (
            <li
              key={b.schluessel}
              className="eintritt"
              style={{ animationDelay: `${Math.min(i, 8) * 24}ms` }}
            >
              <button
                type="button"
                onClick={() => waehlen(b.schluessel)}
                aria-pressed={betont === b.schluessel}
                className={cn(
                  "druckbar flex w-full items-center gap-3 px-4 py-2 text-left",
                  betont === b.schluessel && "bg-flaeche-aktiv",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.74rem] text-tinte">{b.name}</span>
                  <span className="block truncate text-[0.6rem] text-grau">
                    {b.stadt}
                    {b.angekauft > 0 ? ` · ${f.eur(b.investiert)} investiert` : ""}
                  </span>
                </span>
                <span className="zahl shrink-0 text-right">
                  <span className="block text-[0.72rem] font-semibold text-tinte">{b.anzahl}</span>
                  <span className="block text-[0.58rem] text-grau">{b.angekauft} gekauft</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
