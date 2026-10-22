/**
 * Leads im Browser.
 *
 * In Phase 2 schreibt das Formular der Leadseite direkt in dieselbe Tabelle.
 * Deshalb kennt der Speicher schon jetzt den Unterschied zwischen einem
 * selbst angelegten und einem eingegangenen Lead — geändert wird daran
 * später nichts mehr.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { Lead, Leadstatus } from "./leads";
import { MOCK_LEADS } from "./mockLeads";

const SPEICHER = "revest.leads.v1";

export type LeadEntwurf = Omit<Lead, "id" | "eingegangenAm">;

interface StoreWert {
  leads: Lead[];
  bereit: boolean;
  anlegen: (entwurf: LeadEntwurf) => Lead;
  aendern: (id: string, teil: Partial<Lead>) => void;
  statusSetzen: (id: string, status: Leadstatus) => void;
  loeschen: (id: string) => void;
  zuruecksetzen: () => void;
}

const Kontext = createContext<StoreWert | null>(null);

let zaehler = Date.now();
function neueId(praefix: string) {
  zaehler += 1;
  return `${praefix}-${zaehler.toString(36)}`;
}

export function LeadProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    try {
      const roh = localStorage.getItem(SPEICHER);
      if (roh) setLeads(JSON.parse(roh) as Lead[]);
    } catch {
      // Beschädigter Stand: mit den Mock-Daten weiterarbeiten.
    }
    setBereit(true);
  }, []);

  useEffect(() => {
    if (!bereit) return;
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(leads));
    } catch {
      // Speicher voll oder gesperrt — die Sitzung läuft trotzdem weiter.
    }
  }, [leads, bereit]);

  const mutieren = useCallback(
    (id: string, teil: Partial<Lead>) =>
      setLeads((alt) => alt.map((l) => (l.id === id ? { ...l, ...teil } : l))),
    [],
  );

  const wert = useMemo<StoreWert>(
    () => ({
      leads,
      bereit,

      anlegen: (entwurf) => {
        const neu: Lead = { ...entwurf, id: neueId("lead"), eingegangenAm: new Date().toISOString() };
        setLeads((alt) => [neu, ...alt]);
        return neu;
      },

      aendern: mutieren,
      statusSetzen: (id, status) => mutieren(id, { status }),
      loeschen: (id) => setLeads((alt) => alt.filter((l) => l.id !== id)),
      zuruecksetzen: () => setLeads(MOCK_LEADS),
    }),
    [leads, bereit, mutieren],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useLeads(): StoreWert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error("useLeads braucht einen LeadProvider.");
  return wert;
}
