/**
 * Mock-Datenbestand für Phase 1.
 *
 * Alles hier ist erfunden, aber plausibel: echte Stadtteile von Ulm und
 * Neu-Ulm, Kaufpreise und Mieten im Rahmen des Marktes. Namen, Kontakte,
 * Straßen und genaue Lagen sind ausgedacht — das Repo darf keine echten
 * Objekte oder Personen verraten. Die Koordinaten liegen bewusst innerhalb
 * der jeweiligen Stadtteilgrenze, damit die Zuordnung auf der Karte aufgeht.
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
import { UMMELDEARTEN, type Ummeldung } from "./ummeldungen";

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
    kaeuferKontakt: null,
    verkaufspreis: preis ?? null,
    verkauftAm: status === "verkauft" ? tage(-60) : null,
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

/**
 * Ummeldungen in Kurzform: je Art Status und was sonst bekannt ist. Nicht
 * genannte Arten stehen auf „offen“.
 */
function um(
  praefix: string,
  richtung: Ummeldung["richtung"],
  einheitId: string | null,
  bekannt: Partial<Record<Ummeldung["art"], Partial<Ummeldung>>>,
): Ummeldung[] {
  return UMMELDEARTEN.map(({ art }) => ({
    id: `${praefix}-${art}`,
    art,
    richtung,
    einheitId,
    status: "offen" as const,
    ...bekannt[art],
  }));
}

