/**
 * Oberer Teil der Auswertung (SAMMLUNG 3): ein Zeitraum-Schalter für alles,
 * Trichter mit Quoten und Vorjahr, Ziele als Balken, Quellen, Durchlaufzeit,
 * hängende Leads und Notartermine. Alle Zahlen aus der Pipeline-Historie.
 */
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import {
  durchlaufzeiten,
  gewinnImZeitraum,
  haengendeLeads,
  notartermine,
  quellen,
  trichter,
  zeitraumFuer,
  zielImZeitraum,
  type Zeitraum,
  type Zeitraumart,
} from "../lib/auswertung";
import { useAufgaben } from "../lib/aufgabenStore";
import { useEingang } from "../lib/eingangStore";
import { useEinstellungen } from "../lib/einstellungenStore";
import { GESELLSCHAFTEN, f, type Gesellschaft, type Objekt } from "../lib/objekte";
import { cn } from "../lib/utils";

const ARTEN: [Zeitraumart, string][] = [
  ["woche", "Woche"],
  ["monat", "Monat"],
  ["quartal", "Quartal"],
  ["jahr", "Jahr"],
  ["frei", "frei"],
];

const zahl = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });

export function Leadauswertung({ objekte }: { objekte: Objekt[] }) {
  const { eingaenge } = useEingang();
  const { aufgaben } = useAufgaben();
  const { ziele, vorgaben } = useEinstellungen();
  const [art, setArt] = useState<Zeitraumart>("monat");
  const [frei, setFrei] = useState<Zeitraum>(() => zeitraumFuer("monat", new Date()));
  const z = art === "frei" ? frei : zeitraumFuer(art, new Date());

  const t = useMemo(() => trichter(objekte, eingaenge, z), [objekte, eingaenge, z]);
  const q = useMemo(() => quellen(objekte, z), [objekte, z]);
  const d = useMemo(() => durchlaufzeiten(objekte), [objekte]);
  const h = useMemo(
    () => haengendeLeads(objekte, ziele.haengtNachTagen),
    [objekte, ziele.haengtNachTagen],
  );
  const n = useMemo(() => notartermine(objekte, aufgaben, z), [objekte, aufgaben, z]);
  const g = useMemo(() => gewinnImZeitraum(objekte, vorgaben, z), [objekte, vorgaben, z]);

  const anzahl = (id: string) => t.find((x) => x.id === id)?.anzahl ?? 0;
  const zielbalken = [
    {
      titel: "Leads (Neu)",
      ist: anzahl("neu"),
      ziel: ziele.leadsWoche,
      je: "woche" as const,
      geld: false,
    },
    {
      titel: "Besichtigungen",
      ist: anzahl("besichtigt"),
      ziel: ziele.besichtigungenMonat,
      je: "monat" as const,
      geld: false,
    },
    {
      titel: "Angebote",
      ist: anzahl("angebot"),
      ziel: ziele.angeboteMonat,
      je: "monat" as const,
      geld: false,
    },
    {
      titel: "Ankäufe",
      ist: anzahl("angekauft"),
      ziel: ziele.ankaeufeJahr,
      je: "jahr" as const,
      geld: false,
    },
    {
      titel: "Gewinn (Nachkalkulation)",
      ist: g.summe,
      ziel: ziele.jahresgewinn,
      je: "jahr" as const,
      geld: true,
    },
  ];
  const groesster = Math.max(1, ...t.map((x) => x.anzahl));

  return (
    <div className="divide-y divide-linie">
      {/* ----- Zeitraum ----- */}
      <section className="flex flex-wrap items-center gap-2 px-4 py-4 sm:px-6 md:px-10">
        <div className="flex gap-1 rounded-full border border-linie bg-flaeche-hoch p-1">
          {ARTEN.map(([w, titel]) => (
            <button
              key={w}
              type="button"
              onClick={() => setArt(w)}
              aria-pressed={art === w}
              className={cn(
                "druckbar rounded-full px-3 py-1 text-[0.7rem] font-medium",
                art === w ? "bg-tinte text-grund" : "text-grau-stark",
              )}
            >
              {titel}
            </button>
          ))}
        </div>
        {art === "frei" ? (
          <span className="flex items-center gap-1.5 text-[0.72rem] text-grau">
            <input
              type="date"
              value={frei.von}
              onChange={(e) => setFrei({ ...frei, von: e.target.value })}
              aria-label="Von"
              className="zahl rounded-lg border border-linie bg-flaeche px-2 py-1"
            />
            –
            <input
              type="date"
              value={frei.bis}
              onChange={(e) => setFrei({ ...frei, bis: e.target.value })}
              aria-label="Bis"
              className="zahl rounded-lg border border-linie bg-flaeche px-2 py-1"
            />
          </span>
        ) : (
          <span className="zahl text-[0.72rem] text-grau">
            {f.datum(z.von)} – {f.datum(z.bis)}
          </span>
        )}
      </section>

      {/* ----- Trichter ----- */}
      <section className="px-4 py-6 sm:px-6 md:px-10">
        <div className="mini-label">Trichter · Vorjahr klein daneben</div>
        <ol className="mt-4 flex flex-col gap-2">
          {t.map((s) => {
            const diff = s.anzahl - s.vorjahr;
            return (
              <li
                key={s.id}
                className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-[0.78rem] sm:grid-cols-[8rem_1fr_9rem]"
              >
                <span className="text-grau-stark">{s.titel}</span>
                <span className="h-6 overflow-hidden rounded-full bg-flaeche-hoch">
                  <span
                    className="flex h-full items-center rounded-full bg-tinte px-2 text-[0.66rem] font-semibold text-grund"
                    style={{ width: `${Math.max(6, (s.anzahl / groesster) * 100)}%` }}
                  >
                    {s.anzahl}
                  </span>
                </span>
                <span className="zahl text-right text-[0.7rem] text-grau">
                  {s.quote !== null ? `${zahl(s.quote)} %` : "—"}
                  <span
                    className={cn(
                      "ml-2",
                      diff > 0 ? "text-[#0C5E3A]" : diff < 0 ? "text-[#9A2727]" : "",
                    )}
                  >
                    VJ {s.vorjahr} ({diff > 0 ? "+" : ""}
                    {diff})
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[0.66rem] text-grau">
          Eingang = Angebote im Ankauf-Eingang · Neu = übernommene bzw. angelegte Objekte. Quote zur
          Vorstufe; übersprungene Stufen zählen mit.
        </p>
      </section>

      {/* ----- Ziele ----- */}
      <section className="px-4 py-6 sm:px-6 md:px-10">
        <div className="flex items-baseline gap-2">
          <div className="mini-label">Ziele im Zeitraum</div>
          <Link to="/einstellungen" className="text-[0.66rem] text-grau hover:text-tinte">
            Ziele ändern
          </Link>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {zielbalken.map((b) => {
            const soll = b.ziel ? zielImZeitraum(b.ziel, b.je, z) : null;
            const prozent = soll ? (b.ist / soll) * 100 : null;
            return (
              <li key={b.titel} className="rounded-2xl border border-linie bg-flaeche px-4 py-3">
                <div className="flex items-baseline justify-between gap-2 text-[0.76rem]">
                  <span className="text-grau-stark">{b.titel}</span>
                  <span className="zahl font-semibold text-tinte">
                    {b.geld ? f.eurKurz(b.ist) : zahl(b.ist)}
                    {soll !== null && (
                      <span className="font-normal text-grau">
                        {" "}
                        / {b.geld ? f.eurKurz(soll) : zahl(soll)}
                      </span>
                    )}
                  </span>
                </div>
                {prozent !== null ? (
                  <>
                    {/* Über 100 % läuft der Balken weiter — als zweite, dunklere Spur. */}
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-flaeche-hoch">
                      <div
                        className="h-2 rounded-full bg-[#17935C]"
                        style={{ width: `${Math.min(100, prozent)}%` }}
                      />
                    </div>
                    {prozent > 100 && (
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-flaeche-hoch">
                        <div
                          className="h-1.5 rounded-full bg-[#0C5E3A]"
                          style={{ width: `${Math.min(100, prozent - 100)}%` }}
                        />
                      </div>
                    )}
                    <div className="zahl mt-1 text-right text-[0.64rem] text-grau">
                      {Math.round(prozent)} %
                    </div>
                  </>
                ) : (
                  <div className="mt-2 text-[0.64rem] text-grau">kein Ziel gesetzt</div>
                )}
              </li>
            );
          })}
        </ul>
        {Object.keys(g.jeGesellschaft).length > 0 && (
          <p className="mt-3 text-[0.68rem] text-grau-stark">
            Gewinn je Gesellschaft:{" "}
            {Object.entries(g.jeGesellschaft)
              .map(([k, v]) => `${GESELLSCHAFTEN[k as Gesellschaft] ?? k} ${f.eurKurz(v)}`)
              .join(" · ")}
          </p>
        )}
      </section>

      {/* ----- Quellen, Durchlauf ----- */}
      <section className="grid gap-6 px-4 py-6 sm:px-6 md:px-10 lg:grid-cols-2">
        <div>
          <div className="mini-label">Quellen · neu im Zeitraum</div>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-linie bg-flaeche">
            <table className="w-full min-w-[26rem] text-left text-[0.74rem]">
              <thead>
                <tr className="bg-flaeche-hoch text-[0.58rem] font-semibold tracking-[0.12em] text-grau uppercase">
                  <th className="px-3 py-2">Quelle</th>
                  <th className="px-2 py-2 text-right">Neu</th>
                  <th className="px-2 py-2 text-right">Besichtigt</th>
                  <th className="px-2 py-2 text-right">Angebot</th>
                  <th className="px-3 py-2 text-right">Gekauft</th>
                </tr>
              </thead>
              <tbody>
                {q.map((r) => (
                  <tr key={r.quelle} className="border-t border-linie">
                    <td className="max-w-[12rem] truncate px-3 py-1.5 text-tinte" title={r.quelle}>
                      {r.quelle}
                    </td>
                    <td className="zahl px-2 py-1.5 text-right">{r.neu}</td>
                    <td className="zahl px-2 py-1.5 text-right">{r.besichtigt}</td>
                    <td className="zahl px-2 py-1.5 text-right">{r.angebot}</td>
                    <td className="zahl px-3 py-1.5 text-right font-semibold">{r.gekauft}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {q.length === 0 && (
              <p className="px-3 py-4 text-center text-[0.72rem] text-grau">
                Im Zeitraum nichts neu.
              </p>
            )}
          </div>
        </div>
        <div>
          <div className="mini-label">Durchlaufzeit · Ø Tage (alle Objekte)</div>
          <ul className="mt-3 divide-y divide-linie rounded-2xl border border-linie bg-flaeche">
            {d.map((x) => (
              <li
                key={`${x.von}-${x.bis}`}
                className="flex items-center justify-between gap-2 px-3 py-2 text-[0.76rem]"
              >
                <span className="text-grau-stark">
                  {x.von} → {x.bis}
                </span>
                <span className="zahl font-semibold text-tinte">
                  {x.tage === null ? "—" : `${x.tage} Tage`}
                  <span className="ml-1.5 font-normal text-grau">n={x.anzahl}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ----- Hängend, Notar ----- */}
      <section className="grid gap-6 px-4 py-6 sm:px-6 md:px-10 lg:grid-cols-2">
        <div>
          <div className="mini-label">
            Hängende Leads · seit über {ziele.haengtNachTagen} Tagen ohne Stufenwechsel
          </div>
          <ul className="mt-3 divide-y divide-linie rounded-2xl border border-linie bg-flaeche">
            {h.slice(0, 10).map(({ objekt, seitTagen }) => (
              <li key={objekt.id}>
                <Link
                  to="/ankauf"
                  search={{ objekt: objekt.id }}
                  className="druckbar flex items-center justify-between gap-2 px-3 py-2 text-[0.76rem]"
                >
                  <span className="min-w-0 truncate text-tinte">
                    {objekt.bezeichnung?.trim() || objekt.strasse}
                  </span>
                  <span className="zahl shrink-0 text-[#9A2727]">{seitTagen} Tage</span>
                </Link>
              </li>
            ))}
            {h.length === 0 && (
              <li className="px-3 py-4 text-center text-[0.72rem] text-grau">Nichts hängt.</li>
            )}
          </ul>
        </div>
        <div>
          <div className="mini-label">Notartermine im Zeitraum</div>
          <ul className="mt-3 divide-y divide-linie rounded-2xl border border-linie bg-flaeche">
            {n.map((x, i) => (
              <li key={`${x.am}-${i}`} className="flex items-center gap-3 px-3 py-2 text-[0.76rem]">
                <span className="zahl w-20 shrink-0 text-grau">{f.datum(x.am)}</span>
                <span className="min-w-0 flex-1 truncate text-tinte">{x.titel}</span>
                {x.objekt && (
                  <span className="shrink-0 text-[0.66rem] text-grau">
                    {x.objekt.kuerzel ?? x.objekt.strasse}
                  </span>
                )}
              </li>
            ))}
            {n.length === 0 && (
              <li className="px-3 py-4 text-center text-[0.72rem] text-grau">
                Keine Notartermine.
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
