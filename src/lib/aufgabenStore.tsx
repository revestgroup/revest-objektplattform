/**
 * Die Aufgabenliste im Browser.
 *
 * Gleiche Bauart wie die anderen Speicher: React-State, Spiegel im
 * localStorage, eine Mutations-Funktion pro Handgriff. Der Haken ist
 * absichtlich umkehrbar — man verklickt sich, und eine erledigte Aufgabe
 * wiederherzustellen darf nicht bedeuten, sie neu zu tippen.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { Aufgabe, AufgabenEntwurf } from "./aufgaben";
import { MOCK_AUFGABEN } from "./mockAufgaben";

const SPEICHER = "revest.aufgaben.v1";

interface StoreWert {
  aufgaben: Aufgabe[];
  bereit: boolean;
  anlegen: (entwurf: AufgabenEntwurf) => Aufgabe;
  aendern: (id: string, teil: Partial<Aufgabe>) => void;
  loeschen: (id: string) => void;
  /** Haken setzen oder wieder entfernen. */
  umschalten: (id: string) => void;
  zuruecksetzen: () => void;
}

const Kontext = createContext<StoreWert | null>(null);

let zaehler = Date.now();
function neueId(praefix: string) {
  zaehler += 1;
  return `${praefix}-${zaehler.toString(36)}`;
}

export function AufgabenProvider({ children }: { children: ReactNode }) {
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>(MOCK_AUFGABEN);
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    try {
      const roh = localStorage.getItem(SPEICHER);
      if (roh) setAufgaben(JSON.parse(roh) as Aufgabe[]);
    } catch {
      // Beschädigter Stand: lieber mit den Mock-Daten weiterarbeiten.
    }
    setBereit(true);
  }, []);

  useEffect(() => {
    if (!bereit) return;
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(aufgaben));
    } catch {
      // Speicher voll oder gesperrt — die Sitzung läuft trotzdem weiter.
    }
  }, [aufgaben, bereit]);

  const mutieren = useCallback(
    (id: string, bauen: (a: Aufgabe) => Aufgabe) =>
      setAufgaben((alt) => alt.map((a) => (a.id === id ? bauen(a) : a))),
    [],
  );

  const wert = useMemo<StoreWert>(
    () => ({
      aufgaben,
      bereit,

      anlegen: (entwurf) => {
        const neu: Aufgabe = {
          ...entwurf,
          id: neueId("auf"),
          erledigtAm: null,
          angelegtAm: new Date().toISOString(),
        };
        setAufgaben((alt) => [neu, ...alt]);
        return neu;
      },

      aendern: (id, teil) => mutieren(id, (a) => ({ ...a, ...teil })),

      loeschen: (id) => setAufgaben((alt) => alt.filter((a) => a.id !== id)),

      umschalten: (id) =>
        mutieren(id, (a) => ({
          ...a,
          erledigtAm: a.erledigtAm ? null : new Date().toISOString(),
        })),

      zuruecksetzen: () => setAufgaben(MOCK_AUFGABEN),
    }),
    [aufgaben, bereit, mutieren],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useAufgaben(): StoreWert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error("useAufgaben braucht einen AufgabenProvider.");
  return wert;
}
