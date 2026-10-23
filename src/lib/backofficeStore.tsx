/**
 * Die Belegablage im Browser.
 *
 * Gleiche Bauart wie die anderen Speicher: React-State, Spiegel im
 * localStorage, eine Funktion pro Handgriff. Später übernimmt die Scanstrecke
 * das Anlegen und schreibt den Index in Supabase — die Oberfläche merkt davon
 * nichts, weil sie nur diese Schnittstelle kennt.
 *
 * `bestaetigen` ist absichtlich umkehrbar: wer zu schnell abnickt, soll den
 * Beleg zurück in den Posteingang holen können, statt ihn zu suchen.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { Beleg, BelegEntwurf } from "./backoffice";
import { MOCK_BELEGE } from "./mockBackoffice";

const SPEICHER = "revest.backoffice.v1";

interface StoreWert {
  belege: Beleg[];
  bereit: boolean;
  anlegen: (entwurf: BelegEntwurf) => Beleg;
  aendern: (id: string, teil: Partial<Beleg>) => void;
  loeschen: (id: string) => void;
  /** Abnicken oder zurück in den Posteingang holen. */
  bestaetigen: (id: string, ja: boolean) => void;
  zuruecksetzen: () => void;
}

const Kontext = createContext<StoreWert | null>(null);

let zaehler = Date.now();
function neueId(praefix: string) {
  zaehler += 1;
  return `${praefix}-${zaehler.toString(36)}`;
}

export function BackofficeProvider({ children }: { children: ReactNode }) {
  const [belege, setBelege] = useState<Beleg[]>(MOCK_BELEGE);
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    try {
      const roh = localStorage.getItem(SPEICHER);
      if (roh) setBelege(JSON.parse(roh) as Beleg[]);
    } catch {
      // Beschädigter Stand: lieber mit den Mock-Daten weiterarbeiten.
    }
    setBereit(true);
  }, []);

  useEffect(() => {
    if (!bereit) return;
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(belege));
    } catch {
      // Speicher voll oder gesperrt — die Sitzung läuft trotzdem weiter.
    }
  }, [belege, bereit]);

  const mutieren = useCallback(
    (id: string, bauen: (b: Beleg) => Beleg) =>
      setBelege((alt) => alt.map((b) => (b.id === id ? bauen(b) : b))),
    [],
  );

  const wert = useMemo<StoreWert>(
    () => ({
      belege,
      bereit,

      anlegen: (entwurf) => {
        const neu: Beleg = {
          ...entwurf,
          id: neueId("bel"),
          bestaetigtAm: null,
          gescanntAm: new Date().toISOString(),
          driveLink: null,
        };
        setBelege((alt) => [neu, ...alt]);
        return neu;
      },

      aendern: (id, teil) => mutieren(id, (b) => ({ ...b, ...teil })),

      loeschen: (id) => setBelege((alt) => alt.filter((b) => b.id !== id)),

      bestaetigen: (id, ja) =>
        mutieren(id, (b) => ({ ...b, bestaetigtAm: ja ? new Date().toISOString() : null })),

      zuruecksetzen: () => setBelege(MOCK_BELEGE),
    }),
    [belege, bereit, mutieren],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useBackoffice(): StoreWert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error("useBackoffice braucht einen BackofficeProvider.");
  return wert;
}
