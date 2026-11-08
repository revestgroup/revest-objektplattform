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
import { STANDARD_VORGABEN, type EtwVorgaben } from "./kalkulationEtw";

const SPEICHER = "revest.einstellungen.v1";
/** Eigener Schlüssel: Zahlen statt Schalter, und ein Zurücksetzen der Schalter soll sie nicht treffen. */
const SPEICHER_VORGABEN = "revest.kalkulationsvorgaben.v1";

interface StoreWert {
  einstellungen: Einstellungen;
  bereit: boolean;
  setzen: (schluessel: Schluessel, wert: boolean) => void;
  umschalten: (schluessel: Schluessel) => void;
  zuruecksetzen: () => void;
  /** Standardwerte der ETW-Kalkulation. */
  vorgaben: EtwVorgaben;
  vorgabenSetzen: (teil: Partial<Omit<EtwVorgaben, "preise">>) => void;
  /** Null nimmt den Katalogpreis zurück. */
  preisSetzen: (id: string, preis: number | null) => void;
  vorgabenZuruecksetzen: () => void;
}

const Kontext = createContext<StoreWert | null>(null);

export function EinstellungenProvider({ children }: { children: ReactNode }) {
  const [einstellungen, setEinstellungen] = useState<Einstellungen>(STANDARD);
  const [vorgaben, setVorgaben] = useState<EtwVorgaben>(STANDARD_VORGABEN);
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    try {
      const roh = localStorage.getItem(SPEICHER);
      if (roh) setEinstellungen({ ...STANDARD, ...(JSON.parse(roh) as Partial<Einstellungen>) });
      const rohV = localStorage.getItem(SPEICHER_VORGABEN);
      if (rohV) {
        const v = JSON.parse(rohV) as Partial<EtwVorgaben>;
        // Bis Feinschliff B war der Abzug „für die €/m²-Betrachtung“ mit
        // 30.000 € vorbelegt und wurde mitgespeichert. Seit er „Abzug
        // Stellplatz / Garage“ heißt, ist der Standard 0.
        if (v.abzugQm === 30_000) delete v.abzugQm;
        setVorgaben({ ...STANDARD_VORGABEN, ...v, preise: { ...(v.preise ?? {}) } });
      }
    } catch {
      // Beschädigter Stand: mit den Standardwerten weiterarbeiten.
    }
    setBereit(true);
  }, []);

  useEffect(() => {
    if (!bereit) return;
    try {
      localStorage.setItem(SPEICHER_VORGABEN, JSON.stringify(vorgaben));
    } catch {
      // siehe unten
    }
  }, [vorgaben, bereit]);

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
      vorgaben,
      vorgabenSetzen: (teil) => setVorgaben((alt) => ({ ...alt, ...teil })),
      preisSetzen: (id, preis) =>
        setVorgaben((alt) => {
          const preise = { ...alt.preise };
          if (preis === null) delete preise[id];
          else preise[id] = preis;
          return { ...alt, preise };
        }),
      vorgabenZuruecksetzen: () => setVorgaben(STANDARD_VORGABEN),
    }),
    [einstellungen, vorgaben, bereit, setzen],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useEinstellungen(): StoreWert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error("useEinstellungen braucht einen EinstellungenProvider.");
  return wert;
}
