/**
 * Mock-Anmeldung für Phase 1.
 *
 * Es gibt genau einen Nutzer und kein Passwort-Backend. Die Sitzung liegt im
 * localStorage. In Phase 2 wird das durch Supabase Auth ersetzt — die
 * Schnittstelle (`useAuth`) bleibt dabei gleich, damit nur diese Datei
 * getauscht werden muss.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export interface Nutzer {
  name: string;
  rolle: string;
  email: string;
  initialen: string;
}

const TIMO: Nutzer = {
  name: "Timo Birk",
  rolle: "Geschäftsführung",
  email: "timo.birk@revest-projekt.de",
  initialen: "TB",
};

/** Phase 1: ein Zugang, fest hinterlegt. Kein Geheimnis, nur eine Tür. */
const ZUGANG = { kennung: "timo.birk@revest-projekt.de", kennwort: "%Revest20!" };

const SPEICHER = "revest.sitzung";

interface AuthWert {
  nutzer: Nutzer | null;
  bereit: boolean;
  anmelden: (kennung: string, kennwort: string) => { ok: boolean; fehler?: string };
  abmelden: () => void;
}

const Kontext = createContext<AuthWert | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [nutzer, setNutzer] = useState<Nutzer | null>(null);
  const [bereit, setBereit] = useState(false);

  // Erst nach dem Mount lesen — auf dem Server gibt es kein localStorage.
  useEffect(() => {
    try {
      if (localStorage.getItem(SPEICHER) === "1") setNutzer(TIMO);
    } catch {
      // Privater Modus ohne Speicherzugriff: dann eben ohne Sitzung.
    }
    setBereit(true);
  }, []);

  const anmelden = useCallback((kennung: string, kennwort: string) => {
    const passt =
      kennung.trim().toLowerCase() === ZUGANG.kennung && kennwort === ZUGANG.kennwort;
    if (!passt) return { ok: false, fehler: "E-Mail oder Passwort stimmt nicht." };
    try {
      localStorage.setItem(SPEICHER, "1");
    } catch {
      /* siehe oben */
    }
    setNutzer(TIMO);
    return { ok: true };
  }, []);

  const abmelden = useCallback(() => {
    try {
      localStorage.removeItem(SPEICHER);
    } catch {
      /* siehe oben */
    }
    setNutzer(null);
  }, []);

  const wert = useMemo(
    () => ({ nutzer, bereit, anmelden, abmelden }),
    [nutzer, bereit, anmelden, abmelden],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useAuth(): AuthWert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error("useAuth braucht einen AuthProvider.");
  return wert;
}
