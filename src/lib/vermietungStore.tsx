/**
 * Mietgarantien im Browser.
 *
 * Gleiche Bauart wie der Objektspeicher: State plus localStorage-Spiegel,
 * Mutationen in der Form, die sie in Phase 2 mit Supabase behalten.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { MOCK_GARANTIEN } from "./mockVermietung";
import type { Mietgarantie, Zimmer } from "./vermietung";

const SPEICHER = "revest.garantien.v1";

export type GarantieEntwurf = Omit<Mietgarantie, "id">;

interface StoreWert {
  garantien: Mietgarantie[];
  bereit: boolean;
  anlegen: (entwurf: GarantieEntwurf) => Mietgarantie;
  aendern: (id: string, teil: Partial<Mietgarantie>) => void;
  loeschen: (id: string) => void;
  /** Zimmer belegen oder freiräumen — der häufigste Handgriff bei WGs. */
  zimmerSetzen: (id: string, zimmerId: string, teil: Partial<Zimmer>) => void;
  zimmerAnlegen: (id: string) => void;
  zimmerLoeschen: (id: string, zimmerId: string) => void;
  zuruecksetzen: () => void;
}

const Kontext = createContext<StoreWert | null>(null);

let zaehler = Date.now();
function neueId(praefix: string) {
  zaehler += 1;
  return `${praefix}-${zaehler.toString(36)}`;
}

export function VermietungProvider({ children }: { children: ReactNode }) {
  const [garantien, setGarantien] = useState<Mietgarantie[]>(MOCK_GARANTIEN);
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    try {
      const roh = localStorage.getItem(SPEICHER);
      if (roh) setGarantien(JSON.parse(roh) as Mietgarantie[]);
    } catch {
      // Beschädigter Stand: mit den Mock-Daten weiterarbeiten.
    }
    setBereit(true);
  }, []);

  useEffect(() => {
    if (!bereit) return;
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(garantien));
    } catch {
      // Speicher voll oder gesperrt — die Sitzung läuft trotzdem weiter.
    }
  }, [garantien, bereit]);

  const mutieren = useCallback(
    (id: string, bauen: (g: Mietgarantie) => Mietgarantie) =>
      setGarantien((alt) => alt.map((g) => (g.id === id ? bauen(g) : g))),
    [],
  );

  const wert = useMemo<StoreWert>(
    () => ({
      garantien,
      bereit,

      anlegen: (entwurf) => {
        const neu: Mietgarantie = { ...entwurf, id: neueId("mg") };
        setGarantien((alt) => [neu, ...alt]);
        return neu;
      },

      aendern: (id, teil) => mutieren(id, (g) => ({ ...g, ...teil })),

      loeschen: (id) => setGarantien((alt) => alt.filter((g) => g.id !== id)),

      zimmerSetzen: (id, zimmerId, teil) =>
        mutieren(id, (g) => ({
          ...g,
          zimmer: g.zimmer.map((z) => (z.id === zimmerId ? { ...z, ...teil } : z)),
        })),

      zimmerAnlegen: (id) =>
        mutieren(id, (g) => ({
          ...g,
          zimmer: [
            ...g.zimmer,
            {
              id: neueId("z"),
              bezeichnung: `Zimmer ${g.zimmer.length + 1}`,
              flaeche: null,
              miete: 0,
              mieter: null,
              einzugAm: null,
            },
          ],
        })),

      zimmerLoeschen: (id, zimmerId) =>
        mutieren(id, (g) => ({ ...g, zimmer: g.zimmer.filter((z) => z.id !== zimmerId) })),

      zuruecksetzen: () => setGarantien(MOCK_GARANTIEN),
    }),
    [garantien, bereit, mutieren],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useVermietung(): StoreWert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error("useVermietung braucht einen VermietungProvider.");
  return wert;
}
