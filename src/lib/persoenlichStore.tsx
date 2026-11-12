/**
 * Persönliches im Browser — eigener Schlüssel `revest.persoenlich.v1`,
 * getrennt von den Geschäftsdaten. Bilder liegen als verkleinerte data:-URL
 * darin; wird der Speicher voll, meldet `speicherFehler` das, statt still zu
 * verlieren.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { tagIso } from "./cockpit";
import {
  schieben as schiebenRein,
  startstand,
  verschieben as verschiebenRein,
  type Kachel,
  type Persoenlich,
  type PrivatesZiel,
} from "./persoenlich";

const SPEICHER = "revest.persoenlich.v1";

let zaehler = Date.now();
function neueId(praefix: string) {
  zaehler += 1;
  return `${praefix}-${zaehler.toString(36)}`;
}

type Quartale = [boolean, boolean, boolean, boolean];

interface StoreWert extends Persoenlich {
  bereit: boolean;
  /** Gesetzt, wenn der letzte Speicherversuch scheiterte (meist: Bilder zu groß). */
  speicherFehler: boolean;
  fokusSetzen: (text: string) => void;
  warumSetzen: (text: string) => void;
  impulsWeiter: () => void;
  kachelAnlegen: (k: Omit<Kachel, "id">) => void;
  kachelAendern: (id: string, teil: Partial<Kachel>) => void;
  kachelEntfernen: (id: string) => void;
  kachelVerschieben: (id: string, zielId: string) => void;
  kachelSchieben: (id: string, richtung: -1 | 1) => void;
  geschaeftQuartalUmschalten: (schluessel: string, q: number) => void;
  zielAnlegen: (name: string) => void;
  zielAendern: (id: string, teil: Partial<PrivatesZiel>) => void;
  zielEntfernen: (id: string) => void;
  ideeAnlegen: (text: string) => void;
  ideeEntfernen: (id: string) => void;
}

const Kontext = createContext<StoreWert | null>(null);

export function PersoenlichProvider({ children }: { children: ReactNode }) {
  const [stand, setStand] = useState<Persoenlich>(() => startstand(neueId));
  const [bereit, setBereit] = useState(false);
  const [speicherFehler, setSpeicherFehler] = useState(false);

  useEffect(() => {
    try {
      const roh = localStorage.getItem(SPEICHER);
      if (roh) setStand((alt) => ({ ...alt, ...(JSON.parse(roh) as Partial<Persoenlich>) }));
    } catch {
      // Beschädigter Stand: mit leerem Board weiter.
    }
    setBereit(true);
  }, []);

  useEffect(() => {
    if (!bereit) return;
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(stand));
      setSpeicherFehler(false);
    } catch {
      setSpeicherFehler(true);
    }
  }, [stand, bereit]);

  const wert = useMemo<StoreWert>(() => {
    const aendern = (bauen: (s: Persoenlich) => Persoenlich) => setStand(bauen);
    const ziel = (id: string, bauen: (z: PrivatesZiel) => PrivatesZiel) =>
      aendern((s) => ({
        ...s,
        privateZiele: s.privateZiele.map((z) => (z.id === id ? bauen(z) : z)),
      }));
    return {
      ...stand,
      bereit,
      speicherFehler,

      fokusSetzen: (text) =>
        aendern((s) => ({ ...s, fokus: { ...s.fokus, [tagIso(new Date())]: text } })),
      warumSetzen: (text) => aendern((s) => ({ ...s, warum: text })),
      impulsWeiter: () =>
        aendern((s) => {
          const heute = tagIso(new Date());
          const versatz = s.impuls.am === heute ? s.impuls.versatz + 1 : 1;
          return { ...s, impuls: { am: heute, versatz } };
        }),

      kachelAnlegen: (k) =>
        aendern((s) => ({ ...s, board: [...s.board, { ...k, id: neueId("kac") }] })),
      kachelAendern: (id, teil) =>
        aendern((s) => ({
          ...s,
          board: s.board.map((k) => (k.id === id ? { ...k, ...teil, id } : k)),
        })),
      kachelEntfernen: (id) =>
        aendern((s) => ({ ...s, board: s.board.filter((k) => k.id !== id) })),
      kachelVerschieben: (id, zielId) =>
        aendern((s) => ({ ...s, board: verschiebenRein(s.board, id, zielId) })),
      kachelSchieben: (id, richtung) =>
        aendern((s) => ({ ...s, board: schiebenRein(s.board, id, richtung) })),

      geschaeftQuartalUmschalten: (schluessel, q) =>
        aendern((s) => {
          const alt: Quartale = s.geschaeftQuartale[schluessel] ?? [false, false, false, false];
          const neu = [...alt] as Quartale;
          neu[q] = !neu[q];
          return { ...s, geschaeftQuartale: { ...s.geschaeftQuartale, [schluessel]: neu } };
        }),
      zielAnlegen: (name) => {
        const n = name.trim();
        if (!n) return;
        aendern((s) => ({
          ...s,
          privateZiele: [
            ...s.privateZiele,
            {
              id: neueId("ziel"),
              name: n,
              stand: "",
              fortschritt: 0,
              quartale: [false, false, false, false],
            },
          ],
        }));
      },
      zielAendern: (id, teil) => ziel(id, (z) => ({ ...z, ...teil, id })),
      zielEntfernen: (id) =>
        aendern((s) => ({ ...s, privateZiele: s.privateZiele.filter((z) => z.id !== id) })),

      ideeAnlegen: (text) => {
        const t = text.trim();
        if (!t) return;
        aendern((s) => ({
          ...s,
          ideen: [
            { id: neueId("idee"), text: t, angelegtAm: new Date().toISOString() },
            ...s.ideen,
          ],
        }));
      },
      ideeEntfernen: (id) => aendern((s) => ({ ...s, ideen: s.ideen.filter((i) => i.id !== id) })),
    };
  }, [stand, bereit, speicherFehler]);

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function usePersoenlich(): StoreWert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error("usePersoenlich braucht einen PersoenlichProvider.");
  return wert;
}
