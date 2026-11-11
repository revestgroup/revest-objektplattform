/**
 * Detailansicht eines Objekts.
 *
 * Die Reiter folgen dem Ankauf: erst die Zahlen, dann was zu tun ist, dann mit
 * wem, dann Planung, Kosten, Einheiten, Unterlagen — und über allem der Verlauf
 * als Gedächtnis. Alles in einer einzigen langen Seite wäre schneller gebaut,
 * aber unbenutzbar.
 */
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Crosshair,
  Hammer,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ANGEBOTSARTEN,
  ANGEBOTSERGEBNISSE,
  BUNDESLAND_NAMEN,
  GESELLSCHAFTEN,
  ankaufsOrdner,
  driveOrdnerId,
  driveOrdnerName,
  EINHEITSSTATUS,
  GEWERKE,
  GEWERKSTATUS,
  GEWERK_TITEL,
  KONTAKTROLLEN,
  OBJEKTARTEN,
  STUFEN,
  STUFEN_REIHENFOLGE,
  ZUSTAENDE,
  adresse,
  aufteilungText,
  NUTZUNGEN,
  nutzungDerEinheit,
  type Nutzung,
  berechneKennzahlen,
  berechneVerkaufsplan,
  f,
  notizverlauf,
  type Angebot,
  type Angebotsergebnis,
  type Einheit,
  type Einheitsstatus,
  type Kontakt,
  type Objekt,
  type Sanierungsposten,
} from "../lib/objekte";
import { useAufgaben } from "../lib/aufgabenStore";
import { useEinstellungen } from "../lib/einstellungenStore";
import { SZENARIEN, SZENARIO_TITEL, berechneEtw, etwEingabe } from "../lib/kalkulationEtw";
import { pruefstand } from "../lib/pruefung";
import { useObjekte } from "../lib/objekteStore";
import { cn, gmailLink } from "../lib/utils";
import { useVermietung } from "../lib/vermietungStore";
import { Bildergalerie, Bildflaeche, istQuelle } from "./Bilder";
import { Dateiliste, Dokumentenablage, Einsortieren } from "./Dokumente";
import { AktivitaetenReiter, AktivitaetenSpalte } from "./Aktivitaeten";
import { Nachberechnungsblatt } from "./Nachberechnung";
import { Kontaktkacheln } from "./Kontaktkacheln";
import { Objektaufgaben } from "./Objektaufgaben";
import { Fristzeichen, Stufenzeichen } from "./Stufe";
import { Teilung, TeilungAnstossen } from "./Teilung";
import { Ruecknahmedialog, Verkaufsdialog } from "./Verkaufsdialog";
import { Verkaufsplanung } from "./Verkaufsplanung";
import { KalkulationEtwBlatt } from "./KalkulationEtw";
import { Pruefblatt, Pruefzeichen } from "./Pruefung";
import { Stufenleiste } from "./Stufenleiste";
import { Ummeldungsblatt } from "./Ummeldungen";

type Reiter =
  | "uebersicht"
  | "pruefung"
  | "ummeldungen"
  | "aufgaben"
  | "kontakt"
  | "verkauf"
  | "kosten"
  | "teilung"
  | "sanierung"
  | "einheiten"
  | "dokumente"
  | "verlauf"
  | "nachberechnung";

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
  "pruefung",
  "aufgaben",
  "kontakt",
  "verkauf",
  "dokumente",
  "verlauf",
];

const PROJEKT_REITER: Reiter[] = [
  "uebersicht",
  "aufgaben",
  "kontakt",
  // Mit dem Besitzübergang zuerst: wer zahlt ab wann Gas und Hausgeld.
  "ummeldungen",
  "teilung",
  "sanierung",
  "kosten",
  "einheiten",
  "verkauf",
  // Nach dem Verkauf: was an Rechnungen noch kommt und wem es gehört.
  "nachberechnung",
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
  // Im Ankauf eine flache Liste, im Projekt die Ablage mit Ordnern.
  if (r === "dokumente") return projekt ? "Drive" : "Dateien";
  return REITER_TITEL[r];
}

