/**
 * Kalkulation einer Eigentumswohnung — Timos Excel „Sanierungskalkulation“,
 * 1:1 abgebildet. Die Vorgabe steht in `docs/planung/KALKULATION_ETW.md`; deren Prüfwerte
 * (Abschnitt 3) rechnet `kalkulationEtw.test.ts` nach.
 *
 * Gerechnet wird ungerundet wie in der Excel, gerundet wird erst in der
 * Anzeige. Alle Prozentsätze stehen als Prozentzahl (5,5 statt 0,055), so wie
 * man sie eintippt.
 */
import { GRUNDERWERBSTEUER, type Objekt } from "./objekte";

/* ------------------------------------------------------------------ */
/* Aufwertungskatalog                                                   */
/* ------------------------------------------------------------------ */

/**
 * Drei Rechenarten:
 *  - `pauschal`: Ja → Preis, Nein → 0
 *  - `flaeche`:  Ja → Preis × Wohnfläche
 *  - `menge`:    Menge × Preis (Stück, m², lfm oder Tage)
 */
export type Rechenart = "pauschal" | "flaeche" | "menge";

export interface Katalogposition {
  id: string;
  titel: string;
  art: Rechenart;
  einheit?: "Stück" | "m²" | "lfm" | "Tage";
  /** Standardpreis je Einheit in Euro. In den Einstellungen und je Objekt überschreibbar. */
  preis: number;
}

export interface Gewerk {
  id: string;
  titel: string;
  positionen: Katalogposition[];
}

