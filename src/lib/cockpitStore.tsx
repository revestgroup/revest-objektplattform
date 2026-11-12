/**
 * Cockpit im Browser — gleiche Bauart wie die übrigen Speicher.
 *
 * Die Rolle steht unter eigenem Schlüssel. Gedanken, Fragen an Timo,
 * Sprint-Punkte, Bereiche und die Vermerke von „Heute auf dem Tisch“ liegen
 * zusammen unter `revest.cockpit.v1`, ebenso Backoffice-Routinen, ihre Haken
 * (zugleich Zeiterfassung) und die von Hand angelegten Mails des Posteingangs.
 * Persönliches liegt getrennt in `persoenlichStore.tsx`.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  ANTWORTEN_STANDARD,
  STANDARD_BEREICHE,
  rolleLesen,
  tagIso,
  type Frage,
  type Gedanke,
  type Gedankenziel,
  type Rolle,
  type Sprintpunkt,
  type Tischvermerk,
  type Tischwahl,
} from "./cockpit";
import type { Mailvorschlag, Posteingangsmail } from "./posteingang";
import {
  STANDARD_ROUTINEN,
  abgehakt,
  type Routinehaken,
  type Routinen,
  type Routinepunkt,
} from "./routine";

const SPEICHER_ROLLE = "revest.rolle.v1";
const SPEICHER = "revest.cockpit.v1";

interface Stand {
  gedanken: Gedanke[];
  fragen: Frage[];
  sprintpunkte: Sprintpunkt[];
  bereiche: string[];
  tisch: Record<string, Tischvermerk>;
  routinen: Routinen;
  haken: Routinehaken[];
  mails: Posteingangsmail[];
}

const LEER: Stand = {
  gedanken: [],
  fragen: [],
  sprintpunkte: [],
  bereiche: STANDARD_BEREICHE,
  tisch: {},
  routinen: STANDARD_ROUTINEN,
  haken: [],
  mails: [],
};

interface StoreWert extends Stand {
  rolle: Rolle;
  bereit: boolean;
  rolleSetzen: (r: Rolle) => void;

  gedankeErfassen: (text: string) => void;
  /** Ziel setzen; `verweisId` ist die Aufgabe/Karte, die daraus wurde. */
  gedankeSortieren: (id: string, ziel: Gedankenziel, verweisId?: string | null) => void;
  gedankeZuruecknehmen: (id: string) => void;

  frageStellen: (
    f: Omit<Frage, "id" | "gestelltAm" | "antwort" | "beantwortetAm" | "antworten"> & {
      antworten?: [string, string];
    },
  ) => Frage;
  frageBeantworten: (id: string, antwort: string | null) => void;

  sprintpunktSpeichern: (p: Omit<Sprintpunkt, "id"> & { id?: string }) => void;
  sprintpunktLoeschen: (id: string) => void;
  bereichHinzufuegen: (name: string) => void;

  tischSetzen: (schluessel: string, wahl: Tischwahl | null) => void;

  /** Haken setzen oder (am selben Tag bzw. in derselben Woche) wieder entfernen. */
  routineUmschalten: (punkt: Routinepunkt, art: "tag" | "woche") => void;
  routinenSetzen: (r: Routinen) => void;

  mailAnlegen: (
    m: Omit<Posteingangsmail, "id" | "status" | "erledigtAm" | "verweis" | "quelle" | "externeId">,
  ) => void;
  mailVorschlagSetzen: (id: string, teil: Partial<Mailvorschlag>) => void;
  mailUebernommen: (id: string, verweis: string | null) => void;
  mailZuruecknehmen: (id: string) => void;
  mailLoeschen: (id: string) => void;
}

const Kontext = createContext<StoreWert | null>(null);

let zaehler = Date.now();
function neueId(praefix: string) {
  zaehler += 1;
  return `${praefix}-${zaehler.toString(36)}`;
}

