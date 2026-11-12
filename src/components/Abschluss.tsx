/**
 * Reiter „Abschluss“ im Projekt (SAMMLUNG 2): Verkaufsunterlagen für den
 * Datenraum, Nachkalkulation (Soll gegen Ist) und Abschluss-Checkliste.
 */
import { CheckCircle2, Share2 } from "lucide-react";
import { useState } from "react";

import { useEinstellungen } from "../lib/einstellungenStore";
import { f, type Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import {
  DATENRAUM_ORDNER,
  VERKAUFSUNTERLAGEN,
  abschlussstand,
  datenraumDatei,
  datenraumStand,
  datenraumVollstaendig,
  istVorschlag,
  nachkalkulation,
  type Kalkposition,
} from "../lib/projektabschluss";
import { cn } from "../lib/utils";

const ABSCHNITT = "rounded-2xl border border-linie bg-flaeche";

export function Abschlussblatt({ objekt }: { objekt: Objekt }) {
  return (
    <div className="flex flex-col gap-8 px-6 py-8 md:px-9">
      <Checkliste objekt={objekt} />
      <Datenraum objekt={objekt} />
      <Nachkalkulationsblatt objekt={objekt} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Haken({ an, auto }: { an: boolean; auto?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px]",
        an ? "border-[#17935C] bg-[#17935C] text-white" : "border-linie-stark bg-flaeche",
        auto && "opacity-80",
      )}
    >
      {an && (
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
          <path
            d="M2.5 6.2l2.3 2.3 4.7-4.9"
            fill="none"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

function Checkliste({ objekt }: { objekt: Objekt }) {
  const { aendern } = useObjekte();
  const { vorgaben } = useEinstellungen();
  const s = abschlussstand(objekt, vorgaben);
  const heute = new Date().toISOString().slice(0, 10);
  return (
    <section>
      <div className="flex flex-wrap items-baseline gap-3">
        <div className="mini-label">Abschluss-Checkliste</div>
        <span className="zahl text-[0.72rem] text-grau-stark">
          {s.punkte.filter((p) => p.erledigt).length} von {s.punkte.length}
        </span>
        {s.abgeschlossen && (
          <span className="flex items-center gap-1 text-[0.72rem] font-semibold text-[#0C5E3A]">
            <CheckCircle2 size={13} /> Projekt abgeschlossen
            {s.abgeschlossenAm ? ` am ${f.datum(s.abgeschlossenAm)}` : ""}
          </span>
        )}
      </div>
      <ul className={cn(ABSCHNITT, "mt-3 divide-y divide-linie")}>
        {s.punkte.map(({ punkt, erledigt, automatisch, am }) => (
          <li
            key={punkt.id}
            className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[0.8rem]"
          >
            <button
              type="button"
              disabled={automatisch}
              onClick={() =>
                aendern(objekt.id, {
                  abschluss: { ...objekt.abschluss, [punkt.id]: { erledigtAm: am ? null : heute } },
                })
              }
              aria-pressed={erledigt}
              aria-label={`${punkt.titel} ${erledigt ? "erledigt" : "offen"}`}
              className="druckbar"
            >
              <Haken an={erledigt} auto={automatisch} />
            </button>
            <span className={cn("min-w-0 flex-1", erledigt ? "text-grau-stark" : "text-tinte")}>
              {punkt.titel}
            </span>
            {automatisch && <span className="text-[0.64rem] text-grau">automatisch erkannt</span>}
            {am && (
              <input
                type="date"
                value={am}
                onChange={(e) =>
                  aendern(objekt.id, {
                    abschluss: {
                      ...objekt.abschluss,
                      [punkt.id]: { erledigtAm: e.target.value || null },
                    },
                  })
                }
                aria-label={`Datum ${punkt.titel}`}
                className="zahl rounded-lg border border-linie bg-grund px-2 py-0.5 text-[0.7rem] text-grau-stark"
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Datenraum({ objekt }: { objekt: Objekt }) {
  const { aendern } = useObjekte();
  const v = datenraumVollstaendig(objekt);
  const setze = (id: string, teil: { dokumentId?: string | null; entfaellt?: boolean }) =>
    aendern(objekt.id, {
      datenraum: { ...objekt.datenraum, [id]: { ...objekt.datenraum?.[id], ...teil } },
    });
  return (
    <section>
      <div className="flex flex-wrap items-center gap-3">
        <div className="mini-label">Verkaufsunterlagen · Datenraum</div>
        <span className="zahl text-[0.72rem] text-grau-stark">
          {v.da} von {v.gesamt}
        </span>
        {v.vollstaendig && (
          <span className="flex items-center gap-1 text-[0.72rem] font-semibold text-[#0C5E3A]">
            <CheckCircle2 size={13} /> Datenraum vollständig
          </span>
        )}
        <button
          type="button"
          disabled
          title="Phase 2: Freigabe des Drive-Ordners an Vertrieb und AUVERO"
          className="ml-auto flex items-center gap-1.5 rounded-full border border-dashed border-linie-stark px-3 py-1.5 text-[0.66rem] font-semibold text-grau"
        >
          <Share2 size={12} /> Datenraum freigeben · Phase 2
        </button>
      </div>
      <ul className={cn(ABSCHNITT, "mt-3 divide-y divide-linie")}>
        {VERKAUFSUNTERLAGEN.map((u) => {
          const stand = datenraumStand(objekt, u.id);
          const datei = datenraumDatei(objekt, u.id);
          return (
            <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-[0.78rem]">
              <Haken an={stand === "liegt_vor"} />
              <span
                className={cn(
                  "min-w-0 flex-1",
                  stand === "entfaellt" ? "text-grau line-through" : "text-tinte",
                )}
              >
                {u.titel}
              </span>
              <select
                value={datei?.id ?? ""}
                disabled={stand === "entfaellt"}
                onChange={(e) => setze(u.id, { dokumentId: e.target.value || null })}
                aria-label={`Datei für ${u.titel}`}
                className="max-w-[16rem] truncate rounded-lg border border-linie bg-grund px-2 py-1 text-[0.68rem] text-grau-stark"
              >
                <option value="">keine Datei</option>
                {objekt.dokumente.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-[0.64rem] text-grau">
                <input
                  type="checkbox"
                  checked={stand === "entfaellt"}
                  onChange={(e) => setze(u.id, { entfaellt: e.target.checked })}
                />
                entfällt
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[0.66rem] text-grau">
        Dateien werden über den Namen zugeordnet, Dateien im Ordner {DATENRAUM_ORDNER} haben
        Vorrang.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Nachkalkulationsblatt({ objekt }: { objekt: Objekt }) {
  const { aendern } = useObjekte();
  const { vorgaben } = useEinstellungen();
  const n = nachkalkulation(objekt, vorgaben);
  const vorschlag = istVorschlag(objekt);

  function setze(id: string, wert: number | null) {
    const nk = objekt.nachkalkulation ?? {};
    aendern(
      objekt.id,
      id === "verkauf"
        ? { nachkalkulation: { ...nk, verkaufspreis: wert } }
        : { nachkalkulation: { ...nk, ist: { ...nk.ist, [id as Kalkposition]: wert } } },
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-baseline gap-3">
        <div className="mini-label">Nachkalkulation · Soll gegen Ist</div>
        <span className="text-[0.66rem] text-grau">Soll aus: {n.quelle}</span>
        {n.vollstaendig && (
          <span className="flex items-center gap-1 text-[0.72rem] font-semibold text-[#0C5E3A]">
            <CheckCircle2 size={13} /> erstellt
          </span>
        )}
      </div>
      <div className={cn(ABSCHNITT, "mt-3 overflow-x-auto")}>
        <table className="w-full min-w-[40rem] text-left text-[0.76rem]">
          <thead>
            <tr className="bg-flaeche-hoch text-[0.58rem] font-semibold tracking-[0.12em] text-grau uppercase">
              <th className="px-3 py-2">Position</th>
              <th className="px-3 py-2 text-right">Soll</th>
              <th className="w-40 px-3 py-2 text-right">Ist</th>
              <th className="px-3 py-2 text-right">Abweichung</th>
            </tr>
          </thead>
          <tbody>
            {n.zeilen.map((z) => {
              const summe = z.id === "gewinn";
              const einnahme = z.id === "verkauf" || summe;
              // Bei Kosten ist „mehr“ schlecht, bei Verkauf und Gewinn gut.
              const gut =
                z.abweichung === null ? null : einnahme ? z.abweichung >= 0 : z.abweichung <= 0;
              const vorbelegt =
                z.id !== "gewinn" &&
                (z.id === "verkauf"
                  ? objekt.nachkalkulation?.verkaufspreis == null
                  : objekt.nachkalkulation?.ist?.[z.id as Kalkposition] == null) &&
                z.ist !== null;
              return (
                <tr
                  key={z.id}
                  className={cn(
                    "border-t border-linie",
                    summe && "border-t-linie-stark font-semibold",
                  )}
                >
                  <td className="px-3 py-2 text-tinte">{z.titel}</td>
                  <td className="zahl px-3 py-2 text-right text-grau-stark">{f.eur(z.soll)}</td>
                  <td className="px-3 py-1.5 text-right">
                    {summe ? (
                      <span className="zahl text-tinte">{f.eur(z.ist)}</span>
                    ) : (
                      <IstFeld
                        wert={z.ist}
                        vorbelegt={vorbelegt}
                        titel={z.titel}
                        setze={(w) => setze(z.id, w)}
                        hinweis={z.id in vorschlag ? "aus der Plattform vorbelegt" : undefined}
                      />
                    )}
                  </td>
                  <td
                    className={cn(
                      "zahl px-3 py-2 text-right",
                      gut === null ? "text-grau" : gut ? "text-[#0C5E3A]" : "text-[#9A2727]",
                    )}
                  >
                    {z.abweichung === null
                      ? "—"
                      : `${z.abweichung > 0 ? "+" : ""}${f.eur(z.abweichung)}${z.prozent !== null ? ` · ${z.prozent > 0 ? "+" : ""}${z.prozent.toFixed(1).replace(".", ",")} %` : ""}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[0.66rem] text-grau">
        Ist bis Phase 2 von Hand; vorbelegt sind Kaufpreis, abgerechnete Gewerke, Revest-Anteile der
        Nachberechnung und die Verkaufspreise der verkauften Einheiten. Phase 2: Ist-Kosten aus
        Qonto über das Objektkürzel.
      </p>
    </section>
  );
}

function IstFeld({
  wert,
  vorbelegt,
  titel,
  setze,
  hinweis,
}: {
  wert: number | null;
  vorbelegt: boolean;
  titel: string;
  setze: (w: number | null) => void;
  hinweis?: string;
}) {
  const [text, setText] = useState(
    wert !== null ? String(Math.round(wert * 100) / 100).replace(".", ",") : "",
  );
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const n = Number(text.replace(/\./g, "").replace(",", "."));
        const neu = text.trim() === "" || !Number.isFinite(n) ? null : n;
        if (neu !== wert) setze(neu);
      }}
      inputMode="decimal"
      aria-label={`Ist ${titel}`}
      title={vorbelegt ? hinweis : undefined}
      className={cn(
        "zahl w-full rounded-lg border px-2 py-1 text-right text-[0.74rem]",
        vorbelegt
          ? "border-linie bg-flaeche-hoch text-grau-stark"
          : "border-[#F0D58A] bg-[#FFF8E1] text-tinte",
      )}
    />
  );
}
