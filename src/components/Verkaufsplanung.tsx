/**
 * Verkaufsplanung — die Wunschrechnung eines Objekts.
 *
 * Drei Entscheidungen tragen diesen Reiter:
 *
 *  1. Er existiert erst nach dem Ankauf. Beim Anlegen weiß niemand, wie die
 *     Aufteilung aussieht; wer dort nach Wunschpreisen fragt, bekommt geratene
 *     Zahlen, die später als Wahrheit gelesen werden.
 *
 *  2. Er rechnet mit, speichert aber nur auf Befehl. Beim Durchspielen von
 *     Preisen soll nichts in den Verlauf tropfen — gespeichert wird, wenn die
 *     Variante steht.
 *
 *  3. Die Felder sind rahmenlos. Zwölf Zeilen mit je fünf umrandeten Kästen
 *     wären ein Gitter aus Linien; hier zeigt sich die Fläche erst, wenn man
 *     sie anfasst.
 */
import { Check, Copy, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  berechneKennzahlen,
  berechneVerkaufsplan,
  f,
  leererVerkaufsplan,
  type Einheit,
  type Objekt,
  type Verkaufsplan,
  type Verkaufsposten,
} from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { cn } from "../lib/utils";

/* ------------------------------------------------------------------ */
/* Eingabezustand                                                       */
/* ------------------------------------------------------------------ */

/**
 * Zahlen liegen beim Tippen als Text vor, nicht als Zahl. Sonst springt der
 * Zeiger, sobald man „850." schreibt: aus der geparsten 850 würde wieder
 * „850" im Feld, mitten im Tippen.
 */
interface PostenEingabe {
  id: string;
  bezeichnung: string;
  flaeche: string;
  zimmer: string;
  wunschpreis: string;
  monatsmiete: string;
  alsWg: boolean;
}

interface PlanEingabe {
  posten: PostenEingabe[];
  sanierungsschaetzung: string;
  verkaufsprovision: string;
  notiz: string;
}

