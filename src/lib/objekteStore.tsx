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
  Dokument,
  Einheit,
  Objekt,
  Teilungserklaerung,
  Verkaufsplan,
  Verlaufseintrag,
} from "./objekte";
import { TEILUNGSSTATUS, f } from "./objekte";
import { MOCK_OBJEKTE } from "./mockDaten";

/**
 * Versionierter Schlüssel. Ändert sich die Form von `Objekt`, wird die Zahl
 * erhöht — ein alter Stand ohne die neuen Felder würde sonst beim Rechnen
 * über halbe Objekte stolpern.
 */
const SPEICHER = "revest.objekte.v5";

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
  zuruecksetzen: () => void;
}

const Kontext = createContext<StoreWert | null>(null);

let zaehler = Date.now();
function neueId(praefix: string) {
  zaehler += 1;
  return `${praefix}-${zaehler.toString(36)}`;
}

function eintrag(art: Verlaufseintrag["art"], text: string): Verlaufseintrag {
  return { id: neueId("v"), zeitpunkt: new Date().toISOString(), art, text };
}

export function ObjekteProvider({ children }: { children: ReactNode }) {
  const [objekte, setObjekte] = useState<Objekt[]>(MOCK_OBJEKTE);
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    try {
      const roh = localStorage.getItem(SPEICHER);
      if (roh) setObjekte(JSON.parse(roh) as Objekt[]);
    } catch {
      // Beschädigter Stand: lieber mit den Mock-Daten weiterarbeiten.
    }
    setBereit(true);
  }, []);

  useEffect(() => {
    if (!bereit) return;
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(fuerSpeicher(objekte)));
    } catch {
      // Speicher voll oder gesperrt — die Sitzung läuft trotzdem weiter.
    }
  }, [objekte, bereit]);

  /** Einzige Stelle, die ein Objekt verändert. Hält den Verlauf automatisch mit. */
  const mutieren = useCallback(
    (id: string, bauen: (o: Objekt) => Objekt) =>
      setObjekte((alt) => alt.map((o) => (o.id === id ? bauen(o) : o))),
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
          verlauf: verlaufstext ? [...o.verlauf, eintrag("notiz", verlaufstext)] : o.verlauf,
        })),

      loeschen: (id) => setObjekte((alt) => alt.filter((o) => o.id !== id)),

      stufeSetzen: (id, stufe) =>
        mutieren(id, (o) =>
          o.stufe === stufe
            ? o
            : {
                ...o,
                stufe,
                verlauf: [...o.verlauf, eintrag("status", `Stufe auf ${stufe} gesetzt`)],
              },
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

          return {
            ...o,
            stufe: "angekauft",
            angekauftAm: a.datum,
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
        mutieren(id, (o) => ({ ...o, verlauf: [...o.verlauf, eintrag("notiz", text)] })),

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

      einheitenSetzen: (id, einheiten) => mutieren(id, (o) => ({ ...o, einheiten })),

      einheitVerkaufen: (id, einheitId, v) =>
        mutieren(id, (o) => {
          const e = o.einheiten.find((x) => x.id === einheitId);
          return {
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
          };
        }),

      einheitVerkaufZurueck: (id, einheitId, status, grund) =>
        mutieren(id, (o) => {
          const e = o.einheiten.find((x) => x.id === einheitId);
          // Der Wunschpreis bleibt stehen: er war vor dem Verkauf der geführte
          // Preis und ist nach der Rücknahme wieder genau das.
          return {
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
          };
        }),

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

      zuruecksetzen: () => setObjekte(MOCK_OBJEKTE),
    }),
    [objekte, bereit, mutieren],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useObjekte(): StoreWert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error("useObjekte braucht einen ObjekteProvider.");
  return wert;
}