const REITER_TITEL: Record<Reiter, string> = {
  uebersicht: "Übersicht",
  pruefung: "Checkliste Ankauf",
  ummeldungen: "Ummeldungen",
  aufgaben: "Aufgaben",
  kontakt: "Kontakte",
  verkauf: "Kalkulation",
  kosten: "Kosten",
  teilung: "Teilung",
  sanierung: "Sanierung",
  einheiten: "Einheiten",
  dokumente: "Dokumente",
  verlauf: "Mail & Aktivitäten",
  nachberechnung: "Nachberechnung",
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
  // Ein Paket hat schon im Ankauf seine Einheiten — direkt nach der Checkliste.
  const reiterliste = projekt
    ? PROJEKT_REITER
    : objekt.paket
      ? ANKAUF_REITER.flatMap((r) => (r === "pruefung" ? [r, "einheiten" as const] : [r]))
      : ANKAUF_REITER;

  // Nach dem Deal wechselt die Reiterliste unter den Füßen. Wer gerade in der
  // Kalkulation stand, soll nicht ins Leere schauen — gibt es den Reiter in
  // der neuen Phase nicht, landet man auf der Übersicht.
  const sichtbar = reiterliste.includes(reiter) ? reiter : "uebersicht";

  // Wie hoch der feste Kopf gerade ist — damit Inhalte, die selbst stehen
  // bleiben (das Ergebnis der Kalkulation), genau darunter andocken.
  const kopfRef = useRef<HTMLDivElement>(null);
  const [kopfHoehe, setKopfHoehe] = useState(0);
  useEffect(() => {
    const el = kopfRef.current;
    if (!el) return;
    const beobachter = new ResizeObserver(() => setKopfHoehe(el.offsetHeight));
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, []);
  const { garantien: alleGarantien } = useVermietung();
  const verwertung = aufteilungText(
    objekt,
    (e) => alleGarantien.find((g) => g.einheitId === e.id)?.art === "wg",
  );

  /**
   * Die Zahl am Reiter. Bei Aufgaben zählen nur die offenen — eine erledigte
   * Aufgabe ist kein Grund hinzuschauen.
   */
  const zahlen = useMemo<Record<Reiter, number | null>>(
    () => ({
      uebersicht: null,
      // Nur Offenes zählt: was noch zu tun ist, dazu die Zahl der Dateien.
      pruefung: (() => {
        const s = pruefstand(objekt);
        return s.gesamt - s.erledigt;
      })(),
      ummeldungen: (objekt.ummeldungen ?? []).filter(
        (u) => u.status !== "bestaetigt" && u.status !== "entfaellt",
      ).length,
      aufgaben: aufgaben.filter((a) => a.objektId === objekt.id && !a.erledigtAm).length,
      kontakt: null,
      verkauf: null,
      kosten: null,
      teilung: null,
      sanierung: objekt.sanierung.filter((p) => p.status !== "abgenommen").length,
      einheiten: null,
      dokumente: objekt.dokumente.length,
      verlauf: null,
      // Offene Zeilen: was noch abzurechnen oder zu bezahlen ist.
      nachberechnung: (objekt.nachberechnung ?? []).filter((z) => z.status !== "erledigt").length,
    }),
    [objekt, aufgaben],
  );

  return (
    <div
      className="flex min-h-full flex-col"
      style={{ "--kopf-hoehe": `${kopfHoehe}px` } as React.CSSProperties}
    >
      {/* ----- Kopf ----- */}
      {/* Kopf, Stufenleiste und Reiter stehen fest; nur der Inhalt darunter
          scrollt. Deshalb so kompakt: Bild, Bezeichnung, Adresse, Fläche,
          Preis und Stufe in einem Block, die Knöpfe in derselben Zeile. */}
      <div ref={kopfRef} className="sticky top-0 z-20 bg-grund">
        <div className="border-b border-linie px-4 py-4 md:px-7">
          <div className="flex items-start gap-4">
            <div className="hidden h-[4.5rem] w-24 shrink-0 overflow-hidden rounded-xl bg-flaeche-hoch sm:block">
              <Bildflaeche eintrag={objekt.bilder[0] ?? "Kein Bild"} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Im Ankauf zeigt die Stufenleiste darunter die Stufe — ein
                    zweites Etikett wäre doppelt. */}
                {projekt && <Stufenzeichen stufe={objekt.stufe} />}
                {objekt.kuerzel && <Marke>{objekt.kuerzel}</Marke>}
                <Fristzeichen objekt={objekt} />
                {objekt.denkmalschutz && <Marke>Denkmal</Marke>}
                {objekt.erbbaurecht && <Marke>Erbbaurecht</Marke>}
              </div>
              <h1 className="headline mt-1.5 truncate text-[1.2rem] md:text-[1.45rem]">
                {objekt.bezeichnung?.trim() || objekt.strasse}
              </h1>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[0.74rem] text-grau">
                <span className="flex min-w-0 items-center gap-1.5">
                  <MapPin size={12} strokeWidth={1.75} className="shrink-0" />
                  <span className="truncate">
                    {objekt.strasse}, {objekt.plz} {objekt.stadt} · {objekt.stadtteil}
                  </span>
                </span>
                <span className="zahl font-semibold text-tinte">{f.eur(objekt.kaufpreis)}</span>
                <span className="zahl text-grau-stark">{f.qm(objekt.wohnflaeche)}</span>
                {verwertung && <span>{verwertung}</span>}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
              {projekt && <TeilungAnstossen objekt={objekt} />}
              {onAufKarte && (
                <button
                  type="button"
                  onClick={onAufKarte}
                  aria-label="Auf der Karte"
                  title="Auf der Karte"
                  className="druckbar flex size-8 items-center justify-center rounded-full border border-linie text-grau-stark"
                >
                  <Crosshair size={13} strokeWidth={2} />
                </button>
              )}
              <button
                type="button"
                onClick={onBearbeiten}
                className="druckbar flex h-8 items-center gap-1.5 rounded-full border border-linie-stark px-3 text-[0.62rem] font-medium tracking-[0.12em] uppercase text-tinte"
              >
                <Pencil size={11} strokeWidth={2} />
                Bearbeiten
              </button>
            </div>
          </div>

          {/* Eine Absage ohne Begründung ist in zwei Jahren wertlos — hier steht
            sie dort, wo sie gelesen wird, und nicht nur im Verlauf. */}
          {objekt.stufe === "abgesagt" && objekt.absagegrund && (
            <p className="mt-3 rounded-xl border border-[#E3BDB9] bg-[#F8DEDC] px-3.5 py-2 text-[0.72rem] leading-relaxed text-[#8A2822]">
              No Deal: {objekt.absagegrund}
            </p>
          )}
        </div>

        {/* Im Ankauf die Stufenleiste; ein Projekt ist gekauft und braucht keine. */}
        {!projekt && <Stufenleiste objekt={objekt} zurCheckliste={() => setReiter("pruefung")} />}

        {/* ----- Reiter ----- */}
        {/* Zehn Reiter passen auf dem Telefon nicht nebeneinander — also wischen
          statt umbrechen, sonst wandert der Inhalt nach unten. */}
        <div className="scroll-reihe flex shrink-0 gap-1 overflow-x-auto border-b border-linie bg-grund px-4 md:px-7">
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
                {r === "dokumente" && projekt && <DriveZeichen />}
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
      </div>

      <div className="flex-1">
        {sichtbar === "uebersicht" && (
          <Uebersicht objekt={objekt} kennzahlen={k} zuReiter={setReiter} />
        )}
        {sichtbar === "pruefung" && <Pruefblatt objekt={objekt} />}
        {sichtbar === "ummeldungen" && <Ummeldungsblatt objekt={objekt} />}
        {sichtbar === "aufgaben" && <Objektaufgaben objekt={objekt} />}
        {sichtbar === "kontakt" && (
          <div className="px-4 py-5 md:px-7">
            <div className="mb-3.5 flex items-baseline gap-3.5">
              <h2 className="headline text-[1.25rem]">Kontakte</h2>
              <span className="text-[0.8rem] text-grau-stark">
                {objekt.kontakte.filter((k) => k.name.trim()).length} Beteiligte
              </span>
            </div>
            <Kontaktkacheln objekt={objekt} />
          </div>
        )}
        {sichtbar === "verkauf" &&
          (projekt ? <Verkaufsplanung objekt={objekt} /> : <Kalkulation objekt={objekt} />)}
        {sichtbar === "teilung" && <Teilung objekt={objekt} />}
        {sichtbar === "sanierung" && <Sanierung objekt={objekt} kennzahlen={k} />}
        {sichtbar === "kosten" && <Kosten objekt={objekt} kennzahlen={k} />}
        {sichtbar === "einheiten" && <Einheiten objekt={objekt} />}
        {sichtbar === "dokumente" && <Dokumente objekt={objekt} projekt={projekt} />}
        {sichtbar === "verlauf" && <AktivitaetenReiter objekt={objekt} />}
        {sichtbar === "nachberechnung" && <Nachberechnungsblatt objekt={objekt} />}
      </div>
    </div>
  );
}