function z(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function t(v: number | null): string {
  return v === null ? "" : String(v);
}

function ausPlan(plan: Verkaufsplan): PlanEingabe {
  return {
    posten: plan.posten.map((p) => ({
      id: p.id,
      bezeichnung: p.bezeichnung,
      flaeche: t(p.flaeche),
      zimmer: t(p.zimmer),
      wunschpreis: t(p.wunschpreis),
      monatsmiete: t(p.monatsmiete),
      alsWg: p.alsWg,
    })),
    sanierungsschaetzung: t(plan.sanierungsschaetzung),
    verkaufsprovision: t(plan.verkaufsprovision),
    notiz: plan.notiz ?? "",
  };
}

function inPlan(e: PlanEingabe, stand: string | null): Verkaufsplan {
  return {
    posten: e.posten.map<Verkaufsposten>((p) => ({
      id: p.id,
      bezeichnung: p.bezeichnung.trim() || "Ohne Bezeichnung",
      flaeche: z(p.flaeche),
      zimmer: z(p.zimmer),
      wunschpreis: z(p.wunschpreis),
      monatsmiete: z(p.monatsmiete),
      alsWg: p.alsWg,
    })),
    sanierungsschaetzung: z(e.sanierungsschaetzung),
    verkaufsprovision: z(e.verkaufsprovision),
    notiz: e.notiz.trim() || null,
    stand,
  };
}

let zaehler = 0;
function neueId() {
  zaehler += 1;
  return `vp-${Date.now().toString(36)}-${zaehler}`;
}

function leererPosten(nummer: number): PostenEingabe {
  return {
    id: neueId(),
    bezeichnung: `Wohnung ${nummer}`,
    flaeche: "",
    zimmer: "",
    wunschpreis: "",
    monatsmiete: "",
    alsWg: false,
  };
}

/* ------------------------------------------------------------------ */
/* Reiter                                                               */
/* ------------------------------------------------------------------ */

export function Verkaufsplanung({ objekt }: { objekt: Objekt }) {
  const { einheitenSetzen, verkaufsplanSetzen } = useObjekte();
  const gespeichert = objekt.verkaufsplan ?? leererVerkaufsplan();

  const [e, setE] = useState<PlanEingabe>(() => ausPlan(gespeichert));

  const k = useMemo(() => berechneKennzahlen(objekt), [objekt]);
  const rechnung = useMemo(
    () => berechneVerkaufsplan({ ...objekt, verkaufsplan: inPlan(e, null) }, k),
    [objekt, e, k],
  );

  // Vergleich über den Datenstand, nicht über jedes Feld: der Zeitstempel ist
  // ausgenommen, weil er sich beim Speichern ohnehin ändert.
  const geaendert = useMemo(
    () => JSON.stringify(inPlan(e, null)) !== JSON.stringify({ ...gespeichert, stand: null }),
    [e, gespeichert],
  );

  function setzePosten(id: string, teil: Partial<PostenEingabe>) {
    setE((alt) => ({
      ...alt,
      posten: alt.posten.map((p) => (p.id === id ? { ...p, ...teil } : p)),
    }));
  }

  function hinzufuegen() {
    setE((alt) => ({ ...alt, posten: [...alt.posten, leererPosten(alt.posten.length + 1)] }));
  }

  function entfernen(id: string) {
    setE((alt) => ({ ...alt, posten: alt.posten.filter((p) => p.id !== id) }));
  }

  /** Aus der bestehenden Aufteilung übernehmen — Flächen und Mieten stehen dort schon. */
  function ausEinheiten() {
    setE((alt) => ({
      ...alt,
      posten: objekt.einheiten.map((u) => ({
        id: neueId(),
        bezeichnung: u.geschoss ? `${u.bezeichnung} · ${u.geschoss}` : u.bezeichnung,
        flaeche: u.wohnflaeche ? String(u.wohnflaeche) : "",
        zimmer: u.zimmer ? String(u.zimmer) : "",
        wunschpreis: t(u.verkaufspreis),
        monatsmiete: t(u.kaltmiete),
        alsWg: false,
      })),
    }));
  }

  /**
   * Der Rückweg: aus der Planung werden Einheiten.
   *
   * Die Aufteilung wird hier erdacht, verkauft wird sie aber im Reiter
   * Einheiten — und bisher musste man sie dort ein zweites Mal tippen.
   *
   * Zwei Bedingungen hängen daran: Es darf noch keine Einheiten geben, sonst
   * würde eine bestehende Aufteilung samt Käufern überschrieben. Und das
   * Objekt muss gekauft sein — vor dem Ankauf gibt es den Einheiten-Reiter
   * nicht, der Knopf legte also etwas an, das niemand zu sehen bekommt.
   */
  function inEinheiten() {
    const neue = e.posten.map<Einheit>((p, i) => ({
      id: `${objekt.id}-vp-${i + 1}`,
      bezeichnung: p.bezeichnung.trim() || `WE ${i + 1}`,
      geschoss: "",
      wohnflaeche: z(p.flaeche) ?? 0,
      zimmer: z(p.zimmer) ?? 0,
      kaltmiete: z(p.monatsmiete),
      status: "geplant",
      kaeufer: null,
      kaeuferKontakt: null,
      // Der Wunschpreis ist der geführte Preis, bis ein Verkauf ihn ersetzt.
      verkaufspreis: z(p.wunschpreis),
      verkauftAm: null,
    }));
    einheitenSetzen(objekt.id, neue);
  }

  /**
   * Vorschlag aus dem Exposé: Anzahl und Gesamtfläche sind bekannt, die
   * Verteilung nicht. Gleich große Wohnungen sind garantiert falsch — aber
   * eine ehrliche Startgröße, die man einzeln korrigiert.
   */
  function ausExpose() {
    const anzahl = objekt.anzahlEinheiten ?? 0;
    const schnitt =
      objekt.wohnflaeche && anzahl > 0 ? Math.round(objekt.wohnflaeche / anzahl) : null;
    setE((alt) => ({
      ...alt,
      posten: Array.from({ length: anzahl }, (_, i) => ({
        ...leererPosten(i + 1),
        flaeche: schnitt === null ? "" : String(schnitt),
      })),
    }));
  }

  if (e.posten.length === 0) {
    return (
      <Leerstand
        objekt={objekt}
        onPosten={hinzufuegen}
        onEinheiten={objekt.einheiten.length > 0 ? ausEinheiten : undefined}
        onExpose={objekt.anzahlEinheiten && objekt.anzahlEinheiten > 1 ? ausExpose : undefined}
      />
    );
  }

  return (
    <div>
      {/* ----- Ergebnis zuerst ----- */}
      {/* Die Planung wird gelesen, um eine Zahl zu erfahren — die steht oben,
          nicht hinter zwölf Eingabezeilen. */}
      <section className="px-6 pt-8 pb-2 md:px-9 md:pt-10">
        <div className="grid grid-cols-2 gap-x-6 gap-y-7 lg:grid-cols-4">
          <Gross titel="Verkaufserlös" wert={f.eurKurz(rechnung.erloes)} />
          <Gross
            titel="Rohgewinn"
            wert={rechnung.rohgewinn === null ? "—" : f.eurKurz(rechnung.rohgewinn)}
            unter={rechnung.margeProzent === null ? undefined : `${f.prozent(rechnung.margeProzent)} Marge`}
            ton={
              rechnung.rohgewinn === null ? undefined : rechnung.rohgewinn >= 0 ? "gut" : "warnung"
            }
          />
          <Gross
            titel="Rendite für Käufer"
            wert={f.prozent(rechnung.kaeuferrendite)}
            unter={
              rechnung.kaeuferfaktor === null
                ? undefined
                : `Faktor ${f.faktor(rechnung.kaeuferfaktor)}`
            }
          />
          <Gross titel="Erlös je m²" wert={f.eur(rechnung.preisJeQm)} />
        </div>

        <dl className="mt-9 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
          <Klein titel="Posten" wert={String(rechnung.anzahl)} />
          <Klein titel="Fläche geplant" wert={f.qm(rechnung.flaeche)} />
          <Klein titel="Miete im Jahr" wert={f.eurKurz(rechnung.jahresmiete)} />
          <Klein titel="Miete je m²" wert={rechnung.mieteJeQm === null ? "—" : f.eurGenau(rechnung.mieteJeQm)} />
          <Klein titel="Gesamtkosten" wert={f.eurKurz(rechnung.gesamtkosten)} />
        </dl>

        {rechnung.ohnePreis > 0 && (
          <p className="mt-6 text-[0.72rem] leading-relaxed text-grau">
            {rechnung.ohnePreis === 1
              ? "Ein Posten hat noch keinen Wunschpreis und fehlt im Erlös."
              : `${rechnung.ohnePreis} Posten haben noch keinen Wunschpreis und fehlen im Erlös.`}
          </p>
        )}
      </section>

      {/* ----- Posten ----- */}
      <section className="mt-6 px-6 md:px-9">
        <h3 className="mini-label">Aufteilung</h3>

        {/* Kopfzeile nur am großen Schirm: darunter trägt jedes Feld sein
            eigenes Label, weil die Zeilen dort untereinander stehen. */}
        <div className="mt-5 hidden grid-cols-[minmax(0,2.4fr)_repeat(4,minmax(0,1fr))_auto] gap-x-3 px-2 pb-2 lg:grid">
          <span className="mini-label !text-[0.55rem]">Bezeichnung</span>
          <span className="mini-label !text-[0.55rem] text-right">Fläche m²</span>
          <span className="mini-label !text-[0.55rem] text-right">Zimmer</span>
          <span className="mini-label !text-[0.55rem] text-right">Wunschpreis €</span>
          <span className="mini-label !text-[0.55rem] text-right">Miete / Mon. €</span>
          <span className="sr-only">Entfernen</span>
        </div>

        <ul className="divide-y divide-linie border-t border-linie">
          {e.posten.map((p, i) => (
            <li
              key={p.id}
              className="eintritt py-4 lg:grid lg:grid-cols-[minmax(0,2.4fr)_repeat(4,minmax(0,1fr))_auto] lg:items-center lg:gap-x-3 lg:py-1.5"
              style={{ animationDelay: `${Math.min(i, 10) * 24}ms` }}
            >
              <Zelle
                label="Bezeichnung"
                wert={p.bezeichnung}
                setWert={(x) => setzePosten(p.id, { bezeichnung: x })}
                platzhalter="1. OG links"
              />

              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4 lg:mt-0 lg:contents">
                <Zelle
                  label="Fläche m²"
                  wert={p.flaeche}
                  setWert={(x) => setzePosten(p.id, { flaeche: x })}
                  zahl
                  platzhalter="72"
                />
                <Zelle
                  label="Zimmer"
                  wert={p.zimmer}
                  setWert={(x) => setzePosten(p.id, { zimmer: x })}
                  zahl
                  platzhalter="3"
                />
                <Zelle
                  label="Wunschpreis €"
                  wert={p.wunschpreis}
                  setWert={(x) => setzePosten(p.id, { wunschpreis: x })}
                  zahl
                  platzhalter="289000"
                />
                <Zelle
                  label="Miete / Mon. €"
                  wert={p.monatsmiete}
                  setWert={(x) => setzePosten(p.id, { monatsmiete: x })}
                  zahl
                  platzhalter="840"
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 lg:mt-0 lg:justify-end">
                <WgSchalter an={p.alsWg} umschalten={() => setzePosten(p.id, { alsWg: !p.alsWg })} />
                <button
                  type="button"
                  onClick={() => entfernen(p.id)}
                  aria-label={`${p.bezeichnung} entfernen`}
                  className="druckbar rounded-lg p-2 text-grau hover:bg-flaeche-hoch hover:text-tinte"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={hinzufuegen}
            className="druckbar flex items-center gap-2 rounded-full border border-linie-stark px-4 py-2 text-[0.66rem] font-medium tracking-[0.14em] uppercase text-tinte"
          >
            <Plus size={13} strokeWidth={2} />
            Posten
          </button>
          {objekt.einheiten.length > 0 ? (
            <button
              type="button"
              onClick={ausEinheiten}
              className="druckbar flex items-center gap-2 rounded-full px-3 py-2 text-[0.66rem] tracking-[0.14em] uppercase text-grau hover:text-tinte"
            >
              <Copy size={13} strokeWidth={1.75} />
              Aus Einheiten
            </button>
          ) : objekt.stufe === "angekauft" ? (
            <button
              type="button"
              onClick={inEinheiten}
              className="druckbar flex items-center gap-2 rounded-full px-3 py-2 text-[0.66rem] tracking-[0.14em] uppercase text-grau hover:text-tinte"
            >
              <Copy size={13} strokeWidth={1.75} />
              Als Einheiten anlegen
            </button>
          ) : null}
        </div>
      </section>

      {/* ----- Rahmen der Rechnung ----- */}
      <section className="mt-12 px-6 md:px-9">
        <h3 className="mini-label">Rahmen</h3>
        <div className="mt-6 grid max-w-xl gap-x-6 gap-y-6 sm:grid-cols-2">
          <Zelle
            label="Sanierung geschätzt €"
            wert={e.sanierungsschaetzung}
            setWert={(x) => setE((alt) => ({ ...alt, sanierungsschaetzung: x }))}
            zahl
            platzhalter="320000"
            hinweis={
              k.sanierungGeplant > 0
                ? `Gewerkeliste führt ${f.eurKurz(k.sanierungGeplant)} — die Schätzung wird ignoriert.`
                : undefined
            }
          />
          <Zelle
            label="Verkaufsprovision %"
            wert={e.verkaufsprovision}
            setWert={(x) => setE((alt) => ({ ...alt, verkaufsprovision: x }))}
            zahl
            schritt="0.01"
            platzhalter="3.57"
            hinweis={
              rechnung.provisionEuro > 0 ? `${f.eur(rechnung.provisionEuro)} vom Erlös` : undefined
            }
          />
        </div>
      </section>

      {/* ----- Notiz ----- */}
      <section className="mt-12 px-6 pb-8 md:px-9">
        <h3 className="mini-label">Gedanke zur Variante</h3>
        <textarea
          rows={3}
          value={e.notiz}
          onChange={(ev) => setE((alt) => ({ ...alt, notiz: ev.target.value }))}
          placeholder="Warum diese Aufteilung? Was müsste eintreten, damit sie trägt?"
          aria-label="Gedanke zur Variante"
          className="mt-4 w-full max-w-2xl resize-y rounded-xl bg-flaeche px-4 py-3 text-[0.82rem] leading-relaxed text-tinte transition-colors duration-150 ease-out placeholder:text-grau focus:bg-flaeche-hoch focus:outline-none focus:ring-1 focus:ring-linie-stark"
        />
      </section>

      {/* ----- Speichern ----- */}
      <Speicherleiste
        geaendert={geaendert}
        stand={gespeichert.stand}
        onSpeichern={() => verkaufsplanSetzen(objekt.id, inPlan(e, null))}
        onVerwerfen={() => setE(ausPlan(gespeichert))}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bausteine                                                            */
/* ------------------------------------------------------------------ */

function Leerstand({
  objekt,
  onPosten,
  onEinheiten,
  onExpose,
}: {
  objekt: Objekt;
  onPosten: () => void;
  onEinheiten?: () => void;
  onExpose?: () => void;
}) {
  const haupt = onEinheiten ?? onExpose;

  return (
    <div className="px-6 py-16 text-center md:px-9">
      <div className="mini-label">Noch keine Planung</div>
      <p className="mx-auto mt-4 max-w-md text-[0.82rem] leading-relaxed text-grau">
        Noch kein Verkaufsplan angelegt.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {haupt && (
          <button
            type="button"
            onClick={haupt}
            className="druckbar rounded-full bg-tinte px-5 py-3 text-[0.66rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte hover:bg-grau-stark"
          >
            {onEinheiten
              ? `Aus ${objekt.einheiten.length} Einheiten übernehmen`
              : `${objekt.anzahlEinheiten} Wohnungen vorschlagen`}
          </button>
        )}
        <button
          type="button"
          onClick={onPosten}
          className={cn(
            "druckbar flex items-center gap-2 rounded-full px-4 py-3 text-[0.66rem] font-medium tracking-[0.14em] uppercase",
            haupt
              ? "text-grau hover:text-tinte"
              : "border border-linie-stark text-tinte",
          )}
        >
          <Plus size={13} strokeWidth={2} />
          Einzeln anlegen
        </button>
      </div>
    </div>
  );
}

/**
 * Rahmenloses Feld. Die Fläche erscheint beim Überfahren und bleibt beim
 * Schreiben — so liest sich die Liste als Tabelle, nicht als Formular.
 */
function Zelle({
  label,
  wert,
  setWert,
  platzhalter,
  hinweis,
  zahl,
  schritt,
}: {
  label: string;
  wert: string;
  setWert: (v: string) => void;
  platzhalter?: string;
  hinweis?: string;
  zahl?: boolean;
  schritt?: string;
}) {
  return (
    <label className="block min-w-0">
      {/* Am großen Schirm trägt die Kopfzeile die Beschriftung — hier wäre sie
          doppelt und würde die Zeilenhöhe verdoppeln. */}
      <span className="mini-label mb-1 block !text-[0.55rem] lg:hidden">{label}</span>
      <input
        type={zahl ? "number" : "text"}
        inputMode={zahl ? "decimal" : undefined}
        step={schritt}
        value={wert}
        onChange={(ev) => setWert(ev.target.value)}
        placeholder={platzhalter}
        aria-label={label}
        className={cn(
          "w-full rounded-lg bg-transparent px-2 py-2 text-[0.82rem] text-tinte transition-colors duration-150 ease-out placeholder:text-linie-stark hover:bg-flaeche focus:bg-flaeche-hoch focus:outline-none focus:ring-1 focus:ring-linie-stark",
          zahl &&
            "zahl text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        )}
      />
      {hinweis && (
        <span className="mt-1.5 block px-2 text-[0.64rem] leading-relaxed text-grau">
          {hinweis}
        </span>
      )}
    </label>
  );
}

/** Kurzer Kippschalter in der Zeile — das Wort allein wäre nicht als Zustand lesbar. */
function WgSchalter({ an, umschalten }: { an: boolean; umschalten: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={an}
      onClick={umschalten}
      title="Einzelzimmer statt ganzer Wohnung vermieten"
      className={cn(
        "druckbar flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[0.6rem] font-semibold tracking-[0.12em] uppercase transition-colors duration-150 ease-out",
        an ? "bg-tinte text-grund" : "text-grau hover:bg-flaeche-hoch hover:text-grau-stark",
      )}
    >
      {an && <Check size={10} strokeWidth={3} aria-hidden />}
      WG
    </button>
  );
}

function Gross({
  titel,
  wert,
  unter,
  ton,
}: {
  titel: string;
  wert: string;
  unter?: string;
  ton?: "gut" | "warnung";
}) {
  return (
    <div className="min-w-0">
      <div className="mini-label truncate !text-[0.55rem]">{titel}</div>
      <div
        className={cn(
          "zahl mt-2 truncate text-[1.3rem] font-semibold md:text-[1.5rem]",
          ton === "warnung" ? "text-[#CF4848]" : ton === "gut" ? "text-[#17935C]" : "text-tinte",
        )}
      >
        {wert}
      </div>
      {unter && <div className="zahl mt-1 truncate text-[0.68rem] text-grau">{unter}</div>}
    </div>
  );
}

function Klein({ titel, wert }: { titel: string; wert: string }) {
  return (
    <div className="min-w-0">
      <dt className="mini-label truncate !text-[0.52rem]">{titel}</dt>
      <dd className="zahl mt-1 truncate text-[0.82rem] text-grau-stark">{wert}</dd>
    </div>
  );
}

/**
 * Bleibt unten stehen, solange ungespeicherte Änderungen offen sind, und
 * verschwindet danach. Ein dauerhaft sichtbarer Speicherknopf, der nichts zu
 * speichern hat, ist nur ein Hinweis darauf, dass man etwas vergessen könnte.
 */
function Speicherleiste({
  geaendert,
  stand,
  onSpeichern,
  onVerwerfen,
}: {
  geaendert: boolean;
  stand: string | null;
  onSpeichern: () => void;
  onVerwerfen: () => void;
}) {
  if (!geaendert) {
    return (
      <div className="px-6 pb-8 md:px-9">
        <p className="flex items-center gap-2 text-[0.7rem] text-grau">
          <Check size={13} strokeWidth={2} className="shrink-0" />
          {stand ? `Gespeichert am ${f.datumZeit(stand)}` : "Nichts zu speichern"}
        </p>
      </div>
    );
  }

  return (
    <div className="eintritt sticky bottom-0 border-t border-linie-stark bg-flaeche/97 px-6 py-4 backdrop-blur-sm md:px-9">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="mr-auto text-[0.72rem] text-grau">Planung nicht gespeichert</span>
        <button
          type="button"
          onClick={onVerwerfen}
          className="druckbar flex items-center gap-2 rounded-full px-3 py-2.5 text-[0.66rem] tracking-[0.14em] uppercase text-grau hover:text-tinte"
        >
          <RotateCcw size={13} strokeWidth={1.75} />
          Verwerfen
        </button>
        <button
          type="button"
          onClick={onSpeichern}
          className="druckbar rounded-full bg-tinte px-5 py-2.5 text-[0.66rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte hover:bg-grau-stark"
        >
          Planung speichern
        </button>
      </div>
    </div>
  );
}
