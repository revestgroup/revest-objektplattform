/**
 * Archiv des Backoffice: alles, dessen Übergabe bestätigt ist (oder das als
 * erledigt bestätigt wurde). Durchsuchbar, filterbar nach Ziel, Gesellschaft,
 * Objekt und Zeitraum. Nichts wird automatisch gelöscht; „Zurückholen“ legt
 * die Karte wieder in den Posteingang.
 */
import { Search } from "lucide-react";
import { useState } from "react";

import {
  ABLAGE_GESELLSCHAFTEN,
  WEITERLEITUNGEN,
  archivFiltern,
  archivZiel,
  type Archivfilter,
} from "../lib/backoffice";
import { useBackoffice } from "../lib/backofficeStore";
import { f } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { cn } from "../lib/utils";

const ZIELTITEL: Record<string, string> = {
  ...Object.fromEntries(WEITERLEITUNGEN.map((w) => [w.id, w.titel.replace("→ ", "")])),
  erledigt: "Erledigt",
};

export function Backofficearchiv({ oeffnen }: { oeffnen: (id: string) => void }) {
  const { karten, zurueckholen } = useBackoffice();
  const { objekte } = useObjekte();
  const [filter, setFilter] = useState<Archivfilter>({});
  const liste = archivFiltern(karten, filter);
  const setze = (teil: Partial<Archivfilter>) => setFilter((alt) => ({ ...alt, ...teil }));
  const feld =
    "h-8 rounded-full border border-linie bg-flaeche px-3 text-[0.72rem] text-tinte focus:border-linie-stark focus:outline-none";

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 md:px-10">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <Search
            size={12}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-grau"
          />
          <input
            value={filter.suche ?? ""}
            onChange={(e) => setze({ suche: e.target.value })}
            placeholder="Titel, Datei, Notiz, Link"
            aria-label="Archiv durchsuchen"
            className={cn(feld, "w-60 pl-8")}
          />
        </label>
        <select
          className={feld}
          aria-label="Ziel"
          value={filter.ziel ?? ""}
          onChange={(e) => setze({ ziel: e.target.value as Archivfilter["ziel"] })}
        >
          <option value="">Alle Ziele</option>
          {Object.entries(ZIELTITEL).map(([w, t]) => (
            <option key={w} value={w}>
              {t}
            </option>
          ))}
        </select>
        <select
          className={feld}
          aria-label="Gesellschaft"
          value={filter.gesellschaft ?? ""}
          onChange={(e) => setze({ gesellschaft: e.target.value })}
        >
          <option value="">Alle Gesellschaften</option>
          {ABLAGE_GESELLSCHAFTEN.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          className={feld}
          aria-label="Objekt"
          value={filter.objektId ?? ""}
          onChange={(e) => setze({ objektId: e.target.value })}
        >
          <option value="">Alle Objekte</option>
          {objekte.map((o) => (
            <option key={o.id} value={o.id}>
              {o.kuerzel ? `${o.kuerzel} · ` : ""}
              {o.strasse}
            </option>
          ))}
        </select>
        <input
          type="date"
          className={cn(feld, "zahl")}
          aria-label="Ab"
          value={filter.von ?? ""}
          onChange={(e) => setze({ von: e.target.value })}
        />
        <input
          type="date"
          className={cn(feld, "zahl")}
          aria-label="Bis"
          value={filter.bis ?? ""}
          onChange={(e) => setze({ bis: e.target.value })}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-linie bg-flaeche">
        <table className="w-full min-w-[52rem] text-left text-[0.76rem]">
          <thead>
            <tr className="bg-flaeche-hoch text-[0.6rem] font-semibold tracking-[0.14em] text-grau uppercase">
              <th className="px-3 py-2">Archiviert</th>
              <th className="px-3 py-2">Karte</th>
              <th className="px-3 py-2">Ziel</th>
              <th className="px-3 py-2">Gesellschaft / Objekt</th>
              <th className="px-3 py-2">Nachweis</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {liste.map((k) => {
              const o = objekte.find((x) => x.id === k.objektId);
              const letzter = [...k.verlauf].reverse().find((v) => /Archiv|bestätigt/.test(v.text));
              const wer = letzter?.text.split(" · ").at(-1);
              return (
                <tr key={k.id} className="border-t border-linie align-top">
                  <td className="zahl px-3 py-2 text-grau">
                    {f.datum(k.archiviertAm!)}
                    {wer && wer !== letzter?.text && <div className="text-[0.64rem]">{wer}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => oeffnen(k.id)}
                      className="text-left font-medium text-tinte hover:underline"
                    >
                      {k.titel}
                    </button>
                    {k.datei && <div className="text-[0.66rem] text-grau">{k.datei.name}</div>}
                  </td>
                  <td className="px-3 py-2 text-grau-stark">
                    {ZIELTITEL[archivZiel(k)]}
                    {k.uebergabe?.details && (
                      <div className="text-[0.66rem] text-grau">{k.uebergabe.details}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-grau-stark">
                    {k.gesellschaft ?? ""}
                    {o && <div className="text-[0.66rem] text-grau">{o.kuerzel ?? o.strasse}</div>}
                  </td>
                  <td className="max-w-[14rem] truncate px-3 py-2">
                    {k.uebergabe?.link ? (
                      /^https?:/.test(k.uebergabe.link) ? (
                        <a
                          href={k.uebergabe.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-tinte underline"
                        >
                          {k.uebergabe.link}
                        </a>
                      ) : (
                        <span className="text-grau-stark">{k.uebergabe.link}</span>
                      )
                    ) : (
                      <span className="text-grau">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => zurueckholen(k.id)}
                      className="druckbar text-[0.66rem] text-grau hover:text-tinte"
                    >
                      Zurückholen
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {liste.length === 0 && (
          <p className="px-3 py-6 text-center text-[0.74rem] text-grau">Nichts im Archiv.</p>
        )}
      </div>
      <p className="text-[0.66rem] text-grau">Nichts wird automatisch gelöscht.</p>
    </div>
  );
}
