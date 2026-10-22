/**
 * Mietgarantien und Mieter im Browser.
 *
 * Beides liegt in einem Speicher, weil die Zuordnung über beide Listen geht:
 * wer einem Zimmer zugewiesen wird, verändert gleichzeitig die Ist-Miete der
 * Garantie. Zwei getrennte Speicher könnten auseinanderlaufen.
 *
 * Gleiche Bauart wie der Objektspeicher: State plus localStorage-Spiegel,
 * Mutationen in der Form, die sie in Phase 2 mit Supabase behalten.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { Mieter } from "./mieter";
import { MOCK_MIETER } from "./mockMieter";
import { MOCK_GARANTIEN } from "./mockVermietung";
import type { Mietgarantie, Zimmer } from "./vermietung";

const SPEICHER = "revest.vermietung.v2";

export type GarantieEntwurf = Omit<Mietgarantie, "id">;
export type MieterEntwurf = Omit<Mieter, "id">;

interface Stand {
  garantien: Mietgarantie[];
  mieter: Mieter[];
}

interface StoreWert extends Stand {
  bereit: boolean;

  anlegen: (entwurf: GarantieEntwurf) => Mietgarantie;
  aendern: (id: string, teil: Partial<Mietgarantie>) => void;
  loeschen: (id: string) => void;
  /** Zuschnitt des Zimmers — Bezeichnung, Fläche, Sollmiete. */
  zimmerSetzen: (id: string, zimmerId: string, teil: Partial<Zimmer>) => void;
  zimmerAnlegen: (id: string) => void;
  zimmerLoeschen: (id: string, zimmerId: string) => void;

  mieterAnlegen: (entwurf: MieterEntwurf) => Mieter;
  mieterAendern: (id: string, teil: Partial<Mieter>) => void;
  mieterLoeschen: (id: string) => void;
  /**
   * Einem Mieter einen Platz geben. `zimmerId` nur bei WGs. Die Miete kommt
   * aus dem Zimmer bzw. der Einheit, lässt sich danach aber überschreiben.
   */
  zuordnen: (mieterId: string, garantieId: string, zimmerId: string | null) => void;
  /** Platz wieder freigeben, ohne den Mieter zu verlieren. */
  freigeben: (mieterId: string) => void;

  zuruecksetzen: () => void;
}

const Kontext = createContext<StoreWert | null>(null);

const FRISCH: Stand = { garantien: MOCK_GARANTIEN, mieter: MOCK_MIETER };

let zaehler = Date.now();
function neueId(praefix: string) {
  zaehler += 1;
  return `${praefix}-${zaehler.toString(36)}`;
}

export function VermietungProvider({ children }: { children: ReactNode }) {
  const [stand, setStand] = useState<Stand>(FRISCH);
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    try {
      const roh = localStorage.getItem(SPEICHER);
      if (roh) setStand(JSON.parse(roh) as Stand);
    } catch {
      // Beschädigter Stand: mit den Mock-Daten weiterarbeiten.
    }
    setBereit(true);
  }, []);

  useEffect(() => {
    if (!bereit) return;
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(stand));
    } catch {
      // Speicher voll oder gesperrt — die Sitzung läuft trotzdem weiter.
    }
  }, [stand, bereit]);

  const mutieren = useCallback(
    (id: string, bauen: (g: Mietgarantie) => Mietgarantie) =>
      setStand((alt) => ({
        ...alt,
        garantien: alt.garantien.map((g) => (g.id === id ? bauen(g) : g)),
      })),
    [],
  );

  const mieterMutieren = useCallback(
    (id: string, bauen: (m: Mieter) => Mieter) =>
      setStand((alt) => ({ ...alt, mieter: alt.mieter.map((m) => (m.id === id ? bauen(m) : m)) })),
    [],
  );

  const wert = useMemo<StoreWert>(
    () => ({
      garantien: stand.garantien,
      mieter: stand.mieter,
      bereit,

      anlegen: (entwurf) => {
        const neu: Mietgarantie = { ...entwurf, id: neueId("mg") };
        setStand((alt) => ({ ...alt, garantien: [neu, ...alt.garantien] }));
        return neu;
      },

      aendern: (id, teil) => mutieren(id, (g) => ({ ...g, ...teil })),

      // Mit der Garantie fällt auch die Zuordnung der Mieter weg — sonst
      // zeigen sie auf eine Einheit, die es nicht mehr gibt.
      loeschen: (id) =>
        setStand((alt) => ({
          garantien: alt.garantien.filter((g) => g.id !== id),
          mieter: alt.mieter.map((m) =>
            m.garantieId === id ? { ...m, garantieId: null, zimmerId: null } : m,
          ),
        })),

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
            },
          ],
        })),

      zimmerLoeschen: (id, zimmerId) =>
        setStand((alt) => ({
          garantien: alt.garantien.map((g) =>
            g.id === id ? { ...g, zimmer: g.zimmer.filter((z) => z.id !== zimmerId) } : g,
          ),
          mieter: alt.mieter.map((m) => (m.zimmerId === zimmerId ? { ...m, zimmerId: null } : m)),
        })),

      mieterAnlegen: (entwurf) => {
        const neu: Mieter = { ...entwurf, id: neueId("mt") };
        setStand((alt) => ({ ...alt, mieter: [neu, ...alt.mieter] }));
        return neu;
      },

      mieterAendern: (id, teil) => mieterMutieren(id, (m) => ({ ...m, ...teil })),

      mieterLoeschen: (id) =>
        setStand((alt) => ({ ...alt, mieter: alt.mieter.filter((m) => m.id !== id) })),

      zuordnen: (mieterId, garantieId, zimmerId) =>
        setStand((alt) => {
          const g = alt.garantien.find((x) => x.id === garantieId);
          const soll = zimmerId
            ? (g?.zimmer.find((z) => z.id === zimmerId)?.miete ?? null)
            : (g?.sollmiete ?? null);

          return {
            ...alt,
            mieter: alt.mieter.map((m) =>
              m.id === mieterId
                ? {
                    ...m,
                    garantieId,
                    zimmerId,
                    // Eine schon verhandelte Miete bleibt stehen.
                    miete: m.miete ?? soll,
                    status: MIETERSTATUS_BELEGT.includes(m.status) ? m.status : "zugeordnet",
                  }
                : m,
            ),
          };
        }),

      freigeben: (mieterId) =>
        mieterMutieren(mieterId, (m) => ({ ...m, garantieId: null, zimmerId: null })),

      zuruecksetzen: () => setStand(FRISCH),
    }),
    [stand, bereit, mutieren, mieterMutieren],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

/** Status, die eine Zuordnung schon voraussetzen — die bleiben beim Zuordnen stehen. */
const MIETERSTATUS_BELEGT: Mieter["status"][] = ["zugeordnet", "vertrag_raus", "eingezogen"];

export function useVermietung(): StoreWert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error("useVermietung braucht einen VermietungProvider.");
  return wert;
}
