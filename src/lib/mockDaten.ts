/**
 * Mock-Datenbestand für Phase 1.
 *
 * Alles hier ist erfunden, aber plausibel: echte Stadtteile von Ulm und
 * Neu-Ulm, echte Straßennamen, Kaufpreise und Mieten im Rahmen des Marktes.
 * Die Koordinaten liegen bewusst innerhalb der jeweiligen Stadtteilgrenze,
 * damit die Zuordnung auf der Karte aufgeht.
 *
 * Bildfelder enthalten keine Dateien, sondern Beschriftungen. Die Galerie
 * rendert daraus einen Platzhalter — lädt aber echte Uploads (blob:/data:)
 * ganz normal als Bild. So funktioniert dieselbe Komponente in Phase 2.
 */
import type {
  Angebot,
  Dokument,
  Einheit,
  Objekt,
  Sanierungsposten,
  Verlaufseintrag,
} from "./objekte";
import { umrissAusMitte } from "./objekte";

/** Fester Bezugszeitpunkt, damit Fristen und Verlauf reproduzierbar bleiben. */
export const JETZT = new Date("2026-10-20T09:30:00+02:00");

function stunden(anzahl: number): string {
  return new Date(JETZT.getTime() + anzahl * 3_600_000).toISOString();
}

function tage(anzahl: number): string {
  return new Date(JETZT.getTime() + anzahl * 86_400_000).toISOString();
}

let laufendeNummer = 0;
function dok(name: string, ordner: string, groesseKb: number, vorTagen: number): Dokument {
  laufendeNummer += 1;
  return {
    id: `d${laufendeNummer}`,
    name,
    ordner,
    groesseKb,
    hochgeladenAm: tage(-vorTagen),
  };
}

function ev(vorTagen: number, art: Verlaufseintrag["art"], text: string): Verlaufseintrag {
  laufendeNummer += 1;
  return { id: `v${laufendeNummer}`, zeitpunkt: tage(-vorTagen), art, text };
}

/**
 * Baut eine Etagenaufteilung. Spart in den Mock-Daten gut 200 Zeilen und
 * macht die Verteilung der Status sichtbar statt sie zu verstecken.
 */
function einheiten(
  praefix: string,
  zeilen: [geschoss: string, lage: string, qm: number, zimmer: number, miete: number | null, status: Einheit["status"], kaeufer?: string, preis?: number][],
): Einheit[] {
  return zeilen.map(([geschoss, lage, qm, zimmer, miete, status, kaeufer, preis], i) => ({
    id: `${praefix}-${i + 1}`,
    bezeichnung: `WE ${i + 1} · ${lage}`,
    geschoss,
    wohnflaeche: qm,
    zimmer,
    kaltmiete: miete,
    status,
    kaeufer: kaeufer ?? null,
    verkaufspreis: preis ?? null,
  }));
}

/**
 * Preisgeschichte. Jede Zeile ist eine Preisnennung mit Ausgang — genau das,
 * was beim Wiederauftauchen eines Objekts in zwei Jahren zählt.
 */
function ang(
  praefix: string,
  zeilen: [
    vorTagen: number,
    art: Angebot["art"],
    preis: number,
    quelle: string | null,
    ergebnis: Angebot["ergebnis"],
    notiz?: string,
  ][],
): Angebot[] {
  return zeilen.map(([vorTagen, art, preis, quelle, ergebnis, notiz], i) => ({
    id: `${praefix}-a${i + 1}`,
    datum: tage(-vorTagen),
    art,
    preis,
    quelle,
    ergebnis,
    notiz: notiz ?? null,
  }));
}

