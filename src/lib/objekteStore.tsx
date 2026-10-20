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

import type { Dokument, Einheit, Objekt, Verlaufseintrag } from "./objekte";
import { MOCK_OBJEKTE } from "./mockDaten";

/**
 * Versionierter Schlüssel. Ändert sich die Form von `Objekt`, wird die Zahl
 * erhöht — ein alter Stand ohne die neuen Felder würde sonst beim Rechnen
 * über halbe Objekte stolpern.
 */
const SPEICHER = "revest.objekte.v2";

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

interface StoreWert {
  objekte: Objekt[];
  /** Vor dem ersten Hydrieren rendert die Liste nichts — sonst blitzt der Mock-Stand auf. */
  bereit: boolean;
  objekt: (id: string) => Objekt | undefined;
  anlegen: (entwurf: ObjektEntwurf) => Objekt;
  aendern: (id: string, teil: Partial<Objekt>, verlaufstext?: string) => void;
  loeschen: (id: string) => void;
  stufeSetzen: (id: string, stufe: Objekt["stufe"]) => void;
  notizAnhaengen: (id: string, text: string) => void;
  dokumenteAnhaengen: (id: string, dokumente: Omit<Dokument, "id" | "hochgeladenAm">[]) => void;
  dokumentLoeschen: (id: string, dokumentId: string) => void;
  einheitenSetzen: (id: string, einheiten: Einheit[]) => void;
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
