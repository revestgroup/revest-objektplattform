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
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
import { useEinstellungen } from "../lib/einstellungenStore";
import {
  OBJEKTARTEN,
  STUFEN,
  STUFEN_REIHENFOLGE,
  berechneKennzahlen,
  f,
  type Ankaufsstufe,
  type Objekt,
} from "../lib/objekte";
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
  /** Nur am Telefon: Vorschaublatt über der Karte, bevor es ganzseitig wird. */
  | { art: "vorschau"; id: string }
  | { art: "detail"; id: string }
  | { art: "bearbeiten"; id: string }
  | { art: "anlegen" };

/** Schwebender Knopf über der Karte. Gleiche Form überall, damit es ruhig wirkt. */
const KNOPF =
  "druckbar flex items-center justify-center gap-2 rounded-full border bg-flaeche/95 shadow-karte backdrop-blur-sm";

/**
 * Telefonformat. Entscheidet, ob ein Tippen auf einen Punkt zuerst das
 * Vorschaublatt zeigt oder direkt ganzseitig öffnet. Auf dem Telefon wäre der
 * Direktsprung unverzeihlich: ein Fehlgriff verdeckt die ganze Karte.
 */
function useTelefon(): boolean {
  const [klein, setKlein] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 767px)");
    const melden = () => setKlein(m.matches);
    melden();
    m.addEventListener("change", melden);
    return () => m.removeEventListener("change", melden);
  }, []);
  return klein;
}

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
  const telefon = useTelefon();

  // Die Einstellungen liegen im Browserspeicher und sind erst nach dem ersten
  // Bild da. Sie setzen deshalb den Startzustand nach, statt ihn vorzugeben —
  // wer danach auf der Karte umschaltet, behält seine Wahl für die Sitzung.
  const { einstellungen, bereit: einstellungenBereit } = useEinstellungen();
  const uebernommen = useRef(false);
  useEffect(() => {
    if (!einstellungenBereit || uebernommen.current) return;
    uebernommen.current = true;
    setAnsicht(einstellungen.karteLuftbild ? "luftbild" : "karte");
    setStadtteileZeigen(einstellungen.teilorteZeigen);
  }, [einstellungenBereit, einstellungen.karteLuftbild, einstellungen.teilorteZeigen]);

  const gewaehlt =
    modus.art === "detail" || modus.art === "bearbeiten" || modus.art === "vorschau"
      ? (objekte.find((o) => o.id === modus.id) ?? null)
      : null;
  const vorschau = modus.art === "vorschau" ? gewaehlt : null;

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
          beschriftung={einstellungen.punktBeschriftung}
          gewaehltesObjekt={gewaehlt?.id ?? null}
          onObjektWaehlen={(id) => {
            if (!id) return setModus({ art: "zu" });
            if (!telefon || !einstellungen.vorschaublatt) return setModus({ art: "detail", id });
            setModus({ art: "vorschau", id });
            const o = objekte.find((x) => x.id === id);
            // Der Punkt muss über das Blatt wandern, sonst tippt man ins Blinde.
            if (o) steuerung.current?.aufObjekt(o);
          }}
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
          // Weicht dem Vorschaublatt: ein halb verdeckter Knopf ist schlimmer
          // als keiner.
          "transition-opacity duration-200 ease-out",
          vorschau && "pointer-events-none opacity-0",
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

      {/* ----- Telefon: Vorschaublatt ----- */}
      <Vorschaublatt
        objekt={vorschau}
        schliessen={() => setModus({ art: "zu" })}
        oeffnen={() => vorschau && setModus({ art: "detail", id: vorschau.id })}
      />

      {/* ----- Schublade ----- */}
      <Schublade
        offen={modus.art !== "zu" && modus.art !== "vorschau"}
        schliessen={() => setModus({ art: "zu" })}
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
/* Telefon: Vorschaublatt                                               */
/* ------------------------------------------------------------------ */

/**
 * Was nach dem Tippen auf einen Punkt erscheint.
 *
 * Das Blatt bleibt immer im Baum und fährt per translateY — nur so ist das
 * Schließen genauso weich wie das Öffnen. Es deckt bewusst nur die untere
 * Hälfte ab: Wer danebengetippt hat, sieht den Fehler sofort und tippt den
 * richtigen Punkt an, ohne erst etwas schließen zu müssen.
 */
function Vorschaublatt({
  objekt,
  schliessen,
  oeffnen,
}: {
  objekt: Objekt | null;
  schliessen: () => void;
  oeffnen: () => void;
}) {
  // Letzten Inhalt behalten, damit beim Hinausfahren nichts leer blinkt.
  const letztes = useRef<Objekt | null>(null);
  if (objekt) letztes.current = objekt;
  const o = objekt ?? letztes.current;

  const k = o ? berechneKennzahlen(o) : null;
  const zahlen = o
    ? [
        { t: "Kaufpreis", v: f.eurKurz(o.kaufpreis) },
        { t: "Faktor", v: f.faktor(k?.faktor) },
        { t: "Rendite", v: f.prozent(k?.bruttoMietrendite) },
      ]
    : [];

  return (
    <div
      aria-hidden={!objekt}
      className={cn(
        "absolute inset-x-0 z-30 px-3 md:hidden",
        // Über der festen Unterleiste und dem Aktionsknopf stehen bleiben.
        "bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)]",
        "transition-transform duration-300 ease-drawer",
        objekt ? "translate-y-0" : "translate-y-[150%]",
      )}
    >
      {o && (
        <div className="overflow-hidden rounded-2xl border border-linie bg-flaeche/97 shadow-schwebe backdrop-blur-sm">
          {/* Griffleiste: zeigt, dass das Blatt zur Karte gehört und nicht
              die Seite ersetzt. */}
          <button
            type="button"
            onClick={schliessen}
            aria-label="Vorschau schließen"
            className="druckbar flex w-full justify-center py-2.5"
          >
            <span aria-hidden className="h-1 w-9 rounded-full bg-linie-stark" />
          </button>

          <div className="px-4 pb-4">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-[0.3rem] size-2.5 shrink-0 rounded-full"
                style={{ background: STUFEN[o.stufe].farbe }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.95rem] leading-tight font-semibold text-tinte">
                  {o.strasse}
                </div>
                <div className="mt-1 truncate text-[0.7rem] text-grau">
                  {o.plz} {o.stadt} · {o.stadtteil} · {OBJEKTARTEN[o.objektart]}
                </div>
              </div>
            </div>

            <dl className="mt-3.5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-linie bg-linie">
              {zahlen.map((z) => (
                <div key={z.t} className="bg-flaeche px-3 py-2.5">
                  <dt className="mini-label text-[0.52rem]">{z.t}</dt>
                  <dd className="zahl mt-1 text-[0.82rem] font-semibold text-tinte">{z.v}</dd>
                </div>
              ))}
            </dl>

            {k?.zuTeuer && (
              <div className="zahl mt-2.5 rounded-lg bg-[#FBE2E2] px-3 py-2 text-[0.64rem] font-medium text-[#9A2727]">
                {f.eur(k.preisAbstand)} über Ankaufslimit
              </div>
            )}

            <div className="mt-3.5 flex gap-2">
              <button
                type="button"
                onClick={oeffnen}
                className="druckbar h-11 flex-1 rounded-full bg-tinte text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte"
              >
                Objekt öffnen
              </button>
              <button
                type="button"
                onClick={schliessen}
                className="druckbar h-11 rounded-full border border-linie-stark px-5 text-[0.68rem] font-medium tracking-[0.14em] uppercase text-grau-stark"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
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
