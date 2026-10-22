/**
 * Anlage- und Bearbeitungsmaske für ein Objekt.
 *
 * Zwei Gestaltungsentscheidungen tragen diese Maske:
 *
 *  1. Die Kennzahlen rechnen MIT. Kaufpreis, Miete und Bundesland sind in
 *     einem Ankaufsgespräch die drei Zahlen, die sich ständig ändern — der
 *     Faktor und die Nebenkosten müssen sofort danebenstehen, nicht erst
 *     nach dem Speichern.
 *
 *  2. Die Grunderwerbsteuer folgt der Stadt. Ulm liegt in Baden-Württemberg
 *     (5,0 %), Neu-Ulm in Bayern (3,5 %). Bei 1,5 Mio sind das 22.500 €
 *     Unterschied — niemand soll das von Hand nachschlagen müssen.
 */
import { AlertCircle } from "lucide-react";
import { useMemo, useState } from "react";

import {
  BUNDESLAND_NAMEN,
  GRUNDERWERBSTEUER,
  OBJEKTARTEN,
  STUFEN,
  STUFEN_REIHENFOLGE,
  ZUSTAENDE,
  f,
  umrissAusMitte,
  type Ankaufsstufe,
  type Objekt,
  type Objektart,
  type Zustand,
} from "../lib/objekte";
import { stadtteilAnPunkt, stadtteileDerStadt } from "../lib/stadtteile";
import type { ObjektEntwurf } from "../lib/objekteStore";
import { cn } from "../lib/utils";
import { AnlegeEinstieg } from "./AnlegeEinstieg";
import { Bilderfeld } from "./Bilder";
import { Dokumentenfeld, type NeuesDokument } from "./Dokumente";
import { PunktWaehler } from "./PunktWaehler";
import {
  Auswahlfeld,
  Bereich,
  Klappbereich,
  Schalter,
  Segmente,
  Textfeld,
  Zahlfeld,
} from "./Felder";

type Stadt = "Ulm" | "Neu-Ulm";

/** Das Bundesland ist durch die Stadt bestimmt, nicht frei wählbar. */
const BUNDESLAND: Record<Stadt, string> = { Ulm: "BW", "Neu-Ulm": "BY" };

interface FormularZustand {
  strasse: string;
  plz: string;
  stadt: Stadt;
  stadtteil: string;
  laenge: string;
  breite: string;
  objektart: Objektart;
  zustand: Zustand;
  stufe: Ankaufsstufe;
  kaufpreis: string;
  ankaufslimit: string;
  wohnflaeche: string;
  gewerbeflaeche: string;
  grundstuecksflaeche: string;
  anzahlEinheiten: string;
  baujahr: string;
  letzteSanierung: string;
  jahresNettokaltmiete: string;
  potenzialMiete: string;
  nichtUmlagefaehig: string;
  instandhaltungsruecklage: string;
  maklerprovision: string;
  energieklasse: string;
  energiekennwert: string;
  denkmalschutz: boolean;
  erbbaurecht: boolean;
  eigentuemer: string;
  eigentuemerKontakt: string;
  quelle: string;
  /** Nur bei Wohnungen: klassischer ETW-Verkauf oder WG-Vermietung. */
  vertriebsweg: "etw" | "wg";
  wgZimmer: string;
  notiz: string;
  /** 48-Stunden-Uhr starten? Nur bei frischen Objekten sinnvoll. */
  fristStarten: boolean;
}

