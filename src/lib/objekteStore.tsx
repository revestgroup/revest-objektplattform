/**
 * Der Datenbestand im Browser.
 *
 * Phase 1 hat kein Backend. Alles liegt im React-State und wird in den
 * localStorage gespiegelt, damit Timo die App zumachen und später
 * weitermachen kann. Die Mutations-Funktionen haben absichtlich schon die
 * Form, die sie in Phase 2 mit Supabase behalten: rein, raus, fertig.
 *
 * Bilder und Dokumente werden NICHT gespeichert — Blob-URLs überleben einen
 * Reload nicht, und Dateien im localStorage sprengen das Limit. Was Timo in
 * einer Sitzung hochlädt, bleibt in dieser Sitzung sichtbar.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type {
  Aufteilung,
  Kontakt,
  Dokument,
  Einheit,
  Gesellschaft,
  Objekt,
  Teilungserklaerung,
  Verkaufsplan,
  Verlaufseintrag,
} from "./objekte";
import {
  STUFEN,
  TEILUNGSSTATUS,
  andereKuerzel,
  f,
  kuerzelVorschlag,
  ordnerUmziehen,
  stufeUmstellen,
} from "./objekte";
import { MOCK_OBJEKTE } from "./mockDaten";
import { MOCK_KONTAKTE } from "./mockKontakte";
import {
  STANDARD_KATEGORIEN,
  kopienAktualisieren,
  neueKontaktId,
  registerAbgleichen,
  type Kategorie,
  type Kontaktdatensatz,
} from "./kontakte";
import {
  mitAbmeldungen,
  mitUmmeldungen,
  ohneOffeneAbmeldungen,
  type Ummeldung,
} from "./ummeldungen";

/**
 * Versionierter Schlüssel. Ändert sich die Form von `Objekt`, wird die Zahl
 * erhöht — ein alter Stand ohne die neuen Felder würde sonst beim Rechnen
 * über halbe Objekte stolpern.
 */
const SPEICHER = "revest.objekte.v6";

/**
 * Gespeicherte Stände an die aktuelle Form anpassen, statt sie über eine neue
 * Version zu verwerfen: Dokumente aus der alten flachen Ablage ziehen in die
 * Drive-Ordner um, alte Stufen werden auf die neuen abgebildet, und gekaufte
 * Objekte ohne Kürzel bekommen den Vorschlag — ab „Gekauft“ ist es Pflicht.
 */
function ausSpeicher(objekte: Objekt[]): Objekt[] {
  const vergeben = objekte.flatMap((o) => (o.kuerzel ? [o.kuerzel] : []));
  return objekte.map((alt) => {
    // Stufen der ersten Fassung (beobachtung, kontakt …) auf Timos Ablauf umstellen.
    const o = { ...alt, stufe: stufeUmstellen(alt.stufe) };
    let kuerzel = o.kuerzel ?? null;
    if (!kuerzel && o.stufe === "angekauft") {
      kuerzel = kuerzelVorschlag(o.strasse, vergeben);
      vergeben.push(kuerzel);
    }
    return mitUmmeldungen({
      ...o,
      kuerzel,
      dokumente: (o.dokumente ?? []).map((d) => ({ ...d, ordner: ordnerUmziehen(d.ordner) })),
    });
  });
}

/** Felder, die einen Reload nicht überleben, werden vor dem Speichern geleert. */
function fuerSpeicher(objekte: Objekt[]) {
  return objekte.map((o) => ({
    ...o,
    bilder: o.bilder.filter((b) => !b.startsWith("blob:")),
  }));
}

/** Ein Objekt ohne die Felder, die erst beim Speichern entstehen. */
export type ObjektEntwurf = Omit<
  Objekt,
  "id" | "dokumente" | "einheiten" | "verlauf" | "angelegtAm"
>;

/**
 * Was beim Deal festgehalten wird.
 *
 * Alles in einem Zug, weil ein Ankauf ein Vorgang ist und kein Umschalter:
 * Preis, Datum, Verwertung und die Frage, ob aufgeteilt wird. Wer das in vier
 * Einzelschritte zerlegt, hat am Ende drei halb gepflegte Objekte.
 */