export const MOCK_OBJEKTE: Objekt[] = [
  {
    id: "obj-001",
    laenge: 10.00725,
    breite: 48.39643,
    umriss: umrissAusMitte(10.00725, 48.39643, 26, 15, 12),
    bezeichnung: "MFH – 10 Einheiten – Neu-Ulm",
    strasse: "Fährgasse 6",
    kurznotiz: "Strangsanierung läuft, DG-Ausbau noch offen",
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
    // Das einzige Objekt, das den Deal hinter sich hat: sechs Wohnungen gehen
    // in den Vertrieb, vier bleiben als WG im Bestand, die Teilung läuft.
    angekauftAm: "2026-04-17",
    besitzuebergangAm: "2026-06-01",
    ummeldungen: [
      ...um("um-obj-001", "an", null, {
        hausverwaltung: { status: "bestaetigt", anbieter: "Hausverwaltung Nordlicht", gemeldetAm: "2026-06-02", bestaetigtAm: "2026-06-09" },
        gas: { status: "gemeldet", anbieter: "Stadtwerke, Kundenservice", zaehlernummer: "G 4471-208", zaehlerstand: "18.402 m³", gemeldetAm: "2026-06-03", notiz: "Bestätigung trotz zweimal Nachfragen nicht da" },
        strom: { status: "bestaetigt", anbieter: "Stadtwerke", zaehlernummer: "1ESY1160-7720", zaehlerstand: "52.118 kWh", gemeldetAm: "2026-06-03", bestaetigtAm: "2026-06-20" },
        versicherung: { status: "bestaetigt", anbieter: "Gebäudeversicherung, Police 77-120", gemeldetAm: "2026-05-28", bestaetigtAm: "2026-06-01" },
        schornsteinfeger: { status: "gemeldet", gemeldetAm: "2026-10-30" },
        grundbesitzabgaben: { status: "bestaetigt", anbieter: "Stadt Neu-Ulm, Steueramt", gemeldetAm: "2026-06-05", bestaetigtAm: "2026-07-14" },
      }),
      ...um("ab-e001-1", "ab", "e001-1", {
        hausverwaltung: { status: "bestaetigt", gemeldetAm: "2026-08-25", bestaetigtAm: "2026-09-02" },
        strom: { status: "bestaetigt", zaehlerstand: "8.204 kWh", gemeldetAm: "2026-08-25", bestaetigtAm: "2026-09-10" },
        gas: { status: "entfaellt", notiz: "Wohnung hat keinen eigenen Gaszähler" },
        versicherung: { status: "entfaellt" },
        schornsteinfeger: { status: "entfaellt" },
        grundbesitzabgaben: { status: "gemeldet", gemeldetAm: "2026-08-26" },
      }),
    ],
    kuerzel: "FAH6",
    gesellschaft: "revest_projekt",
    driveOrdnerUrl: null,
    aufteilung: { etw: 6, wg: 4 },
    teilung: {
      gestartetAm: "2026-04-24",
      status: "beim_amt",
      notar: "Notariat Dr. Winterberg, Ulm",
      einheiten: 10,
      erwartetAm: "2026-12-15",
      notiz:
        "Abgeschlossenheitsbescheinigung liegt seit Juli vor. Grundbuchamt Neu-Ulm nennt derzeit vier bis fünf Monate.",
    },
    kontakte: [
      {
        id: "kon-001-1",
        rolle: "eigentuemer",
        name: "Erbengemeinschaft Lorenzen",
        telefon: null,
        email: null,
        notiz: "Vier Erben, entscheiden nur gemeinsam. Alles läuft über RA Dr. Albrecht.",
      },
      {
        id: "kon-001-2",
        rolle: "sonst",
        name: "RA Dr. Albrecht",
        telefon: "0731 0000001",
        email: "albrecht@kanzlei.beispiel.de",
        notiz: "Vertritt die Erbengemeinschaft. Erreichbar vormittags.",
      },
      {
        id: "kon-001-3",
        rolle: "notar",
        name: "Notariat Dr. Winterberg, Ulm",
        telefon: "0731 0000002",
        email: null,
        notiz: "Hat die WEG-Aufteilung beurkundet.",
      },
    ],
    quelle: "Direktakquise Anschreiben",
    notiz:
      "Acht Wohneinheiten plus zwei Büroeinheiten, direkt an der Donau. Dach 2021 neu, Fenster und Stränge müssen raus. Aufteilung nach WEG ist beim Notar beurkundet.",
    bilder: ["Straßenansicht", "Hofseite", "Treppenhaus", "WE 3 Wohnzimmer", "Dachgeschoss"],
    dokumente: [
      dok("Expose_Faehrgasse_6.pdf", "01_Unterlagen/01_Unterlagen zum Objekt", 4_280, 412),
      dok("Grundbuchauszug_Neu-Ulm_Blatt_0000.pdf", "01_Unterlagen/03_Notar_Grundbuchsachen", 860, 398),
      dok("Teilungserklaerung_WEG.pdf", "01_Unterlagen/03_Notar_Grundbuchsachen", 2_140, 196),
      dok("Kaufvertrag_beurkundet_2025-10-14.pdf", "01_Unterlagen/03_Notar_Grundbuchsachen", 3_610, 371),
      dok("Grundrisse_EG_bis_DG.pdf", "01_Unterlagen/01_Unterlagen zum Objekt", 9_820, 402),
      dok("Mieterliste_Stand_10_2026.xlsx", "01_Unterlagen/01_Unterlagen zum Objekt", 96, 12),
      dok("Mietvertrag_WE3_Ebert.pdf", "01_Unterlagen/01_Unterlagen zum Objekt", 1_240, 364),
      dok("WEG_Protokoll_Erstversammlung.pdf", "01_Unterlagen/02_Bewirtschaftung/00_Hausverwaltung", 540, 188),
      dok("Wirtschaftsplan_2026.pdf", "01_Unterlagen/02_Bewirtschaftung/00_Hausverwaltung", 410, 174),
      dok("Verwaltervertrag_Haus_und_Grund.pdf", "01_Unterlagen/02_Bewirtschaftung/00_Hausverwaltung", 780, 190),
      dok("Energieausweis_Verbrauch.pdf", "01_Unterlagen/01_Unterlagen zum Objekt", 1_120, 405),
      dok("Angebot_Strangsanierung_Seifert.pdf", "03_Renovierung", 2_480, 96),
      dok("Baufortschritt_KW41.pdf", "03_Renovierung", 6_340, 6),
      dok("Ankaufskalkulation_Faehrgasse_6.xlsx", "02_Kalkulation", 148, 400),
      dok("Gebaeudeversicherung_Police_2026.pdf", "01_Unterlagen/02_Bewirtschaftung/04_Versicherung", 320, 170),
      dok("Treppenhaus_vor_Renovierung.jpg", "04_Bilder/01_Ankauf - vor Renovierung", 3_870, 410),
      dok("Strangsanierung_KW38.jpg", "04_Bilder/02_Renovierungsphase", 4_120, 30),
    ],
    einheiten: [
      ...einheiten("e001", [
        ["EG", "links", 58, 2, 462, "verkauft", "M. Ahrens", 289_000],
        ["EG", "rechts", 74, 3, 598, "verkauft", "Fam. Petersen", 362_000],
        ["1. OG", "links", 76, 3, 610, "reserviert", "T. Hollmann", 374_000],
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
        kaeuferKontakt: null,
        verkaufspreis: null,
        verkauftAm: null,
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
        kaeuferKontakt: null,
        verkaufspreis: null,
        verkauftAm: null,
      },
    ],
    angebote: ang("obj-001", [
      [520, "forderung", 1_685_000, "Immobilien Morgentau", "zu_teuer", "Erstaufruf. 4.210 €/m² — über unserem Limit."],
      [486, "gebot", 1_390_000, "Revest", "abgelehnt", "Erstes Gebot nach Besichtigung."],
      [448, "forderung", 1_555_000, "Immobilien Morgentau", "abgelehnt", "Verkäufer reduziert nach acht Wochen ohne Abschluss."],
      [430, "gebot", 1_480_000, "Revest", "angenommen", "Einigung nach Prüfung der Mieterliste."],
      [412, "notarpreis", 1_480_000, "Notariat Dr. Winterberg, Ulm", "angenommen", "Beurkundet."],
    ]),
    sanierung: san("obj-001", [
      ["abbruch", 28_500, 30_700, "Rückbau Nord GmbH", "abgenommen"],
      ["rohbau", 23_500, 26_800, "Bauunternehmung Hartwig", "abgenommen"],
      ["dach", 42_500, 40_200, "Bedachung Falk", "abgenommen"],
      ["fassade", 56_500, 54_300, "Fassadenbau Rohde & Sohn", "abgenommen"],
      ["fenster", 47_000, 53_000, "Fensterbau Lichtwerk", "abgenommen"],
      ["elektro", 42_500, 44_700, "Elektro Kessler", "abgenommen"],
      ["sanitaer", 33_000, 33_900, "Haustechnik Seifert", "abgenommen"],
      ["heizung", 38_000, 37_400, "Haustechnik Seifert", "abgenommen"],
      ["trockenbau", 23_500, 24_800, "Trockenbau Lange", "abgenommen"],
      ["estrich", 14_000, 8_100, "Estrich Born", "laufend"],
      ["fliesen", 19_000, null, "Fliesen Martens", "beauftragt"],
      ["boden", 23_500, null, "Raumausstattung Behrens", "ausgeschrieben"],
      ["maler", 19_000, null, "Malerbetrieb Kühne", "offen"],
      ["tueren", 19_000, null, "Schreinerei Holm", "offen"],
      ["aussenanlagen", 14_000, null, "Garten- & Landschaftsbau Grünlich", "offen"],
      ["baunebenkosten", 19_000, null, "Architekturbüro Wendt", "offen"],
      ["unvorhergesehen", 9_500, null, null, "offen"],
    ]),
    verlauf: [
      ev(438, "anlage", "Objekt angelegt — Anschreiben an Eigentümer raus"),
      ev(430, "status", "Stufe auf Kontakt gesetzt · Rückruf RA Albrecht"),
      ev(421, "status", "Stufe auf Prüfung gesetzt"),
      ev(412, "dokument", "Exposé und Grundbuchauszug hinterlegt"),
      ev(396, "status", "Stufe auf Verhandlung gesetzt · 1,62 Mio geboten"),
      ev(380, "notiz", "Nachverhandlung über Strangsanierung: −140.000 €"),
      ev(371, "status", "Angekauft — Beurkundung bei Notar Dr. Winterberg"),
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
    laenge: 9.97121,
    breite: 48.35276,
    umriss: umrissAusMitte(9.97121, 48.35276, 17, 11, 12),
    bezeichnung: "WHG – Wiblingen",
    strasse: "Wiesengrundstraße 41",
    zimmer: 3,
    etage: "EG",
    hausgeld: 290,
    kurznotiz: "Nur bei Preis unter 280k wieder anfassen",
    plz: "89079",
    stadt: "Ulm",
    stadtteil: "Wiblingen",
    bundesland: "BW",
    objektart: "etw",
    zustand: "leerstand",
    stufe: "watchlist",
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
    // Portalobjekt: der Eigentümer steht nirgends, nur die Maklerin.
    // Genau deshalb ist die Kontaktliste offen — hier fehlt eine Rolle.
    kontakte: [
      {
        id: "kon-018-1",
        rolle: "makler",
        name: "Petra Lindqvist, Immowelt-Anzeige",
        telefon: "0731 0000003",
        email: null,
        notiz: "Will vor dem Exposé eine Finanzierungsbestätigung sehen.",
      },
    ],
    quelle: "Portal Immowelt",
    vertriebsweg: "etw",
    notiz: "Einzelne ETW in Wiblingen, klassischer Weiterverkauf nach Renovierung. Niedrige Priorität.",
    bilder: ["Portalbild Wohnzimmer"],
    dokumente: [dok("Portalexpose_Wiesengrund_41.pdf", "", 1_240, 22)],
    einheiten: [],
    angebote: ang("obj-018", [
      [16, "forderung", 318_000, "Makler Sonnfeld & Partner", "zu_teuer", "Deutlich über unserem Ankaufslimit — beobachten, ob der Preis fällt."],
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
    laenge: 9.9717,
    breite: 48.39621,
    umriss: umrissAusMitte(9.9717, 48.39621, 18, 12, 24),
    bezeichnung: "WHG – 4Z – Weststadt",
    strasse: "Ahornhof 15",
    pruefung: {
      unterlagen: {
        grundbuch: { status: "liegt_vor" },
        teilungserklaerung: { status: "liegt_vor" },
        aufteilungsplan: { status: "liegt_vor" },
        weg_protokolle: { status: "liegt_vor" },
        wirtschaftsplan: { status: "liegt_vor" },
        hausgeldabrechnung: { status: "liegt_vor" },
        energieausweis: { status: "liegt_vor" },
        grundriss: { status: "liegt_vor" },
      },
      punkte: {
        sonderumlagen: { status: "ok", notiz: "Keine beschlossen, Dach 2019 saniert" },
        erhaltungsruecklage: { status: "ok" },
        beschluesse: { status: "ok" },
        hausgeld: { status: "ok", notiz: "360 € im Monat, passt zur Größe" },
        stellplatz: { status: "ok", notiz: "Kein Stellplatz dabei" },
        mietverhaeltnis: { status: "ok", notiz: "Leerstand" },
      },
    },
    kalkulationEtw: {
      verkauf: { worst: 449_000, mid: 479_000, best: 499_000 },
      katalog: {
        tagessatz_3_pers_a_30_h: 3,
        entsorgung_klein: 1,
        steckdosen_schalter_wechseln: 1,
        austausch_alle_keramik_armaturen_kabinen: 2,
        fliesen_inkl_trockebauverkleidung_siliko: 24,
        wand_decke_streichen: 290,
        vinyl_inkl_trittschall_sockelleisten: 1,
        wohnungsinnentuere: 5,
        endreinigung: 1,
        kleiner_puffer_bei_renovierung_light: 1,
      },
    },
    zimmer: 4,
    etage: "2. OG",
    hausgeld: 360,
    stellplatz: null,
    kurznotiz: "Besichtigung vormittags, Bäder prüfen",
    plz: "89077",
    stadt: "Ulm",
    stadtteil: "Weststadt",
    bundesland: "BW",
    objektart: "etw",
    zustand: "leerstand",
    stufe: "besichtigt",
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
    kontakte: [],
    quelle: "Portal ImmoScout",
    vertriebsweg: "wg",
    wgZimmer: 4,
    notiz:
      "4-Zimmer-Wohnung in der Weststadt, ideal geschnitten für WG-Vermietung an Studierende — vier gleich große Zimmer, zwei Bäder. Leerstand, Renovierung überschaubar.",
    bilder: ["Portalbild Wohnzimmer"],
    dokumente: [dok("Portalexpose_Ahornhof_15.pdf", "", 2_640, 118)],
    einheiten: [],
    angebote: ang("obj-013", [
      [16, "forderung", 385_000, "Immobilien Morgentau", "offen", "Preis aus dem Inserat, noch nicht verhandelt."],
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
    laenge: 9.95825,
    breite: 48.41379,
    umriss: umrissAusMitte(9.95825, 48.41379, 16, 12, -22),
    bezeichnung: "WHG – 5Z – Eselsberg",
    strasse: "Rebhangweg 9",
    pruefung: {
      unterlagen: {
        grundbuch: { status: "liegt_vor" },
        teilungserklaerung: { status: "angefordert" },
        weg_protokolle: { status: "angefordert" },
        energieausweis: { status: "liegt_vor" },
        mietvertrag: { status: "liegt_vor" },
      },
      punkte: {
        stellplatz: { status: "kritisch", notiz: "TG-Platz ohne eigenes Grundbuch — nur Sondernutzungsrecht?" },
        mietverhaeltnis: { status: "ok", notiz: "5 WG-Verträge, je 3 Monate Kündigungsfrist" },
      },
    },
    kalkulationEtw: {
      verkauf: { worst: 545_000, mid: 579_000, best: 598_000 },
      monate: 3,
      katalog: {
        wand_decke_streichen: 360,
        austausch_wc: 2,
        austausch_waschbecken_inkl_armaturen: 2,
        endreinigung: 1,
      },
    },
    zimmer: 5,
    etage: "1. OG",
    hausgeld: 410,
    stellplatz: "TG-Stellplatz, Grundbuch offen",
    kurznotiz: "18k für TG locker, eigenes Grundbuch TG?",
    plz: "89075",
    stadt: "Ulm",
    stadtteil: "Eselsberg",
    bundesland: "BW",
    objektart: "etw",
    zustand: "vermietet",
    stufe: "neu",
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
    kontakte: [
      {
        id: "kon-011-1",
        rolle: "eigentuemer",
        name: "Hausgemeinschaft Rebhangweg GbR",
        telefon: null,
        email: null,
        notiz: "Zwei Gesellschafter, verkaufen wegen Altersnachfolge.",
      },
      {
        id: "kon-011-2",
        rolle: "makler",
        name: "Brandt & Partner, Herr Ostermann",
        telefon: "0731 0000004",
        email: "ostermann@beispiel.de",
        notiz: "Hat uns das Objekt vor der Portalschaltung gezeigt.",
      },
      {
        id: "kon-011-3",
        rolle: "verwalter",
        name: "Verwalter Feldhaus",
        telefon: "0731 0000005",
        email: null,
        notiz: "Hat Protokolle und Rücklagenstand. Antwortet nur per Post oder Telefon.",
      },
    ],
    quelle: "Makler Brandt & Partner",
    vertriebsweg: "wg",
    wgZimmer: 5,
    notiz:
      "Große 5-Zimmer-Wohnung am Eselsberg, läuft bereits als Studenten-WG — fünf Zimmer vermietet, Nähe Uni und Science Park. WG-Vermietung einfach fortführen.",
    bilder: ["Straßenansicht", "WG-Küche"],
    dokumente: [
      dok("Kurzexpose_Rebhangweg.pdf", "", 1_840, 16),
      dok("Mietaufstellung_WG_Zimmer.xlsx", "", 64, 14),
      dok("Grundbuchauszug_Eselsberg.pdf", "", 720, 10),
      dok("WEG_Protokoll_2025.pdf", "", 380, 9),
    ],
    einheiten: [],
    // Eine Wohnung, zwei Varianten im Kopf — hier steht die, die wir rechnen:
    // WG weiterlaufen lassen. Die Sanierungsschätzung bleibt leer, weil die
    // Gewerkeliste oben schon 34.000 € führt und die bessere Zahl ist.
    verkaufsplan: {
      posten: [
        {
          id: "vp-011-1",
          bezeichnung: "Wohnung komplett, 5 Zimmer als WG",
          flaeche: 132,
          zimmer: 5,
          wunschpreis: 598_000,
          monatsmiete: 2_250,
          alsWg: true,
        },
      ],
      sanierungsschaetzung: null,
      verkaufsprovision: 2.38,
      notiz:
        "Die WG-Miete trägt den Preis: 2.250 € kalt sind je Zimmer 450 €, am Eselsberg marktüblich. Als normale Familienwohnung wären rund 1.500 € realistisch — dann hält der Wunschpreis nicht.",
      stand: tage(-3),
    },
    angebote: ang("obj-011", [
      [21, "forderung", 445_000, "Hausverwaltung Nordlicht", "offen", "Preisvorstellung im Erstgespräch genannt."],
    ]),
    sanierung: san("obj-011", [
      ["sanitaer", 18_000, null, null, "offen"],
      ["elektro", 9_500, null, null, "offen"],
      ["maler", 6_500, null, null, "offen"],
    ]),
    verlauf: [
      ev(18, "anlage", "Objekt angelegt — Kurzexposé Brandt & Partner"),
      ev(16, "status", "Stufe auf Kontakt gesetzt"),
      ev(9, "notiz", "WG läuft: 5 Zimmer, zusammen 2.250 € kalt im Monat"),
    ],
    angelegtAm: tage(-18),
    fristBis: null,
  },
];