/** Aus `docs/planung/KALKULATION_ETW.md`, Abschnitt 4. „Garagentore“ gehört zu „Sonstiges“. */
export const AUFWERTUNGSKATALOG: Gewerk[] = [
  {
    id: "projektplanung",
    titel: "Projektplanung",
    positionen: [
      { id: "architekt", titel: "Architekt", art: "pauschal", preis: 5000 },
      { id: "statik", titel: "Statik", art: "pauschal", preis: 200 },
      { id: "pruefstatik", titel: "Prüfstatik", art: "pauschal", preis: 100 },
      { id: "teilung_notar", titel: "Teilung Notar", art: "pauschal", preis: 3600 },
    ],
  },
  {
    id: "errichtung_erschliessung",
    titel: "Errichtung & Erschließung",
    positionen: [
      { id: "wasseranschluss", titel: "Wasseranschluß", art: "pauschal", preis: 5000 },
      { id: "gasanschluss", titel: "Gasanschluß", art: "pauschal", preis: 5000 },
      { id: "stromanschluss", titel: "Stromanschluß", art: "pauschal", preis: 5000 },
      {
        id: "internet_kabelanschluss",
        titel: "Internet & Kabelanschluss",
        art: "pauschal",
        preis: 5000,
      },
    ],
  },
  {
    id: "entkernung_entsorgung",
    titel: "Entkernung & Entsorgung",
    positionen: [
      {
        id: "tagessatz_3_pers_a_30_h",
        titel: "Tagessatz 3 Pers. a 30€/h",
        art: "menge",
        einheit: "Tage",
        preis: 900,
      },
      { id: "entsorgung_klein", titel: "Entsorgung klein", art: "pauschal", preis: 1000 },
      { id: "entsorgung_mittel", titel: "Entsorgung mittel", art: "pauschal", preis: 5000 },
      { id: "entsorgung_gross", titel: "Entsorgung groß", art: "pauschal", preis: 10000 },
    ],
  },
  {
    id: "fenster_und_hauseingangstuere",
    titel: "Fenster und Hauseingangstüre",
    positionen: [
      {
        id: "fenster_standard_inkl_einbau",
        titel: "Fenster Standard inkl. Einbau",
        art: "menge",
        einheit: "Stück",
        preis: 700,
      },
      {
        id: "rolladen_inkl_einbau",
        titel: "Rolladen inkl. Einbau",
        art: "menge",
        einheit: "Stück",
        preis: 300,
      },
      {
        id: "balkontuere_inkl_einbau",
        titel: "Balkontüre inkl. Einbau",
        art: "menge",
        einheit: "Stück",
        preis: 950,
      },
      {
        id: "hauseingangstuere_inkl_einbau",
        titel: "Hauseingangstüre inkl. Einbau",
        art: "menge",
        einheit: "Stück",
        preis: 2250,
      },
      {
        id: "elektrisches_rolltor_garage_inkl_einbau",
        titel: "Elektrisches Rolltor Garage inkl. Einbau",
        art: "menge",
        einheit: "Stück",
        preis: 2250,
      },
      {
        id: "garagentor_lackieren",
        titel: "Garagentor lackieren",
        art: "menge",
        einheit: "Stück",
        preis: 500,
      },
    ],
  },
  {
    id: "elektrik",
    titel: "Elektrik",
    positionen: [
      {
        id: "komplette_elektriksanierung",
        titel: "Komplette Elektriksanierung",
        art: "flaeche",
        preis: 100,
      },
      {
        id: "steckdosen_schalter_wechseln",
        titel: "Steckdosen & Schalter wechseln",
        art: "flaeche",
        preis: 35,
      },
      { id: "klingelanlage", titel: "Klingelanlage", art: "pauschal", preis: 1500 },
      { id: "unterverteiler", titel: "Unterverteiler", art: "menge", einheit: "Stück", preis: 750 },
      {
        id: "zaehlerkasten_hauptkasten",
        titel: "Zählerkasten (Hauptkasten)",
        art: "menge",
        einheit: "Stück",
        preis: 3000,
      },
      {
        id: "lueftungsanlage_pro_inneneinheit_inkl_ke",
        titel: "Lüftungsanlage pro Inneneinheit inkl. Kernbohrung",
        art: "menge",
        einheit: "Stück",
        preis: 750,
      },
      { id: "pv_anlage", titel: "PV - Anlage", art: "pauschal", preis: 25000 },
    ],
  },
  {
    id: "heizung",
    titel: "Heizung",
    positionen: [
      { id: "wartung", titel: "Wartung", art: "menge", einheit: "Stück", preis: 300 },
      {
        id: "austausch_gas_oeltherme",
        titel: "Austausch Gas-Öltherme",
        art: "menge",
        einheit: "Stück",
        preis: 7500,
      },
      {
        id: "austausch_heizkoerper",
        titel: "Austausch Heizkörper",
        art: "menge",
        einheit: "Stück",
        preis: 350,
      },
      {
        id: "heizkoerper_lackieren",
        titel: "Heizkörper lackieren",
        art: "menge",
        einheit: "Stück",
        preis: 100,
      },
      {
        id: "thermostate_wechseln",
        titel: "Thermostate wechseln",
        art: "menge",
        einheit: "Stück",
        preis: 50,
      },
      {
        id: "verlegung_heizungsrohre_inkl_heizkoerper",
        titel: "Verlegung Heizungsrohre inkl. Heizkörper",
        art: "menge",
        einheit: "m²",
        preis: 80,
      },
      {
        id: "verlegung_fussbodenheizung_inkl_unterver",
        titel: "Verlegung Fußbodenheizung inkl. Unterverteiler (schlitzen)",
        art: "menge",
        einheit: "m²",
        preis: 45,
      },
      {
        id: "daemmung_tackerplatte",
        titel: "Dämmung  & Tackerplatte",
        art: "menge",
        einheit: "m²",
        preis: 80,
      },
      { id: "estrich_verlegen", titel: "Estrich verlegen", art: "menge", einheit: "m²", preis: 30 },
      {
        id: "elektrische_heizkoerper_infrarot",
        titel: "Elektrische Heizkörper Infrarot",
        art: "menge",
        einheit: "Stück",
        preis: 400,
      },
      {
        id: "elektrische_heizkoerper_direktheizung",
        titel: "Elektrische Heizkörper Direktheizung",
        art: "menge",
        einheit: "Stück",
        preis: 700,
      },
      {
        id: "luft_luft_klima_waermepumpe_anzahl_raeum",
        titel: "Luft-Luft Klima Wärmepumpe (Anzahl Räume)",
        art: "menge",
        einheit: "Stück",
        preis: 2000,
      },
    ],
  },
  {
    id: "sanitaer",
    titel: "Sanitär",
    positionen: [
      {
        id: "wasser_abwasser_kueche_bad_wc_inkl_haupt",
        titel: "Wasser / Abwasser Küche/Bad/WC inkl. Hauptwasserstrang",
        art: "menge",
        einheit: "Stück",
        preis: 4000,
      },
      {
        id: "wasser_abwasser_kueche_bad_wc",
        titel: "Wasser / Abwasser Küche/Bad/WC",
        art: "menge",
        einheit: "Stück",
        preis: 2000,
      },
      {
        id: "austausch_alle_keramik_armaturen_kabinen",
        titel: "Austausch alle Keramik, Armaturen, Kabinen",
        art: "menge",
        einheit: "Stück",
        preis: 2000,
      },
      {
        id: "austausch_duschkabine",
        titel: "Austausch Duschkabine",
        art: "menge",
        einheit: "Stück",
        preis: 750,
      },
      { id: "austausch_wc", titel: "Austausch WC", art: "menge", einheit: "Stück", preis: 300 },
      {
        id: "austausch_waschbecken_inkl_armaturen",
        titel: "Austausch Waschbecken inkl. Armaturen",
        art: "menge",
        einheit: "Stück",
        preis: 300,
      },
      {
        id: "austausch_durchlauferhitzer",
        titel: "Austausch Durchlauferhitzer",
        art: "menge",
        einheit: "Stück",
        preis: 500,
      },
      {
        id: "austausch_boiler",
        titel: "Austausch Boiler",
        art: "menge",
        einheit: "Stück",
        preis: 1500,
      },
      {
        id: "fliesen_inkl_trockebauverkleidung_siliko",
        titel: "Fliesen inkl. Trockebauverkleidung & Silikon & Material",
        art: "menge",
        einheit: "m²",
        preis: 150,
      },
    ],
  },
  {
    id: "roh_und_trockenbau",
    titel: "Roh- und Trockenbau",
    positionen: [
      {
        id: "staenderwand_standard_mit_gipskarton",
        titel: "Ständerwand Standard mit Gipskarton",
        art: "menge",
        einheit: "m²",
        preis: 60,
      },
      { id: "f90_wand", titel: "F90-Wand", art: "menge", einheit: "m²", preis: 95 },
      { id: "f60_wand", titel: "F60-Wand", art: "menge", einheit: "m²", preis: 65 },
      {
        id: "decke_abhaengen_uk_verkleiden",
        titel: "Decke Abhängen UK & verkleiden",
        art: "menge",
        einheit: "m²",
        preis: 60,
      },
      {
        id: "wand_mauern_nicht_tragend",
        titel: "Wand mauern (nicht tragend)",
        art: "menge",
        einheit: "m²",
        preis: 95,
      },
      {
        id: "wand_mauern_tragend",
        titel: "Wand mauern (tragend)",
        art: "menge",
        einheit: "m²",
        preis: 120,
      },
      { id: "stahltraeger", titel: "Stahlträger", art: "menge", einheit: "Stück", preis: 2500 },
      {
        id: "mauerwerk_abdichten_aussen",
        titel: "Mauerwerk abdichten (außen)",
        art: "menge",
        einheit: "m²",
        preis: 200,
      },
      {
        id: "betontreppe_bauen",
        titel: "Betontreppe bauen",
        art: "menge",
        einheit: "Stück",
        preis: 5000,
      },
      {
        id: "aussenbalkone_bauen",
        titel: "Außenbalkone bauen",
        art: "menge",
        einheit: "Stück",
        preis: 5000,
      },
      {
        id: "abdichtarbeiten_balkon",
        titel: "Abdichtarbeiten Balkon",
        art: "menge",
        einheit: "m²",
        preis: 90,
      },
    ],
  },
  {
    id: "waende_decken",
    titel: "Wände & Decken",
    positionen: [
      {
        id: "spachteln_q2_tapezieren_streichen",
        titel: "Spachteln (Q2) & Tapezieren & Streichen",
        art: "menge",
        einheit: "m²",
        preis: 30,
      },
      {
        id: "tapezieren_streichen",
        titel: "Tapezieren & streichen",
        art: "menge",
        einheit: "m²",
        preis: 20,
      },
      { id: "gewebespachtel", titel: "Gewebespachtel", art: "menge", einheit: "m²", preis: 20 },
      {
        id: "spachteln_q2_putz_streichen",
        titel: "Spachteln (Q2) & Putz & Streichen",
        art: "menge",
        einheit: "m²",
        preis: 33,
      },
      {
        id: "wand_decke_streichen",
        titel: "Wand & Decke Streichen",
        art: "menge",
        einheit: "m²",
        preis: 14,
      },
      {
        id: "holzdecke_streichen",
        titel: "Holzdecke streichen",
        art: "menge",
        einheit: "m²",
        preis: 25,
      },
      {
        id: "kellerdecke_daemmen",
        titel: "Kellerdecke dämmen",
        art: "menge",
        einheit: "m²",
        preis: 25,
      },
    ],
  },
  {
    id: "boden_innentueren",
    titel: "Boden & Innentüren",
    positionen: [
      {
        id: "laminat_inkl_trittschall_sockelleisten",
        titel: "Laminat inkl. Trittschall & Sockelleisten",
        art: "flaeche",
        preis: 50,
      },
      {
        id: "vinyl_inkl_trittschall_sockelleisten",
        titel: "Vinyl inkl. Trittschall & Sockelleisten",
        art: "flaeche",
        preis: 40,
      },
      {
        id: "parkett_inkl_trittschall_sockelleisten",
        titel: "Parkett inkl. Trittschall & Sockelleisten",
        art: "flaeche",
        preis: 70,
      },
      { id: "boden_ausgleichen", titel: "Boden ausgleichen", art: "flaeche", preis: 15 },
      {
        id: "wohnungseingangstuere",
        titel: "Wohnungseingangstüre",
        art: "menge",
        einheit: "Stück",
        preis: 875,
      },
      {
        id: "wohnungsinnentuere",
        titel: "Wohnungsinnentüre",
        art: "menge",
        einheit: "Stück",
        preis: 400,
      },
      { id: "t30_rs_tuer", titel: "T30-RS Tür", art: "menge", einheit: "Stück", preis: 1000 },
      { id: "t90_rs_tuer", titel: "T90-RS Tür", art: "menge", einheit: "Stück", preis: 2000 },
      {
        id: "innentueren_lackieren",
        titel: "Innentüren lackieren",
        art: "menge",
        einheit: "Stück",
        preis: 100,
      },
      {
        id: "tuergrriffe_tauschen",
        titel: "Türgrriffe tauschen",
        art: "menge",
        einheit: "Stück",
        preis: 50,
      },
    ],
  },
  {
    id: "fassade",
    titel: "Fassade",
    positionen: [
      {
        id: "fassade_daemmen_verputzen_streichen",
        titel: "Fassade dämmen, verputzen, streichen",
        art: "menge",
        einheit: "m²",
        preis: 140,
      },
      {
        id: "fassade_neu_verputzen_streichen",
        titel: "Fassade neu verputzen, streichen",
        art: "menge",
        einheit: "m²",
        preis: 35,
      },
      {
        id: "fassade_streichen",
        titel: "Fassade streichen",
        art: "menge",
        einheit: "m²",
        preis: 18,
      },
      { id: "geruest_stellen", titel: "Gerüst stellen", art: "menge", einheit: "m²", preis: 10 },
    ],
  },
  {
    id: "dach",
    titel: "Dach",
    positionen: [
      {
        id: "dachsanierung_komplett_inkl_dachrinnen",
        titel: "Dachsanierung komplett inkl. Dachrinnen",
        art: "menge",
        einheit: "m²",
        preis: 325,
      },
      { id: "nur_ziegel", titel: "Nur Ziegel", art: "menge", einheit: "m²", preis: 50 },
      {
        id: "dachdaemmung_zwischensparren",
        titel: "Dachdämmung (Zwischensparren)",
        art: "menge",
        einheit: "m²",
        preis: 50,
      },
      { id: "dachreinigung", titel: "Dachreinigung", art: "menge", einheit: "m²", preis: 20 },
      {
        id: "dachreinigung_und_lackieren",
        titel: "Dachreinigung und lackieren",
        art: "menge",
        einheit: "m²",
        preis: 30,
      },
      {
        id: "regenrinnen_fallrohre",
        titel: "Regenrinnen & Fallrohre",
        art: "menge",
        einheit: "lfm",
        preis: 130,
      },
      {
        id: "dachgaube_errichten",
        titel: "Dachgaube errichten",
        art: "menge",
        einheit: "Stück",
        preis: 7000,
      },
      {
        id: "dachgaube_neu_verkleiden_blech",
        titel: "Dachgaube neu verkleiden (Blech)",
        art: "menge",
        einheit: "lfm",
        preis: 500,
      },
      {
        id: "dachfenster_tauschen",
        titel: "Dachfenster tauschen",
        art: "menge",
        einheit: "Stück",
        preis: 1800,
      },
    ],
  },
  {
    id: "aussenanlage",
    titel: "Außenanlage",
    positionen: [
      {
        id: "neuer_aussenparkplatz_herstellen",
        titel: "Neuer Außenparkplatz herstellen",
        art: "pauschal",
        preis: 5000,
      },
      {
        id: "baeume_straeuchen_schneiden",
        titel: "Bäume & Sträuchen schneiden",
        art: "pauschal",
        preis: 1000,
      },
      { id: "garten_anlegen", titel: "Garten anlegen", art: "pauschal", preis: 2000 },
      { id: "terrasse_errichten", titel: "Terrasse errichten", art: "pauschal", preis: 3000 },
      { id: "carport", titel: "Carport", art: "pauschal", preis: 3000 },
      {
        id: "balkon_und_treppengelaender",
        titel: "Balkon- und Treppengeländer",
        art: "menge",
        einheit: "lfm",
        preis: 300,
      },
    ],
  },
  {
    id: "reinigung",
    titel: "Reinigung",
    positionen: [
      { id: "aussenanalage_reinigen", titel: "Außenanalage reinigen", art: "pauschal", preis: 500 },
      { id: "endreinigung", titel: "Endreinigung", art: "pauschal", preis: 250 },
    ],
  },
  {
    id: "sonstiges",
    titel: "Sonstiges",
    positionen: [
      { id: "kuechenzeile", titel: "Küchenzeile", art: "menge", einheit: "Stück", preis: 3500 },
      { id: "treppenhaus", titel: "Treppenhaus", art: "menge", einheit: "Stück", preis: 1000 },
      {
        id: "innentreppe_raumspartreppe",
        titel: "Innentreppe (Raumspartreppe)",
        art: "menge",
        einheit: "Stück",
        preis: 2000,
      },
      { id: "briefkasten", titel: "Briefkasten", art: "menge", einheit: "Stück", preis: 150 },
      { id: "garagentore", titel: "Garagentore", art: "menge", einheit: "Stück", preis: 2000 },
    ],
  },
  {
    id: "puffer",
    titel: "Puffer",
    positionen: [
      {
        id: "grosser_puffer_bei_sanierung",
        titel: "Großer Puffer bei Sanierung",
        art: "pauschal",
        preis: 5000,
      },
      {
        id: "kleiner_puffer_bei_renovierung_light",
        titel: "Kleiner Puffer bei Renovierung light",
        art: "pauschal",
        preis: 2500,
      },
    ],
  },
];

