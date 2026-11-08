/**
 * Ankauf-Eingang im Browser — gleiche Bauart wie die übrigen Speicher.
 * Exposé-Vorschauen (blob:) überleben keinen Reload und werden vor dem
 * Speichern geleert.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { STANDARD_SUCHPROFIL, type Angebotseingang, type Suchprofil } from "./eingang";
import { MOCK_EINGANG } from "./mockEingang";

const SPEICHER = "revest.eingang.v1";
const SPEICHER_PROFIL = "revest.suchprofil.v1";

let zaehler = Date.now();
export function neueEingangsId() {
  zaehler += 1;
  return `ein-${zaehler.toString(36)}`;
}

interface StoreWert {
  eingaenge: Angebotseingang[];
  suchprofil: Suchprofil;
  bereit: boolean;
  erfassen: (e: Angebotseingang) => void;
  aendern: (id: string, teil: Partial<Angebotseingang>) => void;
  /** Gesichtet: interessant (mit dem Objekt, das daraus wurde) oder aussortiert. */
  sichten: (
    id: string,
    status: "interessant" | "aussortiert",
    teil?: Partial<Angebotseingang>,
  ) => void;
  /** Zurück in den Eingang — falls ein Tastendruck danebenging. */
  zuruecknehmen: (id: string) => void;
  suchprofilSetzen: (p: Suchprofil) => void;
  /** Zurück auf die Beispiele und das Standardprofil. */
  zuruecksetzen: () => void;
}

const Kontext = createContext<StoreWert | null>(null);

export function EingangProvider({ children }: { children: ReactNode }) {
  const [eingaenge, setEingaenge] = useState<Angebotseingang[]>(MOCK_EINGANG);
  const [suchprofil, setSuchprofil] = useState<Suchprofil>(STANDARD_SUCHPROFIL);
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    try {
      const roh = localStorage.getItem(SPEICHER);
      if (roh) setEingaenge(JSON.parse(roh) as Angebotseingang[]);
      const rohP = localStorage.getItem(SPEICHER_PROFIL);
      if (rohP)
        setSuchprofil({ ...STANDARD_SUCHPROFIL, ...(JSON.parse(rohP) as Partial<Suchprofil>) });
    } catch {
      // Beschädigter Stand: mit den Beispielen weiterarbeiten.
    }
    setBereit(true);
  }, []);

  useEffect(() => {
    if (!bereit) return;
    try {
      const ohneVorschau = eingaenge.map((e) =>
        e.expose ? { ...e, expose: { name: e.expose.name } } : e,
      );
      localStorage.setItem(SPEICHER, JSON.stringify(ohneVorschau));
      localStorage.setItem(SPEICHER_PROFIL, JSON.stringify(suchprofil));
    } catch {
      // Speicher voll oder gesperrt — die Sitzung läuft trotzdem weiter.
    }
  }, [eingaenge, suchprofil, bereit]);

  const wert = useMemo<StoreWert>(() => {
    const mutieren = (id: string, bauen: (e: Angebotseingang) => Angebotseingang) =>
      setEingaenge((alt) => alt.map((e) => (e.id === id ? bauen(e) : e)));
    return {
      eingaenge,
      suchprofil,
      bereit,
      erfassen: (e) => setEingaenge((alt) => [e, ...alt]),
      aendern: (id, teil) => mutieren(id, (e) => ({ ...e, ...teil })),
      sichten: (id, status, teil) =>
        mutieren(id, (e) => ({ ...e, ...teil, status, gesichtetAm: new Date().toISOString() })),
      zuruecknehmen: (id) =>
        mutieren(id, (e) => ({ ...e, status: "offen", grund: null, gesichtetAm: null })),
      suchprofilSetzen: setSuchprofil,
      zuruecksetzen: () => {
        setEingaenge(MOCK_EINGANG);
        setSuchprofil(STANDARD_SUCHPROFIL);
      },
    };
  }, [eingaenge, suchprofil, bereit]);

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useEingang(): StoreWert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error("useEingang braucht einen EingangProvider.");
  return wert;
}