/** Gewerkeliste. `null` bei tatsaechlich heißt: noch keine Rechnung da. */
function san(
  praefix: string,
  zeilen: [
    gewerk: Sanierungsposten["gewerk"],
    geplant: number | null,
    tatsaechlich: number | null,
    firma: string | null,
    status: Sanierungsposten["status"],
    notiz?: string,
  ][],
): Sanierungsposten[] {
  return zeilen.map(([gewerk, geplant, tatsaechlich, firma, status, notiz], i) => ({
    id: `${praefix}-s${i + 1}`,
    gewerk,
    geplant,
    tatsaechlich,
    firma,
    status,
    notiz: notiz ?? null,
  }));
}

export const MOCK_OBJEKTE: Objekt[] = [
  {
    id: "obj-001",
    laenge: 10.00425,
    breite: 48.39823,
    umriss: umrissAusMitte(10.00425, 48.39823, 26, 15, 12),
    strasse: "Brückenstraße 2",
    plz: "89231",
    stadt: "Neu-Ulm",
    stadtteil: "Stadtmitte",
    bundesland: "BY",
    objektart: "mfh",
    zustand: "sanierungsbedarf",
    stufe: "angekauft",
    kaufpreis: 1_480_000,
    ankaufslimit: 1_525_000,
    wohnflaeche: 612,
    gewerbeflaeche: 214,
    grundstuecksflaeche: 486,
    anzahlEinheiten: 10,
    baujahr: 1958,
    letzteSanierung: 1994,
    jahresNettokaltmiete: 68_400,
    potenzialMiete: 101_000,
    nichtUmlagefaehig: 7_200,
    instandhaltungsruecklage: 0,
    maklerprovision: 3.57,
    energieklasse: "F",
    energiekennwert: 182,
    denkmalschutz: false,
    erbbaurecht: false,
    eigentuemer: "Erbengemeinschaft Hofmann",
    eigentuemerKontakt: "RA Dr. Keller · 0731 55 44 21",
    quelle: "Direktakquise Anschreiben",
    notiz:
      "Acht Wohneinheiten plus zwei Büroeinheiten, direkt an der Donau. Dach 2021 neu, Fenster und Stränge müssen raus. Aufteilung nach WEG ist beim Notar beurkundet.",
    bilder: ["Straßenansicht", "Hofseite", "Treppenhaus", "WE 3 Wohnzimmer", "Dachgeschoss"],
    dokumente: [
      dok("Expose_Brueckenstrasse_2.pdf", "01_expose", 4_280, 412),
      dok("Grundbuchauszug_Neu-Ulm_Blatt_4412.pdf", "02_grundbuch", 860, 398),
      dok("Teilungserklaerung_WEG.pdf", "02_grundbuch", 2_140, 196),
      dok("Kaufvertrag_beurkundet_2025-10-14.pdf", "03_kaufvertrag", 3_610, 371),
      dok("Grundrisse_EG_bis_DG.pdf", "04_plaene", 9_820, 402),
      dok("Mieterliste_Stand_10_2026.xlsx", "05_miete", 96, 12),
      dok("Mietvertrag_WE3_Brandner.pdf", "05_miete", 1_240, 364),
      dok("WEG_Protokoll_Erstversammlung.pdf", "06_hausverwaltung", 540, 188),
      dok("Wirtschaftsplan_2026.pdf", "06_hausverwaltung", 410, 174),
      dok("Verwaltervertrag_Haus_und_Grund.pdf", "06_hausverwaltung", 780, 190),
      dok("Energieausweis_Verbrauch.pdf", "07_energie", 1_120, 405),
      dok("Angebot_Strangsanierung_Mayer.pdf", "08_sanierung", 2_480, 96),
      dok("Baufortschritt_KW41.pdf", "08_sanierung", 6_340, 6),
    ],
    einheiten: [
      ...einheiten("e001", [
        ["EG", "links", 58, 2, 462, "verkauft", "M. Scheible", 289_000],
        ["EG", "rechts", 74, 3, 598, "verkauft", "Fam. Özdemir", 362_000],
        ["1. OG", "links", 76, 3, 610, "reserviert", "T. Wagner", 374_000],
        ["1. OG", "rechts", 74, 3, 540, "im_vertrieb", undefined, 368_000],
        ["2. OG", "links", 76, 3, 592, "im_vertrieb", undefined, 371_000],
        ["2. OG", "rechts", 74, 3, 0, "in_sanierung"],
        ["3. OG", "links", 92, 4, 0, "in_sanierung"],
        ["DG", "Ausbau", 88, 3, null, "geplant"],
      ]),
      {
        id: "e001-g1",
        bezeichnung: "GE 1 · Büro",
        geschoss: "EG",
        wohnflaeche: 118,
        zimmer: 0,
        kaltmiete: 1_540,
        status: "eigenbestand",
        kaeufer: null,
        verkaufspreis: null,
      },
      {
        id: "e001-g2",
        bezeichnung: "GE 2 · Büro",
        geschoss: "1. OG",
        wohnflaeche: 96,
        zimmer: 0,
        kaltmiete: 1_210,
        status: "eigenbestand",
        kaeufer: null,
        verkaufspreis: null,
      },
    ],
    angebote: ang("obj-001", [
      [520, "forderung", 1_685_000, "Immobilien Sauter", "zu_teuer", "Erstaufruf. 4.210 €/m² — über unserem Limit."],
      [486, "gebot", 1_390_000, "Revest", "abgelehnt", "Erstes Gebot nach Besichtigung."],
      [448, "forderung", 1_555_000, "Immobilien Sauter", "abgelehnt", "Verkäufer reduziert nach acht Wochen ohne Abschluss."],
      [430, "gebot", 1_480_000, "Revest", "angenommen", "Einigung nach Prüfung der Mieterliste."],
      [412, "notarpreis", 1_480_000, "Notariat Dr. Vogt, Ulm", "angenommen", "Beurkundet."],
    ]),
    sanierung: san("obj-001", [
      ["abbruch", 28_500, 30_700, "Rückbau Donautal GmbH", "abgenommen"],
      ["rohbau", 23_500, 26_800, "Bauunternehmung Steinle", "abgenommen"],
      ["dach", 42_500, 40_200, "Bedachung Riedmüller", "abgenommen"],
      ["fassade", 56_500, 54_300, "Fassadenbau Kern & Sohn", "abgenommen"],
      ["fenster", 47_000, 53_000, "Fensterbau Aigner", "abgenommen"],
      ["elektro", 42_500, 44_700, "Elektro Mayer Ulm", "abgenommen"],
      ["sanitaer", 33_000, 33_900, "Haustechnik Brunner", "abgenommen"],
      ["heizung", 38_000, 37_400, "Haustechnik Brunner", "abgenommen"],
      ["trockenbau", 23_500, 24_800, "Trockenbau Özdemir", "abgenommen"],
      ["estrich", 14_000, 8_100, "Estrich Wieland", "laufend"],
      ["fliesen", 19_000, null, "Fliesen Scheible", "beauftragt"],
      ["boden", 23_500, null, "Raumausstattung Hirsch", "ausgeschrieben"],
      ["maler", 19_000, null, "Malerbetrieb Gaugler", "offen"],
      ["tueren", 19_000, null, "Schreinerei Lutz", "offen"],
      ["aussenanlagen", 14_000, null, "Garten- & Landschaftsbau Weiß", "offen"],
      ["baunebenkosten", 19_000, null, "Architekturbüro Haller", "offen"],
      ["unvorhergesehen", 9_500, null, null, "offen"],
    ]),
    verlauf: [
      ev(438, "anlage", "Objekt angelegt — Anschreiben an Eigentümer raus"),
      ev(430, "status", "Stufe auf Kontakt gesetzt · Rückruf RA Keller"),
      ev(421, "status", "Stufe auf Prüfung gesetzt"),
      ev(412, "dokument", "Exposé und Grundbuchauszug hinterlegt"),
      ev(396, "status", "Stufe auf Verhandlung gesetzt · 1,62 Mio geboten"),
      ev(380, "notiz", "Nachverhandlung über Strangsanierung: −140.000 €"),
      ev(371, "status", "Angekauft — Beurkundung bei Notar Dr. Steinle"),
      ev(196, "dokument", "Teilungserklärung nach WEG hinterlegt"),
      ev(188, "notiz", "Erstversammlung WEG, Verwalter bestellt"),
      ev(96, "dokument", "Angebot Strangsanierung eingegangen"),
      ev(42, "notiz", "WE 1 und WE 2 notariell verkauft, Übergabe erfolgt"),
      ev(6, "dokument", "Baufortschritt KW 41 dokumentiert"),
    ],
    angelegtAm: tage(-438),
    fristBis: null,
  },
  {
    id: "obj-018",
    laenge: 9.96821,
    breite: 48.35096,
    umriss: umrissAusMitte(9.96821, 48.35096, 17, 11, 12),
    strasse: "Ravensburger Straße 134",
    plz: "89079",
    stadt: "Ulm",
    stadtteil: "Wiblingen",
    bundesland: "BW",
    objektart: "etw",
    zustand: "leerstand",
    stufe: "beobachtung",
    kaufpreis: 318_000,
    ankaufslimit: 275_000,
    wohnflaeche: 94,
    gewerbeflaeche: null,
    grundstuecksflaeche: null,
    anzahlEinheiten: 1,
    baujahr: 1998,
    letzteSanierung: null,
    jahresNettokaltmiete: 0,
    potenzialMiete: 11_800,
    nichtUmlagefaehig: 1_400,
    instandhaltungsruecklage: 4_200,
    maklerprovision: 3.57,
    energieklasse: "C",
    energiekennwert: 98,
    denkmalschutz: false,
    erbbaurecht: false,
    eigentuemer: "unbekannt",
    eigentuemerKontakt: null,
    quelle: "Portal Immowelt",
    vertriebsweg: "etw",
    notiz: "Einzelne ETW in Wiblingen, klassischer Weiterverkauf nach Renovierung. Niedrige Priorität.",
    bilder: ["Portalbild Wohnzimmer"],
    dokumente: [dok("Portalexpose_Ravensburger_134.pdf", "01_expose", 1_240, 22)],
    einheiten: [],
    angebote: ang("obj-018", [
      [16, "forderung", 318_000, "Makler Engel & Partner", "zu_teuer", "Deutlich über unserem Ankaufslimit — beobachten, ob der Preis fällt."],
    ]),
    sanierung: [],
    verlauf: [
      ev(24, "anlage", "Objekt angelegt — Portalfund"),
      ev(22, "dokument", "Portalexposé hinterlegt"),
    ],
    angelegtAm: tage(-24),
    fristBis: null,
  },
  {
    id: "obj-013",
    laenge: 9.9687,
    breite: 48.39441,
    umriss: umrissAusMitte(9.9687, 48.39441, 18, 12, 24),
    strasse: "Wagnerstraße 121",
    plz: "89077",
    stadt: "Ulm",
    stadtteil: "Weststadt",
    bundesland: "BW",
    objektart: "etw",
    zustand: "leerstand",
    stufe: "beobachtung",
    kaufpreis: 385_000,
    ankaufslimit: 352_000,
    wohnflaeche: 104,
    gewerbeflaeche: null,
    grundstuecksflaeche: null,
    anzahlEinheiten: 1,
    baujahr: 1962,
    letzteSanierung: 1998,
    jahresNettokaltmiete: 0,
    potenzialMiete: 21_600,
    nichtUmlagefaehig: 1_600,
    instandhaltungsruecklage: 5_200,
    maklerprovision: 3.57,
    energieklasse: "E",
    energiekennwert: 142,
    denkmalschutz: false,
    erbbaurecht: false,
    eigentuemer: "unbekannt",
    eigentuemerKontakt: null,
    quelle: "Portal ImmoScout",
    vertriebsweg: "wg",
    wgZimmer: 4,
    notiz:
      "4-Zimmer-Wohnung in der Weststadt, ideal geschnitten für WG-Vermietung an Studierende — vier gleich große Zimmer, zwei Bäder. Leerstand, Renovierung überschaubar.",
    bilder: ["Portalbild Wohnzimmer"],
    dokumente: [dok("Portalexpose_Wagnerstrasse_121.pdf", "01_expose", 2_640, 118)],
    einheiten: [],
    angebote: ang("obj-013", [
      [16, "forderung", 385_000, "Immobilien Sauter", "offen", "Preis aus dem Inserat, noch nicht verhandelt."],
    ]),
    sanierung: [],
    verlauf: [
      ev(124, "anlage", "Objekt angelegt — Portalfund"),
      ev(118, "dokument", "Portalexposé hinterlegt"),
      ev(28, "notiz", "Als WG-Vermietung kalkuliert: 4 Zimmer × 450 € kalt"),
    ],
    angelegtAm: tage(-124),
    fristBis: null,
  },
  {
    id: "obj-011",
    laenge: 9.95525,
    breite: 48.41199,
    umriss: umrissAusMitte(9.95525, 48.41199, 16, 12, -22),
    strasse: "Traminerweg 16",
    plz: "89075",
    stadt: "Ulm",
    stadtteil: "Eselsberg",
    bundesland: "BW",
    objektart: "etw",
    zustand: "vermietet",
    stufe: "kontakt",
    kaufpreis: 445_000,
    ankaufslimit: 405_000,
    wohnflaeche: 132,
    gewerbeflaeche: null,
    grundstuecksflaeche: null,
    anzahlEinheiten: 1,
    baujahr: 1983,
    letzteSanierung: 2014,
    jahresNettokaltmiete: 27_000,
    potenzialMiete: 30_600,
    nichtUmlagefaehig: 2_100,
    instandhaltungsruecklage: 7_800,
    maklerprovision: 2.38,
    energieklasse: "D",
    energiekennwert: 121,
    denkmalschutz: false,
    erbbaurecht: false,
    eigentuemer: "Hausgemeinschaft Traminerweg GbR",
    eigentuemerKontakt: "Verwalter Schäufele · 0731 46 02 71",
    quelle: "Makler Keller & Partner",
    vertriebsweg: "wg",
    wgZimmer: 5,
    notiz:
      "Große 5-Zimmer-Wohnung am Eselsberg, läuft bereits als Studenten-WG — fünf Zimmer vermietet, Nähe Uni und Science Park. WG-Vermietung einfach fortführen.",
    bilder: ["Straßenansicht", "WG-Küche"],
    dokumente: [
      dok("Kurzexpose_Traminerweg.pdf", "01_expose", 1_840, 16),
      dok("Mietaufstellung_WG_Zimmer.xlsx", "05_miete", 64, 14),
    ],
    einheiten: [],
    angebote: ang("obj-011", [
      [21, "forderung", 445_000, "Hausverwaltung Dietrich", "offen", "Preisvorstellung im Erstgespräch genannt."],
    ]),
    sanierung: san("obj-011", [
      ["sanitaer", 18_000, null, null, "offen"],
      ["elektro", 9_500, null, null, "offen"],
      ["maler", 6_500, null, null, "offen"],
    ]),
    verlauf: [
      ev(18, "anlage", "Objekt angelegt — Kurzexposé Keller & Partner"),
      ev(16, "status", "Stufe auf Kontakt gesetzt"),
      ev(9, "notiz", "WG läuft: 5 Zimmer, zusammen 2.250 € kalt im Monat"),
    ],
    angelegtAm: tage(-18),
    fristBis: null,
  },
];