export interface Dealabschluss {
  /** Beurkundeter Kaufpreis. Kann vom letzten Gebot abweichen. */
  preis: number | null;
  /** Tag der Beurkundung, als ISO-Datum. */
  datum: string;
  /** Nur bei Einzelwohnungen: ETW-Vertrieb oder WG-Vermietung. */
  vertriebsweg: "etw" | "wg" | null;
  wgZimmer: number | null;
  /** Nur bei Häusern: wie viele Einheiten wohin. */
  aufteilung: Aufteilung | null;
  /** Haken gesetzt heißt: die Teilungserklärung läuft an, der Reiter wird nutzbar. */
  teilungStarten: boolean;
  notar: string | null;
  /** Pflicht ab hier — der Dialog füllt den Vorschlag vor. */
  kuerzel: string;
  gesellschaft: Gesellschaft;
  /** Steht beim Deal oft noch nicht fest. */
  besitzuebergangAm: string | null;
}

/**
 * Was beim Verkauf einer Einheit festgehalten wird.
 *
 * Dieselbe Idee wie `Dealabschluss`, eine Ebene tiefer: der Verkauf einer
 * Wohnung ist ein Vorgang, bei dem vier Angaben gleichzeitig entstehen. Wer
 * nur den Status umschaltet, hat am Ende verkaufte Wohnungen ohne Käufer —
 * genau das ist bisher passiert, weil `kaeufer` und `verkaufspreis` im Modell
 * standen, aber von keiner Oberfläche je geschrieben wurden.
 */
export interface Einheitverkauf {
  kaeufer: string;
  kontakt: string | null;
  preis: number | null;
  /** Tag der Beurkundung, als ISO-Datum. */
  datum: string;
}

interface StoreWert {
  objekte: Objekt[];
  /** Vor dem ersten Hydrieren rendert die Liste nichts — sonst blitzt der Mock-Stand auf. */
  bereit: boolean;
  objekt: (id: string) => Objekt | undefined;
  anlegen: (entwurf: ObjektEntwurf) => Objekt;
  aendern: (id: string, teil: Partial<Objekt>, verlaufstext?: string) => void;
  loeschen: (id: string) => void;
  stufeSetzen: (id: string, stufe: Objekt["stufe"]) => void;
  /** Der Deal. Macht aus einem Ankaufsobjekt ein Projekt. */
  dealAbschliessen: (id: string, abschluss: Dealabschluss) => void;
  /** Kein Deal — mit Grund, weil die Frage in zwei Jahren wiederkommt. */
  absagen: (id: string, grund: string) => void;
  /** Teilungserklärung nachträglich anstoßen oder ändern. */
  teilungSetzen: (id: string, teilung: Teilungserklaerung | null) => void;
  notizAnhaengen: (id: string, text: string) => void;
  dokumenteAnhaengen: (id: string, dokumente: Omit<Dokument, "id" | "hochgeladenAm">[]) => void;
  dokumentLoeschen: (id: string, dokumentId: string) => void;
  /** Ankaufsdateien in die Projektstruktur einsortieren: Dokument-ID → Ordner. */
  dokumenteEinsortieren: (id: string, ziele: Record<string, string>) => void;
  einheitenSetzen: (id: string, einheiten: Einheit[]) => void;
  /** Eine Einheit verkaufen. Setzt Status, Käufer, Preis und Datum in einem Zug. */
  einheitVerkaufen: (id: string, einheitId: string, verkauf: Einheitverkauf) => void;
  /**
   * Der Verkauf war keiner. Nimmt dieselben vier Angaben wieder weg, die
   * `einheitVerkaufen` gesetzt hat — sonst bliebe ein Käufer an einer Einheit
   * hängen, die wieder im Angebot steht.
   */
  einheitVerkaufZurueck: (
    id: string,
    einheitId: string,
    status: Einheit["status"],
    grund: string,
  ) => void;
  verkaufsplanSetzen: (id: string, plan: Verkaufsplan) => void;
  ummeldungSetzen: (id: string, ummeldungId: string, teil: Partial<Ummeldung>) => void;
  zuruecksetzen: () => void;

