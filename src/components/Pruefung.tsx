/**
 * Objektprüfung: der Reiter „Prüfung“, das Ampel-Abzeichen für Liste und
 * Übersicht, und der Hinweis beim Stufenwechsel.
 */
import { AlertTriangle } from "lucide-react";
import { useState, type ReactNode } from "react";

import { STUFEN, type Ankaufsstufe, type Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import {
  AMPEL_FARBE,
  PUNKTSTATUS,
  UNTERLAGENSTATUS,
  pruefpunkteFuer,
  pruefstand,
  punktstatus,
  unterlagenFuer,
  unterlagenstatus,
  warnungFuer,
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

export function Pruefzeichen({ objekt, className }: { objekt: Objekt; className?: string }) {
  const s = pruefstand(objekt);
  const t = AMPEL_FARBE[s.ampel];
  return (
    <span
      title={
        s.kritisch.length > 0
          ? `Kritisch: ${s.kritisch.join(", ")}`
          : s.offenePflicht.length > 0
            ? `Offen: ${s.offenePflicht.join(", ")}`
            : "Alle Pflichtpunkte geprüft"
      }
      className={cn(
        "zahl inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6rem] font-semibold",
        className,
      )}
      style={{ background: t.weich, color: t.tief }}
    >
      <span aria-hidden className="size-[7px] rounded-full" style={{ background: t.farbe }} />
      Prüfung {s.erledigt}/{s.gesamt}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Reiter                                                               */
/* ------------------------------------------------------------------ */

function Wahl<T extends string>({
  wert,
  setWert,
  optionen,
  titel,
}: {
  wert: T;
  setWert: (v: T) => void;
  optionen: { wert: T; titel: string; ton: "grau" | "gelb" | "gruen" | "rot" }[];
  titel: string;
}) {
  const TON = {
    grau: "bg-tinte text-grund",
    gelb: "bg-[#FAE8CD] text-[#8A5608]",
    gruen: "bg-[#DBF2E6] text-[#0C5E3A]",
    rot: "bg-[#FBE2E2] text-[#9A2727]",
  };
  return (
    <div
      role="radiogroup"
      aria-label={titel}
      className="flex shrink-0 rounded-full bg-flaeche-hoch p-0.5"
    >
      {optionen.map((o) => (
        <button
          key={o.wert}
          type="button"
          role="radio"
          aria-checked={wert === o.wert}
          onClick={() => setWert(o.wert)}
          className={cn(
            "druckbar rounded-full px-2.5 py-1 text-[0.64rem] font-medium whitespace-nowrap",
            wert === o.wert ? TON[o.ton] : "text-grau hover:text-grau-stark",
          )}
        >
          {o.titel}
        </button>
      ))}
    </div>
  );
}

export function Pruefblatt({ objekt }: { objekt: Objekt }) {
  const { aendern } = useObjekte();
  const p: Pruefung = objekt.pruefung ?? {};
  const s = pruefstand(objekt);
  const t = AMPEL_FARBE[s.ampel];

  function unterlage(id: string, status: Unterlagenstatus, dokumentId?: string | null) {
    const alt = p.unterlagen?.[id];
    aendern(objekt.id, {
      pruefung: {
        ...p,
        unterlagen: {
          ...p.unterlagen,
          [id]: {
            status,
            dokumentId: dokumentId === undefined ? (alt?.dokumentId ?? null) : dokumentId,
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
            notiz: teil.notiz ?? alt?.notiz ?? null,
          },
        },
      },
    });
  }

  return (
    <div className="flex flex-col gap-9 px-6 py-8 md:px-9">
      {/* ----- Stand ----- */}
      <div
        className="flex flex-wrap items-center gap-4 rounded-2xl border px-4 py-4"
        style={{ borderColor: t.weich, background: `${t.weich}80` }}
      >
        <span
          aria-hidden
          className="size-4 shrink-0 rounded-full"
          style={{ background: t.farbe }}
        />
        <div className="min-w-0 flex-1">
          <div className="zahl text-[1.05rem] font-semibold text-tinte">
            {s.erledigt} von {s.gesamt} erledigt
          </div>
          <div className="mt-0.5 text-[0.7rem]" style={{ color: t.tief }}>
            {s.kritisch.length > 0
              ? `Kritisch: ${s.kritisch.join(", ")}`
              : s.offenePflicht.length > 0
                ? `${s.offenePflicht.length} Pflichtpunkte offen`
                : "Alle Pflichtpunkte geprüft"}
          </div>
        </div>
      </div>

      {/* ----- Unterlagen ----- */}
      <section>
        <div className="mini-label">Unterlagen</div>
        <ul className="mt-3 divide-y divide-linie overflow-hidden rounded-2xl border border-linie bg-flaeche">
          {unterlagenFuer(objekt).map((u) => {
            const status = unterlagenstatus(objekt, u.id);
            const dokumentId = p.unterlagen?.[u.id]?.dokumentId ?? "";
            return (
              <li
                key={u.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="min-w-0 flex-1 text-[0.78rem] text-tinte">
                  {u.titel}
                  {u.pflicht && (
                    <span className="ml-1.5 text-[0.58rem] tracking-[0.14em] uppercase text-grau">
                      Pflicht
                    </span>
                  )}
                </span>
                {objekt.dokumente.length > 0 && (
                  <select
                    value={dokumentId}
                    onChange={(e) =>
                      unterlage(u.id, e.target.value ? "liegt_vor" : status, e.target.value || null)
                    }
                    aria-label={`Datei für ${u.titel}`}
                    className="min-w-0 rounded-lg border border-linie bg-grund px-2 py-1 text-[0.68rem] text-grau-stark focus:border-linie-stark focus:outline-none sm:w-48"
                  >
                    <option value="">— keine Datei —</option>
                    {objekt.dokumente.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
                <Wahl
                  titel={u.titel}
                  wert={status}
                  setWert={(v) => unterlage(u.id, v)}
                  optionen={[
                    { wert: "fehlt", titel: UNTERLAGENSTATUS.fehlt, ton: "rot" },
                    { wert: "angefordert", titel: UNTERLAGENSTATUS.angefordert, ton: "gelb" },
                    { wert: "liegt_vor", titel: UNTERLAGENSTATUS.liegt_vor, ton: "gruen" },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      </section>

      {/* ----- Prüfpunkte ----- */}
      <section>
        <div className="mini-label">Prüfpunkte</div>
        <ul className="mt-3 divide-y divide-linie overflow-hidden rounded-2xl border border-linie bg-flaeche">
          {pruefpunkteFuer(objekt).map((pp) => (
            <Pruefpunktzeile
              key={pp.id}
              titel={pp.titel}
              status={punktstatus(objekt, pp.id)}
              notiz={p.punkte?.[pp.id]?.notiz ?? ""}
              setStatus={(v) => punkt(pp.id, { status: v })}
              setNotiz={(v) => punkt(pp.id, { notiz: v })}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function Pruefpunktzeile({
  titel,
  status,
  notiz,
  setStatus,
  setNotiz,
}: {
  titel: string;
  status: Punktstatus;
  notiz: string;
  setStatus: (v: Punktstatus) => void;
  setNotiz: (v: string | null) => void;
}) {
  const [text, setText] = useState(notiz);
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <span className="min-w-0 flex-1 text-[0.78rem] text-tinte">{titel}</span>
        <Wahl
          titel={titel}
          wert={status}
          setWert={setStatus}
          optionen={[
            { wert: "offen", titel: PUNKTSTATUS.offen, ton: "grau" },
            { wert: "ok", titel: PUNKTSTATUS.ok, ton: "gruen" },
            { wert: "kritisch", titel: PUNKTSTATUS.kritisch, ton: "rot" },
          ]}
        />
      </div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        // Gespeichert beim Verlassen — sonst schreibt jeder Buchstabe einen Stand.
        onBlur={() => text !== notiz && setNotiz(text.trim() || null)}
        placeholder="Notiz …"
        aria-label={`Notiz zu ${titel}`}
        className="w-full rounded-lg border border-transparent bg-flaeche-hoch px-2.5 py-1.5 text-[0.72rem] text-grau-stark placeholder:text-grau focus:border-linie focus:bg-grund focus:outline-none"
      />
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Hinweis beim Stufenwechsel                                           */
/* ------------------------------------------------------------------ */

/**
 * Stufe setzen mit Prüfhinweis. Wer ins Angebot oder in den Kauf will,
 * obwohl Pflichtpunkte offen oder kritisch sind, bekommt die Liste zu sehen
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
        Prüfung {stand.erledigt}/{stand.gesamt} — nicht alle Pflichtpunkte geklärt
      </div>
      {stand.kritisch.length > 0 && (
        <p className="mt-2 text-[0.72rem] leading-relaxed text-[#9A2727]">
          <span className="font-semibold">Kritisch:</span> {stand.kritisch.join(", ")}
        </p>
      )}
      {stand.offenePflicht.length > 0 && (
        <p className="mt-1.5 text-[0.72rem] leading-relaxed text-grau-stark">
          <span className="font-semibold">Offen:</span> {stand.offenePflicht.join(", ")}
        </p>
      )}
    </div>
  );
}