export const KATALOG_PREISE: Record<string, number> = Object.fromEntries(
  AUFWERTUNGSKATALOG.flatMap((g) => g.positionen.map((p) => [p.id, p.preis])),
);

/* ------------------------------------------------------------------ */
/* Vorgaben und Eingaben                                                */
/* ------------------------------------------------------------------ */

/** Standardwerte für alle Objekte. Werden in den Einstellungen gepflegt. */
export interface EtwVorgaben {
  notarProzent: number;
  maklerAnkaufProzent: number;
  monate: number;
  bewirtschaftungMonat: number;
  zinsBankProzent: number;
  gebuehrBankProzent: number;
  zinsCoProzent: number;
  maklerVerkaufProzent: number;
  homeStaging: number;
  /**
   * Vorgabe für Stellplatz, Garage oder TG je Szenario. Kommt zum Verkaufspreis
   * der Wohnung dazu, zählt aber nicht in den €/m²-Wert. (Schlüssel heißt aus
   * Kompatibilität noch `abzugQm`.)
   */
  abzugQm: number;
  /** Abweichende Katalogpreise je Position-ID. Fehlt eine, gilt der Katalog. */
  preise: Record<string, number>;
}

export const STANDARD_VORGABEN: EtwVorgaben = {
  notarProzent: 2,
  maklerAnkaufProzent: 0,
  monate: 4,
  bewirtschaftungMonat: 100,
  zinsBankProzent: 5.5,
  gebuehrBankProzent: 1.5,
  zinsCoProzent: 8,
  maklerVerkaufProzent: 0,
  homeStaging: 0,
  abzugQm: 0,
  preise: {},
};