  /* ----- Kontaktregister ----- */
  register: Kontaktdatensatz[];
  kategorien: Kategorie[];
  /** Anlegen oder ändern; die Kopien an allen Objekten ziehen nach. */
  kontaktSpeichern: (k: Kontaktdatensatz) => void;
  kontaktNotiz: (kontaktId: string, text: string) => void;
  /** Nur ohne verknüpfte Objekte — sonst bliebe ein Verweis ins Leere. */
  kontaktLoeschen: (kontaktId: string) => void;
  /** Einen Register-Kontakt mit einer Rolle an ein Objekt hängen. */
  kontaktVerknuepfen: (objektId: string, kontaktId: string, rolle: Kontakt["rolle"]) => void;
  kategorienSetzen: (k: Kategorie[]) => void;
}

const SPEICHER_REGISTER = "revest.kontakte.v1";
const SPEICHER_KATEGORIEN = "revest.kontaktkategorien.v1";

/** Mock-Stand: Objekte und Register, schon miteinander abgeglichen. */
const START = registerAbgleichen(MOCK_OBJEKTE, MOCK_KONTAKTE);

const Kontext = createContext<StoreWert | null>(null);

let zaehler = Date.now();
function neueId(praefix: string) {
  zaehler += 1;
  return `${praefix}-${zaehler.toString(36)}`;
}

function eintrag(art: Verlaufseintrag["art"], text: string, vonHand?: boolean): Verlaufseintrag {
  return { id: neueId("v"), zeitpunkt: new Date().toISOString(), art, text, vonHand };
}

