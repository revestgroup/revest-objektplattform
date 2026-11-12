/**
 * Cockpit im Browser — gleiche Bauart wie die übrigen Speicher.
 *
 * Bis jetzt nur die Rolle („Ich arbeite gerade als …“). Gedanken, Fragen,
 * Sprint-Punkte und Routinen kommen in den nächsten Blöcken dazu; persönliche
 * Daten bekommen dann einen eigenen Schlüssel.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { rolleLesen, type Rolle } from "./cockpit";

const SPEICHER_ROLLE = "revest.rolle.v1";

interface StoreWert {
  rolle: Rolle;
  bereit: boolean;
  rolleSetzen: (r: Rolle) => void;
}

const Kontext = createContext<StoreWert | null>(null);

export function CockpitProvider({ children }: { children: ReactNode }) {
  const [rolle, setRolle] = useState<Rolle>("gf");
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    try {
      setRolle(rolleLesen(localStorage.getItem(SPEICHER_ROLLE)));
    } catch {
      // Gesperrter Speicher: Geschäftsführung.
    }
    setBereit(true);
  }, []);

  useEffect(() => {
    if (!bereit) return;
    try {
      localStorage.setItem(SPEICHER_ROLLE, rolle);
    } catch {
      // Speicher voll oder gesperrt — die Sitzung läuft trotzdem weiter.
    }
  }, [rolle, bereit]);

  const wert = useMemo<StoreWert>(
    () => ({ rolle, bereit, rolleSetzen: setRolle }),
    [rolle, bereit],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useCockpit(): StoreWert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error("useCockpit braucht einen CockpitProvider.");
  return wert;
}