export type Szenario = "worst" | "mid" | "best";
export const SZENARIEN: Szenario[] = ["worst", "mid", "best"];
export const SZENARIO_TITEL: Record<Szenario, string> = {
  worst: "Worst",
  mid: "Mid",
  best: "Best",
};

/**
 * Was am Objekt gespeichert wird. Alles optional: ein fehlender Wert heißt
 * „Vorgabe gilt“ — so wirken geänderte Einstellungen auf alle Objekte, die
 * den Wert nicht selbst überschrieben haben.
 */
export interface EtwKalkulation {
  grestProzent?: number | null;
  notarProzent?: number | null;
  maklerAnkaufProzent?: number | null;
  /** Von Hand überschriebene Kostenschätzung. Null = Summe des Katalogs. */
  aufwertungManuell?: number | null;
  monate?: number | null;
  bewirtschaftungMonat?: number | null;
  /** Null = Kaufpreis. */
  finanzierungsbetrag?: number | null;
  zinsBankProzent?: number | null;
  gebuehrBankProzent?: number | null;
  coKapital?: number | null;
  zinsCoProzent?: number | null;
  maklerVerkaufProzent?: number | null;
  homeStaging?: number | null;
  verkauf?: Partial<Record<Szenario, number | null>>;
  /** Alt (bis 08.11.2026): ein Wert für alle Szenarien. Gilt weiter als Vorgabe. */
  abzugQm?: number | null;
  /** Stellplatz/Garage je Szenario — zum Verkaufspreis dazu, nicht in €/m². */
  stellplatz?: Partial<Record<Szenario, number | null>>;
  /** Kaufpreis beim letzten Eintragen der Verkaufspreise — Bezug für „Verkaufspreise prüfen“. */
  kaufpreisReferenz?: number | null;
  /** Menge je Position; bei Ja/Nein steht 1 für Ja. */
  katalog?: Record<string, number>;
  /** Je Objekt abweichende Preise. */
  preise?: Record<string, number>;
}