export function ObjekteProvider({ children }: { children: ReactNode }) {
  const [objekte, setObjekte] = useState<Objekt[]>(START.objekte);
  const [register, setRegister] = useState<Kontaktdatensatz[]>(START.register);
  const [kategorien, setKategorien] = useState<Kategorie[]>(STANDARD_KATEGORIEN);
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    try {
      const roh = localStorage.getItem(SPEICHER);
      const rohR = localStorage.getItem(SPEICHER_REGISTER);
      const rohK = localStorage.getItem(SPEICHER_KATEGORIEN);
      // Gespeicherte Objekte ohne Register (Stand vor Feinschliff D): ihre
      // Kontakte werden jetzt übernommen, Dubletten zusammengeführt.
      const obj = roh ? ausSpeicher(JSON.parse(roh) as Objekt[]) : START.objekte;
      const reg = rohR ? (JSON.parse(rohR) as Kontaktdatensatz[]) : MOCK_KONTAKTE;
      const abgeglichen = registerAbgleichen(obj, reg);
      setObjekte(abgeglichen.objekte);
      setRegister(abgeglichen.register);
      if (rohK) setKategorien(JSON.parse(rohK) as Kategorie[]);
    } catch {
      // Beschädigter Stand: lieber mit den Mock-Daten weiterarbeiten.
    }
    setBereit(true);
  }, []);

  useEffect(() => {
    if (!bereit) return;
    try {
      localStorage.setItem(SPEICHER_REGISTER, JSON.stringify(register));
      localStorage.setItem(SPEICHER_KATEGORIEN, JSON.stringify(kategorien));
    } catch {
      // siehe unten
    }
  }, [register, kategorien, bereit]);

  // Ein Kontakt, der am Objekt neu eingetragen wurde, kommt ins Register —
  // oder findet dort seinen Zwilling. An einer Stelle statt an jedem Formular.
  useEffect(() => {
    if (!bereit) return;
    const offen = objekte.some((o) =>
      o.kontakte.some(
        (k) => k.name.trim() && (!k.kontaktId || !register.some((r) => r.id === k.kontaktId)),
      ),
    );
    if (!offen) return;
    const r = registerAbgleichen(objekte, register);
    setRegister(r.register);
    setObjekte(r.objekte);
  }, [objekte, register, bereit]);

  useEffect(() => {
    if (!bereit) return;
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(fuerSpeicher(objekte)));
    } catch {
      // Speicher voll oder gesperrt — die Sitzung läuft trotzdem weiter.
    }
  }, [objekte, bereit]);

  /** Einzige Stelle, die ein Objekt verändert. Hält den Verlauf automatisch mit. */
  // Nach jeder Änderung: ist ein Besitzübergang neu eingetragen — im Deal,
  // im Formular oder im Reiter —, entstehen die Ummeldungen. An einer Stelle,
  // damit kein Weg sie vergisst.
  const mutieren = useCallback(
    (id: string, bauen: (o: Objekt) => Objekt) =>
      setObjekte((alt) => alt.map((o) => (o.id === id ? mitUmmeldungen(bauen(o)) : o))),
    [],
  );

  const wert = useMemo<StoreWert>(
    () => ({
      objekte,
      bereit,

      objekt: (id) => objekte.find((o) => o.id === id),

      anlegen: (entwurf) => {
        const neu: Objekt = {
          ...entwurf,
          id: neueId("obj"),
          dokumente: [],
          einheiten: [],
          verlauf: [eintrag("anlage", "Objekt angelegt")],
          angelegtAm: new Date().toISOString(),
        };
        setObjekte((alt) => [neu, ...alt]);
        return neu;
      },

      aendern: (id, teil, verlaufstext) =>
        mutieren(id, (o) => ({
          ...o,
          ...teil,
          verlauf: verlaufstext ? [...o.verlauf, eintrag("notiz", verlaufstext, false)] : o.verlauf,
        })),

      loeschen: (id) => setObjekte((alt) => alt.filter((o) => o.id !== id)),

      // Ab „Angekauft“ ist das Kürzel Pflicht. Wer per Drag & Drop oder
      // Stufenknopf dorthin springt, statt den Deal-Dialog zu nehmen, bekommt
      // den Vorschlag automatisch — ein gekauftes Objekt ohne Kürzel hätte
      // kein Qonto-Label und keinen Dateinamen.
      stufeSetzen: (id, stufe) =>
        setObjekte((alle) =>
          alle.map((o) => {
            if (o.id !== id || o.stufe === stufe) return o;
            const verlauf = [
              ...o.verlauf,
              eintrag("status", `Stufe auf ${STUFEN[stufe].titel} gesetzt`),
            ];
            if (stufe !== "angekauft" || o.kuerzel) return { ...o, stufe, verlauf };
            const kuerzel = kuerzelVorschlag(o.strasse, andereKuerzel(alle, o.id));
            return {
              ...o,
              stufe,
              kuerzel,
              verlauf: [...verlauf, eintrag("notiz", `Kürzel ${kuerzel} vergeben`, false)],
            };
          }),
        ),

      // Ein Deal schreibt an fünf Stellen gleichzeitig: Stufe, Datum, Preis,
      // Verwertung und Preisgeschichte. Deshalb liegt er hier und nicht als
      // fünf Aufrufe in der Oberfläche — sonst gibt es Objekte, die angekauft
      // sind, ohne dass jemand weiß, zu welchem Preis.
      dealAbschliessen: (id, a) =>
        mutieren(id, (o) => {
          const preis = a.preis ?? o.kaufpreis;
          const texte = [
            `Deal: angekauft${preis !== null ? ` für ${f.eur(preis)}` : ""}, beurkundet am ${f.datum(a.datum)}`,
          ];
          if (a.teilungStarten) texte.push("Teilungserklärung angestoßen");
          if (a.kuerzel !== o.kuerzel) texte.push(`Kürzel ${a.kuerzel} vergeben`);

          return {
            ...o,
            stufe: "angekauft",
            angekauftAm: a.datum,
            besitzuebergangAm: a.besitzuebergangAm ?? o.besitzuebergangAm ?? null,
            kuerzel: a.kuerzel,
            gesellschaft: a.gesellschaft,
            kaufpreis: preis,
            // Die Frist war die Zusage an den Verkäufer. Sie ist eingelöst.
            fristBis: null,
            absagegrund: null,
            vertriebsweg: a.vertriebsweg,
            wgZimmer: a.wgZimmer,
            aufteilung: a.aufteilung,
            teilung: a.teilungStarten
              ? {
                  gestartetAm: a.datum,
                  status: "vorbereitung",
                  notar: a.notar,
                  einheiten: a.aufteilung
                    ? a.aufteilung.etw + a.aufteilung.wg || o.anzahlEinheiten
                    : o.anzahlEinheiten,
                  erwartetAm: null,
                  notiz: null,
                }
              : null,
            // Der beurkundete Preis gehört in die Preisgeschichte, sonst endet
            // sie beim letzten Gebot und das Objekt sieht aus wie offen.
            angebote:
              preis === null
                ? o.angebote
                : [
                    ...o.angebote,
                    {
                      id: neueId("a"),
                      datum: a.datum,
                      art: "notarpreis" as const,
                      preis,
                      quelle: a.notar,
                      ergebnis: "angenommen" as const,
                      notiz: null,
                    },
                  ],
            verlauf: [...o.verlauf, ...texte.map((t) => eintrag("status", t))],
          };
        }),

      absagen: (id, grund) =>
        mutieren(id, (o) => ({
          ...o,
          stufe: "abgesagt",
          fristBis: null,
          absagegrund: grund.trim() || null,
          verlauf: [
            ...o.verlauf,
            eintrag("status", grund.trim() ? `Kein Deal: ${grund.trim()}` : "Kein Deal"),
          ],
        })),

      teilungSetzen: (id, teilung) =>
        mutieren(id, (o) => {
          const text = !teilung
            ? "Teilungserklärung zurückgezogen"
            : !o.teilung
              ? "Teilungserklärung angestoßen"
              : o.teilung.status !== teilung.status
                ? `Teilungserklärung: ${TEILUNGSSTATUS[teilung.status].titel}`
                : null;
          return {
            ...o,
            teilung,
            verlauf: text ? [...o.verlauf, eintrag("status", text)] : o.verlauf,
          };
        }),

      notizAnhaengen: (id, text) =>
        mutieren(id, (o) => ({ ...o, verlauf: [...o.verlauf, eintrag("notiz", text, true)] })),

      dokumenteAnhaengen: (id, neue) =>
        mutieren(id, (o) => {
          const angelegt = neue.map((d) => ({
            ...d,
            id: neueId("d"),
            hochgeladenAm: new Date().toISOString(),
          }));
          const text =
            angelegt.length === 1
              ? `Dokument hinterlegt: ${angelegt[0].name}`
              : `${angelegt.length} Dokumente hinterlegt`;
          return {
            ...o,
            dokumente: [...o.dokumente, ...angelegt],
            verlauf: [...o.verlauf, eintrag("dokument", text)],
          };
        }),

      dokumentLoeschen: (id, dokumentId) =>
        mutieren(id, (o) => ({
          ...o,
          dokumente: o.dokumente.filter((d) => d.id !== dokumentId),
        })),

      dokumenteEinsortieren: (id, ziele) =>
        mutieren(id, (o) => {
          const anzahl = o.dokumente.filter((d) => d.id in ziele).length;
          if (anzahl === 0) return o;
          return {
            ...o,
            dokumente: o.dokumente.map((d) => (d.id in ziele ? { ...d, ordner: ziele[d.id] } : d)),
            verlauf: [
              ...o.verlauf,
              eintrag(
                "dokument",
                anzahl === 1 ? "1 Datei einsortiert" : `${anzahl} Dateien einsortiert`,
              ),
            ],
          };
        }),

      einheitenSetzen: (id, einheiten) => mutieren(id, (o) => ({ ...o, einheiten })),

      einheitVerkaufen: (id, einheitId, v) =>
        mutieren(id, (o) => {
          const e = o.einheiten.find((x) => x.id === einheitId);
          // Mit dem Verkauf entstehen die Abmeldungen an den Käufer.
          return mitAbmeldungen(
            {
              ...o,
              einheiten: o.einheiten.map((x) =>
                x.id === einheitId
                  ? {
                      ...x,
                      status: "verkauft" as const,
                      kaeufer: v.kaeufer,
                      kaeuferKontakt: v.kontakt,
                      verkaufspreis: v.preis,
                      verkauftAm: v.datum,
                    }
                  : x,
              ),
              verlauf: [
                ...o.verlauf,
                eintrag(
                  "status",
                  `${e?.bezeichnung ?? "Einheit"} verkauft an ${v.kaeufer}${
                    v.preis !== null ? ` für ${f.eur(v.preis)}` : ""
                  }`,
                ),
              ],
            },
            einheitId,
          );
        }),

      einheitVerkaufZurueck: (id, einheitId, status, grund) =>
        mutieren(id, (o) => {
          const e = o.einheiten.find((x) => x.id === einheitId);
          // Der Wunschpreis bleibt stehen: er war vor dem Verkauf der geführte
          // Preis und ist nach der Rücknahme wieder genau das.
          return ohneOffeneAbmeldungen(
            {
              ...o,
              einheiten: o.einheiten.map((x) =>
                x.id === einheitId
                  ? { ...x, status, kaeufer: null, kaeuferKontakt: null, verkauftAm: null }
                  : x,
              ),
              verlauf: [
                ...o.verlauf,
                eintrag(
                  "status",
                  `Verkauf zurückgenommen: ${e?.bezeichnung ?? "Einheit"}${
                    e?.kaeufer ? ` (${e.kaeufer})` : ""
                  }${grund.trim() ? ` — ${grund.trim()}` : ""}`,
                ),
              ],
            },
            einheitId,
          );
        }),

      ummeldungSetzen: (id, ummeldungId, teil) =>
        mutieren(id, (o) => ({
          ...o,
          ummeldungen: (o.ummeldungen ?? []).map((u) =>
            u.id === ummeldungId ? { ...u, ...teil } : u,
          ),
        })),

      // Nur das ausdrückliche Speichern schreibt in den Verlauf — beim Tippen
      // in der Planung wäre das eine Flut aus bedeutungslosen Einträgen.
      verkaufsplanSetzen: (id, plan) =>
        mutieren(id, (o) => ({
          ...o,
          verkaufsplan: { ...plan, stand: new Date().toISOString() },
          verlauf: [
            ...o.verlauf,
            eintrag(
              "notiz",
              plan.posten.length === 1
                ? "Verkaufsplanung gespeichert: 1 Posten"
                : `Verkaufsplanung gespeichert: ${plan.posten.length} Posten`,
            ),
          ],
        })),

      zuruecksetzen: () => {
        setObjekte(START.objekte);
        setRegister(START.register);
      },

      register,
      kategorien,

      kontaktSpeichern: (k) => {
        const neu = register.some((r) => r.id === k.id)
          ? register.map((r) => (r.id === k.id ? k : r))
          : [...register, k];
        setRegister(neu);
        setObjekte((alt) => alt.map((o) => kopienAktualisieren(o, neu)));
      },

      kontaktNotiz: (kontaktId, text) =>
        setRegister((alt) =>
          alt.map((r) =>
            r.id === kontaktId
              ? {
                  ...r,
                  notizen: [
                    ...r.notizen,
                    { id: neueKontaktId(), zeitpunkt: new Date().toISOString(), text },
                  ],
                }
              : r,
          ),
        ),

      kontaktLoeschen: (kontaktId) => {
        if (objekte.some((o) => o.kontakte.some((k) => k.kontaktId === kontaktId))) return;
        setRegister((alt) => alt.filter((r) => r.id !== kontaktId));
      },

      kontaktVerknuepfen: (objektId, kontaktId, rolle) => {
        const r = register.find((x) => x.id === kontaktId);
        if (!r) return;
        mutieren(objektId, (o) =>
          kopienAktualisieren(
            {
              ...o,
              kontakte: [
                ...o.kontakte,
                {
                  id: neueId("kon"),
                  rolle,
                  name: "",
                  telefon: null,
                  email: null,
                  notiz: null,
                  kontaktId,
                },
              ],
              verlauf: [...o.verlauf, eintrag("notiz", "Kontakte gepflegt", false)],
            },
            register,
          ),
        );
      },

      kategorienSetzen: (k) => setKategorien(k),
    }),
    [objekte, register, kategorien, bereit, mutieren],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useObjekte(): StoreWert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error("useObjekte braucht einen ObjekteProvider.");
  return wert;
}