export function CockpitProvider({ children }: { children: ReactNode }) {
  const [rolle, setRolle] = useState<Rolle>("gf");
  const [stand, setStand] = useState<Stand>(LEER);
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    try {
      setRolle(rolleLesen(localStorage.getItem(SPEICHER_ROLLE)));
      const roh = localStorage.getItem(SPEICHER);
      if (roh) setStand({ ...LEER, ...(JSON.parse(roh) as Partial<Stand>) });
    } catch {
      // Beschädigter oder gesperrter Speicher: leer anfangen.
    }
    setBereit(true);
  }, []);

  useEffect(() => {
    if (!bereit) return;
    try {
      localStorage.setItem(SPEICHER_ROLLE, rolle);
      localStorage.setItem(SPEICHER, JSON.stringify(stand));
    } catch {
      // Speicher voll oder gesperrt — die Sitzung läuft trotzdem weiter.
    }
  }, [rolle, stand, bereit]);

  const wert = useMemo<StoreWert>(() => {
    const aendern = (bauen: (s: Stand) => Stand) => setStand(bauen);
    return {
      ...stand,
      rolle,
      bereit,
      rolleSetzen: setRolle,

      gedankeErfassen: (text) => {
        const t = text.trim();
        if (!t) return;
        const g: Gedanke = {
          id: neueId("ged"),
          text: t,
          angelegtAm: new Date().toISOString(),
          ziel: null,
          sortiertAm: null,
          verweisId: null,
          zustaendig: "gf",
          quelle: "hand",
          externeId: null,
          kiVorschlag: null,
        };
        aendern((s) => ({ ...s, gedanken: [g, ...s.gedanken] }));
      },
      gedankeSortieren: (id, ziel, verweisId = null) =>
        aendern((s) => ({
          ...s,
          gedanken: s.gedanken.map((g) =>
            g.id === id
              ? {
                  ...g,
                  ziel,
                  verweisId,
                  sortiertAm: new Date().toISOString(),
                  zustaendig: ziel === "backoffice" ? "backoffice" : "gf",
                }
              : g,
          ),
        })),
      gedankeZuruecknehmen: (id) =>
        aendern((s) => ({
          ...s,
          gedanken: s.gedanken.map((g) =>
            g.id === id
              ? { ...g, ziel: null, sortiertAm: null, verweisId: null, zustaendig: "gf" }
              : g,
          ),
        })),

      frageStellen: (f) => {
        const neu: Frage = {
          ...f,
          antworten: f.antworten ?? ANTWORTEN_STANDARD,
          id: neueId("frg"),
          gestelltAm: new Date().toISOString(),
          antwort: null,
          beantwortetAm: null,
        };
        aendern((s) => ({ ...s, fragen: [neu, ...s.fragen] }));
        return neu;
      },
      frageBeantworten: (id, antwort) =>
        aendern((s) => ({
          ...s,
          fragen: s.fragen.map((f) =>
            f.id === id
              ? { ...f, antwort, beantwortetAm: antwort ? new Date().toISOString() : null }
              : f,
          ),
        })),

      sprintpunktSpeichern: (p) =>
        aendern((s) => {
          if (p.id && s.sprintpunkte.some((x) => x.id === p.id))
            return {
              ...s,
              sprintpunkte: s.sprintpunkte.map((x) =>
                x.id === p.id ? { ...x, ...p, id: x.id } : x,
              ),
            };
          return { ...s, sprintpunkte: [...s.sprintpunkte, { ...p, id: neueId("spr") }] };
        }),
      sprintpunktLoeschen: (id) =>
        aendern((s) => ({ ...s, sprintpunkte: s.sprintpunkte.filter((x) => x.id !== id) })),
      bereichHinzufuegen: (name) => {
        const n = name.trim();
        if (!n) return;
        aendern((s) => (s.bereiche.includes(n) ? s : { ...s, bereiche: [...s.bereiche, n] }));
      },

      routineUmschalten: (punkt, art) =>
        aendern((s) => {
          const heute = new Date();
          const treffer = abgehakt(s.haken, punkt.id, art, heute);
          if (treffer) return { ...s, haken: s.haken.filter((h) => h !== treffer) };
          const neu: Routinehaken = {
            punktId: punkt.id,
            datum: tagIso(heute),
            minuten: punkt.minuten,
            kategorie: punkt.kategorie,
          };
          return { ...s, haken: [...s.haken, neu] };
        }),
      routinenSetzen: (r) => aendern((s) => ({ ...s, routinen: r })),

      mailAnlegen: (m) =>
        aendern((s) => ({
          ...s,
          mails: [
            {
              ...m,
              id: neueId("mail"),
              status: "offen",
              erledigtAm: null,
              verweis: null,
              quelle: "hand",
              externeId: null,
            },
            ...s.mails,
          ],
        })),
      mailVorschlagSetzen: (id, teil) =>
        aendern((s) => ({
          ...s,
          mails: s.mails.map((m) =>
            m.id === id ? { ...m, vorschlag: { ...m.vorschlag, ...teil } } : m,
          ),
        })),
      mailUebernommen: (id, verweis) =>
        aendern((s) => ({
          ...s,
          mails: s.mails.map((m) =>
            m.id === id
              ? { ...m, status: "uebernommen", erledigtAm: new Date().toISOString(), verweis }
              : m,
          ),
        })),
      mailZuruecknehmen: (id) =>
        aendern((s) => ({
          ...s,
          mails: s.mails.map((m) =>
            m.id === id ? { ...m, status: "offen", erledigtAm: null, verweis: null } : m,
          ),
        })),
      mailLoeschen: (id) => aendern((s) => ({ ...s, mails: s.mails.filter((m) => m.id !== id) })),

      tischSetzen: (schluessel, wahl) =>
        aendern((s) => {
          const tisch = { ...s.tisch };
          if (wahl) tisch[schluessel] = { wahl, am: tagIso(new Date()) };
          else delete tisch[schluessel];
          return { ...s, tisch };
        }),
    };
  }, [stand, rolle, bereit]);

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useCockpit(): StoreWert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error("useCockpit braucht einen CockpitProvider.");
  return wert;
}
