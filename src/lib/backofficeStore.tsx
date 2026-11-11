/**
 * Backoffice im Browser — gleiche Bauart wie die übrigen Speicher: State plus
 * localStorage-Spiegel. Dateivorschauen (blob:) überleben keinen Reload und
 * werden vor dem Speichern geleert; die Karte selbst bleibt.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  artAusName,
  titelAusName,
  Uebergabefehler,
  archivieren as archivierenRein,
  uebergabeSetzen as uebergabeSetzenRein,
  weiterleiten as weiterleitenRein,
  zurueckholen as zurueckholenRein,
  type Uebergabestatus,
  type Backofficekarte,
  type Spalte,
  type Weiterleitung,
} from "./backoffice";
import type { Mail } from "./mailToBoard";
import { MOCK_BACKOFFICE } from "./mockBackoffice";

const SPEICHER = "revest.backoffice.v1";

let zaehler = Date.now();
export function neueKartenId(praefix = "bo") {
  zaehler += 1;
  return `${praefix}-${zaehler.toString(36)}`;
}

interface StoreWert {
  karten: Backofficekarte[];
  bereit: boolean;
  /** Je Datei eine Karte im Posteingang. */
  dateienAufnehmen: (dateien: File[]) => void;
  /** Reines To-do ohne Datei. */
  todoAnlegen: (titel: string) => Backofficekarte;
  /** Mail to Board: eine Karte im Posteingang, Anhang als Datei, Text als Notiz. */
  mailAufnehmen: (mail: Mail, objektId: string | null) => Backofficekarte;
  aendern: (id: string, teil: Partial<Backofficekarte>) => void;
  verschieben: (id: string, spalte: Spalte) => void;
  weiterleiten: (id: string, ziel: Weiterleitung, details: string) => void;
  /** Gibt den Fehlertext zurück, wenn etwas fehlt (Nachweis, Grund) — sonst null. */
  uebergabeSetzen: (
    id: string,
    status: Uebergabestatus,
    angaben: { link?: string | null; grund?: string | null },
    wer?: string | null,
  ) => string | null;
  archivieren: (id: string, wer?: string | null) => void;
  zurueckholen: (id: string) => void;
  loeschen: (id: string) => void;
}

const Kontext = createContext<StoreWert | null>(null);

function vermerk(k: Backofficekarte, text: string): Backofficekarte {
  return { ...k, verlauf: [...k.verlauf, { zeitpunkt: new Date().toISOString(), text }] };
}

