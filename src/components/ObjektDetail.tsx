/**
 * Detailansicht eines Objekts.
 *
 * Die Reiter folgen dem Ankauf: erst die Zahlen, dann was zu tun ist, dann mit
 * wem, dann Planung, Kosten, Einheiten, Unterlagen — und über allem der Verlauf
 * als Gedächtnis. Alles in einer einzigen langen Seite wäre schneller gebaut,
 * aber unbenutzbar.
 */
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Crosshair,
  Hammer,
  Lock,
  MapPin,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  ANGEBOTSARTEN,
  ANGEBOTSERGEBNISSE,
  BUNDESLAND_NAMEN,
  EINHEITSSTATUS,
  GEWERKE,
  GEWERKSTATUS,
  GEWERK_TITEL,
  OBJEKTARTEN,
  STUFEN,
  STUFEN_REIHENFOLGE,
  ZUSTAENDE,
  adresse,
  aufteilungText,
  berechneKennzahlen,
  eigentuemerVon,
  f,
  type Angebot,
  type Angebotsergebnis,
  type Einheit,
  type Einheitsstatus,
  type Objekt,
  type Sanierungsposten,
} from "../lib/objekte";
import { useAufgaben } from "../lib/aufgabenStore";
import { useObjekte } from "../lib/objekteStore";
import { cn } from "../lib/utils";
import { berechneGarantie } from "../lib/vermietung";
import { useVermietung } from "../lib/vermietungStore";
import { Bildergalerie, Bildflaeche, istQuelle } from "./Bilder";
import { DealKnoepfe } from "./Deal";
import { Dokumentenablage } from "./Dokumente";
import { Kontaktblatt } from "./Kontaktblatt";
import { Objektaufgaben } from "./Objektaufgaben";
import { Fristzeichen, Stufenzeichen } from "./Stufe";
import { Teilung, TeilungAnstossen } from "./Teilung";
import { Verkaufsdialog } from "./Verkaufsdialog";
import { Verkaufsplanung } from "./Verkaufsplanung";

type Reiter =
  | "uebersicht"
  | "aufgaben"
  | "kontakt"
  | "verkauf"
  | "kosten"
  | "teilung"
  | "sanierung"
  | "einheiten"
  | "dokumente"
  | "verlauf";

/**
 * Welche Reiter ein Objekt zeigt, hängt an seiner Phase — nicht an der Liste,
 * aus der man kommt.
 *
 * Vor dem Kauf gibt es nichts zu bauen und nichts zu teilen: Einheiten
 * entstehen erst mit der Teilungserklärung, Gewerke erst nach dem Notartermin.
 * Diese Reiter vorher zu zeigen hieße, leere Tabellen anzubieten und so zu
 * tun, als wäre dort Arbeit möglich.
 *
 * Die Reihenfolge im Projekt ist die Reihenfolge der Arbeit: teilen, bauen,
 * abrechnen, aufteilen, verkaufen.
 */
const ANKAUF_REITER: Reiter[] = [
  "uebersicht",
  "aufgaben",
  "kontakt",
  "verkauf",
  "kosten",
  "dokumente",
  "verlauf",
];

const PROJEKT_REITER: Reiter[] = [
  "uebersicht",
  "aufgaben",
  "kontakt",
  "teilung",
  "sanierung",
  "kosten",
  "einheiten",
  "verkauf",
  "dokumente",
  "verlauf",
];

/**
 * Zwei Reiter heißen je Phase anders, weil dieselbe Tabelle eine andere Frage
 * beantwortet: vor dem Kauf ist die Verkaufsplanung die Rechnung, die über
 * Kauf oder Nichtkauf entscheidet — danach ist sie die Preisliste.
 */
function reiterTitel(r: Reiter, projekt: boolean): string {
  if (r === "verkauf") return projekt ? "Vertrieb" : "Kalkulation";
  return REITER_TITEL[r];
}

const REITER_TITEL: Record<Reiter, string> = {
  uebersicht: "Übersicht",
  aufgaben: "Aufgaben",
  kontakt: "Kontakt",
  verkauf: "Kalkulation",
  kosten: "Kosten",
  teilung: "Teilung",
  sanierung: "Sanierung",
  einheiten: "Einheiten",
  dokumente: "Dokumente",
  verlauf: "Verlauf",
};

