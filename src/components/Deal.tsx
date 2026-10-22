/**
 * Der Ankaufsabschluss — und sein Gegenteil.
 *
 * Ein Deal ist kein Statuswechsel, sondern ein Vorgang: es gibt einen Preis,
 * ein Datum, eine Entscheidung über die Verwertung und die Frage, ob
 * aufgeteilt wird. Genau das fragt dieser Dialog ab, in einem Zug. Danach
 * liegt das Objekt in den Projekten und die Reiter im Detail wechseln mit.
 *
 * Deshalb sitzt der Knopf oben im Objekt und nicht unten bei den Stufenpillen:
 * wer kauft, sucht keine Einstellung.
 */
import { Check, Handshake, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import {
  OBJEKTARTEN,
  istEinzelwohnung,
  f,
  type Objekt,
} from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { cn } from "../lib/utils";
import { Schalter, Segmente, Textfeld, Zahlfeld } from "./Felder";

/** Heute als ISO-Datum — die Vorbelegung für jeden Notartermin. */
function heute() {
  return new Date().toISOString().slice(0, 10);
}

function zahl(s: string): number | null {
  const n = Number(s.replace(",", "."));
  return s.trim() === "" || Number.isNaN(n) ? null : n;
}

/* ------------------------------------------------------------------ */
/* Die Knöpfe im Objektkopf                                             */
/* ------------------------------------------------------------------ */

/**
 * Grün heißt Geld, und Grün ist die einzige Farbe, die in dieser Oberfläche
 * etwas Positives behauptet. Die Absage daneben ist absichtlich still: sie
 * muss erreichbar sein, aber nicht einladen.
 */
export function DealKnoepfe({ objekt }: { objekt: Objekt }) {
  const [dialog, setDialog] = useState<"deal" | "absage" | null>(null);

  if (objekt.stufe === "angekauft") return null;

  return (
    <>
      {/* Die Farbe steht inline, weil `.druckbar:hover` ungelayert ist und
          jede Tailwind-Hintergrundklasse schlägt — grün muss grün bleiben. */}
      <button
        type="button"
        onClick={() => setDialog("deal")}
        style={{ backgroundColor: "#17935C" }}
        className="druckbar flex items-center gap-2 rounded-full px-5 py-2.5 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-white shadow-karte"
      >
        <Handshake size={14} strokeWidth={2.25} />
        Deal — Objekt ankaufen
      </button>

      {objekt.stufe !== "abgesagt" && (
        <button
          type="button"
          onClick={() => setDialog("absage")}
          className="druckbar flex items-center gap-2 rounded-full border border-linie px-4 py-2.5 text-[0.7rem] font-medium text-grau-stark hover:border-linie-stark hover:text-tinte"
        >
          <X size={13} strokeWidth={2} />
          Kein Deal
        </button>
      )}

      {dialog === "deal" && <DealDialog objekt={objekt} schliessen={() => setDialog(null)} />}
      {dialog === "absage" && <AbsageDialog objekt={objekt} schliessen={() => setDialog(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Dialograhmen                                                         */
/* ------------------------------------------------------------------ */

/**
 * Liegt über der Schublade, deshalb z-60. Auf dem Telefon kommt er von unten
 * und ist oben abgerundet — am Daumen ist das die Bewegung, die man erwartet;
 * auf dem Schirm steht er mittig.
 */
function Dialog({
  titel,
  unterzeile,
  schliessen,
  children,
}: {
  titel: string;
  unterzeile: string;
  schliessen: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const beiTaste = (e: KeyboardEvent) => {
      if (e.key === "Escape") schliessen();
    };
    window.addEventListener("keydown", beiTaste);
    return () => window.removeEventListener("keydown", beiTaste);
  }, [schliessen]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div
        aria-hidden
        onClick={schliessen}
        className="schleier absolute inset-0 bg-tinte/35 backdrop-blur-[3px]"
      />
      <div
        role="dialog"
        aria-label={titel}
        className="eintritt relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-flaeche shadow-schwebe sm:max-w-[560px] sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4 md:px-8 md:pt-7">
          <div className="min-w-0">
            <h2 className="headline text-[1.25rem] md:text-[1.4rem]">{titel}</h2>
            <p className="mt-1.5 text-[0.74rem] leading-relaxed text-grau">{unterzeile}</p>
          </div>
          <button
            type="button"
            onClick={schliessen}
            aria-label="Schließen"
            className="druckbar -mt-1 -mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-grau hover:text-tinte"
          >
            <X size={17} strokeWidth={2} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 md:px-8">{children}</div>
      </div>
    </div>
  );
}

/** Abschluss-Leiste. Der bestätigende Knopf steht rechts und trägt die Farbe. */
function Leiste({
  abbrechen,
  bestaetigen,
  titel,
  ton,
  gesperrt,
}: {
  abbrechen: () => void;
  bestaetigen: () => void;
  titel: string;
  ton: "gruen" | "still";
  gesperrt?: boolean;
}) {
  return (
    <div className="mt-7 flex flex-wrap items-center justify-end gap-2.5 border-t border-linie pt-5">
      <button
        type="button"
        onClick={abbrechen}
        className="druckbar rounded-full px-4 py-2.5 text-[0.7rem] font-medium text-grau-stark hover:text-tinte"
      >
        Abbrechen
      </button>
      <button
        type="button"
        onClick={bestaetigen}
        disabled={gesperrt}
        className={cn(
          "druckbar flex items-center gap-2 rounded-full px-5 py-2.5 text-[0.7rem] font-semibold tracking-[0.1em] uppercase shadow-karte disabled:opacity-35",
          ton === "gruen" ? "text-white" : "bg-tinte text-grund",
        )}
        style={ton === "gruen" ? { backgroundColor: "#17935C" } : undefined}
      >
        <Check size={14} strokeWidth={2.5} />
        {titel}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Deal                                                                 */
/* ------------------------------------------------------------------ */

function DealDialog({ objekt, schliessen }: { objekt: Objekt; schliessen: () => void }) {
  const { dealAbschliessen } = useObjekte();
  const wohnung = istEinzelwohnung(objekt);

  const [preis, setPreis] = useState(objekt.kaufpreis !== null ? String(objekt.kaufpreis) : "");
  const [datum, setDatum] = useState(heute());
  // Der Notar aus den Kontakten ist fast immer der richtige — und wenn nicht,
  // steht er schon im Feld und muss nur überschrieben werden.
  const [notar, setNotar] = useState(
    objekt.kontakte.find((k) => k.rolle === "notar")?.name ?? "",
  );
  const [weg, setWeg] = useState<"etw" | "wg">(objekt.vertriebsweg === "wg" ? "wg" : "etw");
  const [zimmer, setZimmer] = useState(objekt.wgZimmer ? String(objekt.wgZimmer) : "");
  const [etw, setEtw] = useState(
    String(objekt.aufteilung?.etw ?? objekt.anzahlEinheiten ?? 0),
  );
  const [wg, setWg] = useState(String(objekt.aufteilung?.wg ?? 0));
  const [teilung, setTeilung] = useState(Boolean(objekt.teilung));
  const [versucht, setVersucht] = useState(false);

  const preisWert = zahl(preis);
  const etwWert = Math.max(0, Math.round(zahl(etw) ?? 0));
  const wgWert = Math.max(0, Math.round(zahl(wg) ?? 0));
  const summe = etwWert + wgWert;
  const soll = objekt.anzahlEinheiten;

  const preisFehler = versucht && preisWert === null ? "Ohne Preis ist der Deal nicht belegt." : "";

  function bestaetigen() {
    setVersucht(true);
    if (preisWert === null) return;
    dealAbschliessen(objekt.id, {
      preis: preisWert,
      datum,
      vertriebsweg: wohnung ? weg : null,
      wgZimmer: wohnung && weg === "wg" ? Math.round(zahl(zimmer) ?? 0) || null : null,
      aufteilung: wohnung ? null : { etw: etwWert, wg: wgWert },
      teilungStarten: teilung,
      notar: notar.trim() || null,
    });
    schliessen();
  }

  return (
    <Dialog
      titel="Deal abschließen"
      unterzeile={`${objekt.strasse}, ${objekt.stadt} · ${OBJEKTARTEN[objekt.objektart]}. Danach liegt das Objekt in den Projekten.`}
      schliessen={schliessen}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <Zahlfeld
          id="deal-preis"
          label="Beurkundeter Kaufpreis"
          wert={preis}
          setWert={setPreis}
          einheit="€"
          pflicht
          fehler={preisFehler}
          hinweis={
            objekt.kaufpreis !== null && preisWert !== null && preisWert !== objekt.kaufpreis
              ? `Zuvor geführt mit ${f.eur(objekt.kaufpreis)} — die Kennzahlen rechnen ab jetzt mit dem neuen Wert.`
              : "Wird in die Preisgeschichte übernommen."
          }
        />

        <div>
          <label htmlFor="deal-datum" className="mini-label block">
            Beurkundet am
          </label>
          <input
            id="deal-datum"
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="zahl mt-2 w-full rounded-xl border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] text-tinte focus:border-linie-stark focus:outline-none"
          />
        </div>

        <Textfeld
          id="deal-notar"
          label="Notariat"
          wert={notar}
          setWert={setNotar}
          platzhalter="Notariat Dr. Bäuerle, Ulm"
          breit
          hinweis="Landet als Quelle in der Preisgeschichte."
        />
      </div>

      {/* ----- Verwertung ----- */}
      <div className="mt-7 border-t border-linie pt-6">
        <div className="mini-label">Verwertung</div>
        <p className="mt-1.5 max-w-prose text-[0.72rem] leading-relaxed text-grau">
          {wohnung
            ? "Geht die Wohnung in den Vertrieb oder bleibt sie als WG im Bestand? Davon hängt ab, ob sie eine Mietgarantie bekommt."
            : "Wie viele Einheiten verkaufen wir, wie viele halten wir als WG? Die Zahlen dürfen später wachsen — gefragt wird jetzt, weil ab hier Geld daran hängt."}
        </p>

        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {wohnung ? (
            <>
              <Segmente
                label="Nutzung"
                wert={weg}
                setWert={setWeg}
                optionen={[
                  { wert: "etw", titel: "Eigentum (ETW)" },
                  { wert: "wg", titel: "WG-Vermietung" },
                ]}
                breit={weg === "etw"}
              />
              {weg === "wg" && (
                <Zahlfeld
                  id="deal-zimmer"
                  label="Zimmer in der WG"
                  wert={zimmer}
                  setWert={setZimmer}
                  einheit="Zi."
                  hinweis="Jedes Zimmer wird später ein Platz in der Mietgarantie."
                />
              )}
            </>
          ) : (
            <>
              <Zahlfeld
                id="deal-etw"
                label="Als ETW verkaufen"
                wert={etw}
                setWert={setEtw}
                einheit="Einh."
              />
              <Zahlfeld
                id="deal-wg"
                label="Als WG halten"
                wert={wg}
                setWert={setWg}
                einheit="Einh."
              />
            </>
          )}
        </div>

        {/* Die Summenprüfung ist ein Hinweis, keine Sperre: eine Einheit darf
            unverplant bleiben, etwa eine Gewerbefläche im Erdgeschoss. */}
        {!wohnung && soll !== null && summe !== soll && (
          <p className="mt-3.5 rounded-xl bg-flaeche-hoch px-3.5 py-2.5 text-[0.72rem] leading-relaxed text-grau-stark">
            <span className="zahl">{summe}</span> von{" "}
            <span className="zahl">{soll}</span> Einheiten verplant
            {summe < soll ? " — der Rest bleibt offen." : " — mehr als im Bestand hinterlegt."}
          </p>
        )}
      </div>

      {/* ----- Teilungserklärung ----- */}
      <div className="mt-7 border-t border-linie pt-6">
        <div className="mini-label">Teilungserklärung</div>
        <p className="mt-1.5 max-w-prose text-[0.72rem] leading-relaxed text-grau">
          Nur mit Haken wird der Reiter im Objekt nutzbar. Ohne Aufteilung gibt
          es dort nichts abzulegen — und ein leerer Reiter ist schlimmer als
          keiner.
        </p>
        <div className="mt-3.5">
          <Schalter
            label="Teilungserklärung jetzt anstoßen"
            hinweis={
              !wohnung && etwWert > 0
                ? "Für den Verkauf einzelner Wohnungen ist sie Voraussetzung."
                : "Kann später im Objekt nachgeholt werden."
            }
            an={teilung}
            setAn={setTeilung}
          />
        </div>
      </div>

      <Leiste
        abbrechen={schliessen}
        bestaetigen={bestaetigen}
        titel="Deal bestätigen"
        ton="gruen"
      />
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Absage                                                               */
/* ------------------------------------------------------------------ */

/**
 * Vorgefertigte Gründe, weil die vier Fälle in Ulm fast alles abdecken — und
 * weil ein freies Feld nach zwei Jahren „zu teuer gewesen" heißt, was beim
 * Wiederauftauchen des Objekts nichts mehr erklärt.
 */
const GRUENDE = [
  "Preis über unserem Limit",
  "Substanz zu schlecht",
  "Verkäufer hat abgebrochen",
  "Anderweitig verkauft",
  "Lage passt nicht",
];

function AbsageDialog({ objekt, schliessen }: { objekt: Objekt; schliessen: () => void }) {
  const { absagen } = useObjekte();
  const [grund, setGrund] = useState("");

  return (
    <Dialog
      titel="Kein Deal"
      unterzeile={`${objekt.strasse}, ${objekt.stadt}. Das Objekt bleibt im Ankauf stehen — mitsamt allen Kontakten.`}
      schliessen={schliessen}
    >
      <div className="mini-label">Grund</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {GRUENDE.map((g) => {
          const aktiv = grund === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setGrund(aktiv ? "" : g)}
              aria-pressed={aktiv}
              className={cn(
                "druckbar rounded-full border px-3.5 py-2 text-[0.7rem] font-medium",
                aktiv
                  ? "border-tinte bg-tinte text-grund hover:bg-tinte"
                  : "border-linie bg-flaeche text-grau-stark hover:border-linie-stark",
              )}
            >
              {g}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <Textfeld
          id="absage-grund"
          label="Oder eigener Grund"
          wert={grund}
          setWert={setGrund}
          platzhalter="Was genau nicht gepasst hat"
          zeilen={3}
          breit
          hinweis="Steht später im Verlauf. Beim zweiten Anlauf ist das die erste Frage."
        />
      </div>

      <Leiste
        abbrechen={schliessen}
        bestaetigen={() => {
          absagen(objekt.id, grund);
          schliessen();
        }}
        titel="Absage festhalten"
        ton="still"
      />
    </Dialog>
  );
}