export function BackofficeProvider({ children }: { children: ReactNode }) {
  const [karten, setKarten] = useState<Backofficekarte[]>(MOCK_BACKOFFICE);
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    try {
      const roh = localStorage.getItem(SPEICHER);
      if (roh) setKarten(JSON.parse(roh) as Backofficekarte[]);
    } catch {
      // Beschädigter Stand: mit den Beispielkarten weiterarbeiten.
    }
    setBereit(true);
  }, []);

  useEffect(() => {
    if (!bereit) return;
    try {
      const ohneVorschau = karten.map((k) =>
        k.datei ? { ...k, datei: { ...k.datei, vorschau: null } } : k,
      );
      localStorage.setItem(SPEICHER, JSON.stringify(ohneVorschau));
    } catch {
      // Speicher voll oder gesperrt — die Sitzung läuft trotzdem weiter.
    }
  }, [karten, bereit]);

  const mutieren = useCallback(
    (id: string, bauen: (k: Backofficekarte) => Backofficekarte) =>
      setKarten((alt) => alt.map((k) => (k.id === id ? bauen(k) : k))),
    [],
  );

  const wert = useMemo<StoreWert>(
    () => ({
      karten,
      bereit,

      dateienAufnehmen: (dateien) => {
        const jetzt = new Date().toISOString();
        const neu = dateien.map((d): Backofficekarte => ({
          id: neueKartenId(),
          titel: titelAusName(d.name),
          spalte: "posteingang",
          art: artAusName(d.name),
          quelle: "upload",
          eingangAm: jetzt,
          datei: {
            name: d.name,
            typ: d.type,
            groesseKb: Math.max(1, Math.round(d.size / 1024)),
            vorschau: URL.createObjectURL(d),
          },
          objektId: null,
          gesellschaft: null,
          faelligAm: null,
          notizen: null,
          checkliste: [],
          zugewiesen: null,
          uebergabe: null,
          verlauf: [{ zeitpunkt: jetzt, text: `Hochgeladen: ${d.name}` }],
        }));
        setKarten((alt) => [...neu, ...alt]);
      },

      mailAufnehmen: (mail, objektId) => {
        const jetzt = new Date().toISOString();
        const [erster, ...weitere] = mail.anhaenge;
        const von = mail.absender
          ? `${mail.absender}${mail.absenderEmail ? ` <${mail.absenderEmail}>` : ""}`
          : mail.absenderEmail;
        const k: Backofficekarte = {
          id: neueKartenId(),
          titel: mail.betreff ?? (mail.absender ? `Mail von ${mail.absender}` : "Mail"),
          spalte: "posteingang",
          art: artAusName(`${mail.betreff ?? ""} ${mail.anhaenge.map((a) => a.name).join(" ")}`),
          quelle: "mail",
          eingangAm: mail.datum ?? jetzt,
          datei: erster
            ? {
                name: erster.name,
                typ: erster.typ,
                groesseKb: erster.inhalt ? Math.max(1, Math.round(erster.inhalt.length / 1024)) : 1,
                vorschau: erster.inhalt
                  ? URL.createObjectURL(
                      new Blob([erster.inhalt as BlobPart], { type: erster.typ || undefined }),
                    )
                  : null,
              }
            : null,
          objektId,
          gesellschaft: null,
          faelligAm: null,
          notizen:
            [
              von ? `Von: ${von}` : null,
              mail.text || null,
              weitere.length ? `Weitere Anhänge: ${weitere.map((a) => a.name).join(", ")}` : null,
            ]
              .filter(Boolean)
              .join("\n\n") || null,
          checkliste: [],
          zugewiesen: null,
          uebergabe: null,
          verlauf: [{ zeitpunkt: jetzt, text: `Per Mail eingegangen${von ? ` von ${von}` : ""}` }],
        };
        setKarten((alt) => [k, ...alt]);
        return k;
      },

      todoAnlegen: (titel) => {
        const jetzt = new Date().toISOString();
        const k: Backofficekarte = {
          id: neueKartenId(),
          titel,
          spalte: "posteingang",
          art: "todo",
          quelle: "hand",
          eingangAm: jetzt,
          datei: null,
          objektId: null,
          gesellschaft: null,
          faelligAm: null,
          notizen: null,
          checkliste: [],
          zugewiesen: null,
          uebergabe: null,
          verlauf: [{ zeitpunkt: jetzt, text: "Karte angelegt" }],
        };
        setKarten((alt) => [k, ...alt]);
        return k;
      },

      aendern: (id, teil) => mutieren(id, (k) => ({ ...k, ...teil })),

      verschieben: (id, spalte) =>
        mutieren(id, (k) =>
          k.spalte === spalte
            ? k
            : vermerk({ ...k, spalte }, `Verschoben nach ${spalte.replace("_", " ")}`),
        ),

      weiterleiten: (id, ziel, details) => mutieren(id, (k) => weiterleitenRein(k, ziel, details)),

      uebergabeSetzen: (id, status, angaben, wer) => {
        const k = karten.find((x) => x.id === id);
        if (!k) return "Karte nicht gefunden.";
        try {
          const neu = uebergabeSetzenRein(k, status, angaben, new Date(), wer);
          mutieren(id, () => neu);
          return null;
        } catch (e) {
          if (e instanceof Uebergabefehler) return e.message;
          throw e;
        }
      },

      archivieren: (id, wer) => mutieren(id, (k) => archivierenRein(k, new Date(), wer)),

      zurueckholen: (id) => mutieren(id, (k) => zurueckholenRein(k)),

      loeschen: (id) => setKarten((alt) => alt.filter((k) => k.id !== id)),
    }),
    [karten, bereit, mutieren],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useBackoffice(): StoreWert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error("useBackoffice braucht einen BackofficeProvider.");
  return wert;
}