/** Alle Eingaben aufgelöst — das, womit gerechnet wird. */
export interface EtwEingabe {
  kaufpreis: number;
  wohnflaeche: number;
  grestProzent: number;
  notarProzent: number;
  maklerAnkaufProzent: number;
  aufwertung: number;
  monate: number;
  bewirtschaftungMonat: number;
  finanzierungsbetrag: number;
  zinsBankProzent: number;
  gebuehrBankProzent: number;
  coKapital: number;
  zinsCoProzent: number;
  maklerVerkaufProzent: number;
  homeStaging: number;
  /** Verkaufspreis der Wohnung allein — Grundlage für €/m². */
  verkauf: Record<Szenario, number | null>;
  /** Stellplatz/Garage je Szenario, kommt zum Gesamtverkaufspreis dazu. */
  stellplatz: Record<Szenario, number>;
}

/* ------------------------------------------------------------------ */
/* Rechnung                                                             */
/* ------------------------------------------------------------------ */

export function katalogPreis(
  id: string,
  vorgaben: EtwVorgaben,
  kalk: EtwKalkulation | null | undefined,
): number {
  return kalk?.preise?.[id] ?? vorgaben.preise[id] ?? KATALOG_PREISE[id] ?? 0;
}

/** Betrag einer Position bei gegebener Menge. */
export function positionsBetrag(
  p: Katalogposition,
  menge: number,
  preis: number,
  wohnflaeche: number,
): number {
  if (!menge) return 0;
  if (p.art === "pauschal") return preis;
  if (p.art === "flaeche") return preis * wohnflaeche;
  return menge * preis;
}

