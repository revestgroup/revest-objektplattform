/**
 * Einstellungen im Browser.
 *
 * Gleiche Bauart wie die übrigen Speicher. Unbekannte Schlüssel aus einem
 * älteren Stand werden still durch die Standardwerte ergänzt — sonst fehlt
 * nach jeder neuen Option ein Schalter.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { STANDARD, type Einstellungen, type Schluessel } from "./einstellungen";

const SPEICHER = "revest.einstellungen.v1";

interface StoreWert {
  einstellungen: Einstellungen;
  bereit: boolean;
  setzen: (schluessel: Schluessel, wert: boolean) => void;
  umschalten: (schluessel: Schluessel) => void;
  zuruecksetzen: () => void;
}

const Kontext = createContext<StoreWert | null>(null);

export function EinstellungenProvider({ children }: { children: ReactNode }) {
  const [einstellungen, setEinstellungen] = useState<Einstellungen>(STANDARD);
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    try {
      const roh = localStorage.getItem(SPEICHER);
      if (roh) setEinstellungen({ ...STANDARD, ...(JSON.parse(roh) as Partial<Einstellungen>) });
    } catch {
      // Beschädigter Stand: mit den Standardwerten weiterarbeiten.
    }
    setBereit(true);
  }, []);

  useEffect(() => {
    if (!bereit) return;
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(einstellungen));
    } catch {
      // Speicher voll oder gesperrt — die Sitzung läuft trotzdem weiter.
    }
  }, [einstellungen, bereit]);

  const setzen = useCallback(
    (schluessel: Schluessel, wert: boolean) =>
      setEinstellungen((alt) => ({ ...alt, [schluessel]: wert })),
    [],
  );

  const wert = useMemo<StoreWert>(
    () => ({
      einstellungen,
      bereit,
      setzen,
      umschalten: (schluessel) =>
        setEinstellungen((alt) => ({ ...alt, [schluessel]: !alt[schluessel] })),
      zuruecksetzen: () => setEinstellungen(STANDARD),
    }),
    [einstellungen, bereit, setzen],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useEinstellungen(): StoreWert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error("useEinstellungen braucht einen EinstellungenProvider.");
  return wert;
}
