/**
 * Objektprüfung: der Reiter „Prüfung“, das Ampel-Abzeichen für Liste und
 * Übersicht, und der Hinweis beim Stufenwechsel.
 */
import { AlertTriangle, Banknote, Send } from "lucide-react";
import { useState, type ReactNode } from "react";

import { STUFEN, type Ankaufsstufe, type Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { Anforderungsdialog, Finanzierungsdialog } from "./PruefungDialoge";
import { Eigentuemerdialog } from "./Eigentuemerliste";
import {
  AMPEL_FARBE,
  UNTERLAGENGRUPPEN,
  UNTERLAGENSTATUS,
  grundbuchstand,
  type Unterlagengruppe,
  pruefpunkteFuer,
  pruefstand,
  punktstatus,
  unterlagenFuer,
  unterlagenstatus,
  warnungFuer,
  zugeordneteDatei,
  type Pruefstand,
  type Pruefung,
  type Punktstatus,
  type Unterlagenstatus,
} from "../lib/pruefung";
import { cn } from "../lib/utils";
import { Dialog } from "./Dialog";

/* ------------------------------------------------------------------ */
/* Abzeichen                                                            */
/* ------------------------------------------------------------------ */

export function Pruefzeichen({
  objekt,
  className,
  kurz,
}: {
  objekt: Objekt;
  className?: string;
  /** Nur „x/18“ — wenn die Überschrift daneben schon „Checkliste Ankauf“ sagt. */
  kurz?: boolean;
}) {
  const s = pruefstand(objekt);
  const t = AMPEL_FARBE[s.ampel];
  return (
    <span
      title={
        s.kritisch.length > 0
          ? `Kritisch: ${s.kritisch.join(", ")}`
          : s.offenePflicht.length > 0
            ? `Basis fehlt: ${s.offenePflicht.join(", ")}`
            : "Alle Basis-Unterlagen da, nichts kritisch"
      }
      className={cn(
        "zahl inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6rem] font-semibold",
        className,
      )}
      style={{ background: t.weich, color: t.tief }}
    >
      <span aria-hidden className="size-[7px] rounded-full" style={{ background: t.farbe }} />
      {kurz ? "" : "Checkliste "}
      {s.erledigt}/{s.gesamt}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Reiter                                                               */
/* ------------------------------------------------------------------ */

const HAKEN =
  "druckbar flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-150";

function Haken({
  an,
  kritisch,
  beiKlick,
  titel,
}: {
  an: boolean;
  kritisch?: boolean;
  beiKlick: () => void;
  titel: string;
}) {
  return (
    <button
      type="button"
      onClick={beiKlick}
      aria-label={titel}
      aria-pressed={an}
      className={cn(
        HAKEN,
        kritisch
          ? "border-[#CF4848] bg-[#CF4848]"
          : an
            ? "border-[#17935C] bg-[#17935C]"
            : "border-linie-stark bg-flaeche hover:border-grau",
      )}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <path
          d="M2.5 6.2l2.3 2.3 4.7-4.9"
          fill="none"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

const UNTERLAGE_TON: Record<Unterlagenstatus, string> = {
  fehlt: "bg-[#FBE2E2] text-[#9A2727] font-semibold",
  angefordert: "bg-[#FBEBD1] text-[#8A5A08] font-semibold",
  liegt_vor: "bg-[#DBF2E6] text-[#0C5E3A] font-semibold",
  entfaellt: "bg-flaeche text-grau-stark font-semibold",
};

/** Kleine Etiketten statt B/X/Z — Basis kräftig, Intern zurückhaltend. */
const GRUPPE_TON: Record<Unterlagengruppe, string> = {
  basis: "bg-[#FBEBD1] text-[#8A5A08]",
  objektart: "bg-[#E4EAF2] text-[#38506E]",
  intern: "bg-flaeche-hoch text-grau-stark",
};

/**
 * Checkliste Ankauf — alles auf einen Blick: links die Unterlagen, rechts die
 * Prüfpunkte, durchnummeriert, eine Zeile je Punkt. Dateien, deren Name den
 * Unterlagentyp trägt, sind automatisch zugeordnet; von Hand gesetzt gewinnt.
 */
export function Pruefblatt({ objekt }: { objekt: Objekt }) {
  const { aendern } = useObjekte();
  const [dialog, setDialog] = useState<"anfordern" | "finanzierung" | "eigentuemer" | null>(null);
  const grundbuch = grundbuchstand(objekt);
  const p: Pruefung = objekt.pruefung ?? {};
  const s = pruefstand(objekt);
  const unterlagen = unterlagenFuer(objekt);
  const punkte = pruefpunkteFuer(objekt);
  const uErledigt = unterlagen.filter((u) => unterlagenstatus(objekt, u.id) === "liegt_vor").length;
  const uZaehlen = unterlagen.filter((u) => unterlagenstatus(objekt, u.id) !== "entfaellt").length;
  const pErledigt = punkte.filter((pp) => punktstatus(objekt, pp.id) === "ok").length;

  function unterlage(
    id: string,
    status: Unterlagenstatus,
    dokumentId?: string | null,
    datum?: string | null,
  ) {
    const alt = p.unterlagen?.[id];
    aendern(objekt.id, {
      pruefung: {
        ...p,
        unterlagen: {
          ...p.unterlagen,
          // Die Automatik festhalten: wer den Status setzt, behält die erkannte Datei.
          [id]: {
            status,
            dokumentId:
              dokumentId !== undefined
                ? dokumentId
                : alt?.dokumentId !== undefined
                  ? alt.dokumentId
                  : (zugeordneteDatei(objekt, id)?.id ?? null),
            datum: datum !== undefined ? datum : (alt?.datum ?? null),
          },
        },
      },
    });
  }

  function punkt(id: string, teil: { status?: Punktstatus; notiz?: string | null }) {
    const alt = p.punkte?.[id];
    aendern(objekt.id, {
      pruefung: {
        ...p,
        punkte: {
          ...p.punkte,
          [id]: {
            status: teil.status ?? alt?.status ?? punktstatus(objekt, id),
            notiz: teil.notiz !== undefined ? teil.notiz : (alt?.notiz ?? null),
          },
        },
      },
    });
  }

  return (
    <div className="flex flex-col gap-3.5 px-4 py-5 md:px-7">
      {/* ----- Kopf ----- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3.5">
          <h2 className="headline text-[1.25rem]">Checkliste Ankauf</h2>
          <span className="zahl text-[0.8rem] text-grau-stark">
            {s.erledigt} von {s.gesamt} erledigt
          </span>
          {s.kritisch.length > 0 && (
            <span className="text-[0.74rem] font-semibold text-[#9A2727]">
              {s.kritisch.length} kritisch
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDialog("anfordern")}
            className="druckbar flex h-8 items-center gap-1.5 rounded-full bg-tinte px-3.5 text-[0.66rem] font-semibold text-grund"
          >
            <Send size={12} strokeWidth={2} />
            Fehlende Unterlagen anfordern
          </button>
          <button
            type="button"
            onClick={() => setDialog("finanzierung")}
            className="druckbar flex h-8 items-center gap-1.5 rounded-full border border-linie-stark px-3.5 text-[0.66rem] font-semibold text-tinte"
          >
            <Banknote size={12} strokeWidth={2} />
            Finanzierungsunterlagen
          </button>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-linie">
          <div
            className="h-1.5 rounded-full bg-[#17935C] transition-[width] duration-300"
            style={{ width: `${Math.round((s.erledigt / s.gesamt) * 100)}%` }}
          />
        </div>
      </div>

      <div className="grid items-start gap-3.5 lg:grid-cols-2">
        {/* ----- Unterlagen ----- */}
        <section className="overflow-hidden rounded-2xl border border-linie bg-flaeche">
          <div className="flex justify-between px-3 pt-3 pb-2 text-[0.6rem] font-semibold tracking-[0.18em] uppercase text-grau">
            <span>Unterlagen</span>
            <span className="zahl">
              {uErledigt} / {uZaehlen}
            </span>
          </div>
          {unterlagen.map((u) => {
            const status = unterlagenstatus(objekt, u.id);
            const datei = zugeordneteDatei(objekt, u.id);
            return (
              <div
                key={u.id}
                className="grid min-h-8 grid-cols-[1.4rem_1.5rem_minmax(0,1fr)_auto] items-center gap-x-2 border-t border-linie px-3 py-1 text-[0.8rem]"
              >
                <span className="zahl text-right text-[0.68rem] text-grau">{u.nr}</span>
                <Haken
                  an={status === "liegt_vor"}
                  titel={`${u.titel} liegt vor`}
                  beiKlick={() => unterlage(u.id, status === "liegt_vor" ? "fehlt" : "liegt_vor")}
                />
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span
                    title={u.titel}
                    className={cn(
                      "min-w-0 truncate",
                      status === "liegt_vor" || status === "entfaellt"
                        ? "text-grau-stark"
                        : "text-tinte",
                      status === "entfaellt" && "line-through",
                    )}
                  >
                    {u.titel}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-px text-[0.54rem] font-semibold",
                      GRUPPE_TON[u.gruppe],
                    )}
                  >
                    {UNTERLAGENGRUPPEN[u.gruppe]}
                  </span>
                  {u.id === "grundbuch" && (
                    <span className="flex shrink-0 items-center gap-1 text-[0.64rem] text-grau">
                      vom
                      <input
                        type="date"
                        value={grundbuch.datum ?? ""}
                        onChange={(e) => unterlage(u.id, status, undefined, e.target.value || null)}
                        aria-label="Datum des Grundbuchauszugs"
                        title={grundbuch.ausName ? "Aus dem Dateinamen" : "Datum des Auszugs"}
                        className="zahl h-5 rounded bg-flaeche-hoch px-1 text-[0.64rem] text-grau-stark focus:outline-none"
                      />
                      {grundbuch.alt && (
                        <span className="font-semibold text-[#9A2727]">
                          älter als 3 Monate — neu anfordern
                        </span>
                      )}
                    </span>
                  )}
                  {u.id === "eigentuemerliste" && (
                    <button
                      type="button"
                      onClick={() => setDialog("eigentuemer")}
                      className="druckbar shrink-0 rounded-full border border-linie px-2 py-px text-[0.6rem] font-semibold text-tinte"
                    >
                      Eigentümer erfassen
                      {objekt.eigentuemer?.length ? ` (${objekt.eigentuemer.length})` : ""}
                    </button>
                  )}
                  {/* Dateiname als schlichte Auswahl: zeigt die Zuordnung und lässt sie ändern. */}
                  {objekt.dokumente.length > 0 && (status === "liegt_vor" || datei) && (
                    <select
                      value={datei?.id ?? ""}
                      onChange={(e) =>
                        unterlage(
                          u.id,
                          e.target.value ? "liegt_vor" : status,
                          e.target.value || null,
                        )
                      }
                      aria-label={`Datei für ${u.titel}`}
                      title="Zugeordnete Datei"
                      className="min-w-0 max-w-[12rem] cursor-pointer truncate appearance-none bg-transparent text-[0.66rem] text-grau hover:text-grau-stark focus:outline-none"
                    >
                      <option value="">keine Datei</option>
                      {objekt.dokumente.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  )}
                </span>
                <span
                  role="radiogroup"
                  aria-label={u.titel}
                  className="flex rounded-full bg-flaeche-hoch p-0.5"
                >
                  {(
                    (u.gruppe === "basis"
                      ? ["fehlt", "angefordert", "liegt_vor"]
                      : ["fehlt", "angefordert", "liegt_vor", "entfaellt"]) as Unterlagenstatus[]
                  ).map((st) => (
                    <button
                      key={st}
                      type="button"
                      role="radio"
                      aria-checked={status === st}
                      onClick={() => unterlage(u.id, st)}
                      className={cn(
                        "druckbar rounded-full px-2 py-0.5 text-[0.62rem] whitespace-nowrap",
                        status === st ? UNTERLAGE_TON[st] : "text-grau hover:text-grau-stark",
                      )}
                    >
                      {UNTERLAGENSTATUS[st]}
                    </button>
                  ))}
                </span>
              </div>
            );
          })}
        </section>

        {/* ----- Prüfpunkte ----- */}
        <section className="overflow-hidden rounded-2xl border border-linie bg-flaeche">
          <div className="flex justify-between px-3 pt-3 pb-2 text-[0.6rem] font-semibold tracking-[0.18em] uppercase text-grau">
            <span>Prüfpunkte</span>
            <span className="zahl">
              {pErledigt} / {punkte.length}
            </span>
          </div>
          {punkte.map((pp, i) => (
            <Pruefpunktzeile
              key={pp.id}
              nr={unterlagen.length + i + 1}
              titel={pp.titel}
              status={punktstatus(objekt, pp.id)}
              notiz={p.punkte?.[pp.id]?.notiz ?? ""}
              setStatus={(v) => punkt(pp.id, { status: v })}
              setNotiz={(v) => punkt(pp.id, { notiz: v })}
            />
          ))}
          <p className="px-3 pt-2 pb-3 text-[0.64rem] text-grau">
            Haken = geprüft und ok · Dreieck = kritisch (Haken wird rot, Warnung beim Ankauf)
          </p>
        </section>
      </div>
      <p className="text-[0.64rem] text-grau">
        Basis = immer nötig, auch für die Finanzierung · Objektart = je nach Objekt (ausblendbar
        über „entfällt“) · Intern = für den weiteren Verlauf. Gewarnt wird beim Angebot und beim
        Kauf nur, wenn Basis-Unterlagen fehlen oder ein Punkt kritisch ist.
      </p>

      {dialog === "anfordern" && (
        <Anforderungsdialog objekt={objekt} schliessen={() => setDialog(null)} />
      )}
      {dialog === "finanzierung" && (
        <Finanzierungsdialog objekt={objekt} schliessen={() => setDialog(null)} />
      )}
      {dialog === "eigentuemer" && (
        <Eigentuemerdialog objekt={objekt} schliessen={() => setDialog(null)} />
      )}
    </div>
  );
}

function Pruefpunktzeile({
  nr,
  titel,
  status,
  notiz,
  setStatus,
  setNotiz,
}: {
  nr: number;
  titel: string;
  status: Punktstatus;
  notiz: string;
  setStatus: (v: Punktstatus) => void;
  setNotiz: (v: string | null) => void;
}) {
  const [text, setText] = useState(notiz);
  const kritisch = status === "kritisch";
  return (
    <div className="grid min-h-8 grid-cols-[1.4rem_1.5rem_minmax(0,1fr)_1.75rem_minmax(0,0.9fr)] items-center gap-x-2 border-t border-linie px-3 py-1 text-[0.8rem]">
      <span className="zahl text-right text-[0.68rem] text-grau">{nr}</span>
      <Haken
        an={status === "ok"}
        kritisch={kritisch}
        titel={`${titel} geprüft`}
        beiKlick={() => setStatus(status === "ok" ? "offen" : "ok")}
      />
      <span
        title={titel}
        className={cn("truncate", status === "ok" ? "text-grau-stark" : "text-tinte")}
      >
        {titel}
      </span>
      <button
        type="button"
        onClick={() => setStatus(kritisch ? "offen" : "kritisch")}
        aria-label={`${titel} als kritisch markieren`}
        aria-pressed={kritisch}
        title="Als kritisch markieren"
        className={cn(
          "druckbar flex size-6 items-center justify-center rounded-full",
          kritisch ? "bg-[#FBE2E2] text-[#9A2727]" : "text-linie-stark hover:text-grau",
        )}
      >
        <AlertTriangle size={13} strokeWidth={1.75} />
      </button>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        // Gespeichert beim Verlassen — sonst schreibt jeder Buchstabe einen Stand.
        onBlur={() => text !== notiz && setNotiz(text.trim() || null)}
        placeholder="Notiz"
        aria-label={`Notiz zu ${titel}`}
        className="h-6 w-full min-w-0 rounded-md bg-flaeche-hoch px-2 text-[0.72rem] text-grau-stark placeholder:text-grau focus:bg-grund focus:outline focus:outline-1 focus:outline-linie-stark"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hinweis beim Stufenwechsel                                           */
/* ------------------------------------------------------------------ */

/**
 * Stufe setzen mit Prüfhinweis. Wer ins Angebot oder in den Kauf will,
 * obwohl Basis-Unterlagen fehlen oder ein Punkt kritisch ist, bekommt die Liste zu sehen
 * — und kann trotzdem wechseln. Keine Sperre, nur kein Versehen.
 *
 * Jede Stelle, die die Stufe setzt, rendert `dialog` mit.
 */
export function useStufenwechsel(zurPruefung?: (objektId: string) => void): {
  setze: (objekt: Objekt, stufe: Ankaufsstufe) => void;
  dialog: ReactNode;
} {
  const { stufeSetzen } = useObjekte();
  const [offen, setOffen] = useState<{
    objekt: Objekt;
    stufe: Ankaufsstufe;
    stand: Pruefstand;
  } | null>(null);

  function setze(objekt: Objekt, stufe: Ankaufsstufe) {
    const stand = warnungFuer(objekt, stufe);
    if (stand) setOffen({ objekt, stufe, stand });
    else stufeSetzen(objekt.id, stufe);
  }

  const dialog = offen && (
    <Dialog
      titel="Prüfung noch nicht fertig"
      unterzeile={`${offen.objekt.bezeichnung?.trim() || offen.objekt.strasse} auf „${STUFEN[offen.stufe].titel}“ setzen?`}
      schliessen={() => setOffen(null)}
    >
      <Pruefhinweis stand={offen.stand} />
      <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t border-linie pt-5">
        {zurPruefung && (
          <button
            type="button"
            onClick={() => {
              zurPruefung(offen.objekt.id);
              setOffen(null);
            }}
            className="druckbar rounded-full border border-linie-stark px-4 py-2.5 text-[0.7rem] font-medium text-tinte"
          >
            Zur Prüfung
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            stufeSetzen(offen.objekt.id, offen.stufe);
            setOffen(null);
          }}
          className="druckbar rounded-full bg-tinte px-5 py-2.5 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-grund"
        >
          Trotzdem wechseln
        </button>
      </div>
    </Dialog>
  );

  return { setze, dialog };
}

/** Die offenen und kritischen Punkte als gelbe Box — auch im Deal-Dialog. */
export function Pruefhinweis({ stand }: { stand: Pruefstand }) {
  return (
    <div className="rounded-xl border border-[#EFD9A6] bg-[#FDF8EC] px-4 py-3">
      <div className="flex items-center gap-2 text-[0.74rem] font-semibold text-[#8A5608]">
        <AlertTriangle size={14} strokeWidth={2} />
        Checkliste {stand.erledigt}/{stand.gesamt} — Basis-Unterlagen fehlen oder ein Punkt ist
        kritisch
      </div>
      {stand.kritisch.length > 0 && (
        <p className="mt-2 text-[0.72rem] leading-relaxed text-[#9A2727]">
          <span className="font-semibold">Kritisch:</span> {stand.kritisch.join(", ")}
        </p>
      )}
      {stand.offenePflicht.length > 0 && (
        <p className="mt-1.5 text-[0.72rem] leading-relaxed text-grau-stark">
          <span className="font-semibold">Basis fehlt:</span> {stand.offenePflicht.join(", ")}
        </p>
      )}
    </div>
  );
}