export interface Katalogsumme {
  jeGewerk: Record<string, number>;
  gesamt: number;
}

export function katalogSumme(
  kalk: EtwKalkulation | null | undefined,
  vorgaben: EtwVorgaben,
  wohnflaeche: number,
): Katalogsumme {
  const jeGewerk: Record<string, number> = {};
  let gesamt = 0;
  for (const g of AUFWERTUNGSKATALOG) {
    let summe = 0;
    for (const p of g.positionen) {
      summe += positionsBetrag(
        p,
        kalk?.katalog?.[p.id] ?? 0,
        katalogPreis(p.id, vorgaben, kalk),
        wohnflaeche,
      );
    }
    jeGewerk[g.id] = summe;
    gesamt += summe;
  }
  return { jeGewerk, gesamt };
}

/** Objekt + Vorgaben → aufgelöste Eingaben. */
export function etwEingabe(o: Objekt, vorgaben: EtwVorgaben): EtwEingabe {
  const k = o.kalkulationEtw ?? {};
  const kaufpreis = o.kaufpreis ?? 0;
  const wohnflaeche = o.wohnflaeche ?? 0;
  return {
    kaufpreis,
    wohnflaeche,
    grestProzent: k.grestProzent ?? GRUNDERWERBSTEUER[o.bundesland] ?? 5,
    notarProzent: k.notarProzent ?? vorgaben.notarProzent,
    // Die Maklerprovision steht schon am Objekt — sie ist die bessere Vorgabe.
    maklerAnkaufProzent: k.maklerAnkaufProzent ?? o.maklerprovision ?? vorgaben.maklerAnkaufProzent,
    aufwertung: k.aufwertungManuell ?? katalogSumme(k, vorgaben, wohnflaeche).gesamt,
    monate: k.monate ?? vorgaben.monate,
    bewirtschaftungMonat: k.bewirtschaftungMonat ?? vorgaben.bewirtschaftungMonat,
    finanzierungsbetrag: k.finanzierungsbetrag ?? kaufpreis,
    zinsBankProzent: k.zinsBankProzent ?? vorgaben.zinsBankProzent,
    gebuehrBankProzent: k.gebuehrBankProzent ?? vorgaben.gebuehrBankProzent,
    coKapital: k.coKapital ?? 0,
    zinsCoProzent: k.zinsCoProzent ?? vorgaben.zinsCoProzent,
    maklerVerkaufProzent: k.maklerVerkaufProzent ?? vorgaben.maklerVerkaufProzent,
    homeStaging: k.homeStaging ?? vorgaben.homeStaging,
    verkauf: {
      worst: k.verkauf?.worst ?? null,
      mid: k.verkauf?.mid ?? null,
      best: k.verkauf?.best ?? null,
    },
    stellplatz: {
      worst: k.stellplatz?.worst ?? k.abzugQm ?? vorgaben.abzugQm,
      mid: k.stellplatz?.mid ?? k.abzugQm ?? vorgaben.abzugQm,
      best: k.stellplatz?.best ?? k.abzugQm ?? vorgaben.abzugQm,
    },
  };
}