function z(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function s(v: string): string | null {
  return v.trim() === "" ? null : v.trim();
}

/** Wie viele dieser Felder sind ausgefüllt — Zählwert am zugeklappten Bereich. */
function zaehle(...werte: string[]): number {
  return werte.filter((w) => w.trim() !== "").length;
}

function leerZustand(): FormularZustand {
  return {
    strasse: "",
    plz: "",
    stadt: "Ulm",
    stadtteil: "",
    laenge: "",
    breite: "",
    objektart: "mfh",
    zustand: "vermietet",
    stufe: "beobachtung",
    kaufpreis: "",
    ankaufslimit: "",
    wohnflaeche: "",
    gewerbeflaeche: "",
    grundstuecksflaeche: "",
    anzahlEinheiten: "",
    baujahr: "",
    letzteSanierung: "",
    jahresNettokaltmiete: "",
    potenzialMiete: "",
    nichtUmlagefaehig: "",
    instandhaltungsruecklage: "",
    maklerprovision: "",
    energieklasse: "",
    energiekennwert: "",
    denkmalschutz: false,
    erbbaurecht: false,
    eigentuemer: "",
    eigentuemerKontakt: "",
    quelle: "",
    vertriebsweg: "etw",
    wgZimmer: "",
    notiz: "",
    fristStarten: true,
  };
}

function ausObjekt(o: Objekt): FormularZustand {
  const t = (v: number | null) => (v === null ? "" : String(v));
  return {
    strasse: o.strasse,
    plz: o.plz,
    stadt: o.stadt as Stadt,
    stadtteil: o.stadtteil,
    laenge: o.laenge.toFixed(5),
    breite: o.breite.toFixed(5),
    objektart: o.objektart,
    zustand: o.zustand,
    stufe: o.stufe,
    kaufpreis: t(o.kaufpreis),
    ankaufslimit: t(o.ankaufslimit),
    wohnflaeche: t(o.wohnflaeche),
    gewerbeflaeche: t(o.gewerbeflaeche),
    grundstuecksflaeche: t(o.grundstuecksflaeche),
    anzahlEinheiten: t(o.anzahlEinheiten),
    baujahr: t(o.baujahr),
    letzteSanierung: t(o.letzteSanierung),
    jahresNettokaltmiete: t(o.jahresNettokaltmiete),
    potenzialMiete: t(o.potenzialMiete),
    nichtUmlagefaehig: t(o.nichtUmlagefaehig),
    instandhaltungsruecklage: t(o.instandhaltungsruecklage),
    maklerprovision: t(o.maklerprovision),
    energieklasse: o.energieklasse ?? "",
    energiekennwert: t(o.energiekennwert),
    denkmalschutz: o.denkmalschutz,
    erbbaurecht: o.erbbaurecht,
    eigentuemer: o.eigentuemer ?? "",
    eigentuemerKontakt: o.eigentuemerKontakt ?? "",
    quelle: o.quelle ?? "",
    vertriebsweg: o.vertriebsweg ?? "etw",
    wgZimmer: t(o.wgZimmer ?? null),
    notiz: o.notiz ?? "",
    fristStarten: o.fristBis !== null,
  };
}

const ENERGIEKLASSEN = ["A+", "A", "B", "C", "D", "E", "F", "G", "H"];

const QUELLEN = [
  "Direktakquise Anschreiben",
  "Direktakquise Telefon",
  "Makler",
  "Portal ImmoScout",
  "Portal Immowelt",
  "Off-Market über Netzwerk",
  "Empfehlung",
  "Bieterverfahren",
  "Städtische Ausschreibung",
  "Insolvenzverwertung",
];

export function ObjektFormular({
  bestehend,
  onSpeichern,
  onAbbrechen,
}: {
  /** Gesetzt heißt: bearbeiten statt anlegen. */
  bestehend?: Objekt;
  onSpeichern: (entwurf: ObjektEntwurf, dokumente: NeuesDokument[]) => void;
  onAbbrechen: () => void;
}) {
  const [v, setV] = useState<FormularZustand>(() =>
    bestehend ? ausObjekt(bestehend) : leerZustand(),
  );
  const [bilder, setBilder] = useState<string[]>(bestehend?.bilder ?? []);
  const [dokumente, setDokumente] = useState<NeuesDokument[]>([]);
  const [geprueft, setGeprueft] = useState(false);
  // Beim Anlegen zuerst die Weggabelung: Wohnung, MFH oder KI-Exposé.
  // Beim Bearbeiten ist die Entscheidung längst gefallen.
  const [einstieg, setEinstieg] = useState(!bestehend);

  /** Ein Setter für alles — bei 30 Feldern ist alles andere Lärm. */
  function setze<K extends keyof FormularZustand>(feld: K, wert: FormularZustand[K]) {
    setV((alt) => ({ ...alt, [feld]: wert }));
  }

  const stadtteile = useMemo(() => stadtteileDerStadt(v.stadt), [v.stadt]);
  const bundesland = BUNDESLAND[v.stadt];

  const fehler = useMemo(() => {
    const m: Partial<Record<keyof FormularZustand, string>> = {};
    if (!v.strasse.trim()) m.strasse = "Straße und Hausnummer fehlen.";
    if (!/^\d{5}$/.test(v.plz.trim())) m.plz = "Fünfstellige Postleitzahl.";
    if (!v.stadtteil) m.stadtteil = "Stadtteil wählen.";
    const ln = z(v.laenge);
    const br = z(v.breite);
    if (ln === null || br === null) {
      m.laenge = "Punkt auf der Karte setzen.";
    } else if (ln < 9.7 || ln > 10.3 || br < 48.2 || br > 48.55) {
      m.laenge = "Der Punkt liegt außerhalb von Ulm und Neu-Ulm.";
    }
    return m;
  }, [v.strasse, v.plz, v.stadtteil, v.laenge, v.breite]);

  const gueltig = Object.keys(fehler).length === 0;

  /**
   * Probeobjekt für die Vorschau. Kein State, nur eine Ableitung — damit
   * Kennzahlen und gespeichertes Objekt garantiert dieselbe Rechnung sehen.
   */
  const entwurf = useMemo<ObjektEntwurf>(() => {
    const ln = z(v.laenge) ?? 9.99;
    const br = z(v.breite) ?? 48.4;
    return {
      laenge: ln,
      breite: br,
      // Umriss bleibt erhalten, wenn er schon mal aus der Karte kam.
      umriss: bestehend?.umriss ?? umrissAusMitte(ln, br),
      strasse: v.strasse.trim(),
      plz: v.plz.trim(),
      stadt: v.stadt,
      stadtteil: v.stadtteil,
      bundesland,
      objektart: v.objektart,
      zustand: v.zustand,
      stufe: v.stufe,
      kaufpreis: z(v.kaufpreis),
      ankaufslimit: z(v.ankaufslimit),
      wohnflaeche: z(v.wohnflaeche),
      gewerbeflaeche: z(v.gewerbeflaeche),
      grundstuecksflaeche: z(v.grundstuecksflaeche),
      anzahlEinheiten: z(v.anzahlEinheiten),
      baujahr: z(v.baujahr),
      letzteSanierung: z(v.letzteSanierung),
      jahresNettokaltmiete: z(v.jahresNettokaltmiete),
      potenzialMiete: z(v.potenzialMiete),
      nichtUmlagefaehig: z(v.nichtUmlagefaehig),
      instandhaltungsruecklage: z(v.instandhaltungsruecklage),
      maklerprovision: z(v.maklerprovision),
      energieklasse: s(v.energieklasse),
      energiekennwert: z(v.energiekennwert),
      denkmalschutz: v.denkmalschutz,
      erbbaurecht: v.erbbaurecht,
      eigentuemer: s(v.eigentuemer),
      eigentuemerKontakt: s(v.eigentuemerKontakt),
      quelle: s(v.quelle),
      vertriebsweg: v.objektart === "etw" ? v.vertriebsweg : null,
      wgZimmer:
        v.objektart === "etw" && v.vertriebsweg === "wg" ? z(v.wgZimmer) : null,
      notiz: s(v.notiz),
      bilder,
      // Angebotshistorie und Gewerkeliste werden im Detail gepflegt, nicht hier.
      angebote: bestehend?.angebote ?? [],
      sanierung: bestehend?.sanierung ?? [],
      fristBis: v.fristStarten
        ? new Date(Date.now() + 48 * 3_600_000).toISOString()
        : null,
    };
  }, [v, bilder, bundesland, bestehend]);

  function absenden(e: React.FormEvent) {
    e.preventDefault();
    setGeprueft(true);
    if (!gueltig) {
      document.getElementById("formular-lage")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    onSpeichern(entwurf, dokumente);
  }

  const zeig = (feld: keyof FormularZustand) => (geprueft ? fehler[feld] : undefined);

  if (einstieg) {
    return (
      <AnlegeEinstieg
        onWahl={(art) => {
          // Eine Wohnung ist genau eine Einheit — das Feld ist damit beantwortet.
          setV((alt) => ({
            ...alt,
            objektart: art,
            anzahlEinheiten: art === "etw" ? "1" : alt.anzahlEinheiten,
          }));
          setEinstieg(false);
        }}
        onAbbrechen={onAbbrechen}
      />
    );
  }

  return (
    <form onSubmit={absenden} className="flex min-h-full flex-col">
      {/* Nach der Weggabelung tritt die Maske weich ein statt hart umzuschalten.
          Die Maske öffnet vollflächig — der Inhalt bleibt als lesbare Spalte
          in der Mitte stehen. */}
      <div className="eintritt mx-auto w-full max-w-3xl flex-1">
        <div id="formular-lage" />

        <Bereich
          titel="Lage"
          hinweis="Die Stadt bestimmt das Bundesland und damit die Grunderwerbsteuer. Der Stadtteil verknüpft das Objekt mit der Karte."
        >
          <Textfeld
            id="strasse"
            label="Straße und Hausnummer"
            wert={v.strasse}
            setWert={(x) => setze("strasse", x)}
            platzhalter="Wagnerstraße 14"
            pflicht
            fehler={zeig("strasse")}
            breit
          />
          <Textfeld
            id="plz"
            label="Postleitzahl"
            wert={v.plz}
            setWert={(x) => setze("plz", x)}
            platzhalter="89077"
            pflicht
            fehler={zeig("plz")}
          />
          <Auswahlfeld
            id="stadt"
            label="Stadt"
            wert={v.stadt}
            setWert={(x) => {
              // Stadtteil gehört zur alten Stadt und wird mit ihr ungültig.
              setV((alt) => ({ ...alt, stadt: x, stadtteil: "" }));
            }}
            optionen={[
              { wert: "Ulm", titel: "Ulm" },
              { wert: "Neu-Ulm", titel: "Neu-Ulm" },
            ]}
            pflicht
            hinweis={`${BUNDESLAND_NAMEN[bundesland]} · ${f.prozent(GRUNDERWERBSTEUER[bundesland])} Grunderwerbsteuer`}
          />
          <Auswahlfeld
            id="stadtteil"
            label="Stadtteil"
            wert={v.stadtteil}
            setWert={(x) => setze("stadtteil", x)}
            optionen={stadtteile.map((t) => ({ wert: t.name, titel: t.name }))}
            leerText="— wählen —"
            pflicht
            fehler={zeig("stadtteil")}
            breit
          />
          {/* Keine Koordinatenfelder: sobald die Adresse vollständig ist, setzt
              das Geocoding den Punkt — nachjustieren geht auf der Minikarte. */}
          <PunktWaehler
            laenge={z(v.laenge)}
            breite={z(v.breite)}
            adresse={
              v.strasse.trim() && /^\d{5}$/.test(v.plz.trim())
                ? { strasse: v.strasse.trim(), plz: v.plz.trim(), stadt: v.stadt }
                : null
            }
            onSetzen={(ln, br) => {
              const treffer = stadtteilAnPunkt(ln, br);
              setV((alt) => ({
                ...alt,
                laenge: ln.toFixed(5),
                breite: br.toFixed(5),
                ...(treffer ? { stadt: treffer.stadt, stadtteil: treffer.name } : {}),
              }));
            }}
            fehler={zeig("laenge")}
          />
        </Bereich>

        <Bereich titel="Objekt" hinweis="Objektart und Zustand entsprechen dem Ankaufsprofil.">
          <Segmente
            label="Ankaufsstufe"
            wert={v.stufe}
            setWert={(x) => setze("stufe", x)}
            optionen={STUFEN_REIHENFOLGE.map((st) => ({ wert: st, titel: STUFEN[st].titel }))}
            breit
            hinweis="Bestimmt die Farbe auf der Karte."
          />
          <Auswahlfeld
            id="objektart"
            label="Objektart"
            wert={v.objektart}
            setWert={(x) => setze("objektart", x)}
            optionen={Object.entries(OBJEKTARTEN).map(([wert, titel]) => ({
              wert: wert as Objektart,
              titel,
            }))}
            pflicht
          />
          <Auswahlfeld
            id="zustand"
            label="Zustand"
            wert={v.zustand}
            setWert={(x) => setze("zustand", x)}
            optionen={Object.entries(ZUSTAENDE).map(([wert, titel]) => ({
              wert: wert as Zustand,
              titel,
            }))}
            pflicht
          />
          <Zahlfeld
            id="wohnflaeche"
            label="Wohnfläche"
            wert={v.wohnflaeche}
            setWert={(x) => setze("wohnflaeche", x)}
            einheit="m²"
            platzhalter="612"
          />
          <Zahlfeld
            id="anzahlEinheiten"
            label="Anzahl Einheiten"
            wert={v.anzahlEinheiten}
            setWert={(x) => setze("anzahlEinheiten", x)}
            platzhalter="8"
          />
          <Zahlfeld
            id="baujahr"
            label="Baujahr"
            wert={v.baujahr}
            setWert={(x) => setze("baujahr", x)}
            platzhalter="1958"
          />
          {/* Nach der Prüfung entscheidet Timo je Wohnung: klassischer
              ETW-Verkauf oder WG-Vermietung. Mietgarantie und WG-Verwaltung
              bekommen später einen eigenen Reiter. */}
          {v.objektart === "etw" && (
            <>
              <Segmente
                label="Vertrieb als"
                wert={v.vertriebsweg}
                setWert={(x) => setze("vertriebsweg", x)}
                optionen={[
                  { wert: "etw", titel: "ETW-Verkauf" },
                  { wert: "wg", titel: "WG-Vermietung" },
                ]}
                breit={v.vertriebsweg !== "wg"}
                hinweis="Entscheidung nach der Prüfung — lässt sich jederzeit ändern."
              />
              {v.vertriebsweg === "wg" && (
                <Zahlfeld
                  id="wgZimmer"
                  label="WG-Zimmer"
                  wert={v.wgZimmer}
                  setWert={(x) => setze("wgZimmer", x)}
                  platzhalter="4"
                  hinweis="Wie viele Zimmer einzeln vermietet werden."
                />
              )}
            </>
          )}
        </Bereich>

        {/* Drei Zahlen, keine Rechnung. Faktor, Rendite und Gesamtinvestition
            stehen im Objekt unter „Übersicht" und „Verkaufsplanung" — beim
            Anlegen kennt man den Kaufpreis und die Ist-Miete, alles andere
            wäre geraten und würde später als Wahrheit gelesen. */}
        <Bereich
          titel="Preis und Miete"
          hinweis="Was gefordert wird, was wir höchstens zahlen, was heute an Miete reinkommt."
        >
          <Zahlfeld
            id="kaufpreis"
            label="Kaufpreis"
            wert={v.kaufpreis}
            setWert={(x) => setze("kaufpreis", x)}
            einheit="€"
            platzhalter="1480000"
          />
          <Zahlfeld
            id="ankaufslimit"
            label="Ankaufslimit"
            wert={v.ankaufslimit}
            setWert={(x) => setze("ankaufslimit", x)}
            einheit="€"
            platzhalter="1425000"
            hinweis="Unser Höchstpreis. Liegt die Forderung darüber, gilt das Objekt als zu teuer."
          />
          <Zahlfeld
            id="jahresNettokaltmiete"
            label="Jahresnettokaltmiete"
            wert={v.jahresNettokaltmiete}
            setWert={(x) => setze("jahresNettokaltmiete", x)}
            einheit="€"
            platzhalter="68400"
            hinweis="Ist-Stand aus dem Exposé. Wunschmieten und Verkaufspreise kommen später in die Verkaufsplanung."
          />
          <Zahlfeld
            id="maklerprovision"
            label="Maklerprovision"
            wert={v.maklerprovision}
            setWert={(x) => setze("maklerprovision", x)}
            einheit="%"
            schritt="0.01"
            platzhalter="3.57"
            hinweis="0 bei Direktakquise."
          />
        </Bereich>

        {/* Offen, nicht zugeklappt: die Pipeline lebt vom Kontakt zu Makler
            und Eigentümer — der muss beim Anlegen direkt erfassbar sein. */}
        <Bereich
          titel="Eigentümer und Quelle"
          hinweis="Wer verkauft, wer vermittelt. Die KI übernimmt diese Angaben später direkt aus dem Exposé."
        >
          <Textfeld
            id="eigentuemer"
            label="Eigentümer"
            wert={v.eigentuemer}
            setWert={(x) => setze("eigentuemer", x)}
            platzhalter="Erbengemeinschaft Hofmann"
          />
          <Textfeld
            id="eigentuemerKontakt"
            label="Kontakt"
            wert={v.eigentuemerKontakt}
            setWert={(x) => setze("eigentuemerKontakt", x)}
            platzhalter="RA Dr. Keller · 0731 55 44 21"
            hinweis="Makler oder Eigentümer — Name, Telefon, E-Mail."
          />
          <Auswahlfeld
            id="quelle"
            label="Quelle"
            wert={v.quelle}
            setWert={(x) => setze("quelle", x)}
            optionen={QUELLEN.map((q) => ({ wert: q, titel: q }))}
            leerText="— keine Angabe —"
            breit
          />
        </Bereich>

        <Bereich titel="Bilder" spalten={1}>
          <Bilderfeld bilder={bilder} setBilder={setBilder} />
        </Bereich>

        <Bereich titel="Notiz und Frist" spalten={1}>
          <Textfeld
            id="notiz"
            label="Interne Notiz"
            wert={v.notiz}
            setWert={(x) => setze("notiz", x)}
            zeilen={4}
            platzhalter="Was ist der Hebel? Was ist das Risiko? Was ist der nächste Schritt?"
          />
          <Schalter
            label="48-Stunden-Prüffrist starten"
            hinweis="Revest verspricht eine verbindliche Prüfung binnen zwei Tagen. Die Uhr läuft dann in Liste und Karte sichtbar mit."
            an={v.fristStarten}
            setAn={(x) => setze("fristStarten", x)}
          />
        </Bereich>

        {/*
          Ab hier nur noch Nachträge. Beim Anlegen eines Objekts weiß Timo den
          Energiekennwert selten und die Hausverwaltungsunterlagen hat er noch
          nicht — zugeklappt bleibt die Maske ein kurzes Formular, verliert aber
          kein Feld.
        */}
        <Klappbereich
          titel="Weitere Flächen und Gebäude"
          hinweis="Gewerbe, Grundstück, Sanierungsstand, Rechte"
          gefuellt={zaehle(v.gewerbeflaeche, v.grundstuecksflaeche, v.letzteSanierung)}
        >
          <Zahlfeld
            id="gewerbeflaeche"
            label="Gewerbefläche"
            wert={v.gewerbeflaeche}
            setWert={(x) => setze("gewerbeflaeche", x)}
            einheit="m²"
            platzhalter="0"
          />
          <Zahlfeld
            id="grundstuecksflaeche"
            label="Grundstück"
            wert={v.grundstuecksflaeche}
            setWert={(x) => setze("grundstuecksflaeche", x)}
            einheit="m²"
            platzhalter="486"
          />
          <Zahlfeld
            id="letzteSanierung"
            label="Letzte Sanierung"
            wert={v.letzteSanierung}
            setWert={(x) => setze("letzteSanierung", x)}
            platzhalter="1994"
          />
          <Auswahlfeld
            id="energieklasse"
            label="Energieklasse"
            wert={v.energieklasse}
            setWert={(x) => setze("energieklasse", x)}
            optionen={ENERGIEKLASSEN.map((k) => ({ wert: k, titel: k }))}
            leerText="— unbekannt —"
          />
          <Zahlfeld
            id="energiekennwert"
            label="Energiekennwert"
            wert={v.energiekennwert}
            setWert={(x) => setze("energiekennwert", x)}
            einheit="kWh"
            platzhalter="182"
          />
          <Schalter
            label="Denkmalschutz"
            hinweis="Erhöhte Abschreibung nach §7i EStG möglich"
            an={v.denkmalschutz}
            setAn={(x) => setze("denkmalschutz", x)}
          />
          <Schalter
            label="Erbbaurecht"
            hinweis="Erbbauzins drückt die Rendite und erschwert die Aufteilung"
            an={v.erbbaurecht}
            setAn={(x) => setze("erbbaurecht", x)}
          />
        </Klappbereich>

        {/*
          Nur beim Bearbeiten. Potenzialmiete und laufende Kosten stehen in
          keinem Exposé — sie entstehen, wenn das Objekt schon geprüft wird.
          Beim Anlegen wären es vier Felder, die niemand füllen kann.
        */}
        {bestehend && (
          <Klappbereich
            titel="Laufende Kosten und Potenzial"
            hinweis="Potenzialmiete, nicht umlagefähige Kosten, Rücklage"
            gefuellt={zaehle(v.potenzialMiete, v.nichtUmlagefaehig, v.instandhaltungsruecklage)}
          >
            <Zahlfeld
              id="potenzialMiete"
              label="Potenzialmiete"
              wert={v.potenzialMiete}
              setWert={(x) => setze("potenzialMiete", x)}
              einheit="€"
              platzhalter="101000"
              hinweis="Nach Sanierung und Neuvermietung."
            />
            <Zahlfeld
              id="nichtUmlagefaehig"
              label="Nicht umlagefähige Kosten"
              wert={v.nichtUmlagefaehig}
              setWert={(x) => setze("nichtUmlagefaehig", x)}
              einheit="€"
              platzhalter="7200"
              hinweis="Verwaltung, Instandhaltung, Mietausfallwagnis."
            />
            <Zahlfeld
              id="instandhaltungsruecklage"
              label="Instandhaltungsrücklage"
              wert={v.instandhaltungsruecklage}
              setWert={(x) => setze("instandhaltungsruecklage", x)}
              einheit="€"
              platzhalter="0"
            />
          </Klappbereich>
        )}

        <Klappbereich
          titel="Unterlagen"
          hinweis="Zehn feste Ordner — später genauso im Google Drive. Hausverwaltungsunterlagen in Ordner 06."
          gefuellt={dokumente.length}
          spalten={1}
        >
          <Dokumentenfeld dokumente={dokumente} setDokumente={setDokumente} />
        </Klappbereich>
      </div>

      <Fussleiste
        gueltig={gueltig}
        geprueft={geprueft}
        anzahlFehler={Object.keys(fehler).length}
        bearbeiten={Boolean(bestehend)}
        onAbbrechen={onAbbrechen}
      />
    </form>
  );
}

/**
 * Nur Aktionen.
 *
 * Hier stand eine mitlaufende Kennzahlenleiste mit Faktor, Rendite und
 * Gesamtinvestition. Sie ist weg: beim Anlegen ist noch nichts geprüft, und
 * eine Rendite neben leeren Feldern lädt dazu ein, die erste Zahl zu glauben.
 * Gerechnet wird im Objekt — unter „Übersicht" mit dem Ist-Stand, unter
 * „Verkaufsplanung" mit den Wunschwerten.
 */
function Fussleiste({
  gueltig,
  geprueft,
  anzahlFehler,
  bearbeiten,
  onAbbrechen,
}: {
  gueltig: boolean;
  geprueft: boolean;
  anzahlFehler: number;
  bearbeiten: boolean;
  onAbbrechen: () => void;
}) {
  return (
    <div className="sticky bottom-0 border-t border-linie bg-flaeche/97 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-end gap-3 px-6 py-4 md:px-10">
        {geprueft && !gueltig && (
          <span className="mr-auto flex items-center gap-2 text-[0.72rem] text-tinte">
            <AlertCircle size={14} strokeWidth={2} />
            {anzahlFehler === 1 ? "Ein Pflichtfeld fehlt" : `${anzahlFehler} Pflichtfelder fehlen`}
          </span>
        )}
        <button
          type="button"
          onClick={onAbbrechen}
          className="druckbar rounded-full px-4 py-3 text-[0.68rem] font-medium tracking-[0.16em] uppercase text-grau hover:text-tinte"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="druckbar rounded-full bg-tinte px-6 py-3 text-[0.68rem] font-semibold tracking-[0.16em] uppercase text-grund shadow-karte hover:bg-grau-stark"
        >
          {bearbeiten ? "Änderungen speichern" : "Objekt anlegen"}
        </button>
      </div>
    </div>
  );
}