/**
 * Im Ankauf: bei Eigentumswohnungen Timos Excel-Kalkulation, bei allen
 * anderen vorerst die bisherige Verkaufsplanung — die MFH-Kalkulation folgt.
 * Die Verkaufsplanung bleibt auch bei ETW erreichbar, zugeklappt darunter:
 * dort steht etwa die WG-Planung, die sonst verloren wäre.
 */
function Kalkulation({ objekt }: { objekt: Objekt }) {
  const [planOffen, setPlanOffen] = useState(false);

  if (objekt.objektart !== "etw") {
    return (
      <div>
        <p className="mx-6 mt-6 rounded-xl border border-linie bg-flaeche-hoch px-3.5 py-2.5 text-[0.74rem] text-grau-stark md:mx-9">
          MFH-Kalkulation folgt. Bis dahin rechnet hier die bisherige Verkaufsplanung.
        </p>
        <Verkaufsplanung objekt={objekt} />
      </div>
    );
  }

  return (
    <div>
      <KalkulationEtwBlatt objekt={objekt} />
      <div className="border-t border-linie">
        <button
          type="button"
          onClick={() => setPlanOffen((o) => !o)}
          aria-expanded={planOffen}
          className="druckbar flex w-full items-center gap-3 px-6 py-5 text-left md:px-9"
        >
          <ChevronDown
            size={14}
            strokeWidth={2}
            className={cn(
              "shrink-0 text-grau transition-transform duration-200",
              !planOffen && "-rotate-90",
            )}
          />
          <span className="mini-label">Bisherige Verkaufsplanung</span>
        </button>
        {planOffen && <Verkaufsplanung objekt={objekt} />}
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

/**
 * Drei Spalten, in der Reihenfolge der Arbeit: wen rufe ich an, was weiß ich
 * schon, was kostet es. Am Telefon stehen sie in derselben Reihenfolge
 * untereinander. Alles Weitere liegt in den Reitern — die Übersicht ist der
 * Arbeitsplatz, nicht das Archiv.
 */
function Uebersicht({
  objekt,
  kennzahlen,
  zuReiter,
}: {
  objekt: Objekt;
  kennzahlen: ReturnType<typeof berechneKennzahlen>;
  zuReiter: (r: Reiter) => void;
}) {
  return (
    <div className="divide-y divide-linie">
      <div className="grid gap-px bg-linie lg:grid-cols-3">
        <KontaktSpalte objekt={objekt} />
        <AktivitaetenSpalte objekt={objekt} alleAnzeigen={() => zuReiter("verlauf")} />
        <SteckbriefSpalte objekt={objekt} kennzahlen={kennzahlen} zuReiter={zuReiter} />
      </div>

      {objekt.bilder.length > 1 && (
        <div className="px-6 py-7 md:px-9">
          <Bildergalerie bilder={objekt.bilder} />
        </div>
      )}
    </div>
  );
}

/** Makler zuerst, dann Eigentümer — in der Reihenfolge, in der man anruft. */
const ROLLEN_FOLGE: Kontakt["rolle"][] = [
  "makler",
  "eigentuemer",
  "verwalter",
  "notar",
  "handwerker",
  "sonst",
];

function KontaktSpalte({ objekt }: { objekt: Objekt }) {
  const kontakte = objekt.kontakte
    .filter((k) => k.name.trim() !== "")
    .sort((a, b) => ROLLEN_FOLGE.indexOf(a.rolle) - ROLLEN_FOLGE.indexOf(b.rolle));
  const empfaenger = kontakte.find((k) => k.email)?.email ?? "";
  const titel = objekt.bezeichnung?.trim() || objekt.strasse;
  const betreff = objekt.kuerzel ? `[${objekt.kuerzel}] ${titel}` : titel;

  return (
    <section className="bg-grund px-6 py-8 md:px-9">
      <div className="mini-label">Kontakt &amp; Mail</div>

      {/* Dieselben Kacheln wie im Reiter „Kontakte“, nur untereinander. */}
      <div className="mt-4">
        <Kontaktkacheln objekt={objekt} einspaltig />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={gmailLink(empfaenger, betreff)}
          target="_blank"
          rel="noreferrer"
          className="druckbar flex items-center gap-2 rounded-full bg-tinte px-4 py-2 text-[0.66rem] font-medium tracking-[0.12em] uppercase text-grund"
        >
          <Mail size={12} strokeWidth={2} />
          E-Mail schreiben
        </a>
      </div>
      {!empfaenger && kontakte.length > 0 && (
        <p className="mt-2 text-[0.64rem] text-grau">
          Keine E-Mail-Adresse hinterlegt — der Entwurf öffnet ohne Empfänger.
        </p>
      )}
    </section>
  );
}

function SteckbriefSpalte({
  objekt,
  kennzahlen,
  zuReiter,
}: {
  objekt: Objekt;
  kennzahlen: ReturnType<typeof berechneKennzahlen>;
  zuReiter: (r: Reiter) => void;
}) {
  const k = kennzahlen;
  const plan = berechneVerkaufsplan(objekt, k);
  const { vorgaben } = useEinstellungen();
  // Bei ETW die Excel-Kalkulation, sobald sie gerechnet werden kann.
  const etw =
    objekt.objektart === "etw" && objekt.stufe !== "angekauft"
      ? berechneEtw(etwEingabe(objekt, vorgaben))
      : null;
  const ruecklage = objekt.instandhaltungsruecklage;

  return (
    <section className="bg-grund px-6 py-8 md:px-9">
      {objekt.stufe !== "angekauft" && (
        <button
          type="button"
          onClick={() => zuReiter("pruefung")}
          className="druckbar mb-6 flex w-full items-center justify-between gap-3 rounded-xl border border-linie bg-flaeche px-3.5 py-2.5 text-left"
        >
          <span className="mini-label">Checkliste Ankauf</span>
          <Pruefzeichen objekt={objekt} kurz />
        </button>
      )}
      <div className="mini-label">Steckbrief</div>
      <dl className="mt-3">
        <Reihe titel="Objektart" wert={OBJEKTARTEN[objekt.objektart]} />
        <Reihe titel="Baujahr" wert={objekt.baujahr ? String(objekt.baujahr) : "—"} />
        <Reihe titel="Wohnfläche" wert={f.qm(objekt.wohnflaeche)} />
        <Reihe
          titel="Zimmer"
          wert={f.zahl(
            objekt.zimmer ?? (objekt.vertriebsweg === "wg" ? objekt.wgZimmer : null) ?? null,
          )}
        />
        <Reihe titel="Etage" wert={objekt.etage ?? "—"} />
        <Reihe
          titel="Zustand"
          wert={ZUSTAENDE[objekt.zustand]}
          unter={
            objekt.jahresNettokaltmiete
              ? `${f.eur(objekt.jahresNettokaltmiete)} Kaltmiete im Jahr`
              : undefined
          }
        />
        <Reihe
          titel="Hausgeld"
          wert={objekt.hausgeld ? `${f.eur(objekt.hausgeld)} / Monat` : "—"}
        />
        <Reihe titel="Erhaltungsrücklage" wert={ruecklage ? f.eur(ruecklage) : "—"} />
        <Reihe titel="Stellplatz / TG" wert={objekt.stellplatz ?? "—"} />
        <Reihe titel="Energieklasse" wert={objekt.energieklasse ?? "—"} />
        <Reihe titel="Quelle" wert={objekt.quelle ?? "—"} />
      </dl>

      <div className="mini-label mt-8">Kalkulation</div>
      {etw ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5">
            <GrossZahl titel="Kaufpreis" wert={f.eurKurz(objekt.kaufpreis)} />
            <GrossZahl
              titel="Gesamtinvestition"
              wert={f.eurKurz(etw.szenarien.mid.gesamtinvestition)}
            />
          </div>
          <table className="zahl mt-4 w-full text-[0.74rem]">
            <thead>
              <tr>
                <th />
                {SZENARIEN.map((sz) => (
                  <th key={sz} className="pb-1.5 text-right">
                    <span className="mini-label">{SZENARIO_TITEL[sz]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1 text-grau">Gewinn</td>
                {SZENARIEN.map((sz) => (
                  <td key={sz} className="py-1 text-right font-semibold text-tinte">
                    {f.eurKurz(etw.szenarien[sz].gewinn)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-grau">Gewinn %</td>
                {SZENARIEN.map((sz) => (
                  <td key={sz} className="py-1 text-right text-grau-stark">
                    {f.prozent(etw.szenarien[sz].gewinnProzent)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5">
            <GrossZahl titel="Kaufpreis" wert={f.eurKurz(objekt.kaufpreis)} />
            <GrossZahl
              titel="Gesamtinvestition"
              wert={f.eurKurz(plan.gesamtkosten ?? k.gesamtinvestition)}
            />
            <GrossZahl titel="Gewinn" wert={f.eurKurz(plan.rohgewinn)} />
            <GrossZahl titel="Gewinn %" wert={f.prozent(plan.margeProzent)} />
          </div>
          <p className="mt-3 text-[0.64rem] leading-relaxed text-grau">
            Aus der Verkaufsplanung. Die MFH-Kalkulation folgt.
          </p>
        </>
      )}
      <button
        type="button"
        onClick={() => zuReiter("verkauf")}
        className="druckbar mt-4 flex items-center gap-2 rounded-full border border-linie-stark px-4 py-2 text-[0.66rem] font-medium tracking-[0.12em] uppercase text-tinte"
      >
        Zur Kalkulation
        <ArrowRight size={12} strokeWidth={2} />
      </button>

      {/* Erst ab dem Ankauf von Belang — vorher gibt es kein Kürzel und keinen Ordner. */}
      {(objekt.stufe === "angekauft" || objekt.kuerzel) && (
        <>
          <div className="mini-label mt-8">Ablage</div>
          <dl className="mt-3">
            <Reihe titel="Kürzel" wert={objekt.kuerzel ?? "—"} stark />
            <Reihe
              titel="Gesellschaft"
              wert={objekt.gesellschaft ? GESELLSCHAFTEN[objekt.gesellschaft] : "nicht hinterlegt"}
            />
            <Reihe
              titel="Beurkundet"
              wert={objekt.angekauftAm ? f.datum(objekt.angekauftAm) : "—"}
            />
            <Reihe
              titel="Besitzübergang"
              wert={objekt.besitzuebergangAm ? f.datum(objekt.besitzuebergangAm) : "offen"}
            />
            <div className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-[0.76rem] text-grau">Drive-Ordner</dt>
              <dd className="text-[0.82rem]">
                {objekt.driveOrdnerUrl ? (
                  <a
                    href={objekt.driveOrdnerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-tinte underline-offset-2 hover:underline"
                  >
                    Öffnen
                    <ArrowUpRight size={12} strokeWidth={2} />
                  </a>
                ) : (
                  <span className="text-grau-stark">nicht verknüpft</span>
                )}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}

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
                <span className="rounded-full px-2 py-0.5" style={ERGEBNIS_TON[a.ergebnis]}>
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
  const [ruecknahme, setRuecknahme] = useState<{
    einheit: Einheit;
    status: Einheitsstatus;
  } | null>(null);

  const summe = useMemo(
    () => ({ flaeche: objekt.einheiten.reduce((s, e) => s + e.wohnflaeche, 0) }),
    [objekt.einheiten],
  );

  /**
   * „Verkauft" ist kein Status, den man setzt, sondern ein Vorgang: es gibt
   * einen Käufer, einen Preis, ein Datum und die Frage nach der Garantie.
   * Deshalb führt dieser Eintrag in den Dialog statt direkt in den Speicher —
   * und der Weg heraus ebenso, weil dabei ein Käufer verschwindet. Alle
   * anderen Wechsel sind reine Statuswechsel.
   */
  function statusSetzen(e: Einheit, status: Einheitsstatus) {
    if (status === "verkauft" && e.status !== "verkauft") {
      setVerkauf(e);
      return;
    }
    if (e.status === "verkauft" && status !== "verkauft") {
      setRuecknahme({ einheit: e, status });
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

  function aendereEinheit(id: string, teil: Partial<Einheit>) {
    einheitenSetzen(
      objekt.id,
      objekt.einheiten.map((x) => (x.id === id ? { ...x, ...teil } : x)),
    );
  }

  /**
   * Nutzung: gesetzt, sonst aus der Mietgarantie (WG-Garantie = WG), sonst ETW.
   * Wer vermietet ist, steht in der Mietverwaltung — hier nur der Name.
   */
  function nutzungVon(e: Einheit): Nutzung {
    return nutzungDerEinheit(e, (x) => garantien.find((g) => g.einheitId === x.id)?.art === "wg");
  }

  function bewohnerVon(e: Einheit): string {
    const g = garantien.find((x) => x.einheitId === e.id);
    const namen = g
      ? mieter.filter((m) => m.garantieId === g.id && m.status === "eingezogen").map((m) => m.name)
      : [];
    if (namen.length > 0) return namen.length > 2 ? `${namen.length} Mieter` : namen.join(", ");
    return e.kaltmiete ? `vermietet · ${f.eur(e.kaltmiete)}` : "Leerstand";
  }

  const zelle = "px-2.5 py-1.5";
  const eingabe =
    "zahl w-full min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[0.78rem] text-tinte hover:border-linie focus:border-linie-stark focus:bg-flaeche focus:outline-none";

  return (
    <div className="px-4 py-5 md:px-7">
      {/* Eine Zeile je Einheit. Käufer, Preis und Reservierung stehen bewusst
          nicht hier: der Vertrieb läuft extern in der Vertriebssoftware. */}
      <div className="overflow-x-auto rounded-2xl border border-linie bg-flaeche">
        <table className="w-full min-w-[44rem] text-left text-[0.78rem]">
          <thead>
            <tr className="bg-flaeche-hoch text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-grau">
              <th className={zelle}>Nr.</th>
              <th className={zelle}>Geschoss</th>
              <th className={cn(zelle, "text-right")}>m²</th>
              <th className={cn(zelle, "text-right")}>Zimmer</th>
              <th className={zelle}>Nutzung</th>
              <th className={zelle}>Status</th>
              <th className={zelle}>Mieter / Leerstand</th>
            </tr>
          </thead>
          <tbody>
            {objekt.einheiten.map((e) => (
              <tr key={e.id} className="border-t border-linie">
                <td
                  className={cn(zelle, "font-medium whitespace-nowrap text-tinte")}
                  title={e.bezeichnung}
                >
                  {e.bezeichnung.split(" · ")[0]}
                </td>
                <td className={cn(zelle, "w-28")}>
                  <input
                    aria-label={`Geschoss ${e.bezeichnung}`}
                    defaultValue={e.geschoss}
                    onBlur={(ev) =>
                      ev.target.value !== e.geschoss &&
                      aendereEinheit(e.id, { geschoss: ev.target.value.trim() })
                    }
                    className={eingabe}
                  />
                </td>
                <td className={cn(zelle, "w-20")}>
                  <input
                    aria-label={`Wohnfläche ${e.bezeichnung}`}
                    inputMode="decimal"
                    defaultValue={e.wohnflaeche || ""}
                    onBlur={(ev) => {
                      const n = Number(ev.target.value.replace(",", ".")) || 0;
                      if (n !== e.wohnflaeche) aendereEinheit(e.id, { wohnflaeche: n });
                    }}
                    className={cn(eingabe, "text-right")}
                  />
                </td>
                <td className={cn(zelle, "w-20")}>
                  <input
                    aria-label={`Zimmer ${e.bezeichnung}`}
                    inputMode="decimal"
                    defaultValue={e.zimmer || ""}
                    onBlur={(ev) => {
                      const n = Number(ev.target.value.replace(",", ".")) || 0;
                      if (n !== e.zimmer) aendereEinheit(e.id, { zimmer: n });
                    }}
                    className={cn(eingabe, "text-right")}
                  />
                </td>
                <td className={zelle}>
                  <select
                    value={nutzungVon(e)}
                    onChange={(ev) => aendereEinheit(e.id, { nutzung: ev.target.value as Nutzung })}
                    aria-label={`Nutzung ${e.bezeichnung}`}
                    className="rounded-full bg-flaeche-hoch px-2 py-0.5 text-[0.68rem] font-semibold text-grau-stark focus:outline-none"
                  >
                    {(Object.keys(NUTZUNGEN) as Nutzung[]).map((n) => (
                      <option key={n} value={n}>
                        {NUTZUNGEN[n]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={zelle}>
                  {/* Der Status als Pille in seiner Farbe; innen ein echtes <select>. */}
                  <span className="relative inline-flex">
                    <select
                      value={e.status}
                      onChange={(ev) => statusSetzen(e, ev.target.value as Einheitsstatus)}
                      aria-label={`Status von ${e.bezeichnung}`}
                      className="appearance-none rounded-full py-0.5 pr-6 pl-2.5 text-[0.66rem] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-linie-stark"
                      style={{
                        background: EINHEITSSTATUS[e.status].weich,
                        color: EINHEITSSTATUS[e.status].tief,
                      }}
                    >
                      {Object.entries(EINHEITSSTATUS).map(([wert, { titel }]) => (
                        <option key={wert} value={wert} className="text-tinte">
                          {titel}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={11}
                      strokeWidth={2.25}
                      aria-hidden
                      className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
                      style={{ color: EINHEITSSTATUS[e.status].tief }}
                    />
                  </span>
                </td>
                <td className={cn(zelle, "truncate text-grau-stark")}>{bewohnerVon(e)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-linie-stark font-bold text-tinte">
              <td className={zelle} colSpan={2}>
                {objekt.einheiten.length} Einheiten
              </td>
              <td className={cn(zelle, "zahl text-right")}>{f.qm(summe.flaeche)}</td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-4">
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
        <Verkaufsdialog objekt={objekt} einheit={verkauf} schliessen={() => setVerkauf(null)} />
      )}

      {ruecknahme && (
        <Ruecknahmedialog
          objekt={objekt}
          einheit={ruecknahme.einheit}
          status={ruecknahme.status}
          schliessen={() => setRuecknahme(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dokumente                                                            */
/* ------------------------------------------------------------------ */

/**
 * Das offizielle Google-Drive-Symbol, direkt von Google geladen — nicht
 * nachgezeichnet.
 */
function DriveZeichen({ gross }: { gross?: boolean }) {
  return (
    <img
      src="https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png"
      alt=""
      width={gross ? 20 : 14}
      height={gross ? 20 : 14}
      className="shrink-0"
    />
  );
}

/**
 * Im Projekt: der Drive-Ordner direkt eingebettet (ohne Google-API über die
 * eingebettete Ordneransicht — klappt, wenn man im Browser bei Google
 * angemeldet ist). Hochgeladen wird im Drive selbst. Darunter, bis Phase 2,
 * die Dateien, die nur in der Plattform liegen.
 */
function DriveOrdner({ objekt }: { objekt: Objekt }) {
  const { aendern } = useObjekte();
  const [link, setLink] = useState("");
  const id = driveOrdnerId(objekt.driveOrdnerUrl);
  const ungueltig = link.trim() !== "" && !driveOrdnerId(link);

  if (!id) {
    return (
      <div className="mb-5 rounded-2xl border border-linie bg-flaeche px-4 py-4">
        <div className="flex items-center gap-2 text-[0.84rem] font-medium text-tinte">
          <DriveZeichen gross />
          Drive-Ordner verknüpfen
        </div>
        <p className="mt-1.5 text-[0.72rem] leading-relaxed text-grau">
          Link zum Objektordner im Google Drive einfügen — danach erscheint der Ordner hier direkt.
          Vorschlag für den Namen:{" "}
          <span className="zahl text-grau-stark">02_Projekte/{driveOrdnerName(objekt)}</span>
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (driveOrdnerId(link)) aendern(objekt.id, { driveOrdnerUrl: link.trim() });
          }}
          className="mt-3 flex flex-wrap gap-2"
        >
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/…"
            aria-label="Link zum Drive-Ordner"
            className="min-w-0 flex-1 rounded-xl border border-linie bg-grund px-3 py-2 text-[0.78rem] text-tinte focus:border-linie-stark focus:outline-none"
          />
          <button
            type="submit"
            disabled={!driveOrdnerId(link)}
            className="druckbar rounded-full bg-tinte px-4 py-2 text-[0.64rem] font-semibold tracking-[0.12em] uppercase text-grund disabled:opacity-30"
          >
            Verknüpfen
          </button>
        </form>
        {ungueltig && (
          <p className="mt-1.5 text-[0.66rem] text-[#9A2727]">
            In diesem Link steckt keine Ordner-ID.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-5">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <DriveZeichen gross />
        <span className="zahl min-w-0 flex-1 truncate text-[0.78rem] text-grau-stark">
          02_Projekte/{driveOrdnerName(objekt)}
        </span>
        <a
          href={objekt.driveOrdnerUrl ?? `https://drive.google.com/drive/folders/${id}`}
          target="_blank"
          rel="noreferrer"
          className="druckbar flex items-center gap-1.5 rounded-full bg-tinte px-3.5 py-2 text-[0.64rem] font-semibold tracking-[0.1em] uppercase text-grund"
        >
          In Drive öffnen
          <ArrowUpRight size={12} strokeWidth={2} />
        </a>
        <button
          type="button"
          onClick={() => aendern(objekt.id, { driveOrdnerUrl: null })}
          className="druckbar rounded-full border border-linie px-3 py-2 text-[0.62rem] text-grau hover:text-tinte"
        >
          Link ändern
        </button>
      </div>
      <iframe
        title="Drive-Ordner"
        src={`https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(id)}#list`}
        className="h-[28rem] w-full rounded-2xl border border-linie bg-flaeche"
      />
      <p className="mt-1.5 text-[0.64rem] text-grau">
        Leer oder Anmeldeseite? Im selben Browser bei Google anmelden. Hochladen bitte über „In
        Drive öffnen“.
      </p>
    </div>
  );
}

function Dokumente({ objekt, projekt }: { objekt: Objekt; projekt: boolean }) {
  const { dokumenteAnhaengen, dokumentLoeschen, dokumenteEinsortieren } = useObjekte();
  const ordnerName = projekt ? `02_Projekte/${driveOrdnerName(objekt)}` : ankaufsOrdner(objekt);
  const [kopiert, setKopiert] = useState(false);

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(ordnerName);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 1600);
    } catch {
      // Ohne Zwischenablage-Recht bleibt der Name zum Abschreiben stehen.
    }
  }

  const archiv = objekt.stufe === "abgesagt" || objekt.stufe === "unqualifiziert";

  return (
    <div className="px-4 py-5 sm:px-6 md:px-9">
      {projekt && <DriveOrdner objekt={objekt} />}
      {/* Brücke zum Drive: der Ordner nach Konvention zum Kopieren, und
          sobald er verknüpft ist, der direkte Weg dorthin. Im Projekt
          übernimmt das der eingebettete Ordner darüber. */}
      {!projekt && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-linie bg-flaeche px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="mini-label">Ordner im Drive</div>
            <div className="zahl mt-1 truncate text-[0.76rem] text-grau-stark">{ordnerName}</div>
            {archiv && (
              <div className="mt-0.5 text-[0.64rem] text-grau">
                Liegt im Archiv — gelöscht wird nichts.
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={kopieren}
            aria-label="Ordnernamen kopieren"
            title="Ordnernamen kopieren"
            className="druckbar flex size-8 shrink-0 items-center justify-center rounded-full text-grau hover:text-tinte"
          >
            {kopiert ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.75} />}
          </button>
          {objekt.driveOrdnerUrl && (
            <a
              href={objekt.driveOrdnerUrl}
              target="_blank"
              rel="noreferrer"
              className="druckbar flex items-center gap-1.5 rounded-full border border-linie-stark px-3.5 py-2 text-[0.66rem] font-medium tracking-[0.1em] uppercase text-tinte"
            >
              Im Drive öffnen
              <ArrowUpRight size={12} strokeWidth={2} />
            </a>
          )}
        </div>
      )}

      {projekt ? (
        <>
          <div className="mini-label mb-2.5">In der Plattform abgelegt · bis Phase 2</div>
          <Einsortieren
            dokumente={objekt.dokumente}
            onEinsortieren={(ziele) => dokumenteEinsortieren(objekt.id, ziele)}
          />
          <Dokumentenablage
            dokumente={objekt.dokumente}
            onHochladen={(neue) => dokumenteAnhaengen(objekt.id, neue)}
            onLoeschen={(id) => dokumentLoeschen(objekt.id, id)}
          />
        </>
      ) : (
        <Dateiliste
          dokumente={objekt.dokumente}
          onHochladen={(neue) => dokumenteAnhaengen(objekt.id, neue)}
          onLoeschen={(id) => dokumentLoeschen(objekt.id, id)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Verlauf                                                              */
/* ------------------------------------------------------------------ */

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
          className={cn("flex items-start justify-between gap-2", onSchliessen && !bild && "pr-7")}
        >
          <div className="min-w-0">
            <div className="truncate text-[0.84rem] font-medium text-tinte">{objekt.strasse}</div>
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
          {objekt.stufe !== "angekauft" && <Pruefzeichen objekt={objekt} className="mt-2.5" />}
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