export function ObjektDetail({
  objekt,
  onBearbeiten,
  onAufKarte,
}: {
  objekt: Objekt;
  onBearbeiten: () => void;
  /** Fehlt, wenn die Detailansicht schon auf der Karte steht. */
  onAufKarte?: () => void;
}) {
  const [reiter, setReiter] = useState<Reiter>("uebersicht");
  const k = useMemo(() => berechneKennzahlen(objekt), [objekt]);
  const { aufgaben } = useAufgaben();

  const projekt = objekt.stufe === "angekauft";
  const reiterliste = projekt ? PROJEKT_REITER : ANKAUF_REITER;

  // Nach dem Deal wechselt die Reiterliste unter den Füßen. Wer gerade in der
  // Kalkulation stand, soll nicht ins Leere schauen — gibt es den Reiter in
  // der neuen Phase nicht, landet man auf der Übersicht.
  const sichtbar = reiterliste.includes(reiter) ? reiter : "uebersicht";
  const verwertung = aufteilungText(objekt);

  /**
   * Die Zahl am Reiter. Bei Aufgaben zählen nur die offenen — eine erledigte
   * Aufgabe ist kein Grund hinzuschauen.
   */
  const zahlen = useMemo<Record<Reiter, number | null>>(
    () => ({
      uebersicht: null,
      aufgaben: aufgaben.filter((a) => a.objektId === objekt.id && !a.erledigtAm).length,
      kontakt: objekt.kontakte.length,
      verkauf: objekt.verkaufsplan?.posten.length ?? 0,
      kosten: null,
      teilung: null,
      sanierung: objekt.sanierung.length,
      einheiten: objekt.einheiten.length,
      dokumente: objekt.dokumente.length,
      verlauf: objekt.verlauf.length,
    }),
    [objekt, aufgaben],
  );

  return (
    <div className="flex min-h-full flex-col">
      {/* ----- Kopf ----- */}
      <div className="border-b border-linie px-6 py-7 md:px-9">
        <div className="flex flex-wrap items-center gap-2">
          <Stufenzeichen stufe={objekt.stufe} gross />
          <Fristzeichen objekt={objekt} />
          {objekt.denkmalschutz && <Marke>Denkmal</Marke>}
          {objekt.erbbaurecht && <Marke>Erbbaurecht</Marke>}
        </div>

        <h1 className="headline mt-4 text-[1.7rem] md:text-[2.1rem]">{objekt.strasse}</h1>

        <div className="mt-2.5 flex items-center gap-2 text-[0.78rem] text-grau">
          <MapPin size={13} strokeWidth={1.75} className="shrink-0" />
          <span>
            {objekt.plz} {objekt.stadt} · {objekt.stadtteil}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] text-grau">
          <span className="text-grau-stark">{OBJEKTARTEN[objekt.objektart]}</span>
          <Punkt />
          <span>{ZUSTAENDE[objekt.zustand]}</span>
          {objekt.baujahr && (
            <>
              <Punkt />
              <span className="zahl">Baujahr {objekt.baujahr}</span>
            </>
          )}
          <Punkt />
          <span>{BUNDESLAND_NAMEN[objekt.bundesland]}</span>
          {verwertung && (
            <>
              <Punkt />
              <span className="text-grau-stark">{verwertung}</span>
            </>
          )}
        </div>

        {/* Der Deal steht über dem Bearbeiten, weil er die Entscheidung ist
            und nicht die Pflege. Nach dem Kauf verschwindet er wieder. */}
        <div className="mt-5 flex flex-wrap gap-2">
          <DealKnoepfe objekt={objekt} />
        </div>

        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBearbeiten}
            className="druckbar flex items-center gap-2 rounded-full border border-linie-stark px-4 py-2 text-[0.66rem] font-medium tracking-[0.14em] uppercase text-tinte"
          >
            <Pencil size={12} strokeWidth={2} />
            Bearbeiten
          </button>
          {onAufKarte && (
            <button
              type="button"
              onClick={onAufKarte}
              className="druckbar flex items-center gap-2 rounded-full border border-linie px-4 py-2 text-[0.66rem] font-medium tracking-[0.14em] uppercase text-grau-stark"
            >
              <Crosshair size={12} strokeWidth={2} />
              Auf der Karte
            </button>
          )}
          {projekt && <TeilungAnstossen objekt={objekt} />}
        </div>

        {/* Eine Absage ohne Begründung ist in zwei Jahren wertlos — hier steht
            sie dort, wo sie gelesen wird, und nicht nur im Verlauf. */}
        {objekt.stufe === "abgesagt" && objekt.absagegrund && (
          <p className="mt-4 rounded-xl border border-[#E3BDB9] bg-[#F8DEDC] px-3.5 py-2.5 text-[0.74rem] leading-relaxed text-[#8A2822]">
            Kein Deal: {objekt.absagegrund}
          </p>
        )}
      </div>

      {/* ----- Reiter ----- */}
      {/* Zehn Reiter passen auf dem Telefon nicht nebeneinander — also wischen
          statt umbrechen, sonst wandert der Inhalt nach unten. */}
      <div className="scroll-reihe sticky top-0 z-10 flex shrink-0 gap-1 overflow-x-auto border-b border-linie bg-grund/95 px-6 backdrop-blur-sm md:px-9">
        {reiterliste.map((r) => {
          const aktiv = r === sichtbar;
          const anzahl = zahlen[r];
          // Die Teilung ist erst nutzbar, wenn sie angestoßen wurde. Grau und
          // sichtbar statt versteckt: so weiß man, dass es den Vorgang gibt,
          // und warum er noch nicht offen ist.
          const gesperrt = r === "teilung" && !objekt.teilung;
          return (
            <button
              key={r}
              type="button"
              onClick={() => !gesperrt && setReiter(r)}
              aria-selected={aktiv}
              aria-disabled={gesperrt || undefined}
              title={gesperrt ? "Beim Deal nicht angestoßen" : undefined}
              className={cn(
                "relative -mb-px flex shrink-0 items-center gap-1.5 px-3 py-3.5 text-[0.68rem] font-medium tracking-[0.12em] uppercase transition-colors duration-150 ease-out",
                gesperrt
                  ? "cursor-not-allowed text-grau/45"
                  : aktiv
                    ? "text-tinte"
                    : "text-grau hover:text-grau-stark",
              )}
            >
              {reiterTitel(r, projekt)}
              {gesperrt && <Lock size={10} strokeWidth={2.25} className="shrink-0" />}
              {anzahl !== null && anzahl > 0 && (
                <span className="zahl text-[0.6rem] text-grau">{anzahl}</span>
              )}
              {/* Unterstrich statt Hintergrund — ruhiger und ohne Sprung. */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 bottom-0 h-px bg-tinte transition-opacity duration-150 ease-out",
                  aktiv ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="flex-1">
        {sichtbar === "uebersicht" && <Uebersicht objekt={objekt} kennzahlen={k} />}
        {sichtbar === "aufgaben" && <Objektaufgaben objekt={objekt} />}
        {sichtbar === "kontakt" && <Kontaktblatt objekt={objekt} />}
        {sichtbar === "verkauf" && <Verkaufsplanung objekt={objekt} />}
        {sichtbar === "teilung" && <Teilung objekt={objekt} />}
        {sichtbar === "sanierung" && <Sanierung objekt={objekt} kennzahlen={k} />}
        {sichtbar === "kosten" && <Kosten objekt={objekt} kennzahlen={k} />}
        {sichtbar === "einheiten" && <Einheiten objekt={objekt} />}
        {sichtbar === "dokumente" && <Dokumente objekt={objekt} />}
        {sichtbar === "verlauf" && <Verlauf objekt={objekt} />}
      </div>
    </div>
  );
}

function Marke({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-linie-stark px-2.5 py-1 text-[0.58rem] font-medium tracking-[0.14em] uppercase text-grau-stark">
      {children}
    </span>
  );
}

function Punkt() {
  return <span aria-hidden className="size-[3px] rounded-full bg-linie-stark" />;
}

/* ------------------------------------------------------------------ */
/* Übersicht                                                            */
/* ------------------------------------------------------------------ */

function Uebersicht({
  objekt,
  kennzahlen,
}: {
  objekt: Objekt;
  kennzahlen: ReturnType<typeof berechneKennzahlen>;
}) {
  const k = kennzahlen;
  const { stufeSetzen } = useObjekte();

  return (
    <div className="divide-y divide-linie">
      {objekt.bilder.length > 0 && (
        <div className="px-6 py-7 md:px-9">
          <Bildergalerie bilder={objekt.bilder} />
        </div>
      )}

      {/* Die drei Zahlen, nach denen jede Ankaufsentscheidung fällt. */}
      <div className="grid grid-cols-3 gap-x-6 px-6 py-8 md:px-9">
        <GrossZahl titel="Kaufpreis" wert={f.eurKurz(objekt.kaufpreis)} />
        <GrossZahl titel="Faktor" wert={f.faktor(k.faktor)} />
        <GrossZahl titel="Rendite" wert={f.prozent(k.bruttoMietrendite)} />
      </div>

      <Block titel="Miete und Rendite">
        <Reihe titel="Jahresnettokaltmiete" wert={f.eur(objekt.jahresNettokaltmiete)} />
        <Reihe
          titel="Potenzialmiete"
          wert={f.eur(objekt.potenzialMiete)}
          unter={
            k.mietePotenzialDelta !== null && k.mietePotenzialDelta > 0
              ? `${f.eur(k.mietePotenzialDelta)} Luft nach oben`
              : undefined
          }
        />
        <Reihe titel="Nicht umlagefähig" wert={f.eur(objekt.nichtUmlagefaehig)} />
        <Reihe titel="Nettomietrendite" wert={f.prozent(k.nettoMietrendite)} stark />
        <Reihe titel="Kaufpreis je m²" wert={f.eur(k.kaufpreisJeQm)} />
        {objekt.einheiten.length > 0 && (
          <Reihe titel="Leerstandsquote" wert={f.prozent(k.leerstandsquote)} />
        )}
      </Block>

      <Block titel="Flächen und Substanz">
        <Reihe titel="Wohnfläche" wert={f.qm(objekt.wohnflaeche)} />
        {objekt.gewerbeflaeche ? (
          <Reihe titel="Gewerbefläche" wert={f.qm(objekt.gewerbeflaeche)} />
        ) : null}
        <Reihe titel="Grundstück" wert={f.qm(objekt.grundstuecksflaeche)} />
        <Reihe titel="Einheiten" wert={f.zahl(objekt.anzahlEinheiten)} />
        <Reihe titel="Baujahr" wert={objekt.baujahr ? String(objekt.baujahr) : "—"} />
        <Reihe
          titel="Letzte Sanierung"
          wert={objekt.letzteSanierung ? String(objekt.letzteSanierung) : "keine"}
        />
        <Reihe
          titel="Energie"
          wert={objekt.energieklasse ?? "—"}
          unter={objekt.energiekennwert ? `${objekt.energiekennwert} kWh/m²a` : undefined}
        />
        <Reihe titel="Instandhaltungsrücklage" wert={f.eur(objekt.instandhaltungsruecklage)} />
      </Block>

      {/* Die Beteiligten stehen im Reiter „Kontakt“, wo sie auch bearbeitet
          werden. Hier bleibt nur der Name als Orientierung — zwei Orte für
          dieselbe Telefonnummer wären einer zu viel. */}
      <Block titel="Herkunft">
        <Reihe titel="Eigentümer" wert={eigentuemerVon(objekt)?.name ?? "nicht hinterlegt"} />
        <Reihe titel="Quelle" wert={objekt.quelle ?? "—"} />
        <Reihe titel="Angelegt" wert={f.datum(objekt.angelegtAm)} />
      </Block>

      {objekt.notiz && (
        <div className="px-6 py-9 md:px-9">
          <div className="mini-label">Notiz</div>
          <p className="mt-3 text-[0.82rem] leading-relaxed whitespace-pre-line text-grau-stark">
            {objekt.notiz}
          </p>
        </div>
      )}

      {/* Stufenwechsel am Ende: erst lesen, dann entscheiden. */}
      <div className="px-6 py-9 md:px-9">
        <div className="mini-label">Stufe wechseln</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {STUFEN_REIHENFOLGE.map((st) => {
            const aktiv = st === objekt.stufe;
            return (
              <button
                key={st}
                type="button"
                onClick={() => stufeSetzen(objekt.id, st)}
                aria-pressed={aktiv}
                className={cn(
                  "druckbar flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.66rem] font-medium whitespace-nowrap",
                  aktiv
                    ? "border-tinte bg-tinte text-grund"
                    : "border-linie bg-flaeche text-grau-stark",
                )}
              >
                <span
                  aria-hidden
                  className="size-[7px] shrink-0 rounded-full"
                  style={{ background: aktiv ? "#ffffff" : STUFEN[st].farbe }}
                />
                {STUFEN[st].titel}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Kennzahl ohne Rahmen. Drei umrandete Kästen neben drei weiteren Blöcken mit
 * Rahmen ergeben ein Gitter, in dem nichts mehr hervorsticht — die Zahl trägt
 * sich durch ihre Größe, nicht durch eine Linie.
 *
 * Auf dem Telefon sind drei Spalten knapp 110 px breit; Schriftgrad und
 * Abstand müssen dort mitgeben, sonst steht „2,45 Mi…".
 */
function GrossZahl({ titel, wert }: { titel: string; wert: string }) {
  return (
    <div className="min-w-0">
      <div className="mini-label truncate !text-[0.5rem] sm:!text-[0.55rem]">{titel}</div>
      <div className="zahl mt-2 truncate text-[1.05rem] font-semibold text-tinte sm:text-[1.25rem]">
        {wert}
      </div>
    </div>
  );
}

/**
 * Datenblock. Die Zeilen hatten einmal je eine Trennlinie — bei vier Blöcken
 * mit sieben Zeilen sind das knapp dreißig Striche auf einem Schirm. Jetzt
 * trennt der Abstand, und die Linie bleibt dem Blockwechsel vorbehalten.
 */
function Block({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="px-6 py-9 md:px-9">
      <div className="mini-label">{titel}</div>
      <dl className="mt-5">{children}</dl>
    </section>
  );
}

function Reihe({
  titel,
  wert,
  unter,
  stark,
  ton,
}: {
  titel: string;
  wert: string;
  unter?: string;
  stark?: boolean;
  /** Färbt nur den Wert — für Zahlen, bei denen das Vorzeichen eine Aussage ist. */
  ton?: "gut" | "warnung";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="min-w-0 text-[0.76rem] text-grau">
        {titel}
        {unter && <span className="mt-0.5 block text-[0.64rem] text-linie-stark">{unter}</span>}
      </dt>
      <dd
        className={cn(
          "zahl shrink-0 text-right",
          stark ? "text-[0.95rem] font-semibold" : "text-[0.82rem]",
          ton === "warnung"
            ? "text-[#CF4848]"
            : ton === "gut"
              ? "text-[#17935C]"
              : stark
                ? "text-tinte"
                : "text-grau-stark",
        )}
      >
        {wert}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kosten                                                              */
/* ------------------------------------------------------------------ */

/**
 * Die Rechnung eines Objekts, in der Reihenfolge, in der das Geld fließt: was
 * verhandelt wurde, was der Ankauf kostet — und was am Ende übrig bleibt.
 *
 * Die Gewerke stehen bewusst nicht hier, sondern im Reiter „Sanierung". Das
 * sind zwei Fragen: „wo steht die Baustelle?" ist eine Bauleiterfrage, „was
 * kostet uns das Projekt?" eine kaufmännische. In einem Reiter musste man für
 * die zweite immer an der ersten vorbeiscrollen.
 */
function Kosten({
  objekt,
  kennzahlen,
}: {
  objekt: Objekt;
  kennzahlen: ReturnType<typeof berechneKennzahlen>;
}) {
  const k = kennzahlen;

  return (
    <div className="divide-y divide-linie">
      {/* ----- Projektrechnung auf einen Blick ----- */}
      <div className="grid grid-cols-3 gap-x-6 px-6 py-8 md:px-9">
        <GrossZahl titel="Kosten Plan" wert={f.eurKurz(k.gesamtkostenPlan)} />
        <GrossZahl titel="Kosten Ist" wert={f.eurKurz(k.gesamtkostenIst)} />
        <GrossZahl titel="Marge" wert={f.prozent(k.margeProzent)} />
      </div>

      {/* ----- Preisverlauf ----- */}
      <Block titel="Preisverlauf">
        <Reihe
          titel="Ankaufslimit"
          wert={f.eur(objekt.ankaufslimit)}
          unter="Höchstpreis, bei dem die Kalkulation noch aufgeht"
        />
        {k.preisAbstand !== null && (
          <Reihe
            titel={k.preisAbstand > 0 ? "Über Limit" : "Unter Limit"}
            wert={f.eur(Math.abs(k.preisAbstand))}
            unter={`Forderung ${f.eur(k.letzteForderung?.preis)} gegen Limit`}
            ton={k.preisAbstand > 0 ? "warnung" : "gut"}
          />
        )}
      </Block>

      {objekt.angebote.length > 0 && <Angebotsverlauf angebote={objekt.angebote} />}

      {/* ----- Ankauf ----- */}
      <Block titel="Ankauf">
        <Reihe titel="Kaufpreis" wert={f.eur(objekt.kaufpreis)} />
        <Reihe
          titel={`Grunderwerbsteuer ${objekt.bundesland}`}
          wert={f.eur(k.grestEuro)}
          unter={`${f.prozent(k.grestSatz)} · ${BUNDESLAND_NAMEN[objekt.bundesland]}`}
        />
        <Reihe titel="Notar und Grundbuch" wert={f.eur(k.notarEuro)} unter="1,5 %" />
        <Reihe
          titel="Maklerprovision"
          wert={f.eur(k.maklerEuro)}
          unter={objekt.maklerprovision ? f.prozent(objekt.maklerprovision) : "provisionsfrei"}
        />
        <Reihe titel="Kaufnebenkosten" wert={f.eur(k.kaufnebenkosten)} />
        <Reihe titel="Gesamtinvestition" wert={f.eur(k.gesamtinvestition)} stark />
      </Block>

      {/* ----- Was am Ende übrig bleibt ----- */}
      <Block titel="Projektrechnung">
        <Reihe titel="Gesamtinvestition Ankauf" wert={f.eur(k.gesamtinvestition)} />
        {/* Geplant und tatsächlich in einer Zeile — zwei Zeilen untereinander
            wiederholen nur, was die Gewerketabelle darüber schon zeigt. */}
        <Reihe
          titel="Sanierung"
          wert={f.eur(k.sanierungTatsaechlich)}
          unter={`geplant ${f.eur(k.sanierungGeplant)}`}
        />
        <Reihe titel="Gesamtkosten Plan" wert={f.eur(k.gesamtkostenPlan)} />
        <Reihe titel="Gesamtkosten Ist" wert={f.eur(k.gesamtkostenIst)} stark />
        <Reihe titel="Gesamtkosten je m²" wert={f.eur(k.gesamtkostenJeQm)} />
        <Reihe
          titel="Verkaufserlös"
          wert={f.eur(k.verkaufserloes)}
          unter="Summe der Einheiten mit Preis"
        />
        <Reihe
          titel="Rohertrag"
          wert={f.eur(k.rohertrag)}
          stark
          // Ohne Verkaufserlös gibt es keinen Rohertrag — ein grüner Strich
          // würde eine Aussage machen, die die Zahlen nicht hergeben.
          ton={k.rohertrag === null ? undefined : k.rohertrag < 0 ? "warnung" : "gut"}
        />
        <Reihe titel="Marge" wert={f.prozent(k.margeProzent)} />
      </Block>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sanierung                                                           */
/* ------------------------------------------------------------------ */

/**
 * Die Baustelle. Eine Frage: wo stehen wir, und wo läuft das Budget weg?
 *
 * Oben die drei Zahlen, die das beantworten — Budget, Abgerechnetes,
 * Fortschritt —, darunter die Gewerke in der Reihenfolge des Bauablaufs. Nach
 * Betrag zu sortieren wäre naheliegend, aber eine Liste, die mit dem Dach
 * beginnt und beim Maler endet, liest sich wie der Bauzeitenplan und lässt
 * sofort sehen, was als Nächstes dran ist.
 */
function Sanierung({
  objekt,
  kennzahlen,
}: {
  objekt: Objekt;
  kennzahlen: ReturnType<typeof berechneKennzahlen>;
}) {
  const k = kennzahlen;

  const posten = useMemo(() => {
    const rang = new Map(GEWERKE.map((g, i) => [g.schluessel, i]));
    return [...objekt.sanierung].sort(
      (a, b) => (rang.get(a.gewerk) ?? 99) - (rang.get(b.gewerk) ?? 99),
    );
  }, [objekt.sanierung]);

  if (posten.length === 0) {
    return (
      <div className="px-6 py-16 text-center md:px-9">
        <Hammer size={22} strokeWidth={1.5} className="mx-auto text-grau" />
        <p className="mx-auto mt-4 max-w-sm text-[0.82rem] leading-relaxed text-grau">
          Noch keine Gewerke kalkuliert.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-linie">
      <div className="grid grid-cols-3 gap-x-6 px-6 py-8 md:px-9">
        <GrossZahl titel="Budget" wert={f.eurKurz(k.sanierungGeplant)} />
        <GrossZahl titel="Abgerechnet" wert={f.eurKurz(k.sanierungTatsaechlich)} />
        <GrossZahl titel="Abgenommen" wert={f.prozent(k.sanierungFortschritt)} />
      </div>

      <section className="px-6 py-8 md:px-9">
        <div className="mini-label">Gewerke</div>

        <div className="mt-3.5 overflow-hidden rounded-2xl border border-linie">
          {/* Nur Plan und Ist als Spalten. Eine dritte Zahlenspalte passt in
              die Schublade nicht, ohne die Gewerknamen abzuschneiden — die
              Abweichung steht deshalb unter dem Gewerk und in der Summe. */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-linie bg-flaeche-hoch px-3.5 py-2">
            <span className="mini-label !text-[0.5rem]">Gewerk</span>
            <span className="mini-label w-[84px] text-right !text-[0.5rem]">Plan</span>
            <span className="mini-label w-[84px] text-right !text-[0.5rem]">Ist</span>
          </div>

          <ul className="divide-y divide-linie bg-flaeche">
            {posten.map((p) => (
              <Gewerkzeile key={p.id} posten={p} />
            ))}
          </ul>

          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-t border-linie bg-flaeche-hoch px-3.5 py-2.5">
            <span className="text-[0.74rem] font-medium text-tinte">Summe</span>
            <span className="zahl w-[84px] text-right text-[0.78rem] font-semibold text-tinte">
              {f.eur(k.sanierungGeplant)}
            </span>
            <span className="zahl w-[84px] text-right text-[0.78rem] font-semibold text-tinte">
              {f.eur(k.sanierungTatsaechlich)}
            </span>
          </div>
        </div>

        <dl className="mt-3.5 divide-y divide-linie">
          <Reihe
            titel="Abweichung gegen Budget"
            wert={abweichung(k.sanierungAbweichung)}
            unter="nur Gewerke mit abgerechneter Schlussrechnung"
            ton={k.sanierungAbweichung > 0 ? "warnung" : "gut"}
          />
          <Reihe titel="Sanierung je m²" wert={f.eur(k.sanierungJeQm)} />
        </dl>
      </section>
    </div>
  );
}

/** Vorzeichen immer mit: ohne „+“ liest sich eine Überschreitung wie ein Betrag. */
function abweichung(v: number) {
  if (v === 0) return "±0 €";
  return `${v > 0 ? "+" : "−"}${f.eur(Math.abs(v))}`;
}

function Gewerkzeile({ posten }: { posten: Sanierungsposten }) {
  const delta =
    posten.geplant !== null && posten.tatsaechlich !== null
      ? posten.tatsaechlich - posten.geplant
      : null;

  return (
    <li className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-3 px-3.5 py-2.5">
      <span className="min-w-0">
        <span className="block truncate text-[0.76rem] text-tinte">
          {GEWERK_TITEL[posten.gewerk]}
        </span>
        {/* Eine Zeile, die abschneidet statt umzubrechen — sonst hängt der
            Trennpunkt am Zeilenende in der Luft. */}
        <span className="mt-0.5 flex items-center gap-2 text-[0.62rem] text-grau">
          <span className="shrink-0">{GEWERKSTATUS[posten.status]}</span>
          {posten.firma && (
            <>
              <Punkt />
              <span className="truncate">{posten.firma}</span>
            </>
          )}
        </span>
        {/* Die Abweichung steht unter dem Gewerk statt in einer eigenen Spalte —
            sie betrifft ohnehin nur die abgerechneten Gewerke. */}
        {delta !== null && delta !== 0 && (
          <span
            className={cn(
              "zahl mt-1 block text-[0.62rem]",
              delta > 0 ? "text-[#CF4848]" : "text-[#17935C]",
            )}
          >
            {abweichung(delta)}
          </span>
        )}
      </span>

      <span className="zahl w-[84px] text-right text-[0.76rem] text-grau-stark">
        {f.eur(posten.geplant)}
      </span>
      <span
        className={cn(
          "zahl w-[84px] text-right text-[0.76rem]",
          posten.tatsaechlich === null ? "text-linie-stark" : "text-tinte",
        )}
      >
        {f.eur(posten.tatsaechlich)}
      </span>
    </li>
  );
}

/**
 * Jede Preisrunde als eigene Zeile. Timo muss Monate später noch sehen, was
 * verlangt und was geboten wurde — und woran es gescheitert ist.
 */
function Angebotsverlauf({ angebote }: { angebote: Angebot[] }) {
  const sortiert = [...angebote].sort((a, b) => b.datum.localeCompare(a.datum));

  return (
    <section className="px-6 py-9 md:px-9">
      <div className="mini-label">Angebote und Gebote</div>
      <ul className="mt-3.5 flex flex-col gap-1.5">
        {sortiert.map((a) => (
          <li
            key={a.id}
            className="flex items-start gap-3 rounded-xl border border-linie bg-flaeche px-3.5 py-2.5"
          >
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[0.76rem] text-tinte">{ANGEBOTSARTEN[a.art]}</span>
                <span className="zahl text-[0.62rem] text-grau">{f.datum(a.datum)}</span>
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.64rem] text-grau">
                <span
                  className="rounded-full px-2 py-0.5"
                  style={ERGEBNIS_TON[a.ergebnis]}
                >
                  {ANGEBOTSERGEBNISSE[a.ergebnis]}
                </span>
                {a.quelle && <span className="truncate">{a.quelle}</span>}
              </span>
              {a.notiz && (
                <span className="mt-1.5 block text-[0.68rem] leading-relaxed text-grau">
                  {a.notiz}
                </span>
              )}
            </span>
            <span className="zahl shrink-0 text-[0.84rem] font-semibold text-tinte">
              {f.eur(a.preis)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Dieselbe Ampel wie auf der Karte, nur als Hinterlegung der Ergebnisplakette. */
const ERGEBNIS_TON: Record<Angebotsergebnis, { background: string; color: string }> = {
  offen: { background: "#F1F3F6", color: "#4B5563" },
  angenommen: { background: STUFEN.angekauft.weich, color: STUFEN.angekauft.tief },
  abgelehnt: { background: STUFEN.abgesagt.weich, color: STUFEN.abgesagt.tief },
  zu_teuer: { background: STUFEN.abgesagt.weich, color: STUFEN.abgesagt.tief },
  zurueckgezogen: { background: "#F1F3F6", color: "#4B5563" },
};

/* ------------------------------------------------------------------ */
/* Einheiten                                                            */
/* ------------------------------------------------------------------ */

function Einheiten({ objekt }: { objekt: Objekt }) {
  const { einheitenSetzen } = useObjekte();
  const { garantien, mieter } = useVermietung();
  const [verkauf, setVerkauf] = useState<Einheit | null>(null);

  const summe = useMemo(() => {
    const flaeche = objekt.einheiten.reduce((s, e) => s + e.wohnflaeche, 0);
    const miete = objekt.einheiten.reduce((s, e) => s + (e.kaltmiete ?? 0), 0);
    const verkauft = objekt.einheiten.filter((e) => e.status === "verkauft");
    const erloes = verkauft.reduce((s, e) => s + (e.verkaufspreis ?? 0), 0);
    return { flaeche, miete, verkauft: verkauft.length, erloes };
  }, [objekt.einheiten]);

  /**
   * „Verkauft" ist kein Status, den man setzt, sondern ein Vorgang: es gibt
   * einen Käufer, einen Preis, ein Datum und die Frage nach der Garantie.
   * Deshalb führt genau dieser eine Eintrag in den Dialog statt direkt in den
   * Speicher. Alle anderen Wechsel sind reine Statuswechsel.
   */
  function statusSetzen(e: Einheit, status: Einheitsstatus) {
    if (status === "verkauft" && e.status !== "verkauft") {
      setVerkauf(e);
      return;
    }
    einheitenSetzen(
      objekt.id,
      objekt.einheiten.map((x) => (x.id === e.id ? { ...x, status } : x)),
    );
  }

  function hinzufuegen() {
    const nummer = objekt.einheiten.length + 1;
    const neu: Einheit = {
      id: `${objekt.id}-neu-${nummer}`,
      bezeichnung: `WE ${nummer}`,
      geschoss: "",
      wohnflaeche: 0,
      zimmer: 0,
      kaltmiete: null,
      status: "geplant",
      kaeufer: null,
      kaeuferKontakt: null,
      verkaufspreis: null,
      verkauftAm: null,
    };
    einheitenSetzen(objekt.id, [...objekt.einheiten, neu]);
  }

  if (objekt.einheiten.length === 0) {
    return (
      <div className="px-6 py-16 text-center md:px-9">
        <div className="mini-label">Noch keine Aufteilung</div>
        {objekt.anzahlEinheiten ? (
          <p className="mx-auto mt-3 max-w-sm text-[0.8rem] leading-relaxed text-grau">
            Laut Exposé sind es {objekt.anzahlEinheiten} Einheiten.
          </p>
        ) : null}
        <button
          type="button"
          onClick={hinzufuegen}
          className="druckbar mx-auto mt-6 flex items-center gap-2 rounded-full border border-linie-stark px-5 py-2.5 text-[0.66rem] font-medium tracking-[0.14em] uppercase text-tinte"
        >
          <Plus size={13} strokeWidth={2} />
          Erste Einheit anlegen
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-7 border-b border-linie px-6 py-8 sm:grid-cols-4 md:px-9">
        <GrossZahl titel="Einheiten" wert={String(objekt.einheiten.length)} />
        <GrossZahl titel="Fläche gesamt" wert={f.qm(summe.flaeche)} />
        <GrossZahl titel="Ist-Miete / Monat" wert={f.eur(summe.miete)} />
        <GrossZahl
          titel="Verkauft"
          wert={summe.verkauft > 0 ? `${summe.verkauft} · ${f.eur(summe.erloes)}` : "—"}
        />
      </div>

      <ul className="divide-y divide-linie border-b border-linie">
        {objekt.einheiten.map((e, i) => (
          <li
            key={e.id}
            className="eintritt px-6 py-5 md:px-9"
            style={{ animationDelay: `${Math.min(i, 8) * 28}ms` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[0.84rem] font-medium text-tinte">{e.bezeichnung}</div>
                <div className="zahl mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.7rem] text-grau">
                  {e.geschoss && <span>{e.geschoss}</span>}
                  {e.geschoss && <Punkt />}
                  <span>{f.qm(e.wohnflaeche)}</span>
                  {e.zimmer > 0 && (
                    <>
                      <Punkt />
                      <span>{e.zimmer} Zi.</span>
                    </>
                  )}
                  <Punkt />
                  <span className={e.kaltmiete ? "text-grau-stark" : ""}>
                    {e.kaltmiete ? `${f.eur(e.kaltmiete)} / Mon.` : "unvermietet"}
                  </span>
                </div>
                {e.kaeufer && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[0.68rem] text-grau-stark">
                    <ArrowUpRight size={11} strokeWidth={2} className="shrink-0" />
                    {e.kaeufer}
                    {e.verkaufspreis && <span className="zahl">· {f.eur(e.verkaufspreis)}</span>}
                  </div>
                )}
                <Garantiezeile einheitId={e.id} garantien={garantien} mieter={mieter} />
              </div>

              <select
                value={e.status}
                onChange={(ev) => statusSetzen(e, ev.target.value as Einheitsstatus)}
                aria-label={`Status von ${e.bezeichnung}`}
                className="shrink-0 border border-linie bg-flaeche px-2.5 py-1.5 text-[0.66rem] text-tinte focus:border-linie-stark focus:outline-none"
                style={{ color: EINHEITSSTATUS[e.status].farbe }}
              >
                {Object.entries(EINHEITSSTATUS).map(([wert, { titel }]) => (
                  <option key={wert} value={wert} className="text-tinte">
                    {titel}
                  </option>
                ))}
              </select>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3 px-6 py-7 md:px-9">
        <button
          type="button"
          onClick={hinzufuegen}
          className="druckbar flex items-center gap-2 rounded-full border border-linie-stark px-4 py-2 text-[0.66rem] font-medium tracking-[0.14em] uppercase text-tinte"
        >
          <Plus size={13} strokeWidth={2} />
          Einheit
        </button>
        {objekt.einheiten.some((e) => e.status === "im_vertrieb") && (
          <span className="flex items-center gap-2 text-[0.7rem] text-grau">
            <Send size={12} strokeWidth={1.75} />
            Einheiten im Vertrieb gehen später automatisch an AUVERO.
          </span>
        )}
      </div>

      {verkauf && (
        <Verkaufsdialog
          objekt={objekt}
          einheit={verkauf}
          schliessen={() => setVerkauf(null)}
        />
      )}
    </div>
  );
}

/**
 * Der Rückweg in die Mietverwaltung.
 *
 * Was eine verkaufte Einheit Revest noch kostet, gehört an die Einheit — sonst
 * muss man den Reiter wechseln, um zu sehen, ob hier eine Verpflichtung hängt.
 * Eine ausgelaufene Garantie bleibt als Satz stehen, aber ohne Weg: dort gibt
 * es nichts mehr zu verwalten, nur noch nachzusehen.
 */
function Garantiezeile({
  einheitId,
  garantien,
  mieter,
}: {
  einheitId: string;
  garantien: ReturnType<typeof useVermietung>["garantien"];
  mieter: ReturnType<typeof useVermietung>["mieter"];
}) {
  const g = garantien.find((x) => x.einheitId === einheitId);
  if (!g) return null;

  const k = berechneGarantie(g, mieter);

  if (k.status === "beendet") {
    return (
      <div className="mt-1.5 flex items-center gap-1.5 text-[0.68rem] text-grau">
        <ShieldCheck size={11} strokeWidth={2} className="shrink-0" />
        Mietgarantie ausgelaufen am <span className="zahl">{f.datum(k.ende.toISOString())}</span>
      </div>
    );
  }

  return (
    <Link
      to="/mietverwaltung"
      search={{ garantie: g.id }}
      className="druckbar mt-1.5 flex items-center gap-1.5 text-[0.68rem] text-grau-stark hover:text-tinte"
    >
      <ShieldCheck size={11} strokeWidth={2} className="shrink-0" />
      Mietgarantie bis <span className="zahl">{f.datum(k.ende.toISOString())}</span>
      <span className="zahl">· {f.eur(g.garantiemiete)}/Mon.</span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Dokumente                                                            */
/* ------------------------------------------------------------------ */

function Dokumente({ objekt }: { objekt: Objekt }) {
  const { dokumenteAnhaengen, dokumentLoeschen } = useObjekte();

  return (
    <div>
      <Dokumentenablage
        dokumente={objekt.dokumente}
        onHochladen={(neue) => dokumenteAnhaengen(objekt.id, neue)}
        onLoeschen={(id) => dokumentLoeschen(objekt.id, id)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Verlauf                                                              */
/* ------------------------------------------------------------------ */

const ART_TITEL = {
  anlage: "Anlage",
  status: "Stufe",
  dokument: "Dokument",
  notiz: "Notiz",
} as const;

function Verlauf({ objekt }: { objekt: Objekt }) {
  const { notizAnhaengen } = useObjekte();
  const [text, setText] = useState("");

  // Neueste oben — der letzte Schritt ist der, der zählt.
  const eintraege = useMemo(
    () =>
      [...objekt.verlauf].sort(
        (a, b) => new Date(b.zeitpunkt).getTime() - new Date(a.zeitpunkt).getTime(),
      ),
    [objekt.verlauf],
  );

  function senden(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    notizAnhaengen(objekt.id, text.trim());
    setText("");
  }

  return (
    <div>
      <form onSubmit={senden} className="border-b border-linie px-6 py-7 md:px-9">
        <label htmlFor="neue-notiz" className="mini-label block">
          Notiz hinzufügen
        </label>
        <textarea
          id="neue-notiz"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Was ist passiert? Was ist der nächste Schritt?"
          className="mt-2 w-full resize-y border border-linie bg-flaeche px-3 py-2.5 text-[0.8rem] leading-relaxed text-tinte placeholder:text-grau focus:border-linie-stark focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="druckbar mt-2.5 flex items-center gap-2 rounded-full border border-linie-stark px-4 py-2 text-[0.66rem] font-medium tracking-[0.14em] uppercase text-tinte disabled:opacity-35"
        >
          <Send size={12} strokeWidth={2} />
          Eintragen
        </button>
      </form>

      <ol className="px-6 py-7 md:px-9">
        {eintraege.map((e, i) => (
          <li
            key={e.id}
            className="eintritt relative flex gap-4 pb-5 last:pb-0"
            style={{ animationDelay: `${Math.min(i, 10) * 24}ms` }}
          >
            {/* Zeitachse: Linie plus Punkt, gezeichnet statt Bild. */}
            <div className="relative flex w-3 shrink-0 justify-center">
              <span
                aria-hidden
                className={cn(
                  "absolute top-[7px] size-[7px]",
                  e.art === "status" ? "bg-tinte" : "bg-linie-stark",
                )}
              />
              {i < eintraege.length - 1 && (
                <span aria-hidden className="absolute top-[18px] bottom-[-8px] w-px bg-linie" />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <span className="text-[0.58rem] font-medium tracking-[0.16em] uppercase text-grau">
                  {ART_TITEL[e.art]}
                </span>
                <span className="zahl text-[0.62rem] text-linie-stark">
                  {f.datumZeit(e.zeitpunkt)}
                </span>
              </div>
              <p
                className={cn(
                  "mt-1 text-[0.8rem] leading-relaxed",
                  e.art === "status" ? "text-tinte" : "text-grau-stark",
                )}
              >
                {e.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Schwebekarte der Karte                                               */
/* ------------------------------------------------------------------ */

/**
 * Die Kompaktkarte zu einem Punkt — in zwei Stärken.
 *
 * `kurz` schwebt beim Überfahren mit der Maus mit und beantwortet eine
 * einzige Frage: Was ist das, und lohnt ein Klick? Foto, Lage, Stufe, Preis,
 * drei Kennzahlen. Mehr wäre im Vorbeifahren nicht lesbar.
 *
 * `voll` bleibt nach dem Klick stehen und darf deshalb mehr erzählen: dazu
 * kommt die Preisgeschichte. Sie ist der eigentliche Grund für die Karte —
 * beim zweiten Kontakt mit einem Objekt muss sofort sichtbar sein, was schon
 * verlangt und geboten wurde. Mit `onOeffnen` bekommt sie außerdem einen Fuß
 * und ein Schließkreuz; ohne bleibt sie ein reines Schaufenster.
 */
export function ObjektSchwebekarte({
  objekt,
  umfang = "kurz",
  onOeffnen,
  onSchliessen,
}: {
  objekt: Objekt;
  umfang?: "kurz" | "voll";
  onOeffnen?: () => void;
  onSchliessen?: () => void;
}) {
  const k = berechneKennzahlen(objekt);
  // Nur echte Fotos — Platzhalter-Einträge aus den Mockdaten bleiben draußen.
  const erstes = objekt.bilder[0];
  const bild = erstes && istQuelle(erstes) ? erstes : null;

  // Nur Kennzahlen zeigen, die wirklich etwas sagen — leere Striche und
  // Null-Prozente machen die Karte auf dem Luftbild groß und wertlos.
  const kennzahlen = [
    k.faktor ? { titel: "Faktor", wert: f.faktor(k.faktor) } : null,
    k.bruttoMietrendite ? { titel: "Rendite", wert: f.prozent(k.bruttoMietrendite) } : null,
    k.kaufpreisJeQm ? { titel: "€ / m²", wert: f.eur(k.kaufpreisJeQm) } : null,
  ].filter((e) => e !== null);

  return (
    <div
      className={cn(
        // Angeheftet steht die Adresse ganz da: zum Ueberfahren reichen 272px,
        // im festgehaltenen Blatt bricht die Strasse darin ab.
        "relative overflow-hidden rounded-2xl border border-linie bg-flaeche/97 shadow-schwebe backdrop-blur-sm",
        umfang === "voll" ? "w-[328px]" : "w-[272px]",
      )}
    >
      {/* Das Foto nur, wenn es eines gibt — der Streifen-Platzhalter hat auf
          dem Luftbild nichts verloren. */}
      {bild && (
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <Bildflaeche eintrag={bild} />
          <div className="absolute bottom-2.5 left-2.5 rounded-full bg-tinte/85 px-3 py-1.5 backdrop-blur-[2px]">
            <span className="zahl text-[0.8rem] font-semibold text-white">
              {f.eur(objekt.kaufpreis)}
            </span>
          </div>
        </div>
      )}

      {/* Das Kreuz liegt über dem Foto, wenn es eines gibt — sonst nimmt es
          dem Titel eine Zeile weg. */}
      {onSchliessen && (
        <button
          type="button"
          onClick={onSchliessen}
          aria-label="Vorschau schließen"
          className={cn(
            "druckbar absolute top-2.5 right-2.5 z-10 flex size-7 items-center justify-center rounded-full",
            bild
              ? "bg-tinte/70 text-white backdrop-blur-[2px]"
              : "border border-linie bg-flaeche text-grau",
          )}
        >
          <X size={13} strokeWidth={2.25} />
        </button>
      )}

      <div className="px-3.5 py-3">
        {/* Ohne Foto sitzt das Kreuz auf derselben Höhe wie die Stufe und
            würde sie überdecken — also Platz freihalten. */}
        <div
          className={cn(
            "flex items-start justify-between gap-2",
            onSchliessen && !bild && "pr-7",
          )}
        >
          <div className="min-w-0">
            <div className="truncate text-[0.84rem] font-medium text-tinte">
              {objekt.strasse}
            </div>
            <div className="mt-0.5 truncate text-[0.68rem] text-grau">
              {objekt.stadtteil} · {OBJEKTARTEN[objekt.objektart]}
              {objekt.anzahlEinheiten ? ` · ${objekt.anzahlEinheiten} Einh.` : ""}
            </div>
          </div>
          <Stufenzeichen stufe={objekt.stufe} className="shrink-0" />
        </div>

        {!bild && (
          <div className="zahl mt-2 text-[0.92rem] font-semibold text-tinte">
            {f.eur(objekt.kaufpreis)}
          </div>
        )}

        {kennzahlen.length > 0 && (
          <dl
            className="mt-2.5 grid gap-2 border-t border-linie pt-2.5"
            style={{ gridTemplateColumns: `repeat(${kennzahlen.length}, minmax(0, 1fr))` }}
          >
            {kennzahlen.map((e) => (
              <Mini key={e.titel} titel={e.titel} wert={e.wert} />
            ))}
          </dl>
        )}

        {/* Die Preisgeschichte ist das, was die angeheftete Karte vor der
            Schwebekarte voraus hat — im Vorbeifahren liest sie ohnehin keiner. */}
        {umfang === "voll" && (k.letzteForderung || k.letztesGebot) && (
          <dl className="mt-2.5 grid grid-cols-2 gap-2 border-t border-linie pt-2.5">
            <Mini titel="Gefordert" wert={f.eur(k.letzteForderung?.preis)} />
            <Mini titel="Geboten" wert={f.eur(k.letztesGebot?.preis)} />
          </dl>
        )}

        {k.zuTeuer && (
          <div className="zahl mt-2.5 rounded-lg bg-[#FBE2E2] px-2.5 py-1.5 text-[0.64rem] font-medium text-[#9A2727]">
            {f.eur(k.preisAbstand)} über Ankaufslimit
          </div>
        )}

        {onOeffnen && (
          <button
            type="button"
            onClick={onOeffnen}
            className="druckbar mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-tinte text-[0.66rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte"
          >
            Objekt öffnen
            <ArrowRight size={13} strokeWidth={2.25} />
          </button>
        )}
      </div>
    </div>
  );
}

function Mini({ titel, wert }: { titel: string; wert: string }) {
  return (
    <div className="min-w-0">
      <dt className="mini-label truncate !text-[0.5rem]">{titel}</dt>
      <dd className="zahl mt-0.5 truncate text-[0.72rem] font-semibold text-grau-stark">{wert}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Objektkachel für das Raster                                          */
/* ------------------------------------------------------------------ */

/**
 * Eine Kachel im Objektraster. Die Reihenfolge der Angaben folgt der Frage,
 * die Timo beim Durchscrollen stellt: Wie teuer, wo, und rechnet es sich?
 * Deshalb steht der Preis im Bild, die Adresse direkt darunter und die drei
 * Kennzahlen in einer Zeile am Fuß — alles ohne Klick lesbar.
 */
export function ObjektKachel({
  objekt,
  beiKlick,
  verzoegerung = 0,
}: {
  objekt: Objekt;
  beiKlick: () => void;
  verzoegerung?: number;
}) {
  const k = berechneKennzahlen(objekt);
  const { loeschen } = useObjekte();

  return (
    <li className="eintritt group relative" style={{ animationDelay: `${verzoegerung}ms` }}>
      <button
        type="button"
        onClick={beiKlick}
        className="kachel druckbar flex w-full flex-col overflow-hidden rounded-2xl border border-linie bg-flaeche text-left"
      >
        {/* ----- Bild mit den beiden Angaben, die sofort sitzen müssen ----- */}
        <span className="relative block aspect-[4/3] w-full overflow-hidden">
          <Bildflaeche eintrag={objekt.bilder[0] ?? objekt.strasse} />

          <span className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
            <Stufenzeichen stufe={objekt.stufe} className="shadow-karte" />
            {/* Nicht nur „zu teuer“, sondern um wie viel — sonst sieht die
                halbe Pipeline gleich aus und das Zeichen nutzt sich ab. */}
            {k.zuTeuer && (
              <span
                title={`Forderung liegt ${f.eur(k.preisAbstand)} über dem Ankaufslimit`}
                className="zahl shrink-0 rounded-full bg-[#CF4848] px-2.5 py-1 text-[0.6rem] font-semibold text-white shadow-karte"
              >
                +{f.eur(k.preisAbstand)}
              </span>
            )}
          </span>

          {/* Preis und Frist liegen im Bild, damit die Adresse darunter die
              volle Breite behält — sonst bricht der Straßenname auf dem
              Telefon nach zwei Silben ab. */}
          <span className="absolute inset-x-2.5 bottom-2.5 flex items-end justify-between gap-2">
            <span className="shrink-0 rounded-full bg-tinte/85 px-3 py-1.5 backdrop-blur-[2px]">
              <span className="zahl text-[0.82rem] font-semibold text-white">
                {f.eur(objekt.kaufpreis)}
              </span>
            </span>
            <Fristzeichen objekt={objekt} className="shadow-karte backdrop-blur-[2px]" />
          </span>
        </span>

        {/* ----- Adresse ----- */}
        <span className="block px-4 pt-3.5 pb-3">
          <span className="block truncate text-[0.88rem] font-medium text-tinte">
            {objekt.strasse}
          </span>
          <span className="mt-1 block truncate text-[0.7rem] text-grau">
            {objekt.plz} {objekt.stadt} · {objekt.stadtteil} · {OBJEKTARTEN[objekt.objektart]}
          </span>
        </span>

        {/* ----- Die drei Zahlen, die den Vergleich erlauben ----- */}
        <dl className="grid grid-cols-3 border-t border-linie">
          <Kennwert titel="Rendite" wert={f.prozent(k.bruttoMietrendite)} />
          <Kennwert titel="€ / m²" wert={f.eur(k.kaufpreisJeQm)} rand />
          <Kennwert titel="Fläche" wert={f.qm(objekt.wohnflaeche)} />
        </dl>

        {objekt.einheiten.length > 0 && <Einheitenbalken einheiten={objekt.einheiten} />}
      </button>

      <button
        type="button"
        onClick={() => loeschen(objekt.id)}
        aria-label={`${objekt.strasse} löschen`}
        className="druckbar absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-full bg-flaeche/90 text-grau opacity-0 shadow-karte backdrop-blur-[2px] transition-opacity duration-150 ease-out group-hover:opacity-100 hover:text-tinte focus-visible:opacity-100"
      >
        <Trash2 size={13} strokeWidth={1.75} />
      </button>
    </li>
  );
}

function Kennwert({ titel, wert, rand }: { titel: string; wert: string; rand?: boolean }) {
  return (
    <div className={cn("min-w-0 px-4 py-3", rand && "border-x border-linie")}>
      <dt className="mini-label truncate !text-[0.5rem]">{titel}</dt>
      <dd className="zahl mt-1 truncate text-[0.78rem] font-semibold text-tinte">{wert}</dd>
    </div>
  );
}

/**
 * Die Einheiten als ein durchgehender Balken statt als Liste. Ein Blick genügt,
 * um zu sehen, wie viel vom Haus schon verkauft ist — die Legende steht
 * darunter nur für die Status, die wirklich vorkommen.
 */
function Einheitenbalken({ einheiten }: { einheiten: Einheit[] }) {
  // EINHEITSSTATUS steht schon in der Reihenfolge des Projektablaufs —
  // von "geplant" bis "verkauft". Die Schlüsselreihenfolge ist die Sortierung.
  const gruppen = (Object.keys(EINHEITSSTATUS) as Einheitsstatus[])
    .map((status) => ({ status, anzahl: einheiten.filter((e) => e.status === status).length }))
    .filter((g) => g.anzahl > 0);

  return (
    <span className="block border-t border-linie px-4 py-3">
      <span className="flex items-baseline justify-between gap-2">
        <span className="mini-label !text-[0.5rem]">Einheiten</span>
        <span className="zahl text-[0.66rem] font-medium text-grau-stark">{einheiten.length}</span>
      </span>

      <span className="mt-2 flex h-[5px] overflow-hidden rounded-full bg-flaeche-hoch">
        {gruppen.map((g) => (
          <span
            key={g.status}
            className="block"
            style={{
              width: `${(g.anzahl / einheiten.length) * 100}%`,
              background: EINHEITSSTATUS[g.status].farbe,
            }}
          />
        ))}
      </span>

      <span className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1">
        {gruppen.map((g) => (
          <span key={g.status} className="flex items-center gap-1.5 text-[0.6rem] text-grau">
            <span
              aria-hidden
              className="size-[6px] shrink-0 rounded-full"
              style={{ background: EINHEITSSTATUS[g.status].farbe }}
            />
            {g.anzahl} {EINHEITSSTATUS[g.status].titel}
          </span>
        ))}
      </span>
    </span>
  );
}