export interface Szenarioergebnis {
  /** Wohnung allein. */
  verkaufspreis: number | null;
  stellplatz: number;
  /** Wohnung + Stellplatz/Garage — damit rechnen Vermarktung und Gewinn. */
  gesamtverkaufspreis: number | null;
  vermarktung: number;
  gesamtinvestition: number;
  gewinn: number | null;
  /** In Prozent der Gesamtinvestition. */
  gewinnProzent: number | null;
  /** €/m² Wohnfläche: Verkaufspreis der Wohnung (ohne Stellplatz) / Wohnfläche. */
  preisJeQm: number | null;
}

export interface EtwErgebnis {
  grest: number;
  notar: number;
  maklerAnkauf: number;
  ankaufsnebenkosten: number;
  aufwertung: number;
  bewirtschaftung: number;
  zinsenBank: number;
  gebuehrBank: number;
  kostenCo: number;
  finanzierungskosten: number;
  szenarien: Record<Szenario, Szenarioergebnis>;
}

/** Abschnitt 2 der Vorgabe, Zeile für Zeile. */
export function berechneEtw(e: EtwEingabe): EtwErgebnis {
  const grest = (e.kaufpreis * e.grestProzent) / 100;
  const notar = (e.kaufpreis * e.notarProzent) / 100;
  const maklerAnkauf = (e.kaufpreis * e.maklerAnkaufProzent) / 100;
  const ankaufsnebenkosten = grest + notar + maklerAnkauf;
  const bewirtschaftung = e.bewirtschaftungMonat * e.monate;
  const zinsenBank = ((e.finanzierungsbetrag * e.zinsBankProzent) / 100 / 12) * e.monate;
  const gebuehrBank = (e.finanzierungsbetrag * e.gebuehrBankProzent) / 100;
  const kostenCo = ((e.coKapital * e.zinsCoProzent) / 100 / 12) * e.monate;
  const finanzierungskosten = zinsenBank + gebuehrBank + kostenCo;

  const szenario = (vp: number | null, stellplatz: number): Szenarioergebnis => {
    const gesamt = vp === null ? null : vp + stellplatz;
    const vermarktung = ((gesamt ?? 0) * e.maklerVerkaufProzent) / 100 + e.homeStaging;
    const gesamtinvestition =
      e.kaufpreis +
      ankaufsnebenkosten +
      e.aufwertung +
      bewirtschaftung +
      vermarktung +
      finanzierungskosten;
    const gewinn = gesamt === null ? null : gesamt - gesamtinvestition;
    return {
      verkaufspreis: vp,
      stellplatz,
      gesamtverkaufspreis: gesamt,
      vermarktung,
      gesamtinvestition,
      gewinn,
      gewinnProzent:
        gewinn !== null && gesamtinvestition > 0 ? (gewinn / gesamtinvestition) * 100 : null,
      preisJeQm: vp !== null && e.wohnflaeche > 0 ? vp / e.wohnflaeche : null,
    };
  };

  return {
    grest,
    notar,
    maklerAnkauf,
    ankaufsnebenkosten,
    aufwertung: e.aufwertung,
    bewirtschaftung,
    zinsenBank,
    gebuehrBank,
    kostenCo,
    finanzierungskosten,
    szenarien: {
      worst: szenario(e.verkauf.worst, e.stellplatz.worst),
      mid: szenario(e.verkauf.mid, e.stellplatz.mid),
      best: szenario(e.verkauf.best, e.stellplatz.best),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Verkaufspreise prüfen                                                */
/* ------------------------------------------------------------------ */

/** Ab dieser Änderung des Kaufpreises (in Prozent) sollen die Verkaufspreise geprüft werden. */
export const PREISPRUEFUNG_SCHWELLE = 20;

/**
 * Hat sich der Kaufpreis seit dem Eintragen der Verkaufspreise um mehr als
 * 20 % verändert? Ohne Referenz (ältere Kalkulationen) kein Hinweis.
 */
export function verkaufspreisePruefen(
  kaufpreis: number | null,
  k: EtwKalkulation | null | undefined,
): { alt: number; neu: number; prozent: number } | null {
  const ref = k?.kaufpreisReferenz;
  if (!ref || !kaufpreis) return null;
  const prozent = ((kaufpreis - ref) / ref) * 100;
  return Math.abs(prozent) > PREISPRUEFUNG_SCHWELLE ? { alt: ref, neu: kaufpreis, prozent } : null;
}
