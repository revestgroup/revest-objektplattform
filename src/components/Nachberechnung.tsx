/**
 * Reiter „Nachberechnung“ im Projekt (SAMMLUNG 8): je Abschnitt (Ankauf
 * gegenüber dem Verkäufer, je verkaufter Einheit gegenüber dem Käufer) der
 * Stichtag und die Rechnungen mit taggenauer Aufteilung. „Abrechnung an
 * Käufer“ fasst gewählte Zeilen zu einer Aufstellung (Druck/PDF) und einem
 * Gmail-Entwurf zusammen und legt eine Erinnerung nach 14 Tagen an.
 */
import { CheckCircle2, FileText, Plus, Printer, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useAufgaben } from "../lib/aufgabenStore";
import { useAuth } from "../lib/auth";
import { useEinstellungen } from "../lib/einstellungenStore";
import {
  NACHBERECHNUNGSARTEN,
  NACHBERECHNUNGSSTATUS,
  abgeschlossen,
  abrechnungstext,
  aufteilen,
  mitPlatzhaltern,
  stichtagFuer,
  type Nachberechnungsart,
  type Nachberechnungsstatus,
  type Nachberechnungszeile,
} from "../lib/nachberechnung";
import { type Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { cn } from "../lib/utils";
import { Dialog } from "./Dialog";

const EINGABE =
  "w-full min-w-0 rounded-lg border border-linie bg-grund px-2 py-1.5 text-[0.72rem] text-grau-stark focus:border-linie-stark focus:outline-none";

const TON: Record<Nachberechnungsstatus, string> = {
  offen: "bg-tinte text-grund",
  gemeldet: "bg-[#FAE8CD] text-[#8A5608]",
  bezahlt: "bg-[#E4EAF2] text-[#38506E]",
  erledigt: "bg-[#DBF2E6] text-[#0C5E3A]",
};

/** Nachberechnungen gehen auf den Cent — anders als der Rest der Plattform. */
const CENT = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const eurCent = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : CENT.format(v);

let nr = 0;
const neueId = () => `nb-${Date.now().toString(36)}-${(nr += 1)}`;

export function Nachberechnungsblatt({ objekt }: { objekt: Objekt }) {
  const { aendern } = useObjekte();
  const verkaufte = objekt.einheiten.filter((e) => e.verkauftAm);

  // Bereits verkaufte Einheiten (vor diesem Reiter) bekommen ihre Platzhalter jetzt.
  useEffect(() => {
    const fehlen = verkaufte.filter(
      (e) => !(objekt.nachberechnung ?? []).some((z) => z.einheitId === e.id),
    );
    if (!fehlen.length) return;
    const neu = fehlen.reduce((o, e) => mitPlatzhaltern(o, e.id), objekt);
    if (neu !== objekt) aendern(objekt.id, { nachberechnung: neu.nachberechnung });
  }, [objekt, verkaufte, aendern]);

  return (
    <div className="flex flex-col gap-10 px-6 py-8 md:px-9">
      <p className="max-w-3xl text-[0.72rem] leading-relaxed text-grau">
        Je Rechnung eine Zeile mit Zeitraum — aufgeteilt wird taggenau zum Stichtag. Welche Kosten
        ab wann wer trägt, regelt der Kaufvertrag; Sonderfälle mit manueller Aufteilung.
      </p>
      {objekt.besitzuebergangAm && (
        <Abschnitt objekt={objekt} einheitId={null} titel="Ankauf · gegenüber Verkäufer" />
      )}
      {verkaufte.map((e) => (
        <Abschnitt
          key={e.id}
          objekt={objekt}
          einheitId={e.id}
          titel={`Verkauf ${e.bezeichnung}${e.kaeufer ? ` · ${e.kaeufer}` : ""}`}
        />
      ))}
      {!objekt.besitzuebergangAm && verkaufte.length === 0 && (
        <p className="text-[0.8rem] text-grau">
          Noch kein Besitzübergang und keine verkaufte Einheit — nichts abzugrenzen.
        </p>
      )}
    </div>
  );
}

function Abschnitt({
  objekt,
  einheitId,
  titel,
}: {
  objekt: Objekt;
  einheitId: string | null;
  titel: string;
}) {
  const { aendern } = useObjekte();
  const [abrechnen, setAbrechnen] = useState(false);
  const alle = objekt.nachberechnung ?? [];
  const zeilen = alle.filter((z) => (z.einheitId ?? null) === einheitId);
  const seite = einheitId ? "verkauf" : "ankauf";
  const stichtag = stichtagFuer(objekt, einheitId);
  const gegenseite = einheitId ? "Käufer" : "Verkäufer";
  const offen = zeilen.filter((z) => z.status !== "erledigt").length;
  const fertig = einheitId ? abgeschlossen(objekt, einheitId) : false;

  const speichern = (neu: Nachberechnungszeile[]) =>
    aendern(objekt.id, {
      nachberechnung: [...alle.filter((z) => (z.einheitId ?? null) !== einheitId), ...neu],
    });
  const setze = (id: string, teil: Partial<Nachberechnungszeile>) =>
    speichern(zeilen.map((z) => (z.id === id ? { ...z, ...teil } : z)));

  const summe = zeilen.reduce(
    (s, z) => {
      const a = aufteilen(z, stichtag);
      return a ? { revest: s.revest + a.revest, gegen: s.gegen + a.gegenseite } : s;
    },
    { revest: 0, gegen: 0 },
  );

  return (
    <section>
      <div className="flex flex-wrap items-center gap-3">
        <div className="mini-label">{titel}</div>
        {fertig ? (
          <span className="flex items-center gap-1 text-[0.66rem] font-semibold text-[#0C5E3A]">
            <CheckCircle2 size={12} /> abgeschlossen
          </span>
        ) : (
          <span className="text-[0.66rem] text-grau-stark">{offen} offen</span>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-[0.66rem] text-grau">
          Stichtag
          <input
            type="date"
            value={stichtag ?? ""}
            onChange={(e) =>
              aendern(objekt.id, {
                nachberechnungStichtag: {
                  ...objekt.nachberechnungStichtag,
                  [einheitId ?? "ankauf"]: e.target.value || null,
                },
              })
            }
            aria-label={`Stichtag ${titel}`}
            className="zahl rounded-lg border border-linie bg-grund px-2 py-1 text-[0.72rem] text-tinte"
          />
        </label>
        {einheitId && (
          <button
            type="button"
            onClick={() => setAbrechnen(true)}
            className="druckbar rounded-full bg-tinte px-3.5 py-1.5 text-[0.66rem] font-semibold text-grund"
          >
            Abrechnung an Käufer
          </button>
        )}
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-linie bg-flaeche">
        <table className="w-full min-w-[60rem] text-left text-[0.72rem]">
          <thead>
            <tr className="bg-flaeche-hoch text-[0.58rem] font-semibold tracking-[0.12em] text-grau uppercase">
              <th className="px-2 py-2">Art / Titel</th>
              <th className="w-24 px-2 py-2 text-right">Betrag €</th>
              <th className="w-32 px-2 py-2">von</th>
              <th className="w-32 px-2 py-2">bis</th>
              <th className="w-24 px-2 py-2 text-right">Revest</th>
              <th className="w-24 px-2 py-2 text-right">{gegenseite}</th>
              <th className="w-56 px-2 py-2">Status</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {zeilen.map((z) => (
              <Zeile
                key={z.id}
                z={z}
                stichtag={stichtag}
                setze={(t) => setze(z.id, t)}
                loeschen={() => speichern(zeilen.filter((x) => x.id !== z.id))}
              />
            ))}
          </tbody>
          {zeilen.length > 0 && (
            <tfoot>
              <tr className="border-t border-linie-stark font-semibold text-tinte">
                <td className="px-2 py-2" colSpan={4}>
                  Summe
                </td>
                <td className="zahl px-2 py-2 text-right">{eurCent(summe.revest)}</td>
                <td className="zahl px-2 py-2 text-right">{eurCent(summe.gegen)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
        <button
          type="button"
          onClick={() =>
            speichern([
              ...zeilen,
              {
                id: neueId(),
                seite,
                einheitId,
                art: "grundsteuer",
                titel: null,
                betrag: null,
                von: stichtag ? `${stichtag.slice(0, 4)}-01-01` : null,
                bis: stichtag ? `${stichtag.slice(0, 4)}-12-31` : null,
                beleg: null,
                status: "offen",
                manuellRevest: null,
              },
            ])
          }
          className="druckbar m-2 flex items-center gap-1.5 rounded-full border border-linie px-3 py-1.5 text-[0.66rem] font-semibold text-grau-stark hover:text-tinte"
        >
          <Plus size={11} />
          Rechnung hinzufügen
        </button>
      </div>

      {abrechnen && einheitId && (
        <Abrechnungsdialog
          objekt={objekt}
          einheitId={einheitId}
          zeilen={zeilen}
          schliessen={() => setAbrechnen(false)}
          vermerken={(ids) =>
            speichern(
              zeilen.map((z) =>
                ids.includes(z.id)
                  ? {
                      ...z,
                      status: "gemeldet",
                      abgerechnetAm: new Date().toISOString().slice(0, 10),
                    }
                  : z,
              ),
            )
          }
        />
      )}
    </section>
  );
}

function Zeile({
  z,
  stichtag,
  setze,
  loeschen,
}: {
  z: Nachberechnungszeile;
  stichtag: string | null;
  setze: (t: Partial<Nachberechnungszeile>) => void;
  loeschen: () => void;
}) {
  const a = aufteilen(z, stichtag);
  const [betrag, setBetrag] = useState(z.betrag !== null ? String(z.betrag).replace(".", ",") : "");
  const [manuell, setManuell] = useState(
    z.manuellRevest !== null ? String(z.manuellRevest).replace(".", ",") : "",
  );
  const zahl = (t: string) => {
    const n = Number(t.replace(/\./g, "").replace(",", "."));
    return t.trim() === "" || !Number.isFinite(n) ? null : n;
  };
  return (
    <tr
      className={cn(
        "border-t border-linie align-top",
        z.platzhalter && z.betrag === null && "bg-[#FDF8EC]",
      )}
    >
      <td className="px-2 py-1.5">
        <div className="flex gap-1">
          <select
            value={z.art}
            onChange={(e) => setze({ art: e.target.value as Nachberechnungsart })}
            aria-label="Art"
            className={cn(EINGABE, "w-32 shrink-0")}
          >
            {Object.entries(NACHBERECHNUNGSARTEN).map(([w, t]) => (
              <option key={w} value={w}>
                {t}
              </option>
            ))}
          </select>
          <input
            defaultValue={z.titel ?? ""}
            onBlur={(e) => setze({ titel: e.target.value.trim() || null })}
            placeholder="Titel / Rechnung"
            aria-label="Titel"
            className={EINGABE}
          />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.62rem] text-grau">
          {z.platzhalter && z.betrag === null && (
            <span className="font-semibold text-[#8A5608]">erwartet</span>
          )}
          <label className="flex cursor-pointer items-center gap-1 hover:text-tinte">
            <FileText size={11} />
            {z.beleg ? z.beleg.name : "Beleg"}
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const d = e.target.files?.[0];
                if (d) setze({ beleg: { name: d.name } });
                e.target.value = "";
              }}
            />
          </label>
          <label className="flex items-center gap-1">
            Revest manuell
            <input
              value={manuell}
              onChange={(e) => setManuell(e.target.value)}
              onBlur={() => setze({ manuellRevest: zahl(manuell) })}
              inputMode="decimal"
              placeholder="—"
              aria-label="Revest-Anteil manuell"
              className="zahl w-20 rounded border border-linie bg-grund px-1.5 py-0.5 text-right text-[0.64rem]"
            />
          </label>
        </div>
      </td>
      <td className="px-2 py-1.5">
        <input
          value={betrag}
          onChange={(e) => setBetrag(e.target.value)}
          onBlur={() => setze({ betrag: zahl(betrag) })}
          inputMode="decimal"
          aria-label="Betrag"
          className={cn(EINGABE, "zahl text-right")}
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="date"
          value={z.von ?? ""}
          onChange={(e) => setze({ von: e.target.value || null })}
          aria-label="von"
          className={cn(EINGABE, "zahl")}
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="date"
          value={z.bis ?? ""}
          onChange={(e) => setze({ bis: e.target.value || null })}
          aria-label="bis"
          className={cn(EINGABE, "zahl")}
        />
      </td>
      <td
        className="zahl px-2 py-2 text-right text-tinte"
        title={a && a.tageGesamt ? `${a.tageRevest} von ${a.tageGesamt} Tagen` : undefined}
      >
        {a ? eurCent(a.revest) : "—"}
      </td>
      <td className="zahl px-2 py-2 text-right text-tinte">{a ? eurCent(a.gegenseite) : "—"}</td>
      <td className="px-2 py-1.5">
        <span
          role="radiogroup"
          aria-label="Status"
          className="flex rounded-full bg-flaeche-hoch p-0.5"
        >
          {(Object.keys(NACHBERECHNUNGSSTATUS) as Nachberechnungsstatus[]).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={z.status === s}
              onClick={() => setze({ status: s })}
              className={cn(
                "druckbar rounded-full px-1.5 py-0.5 text-[0.6rem] font-medium",
                z.status === s ? TON[s] : "text-grau hover:text-grau-stark",
              )}
            >
              {NACHBERECHNUNGSSTATUS[s]}
            </button>
          ))}
        </span>
      </td>
      <td className="px-1 py-1.5">
        <button
          type="button"
          onClick={loeschen}
          aria-label="Zeile entfernen"
          className="druckbar flex size-6 items-center justify-center rounded-full text-grau hover:text-[#9A2727]"
        >
          <Trash2 size={12} />
        </button>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* Abrechnung an Käufer                                                 */
/* ------------------------------------------------------------------ */

function Abrechnungsdialog({
  objekt,
  einheitId,
  zeilen,
  schliessen,
  vermerken,
}: {
  objekt: Objekt;
  einheitId: string;
  zeilen: Nachberechnungszeile[];
  schliessen: () => void;
  vermerken: (ids: string[]) => void;
}) {
  const { bank } = useEinstellungen();
  const { nutzer } = useAuth();
  const { anlegen } = useAufgaben();
  const stichtag = stichtagFuer(objekt, einheitId);
  const moeglich = zeilen.filter(
    (z) => z.status === "offen" && (aufteilen(z, stichtag)?.gegenseite ?? 0) > 0,
  );
  const [wahl, setWahl] = useState<string[]>(moeglich.map((z) => z.id));
  const gewaehlt = moeglich.filter((z) => wahl.includes(z.id));
  const e = objekt.einheiten.find((x) => x.id === einheitId);
  const an = e?.kaeuferKontakt?.includes("@") ? e.kaeuferKontakt : "";
  const t = abrechnungstext(objekt, gewaehlt, bank, nutzer?.name ?? "Timo Birk");

  function drucken() {
    // Ohne „noopener“: das leere Fenster muss beschreibbar sein.
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const zeilenHtml = gewaehlt
      .map((z) => {
        const a = aufteilen(z, stichtag)!;
        return `<tr><td>${z.titel ?? NACHBERECHNUNGSARTEN[z.art]}</td><td>${z.von ?? ""} – ${z.bis ?? ""}</td><td style="text-align:right">${eurCent(z.betrag)}</td><td style="text-align:right">${eurCent(a.gegenseite)}</td></tr>`;
      })
      .join("");
    w.document.write(
      `<!doctype html><meta charset="utf-8"><title>${t.betreff}</title><body style="font-family:system-ui;padding:32px;color:#10131A"><h2>${t.betreff}</h2><p>Stichtag ${stichtag ?? ""} · ${e?.bezeichnung ?? ""} · Käufer ${e?.kaeufer ?? ""}</p><table style="width:100%;border-collapse:collapse" border="1" cellpadding="6"><tr><th align="left">Position</th><th align="left">Zeitraum</th><th>Betrag</th><th>Anteil Käufer</th></tr>${zeilenHtml}<tr><td colspan="3"><b>Summe</b></td><td style="text-align:right"><b>${eurCent(t.summe)}</b></td></tr></table><p>Bankverbindung: ${bank.inhaber} · IBAN ${bank.iban || "—"}</p><script>print()</script></body>`,
    );
    w.document.close();
  }

  return (
    <Dialog
      titel="Abrechnung an Käufer"
      unterzeile={`${e?.bezeichnung ?? ""} · Summe Käuferanteil ${eurCent(t.summe)}`}
      schliessen={schliessen}
    >
      {moeglich.length === 0 ? (
        <p className="text-[0.8rem] text-grau-stark">
          Keine offene Zeile mit Käuferanteil — erst Betrag und Zeitraum eintragen.
        </p>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-linie rounded-xl border border-linie">
            {moeglich.map((z) => (
              <li key={z.id} className="flex items-center gap-2.5 px-3 py-2 text-[0.76rem]">
                <input
                  type="checkbox"
                  checked={wahl.includes(z.id)}
                  onChange={(ev) =>
                    setWahl((alt) =>
                      ev.target.checked ? [...alt, z.id] : alt.filter((x) => x !== z.id),
                    )
                  }
                  className="size-4"
                />
                <span className="min-w-0 flex-1 text-tinte">
                  {z.titel ?? NACHBERECHNUNGSARTEN[z.art]}
                </span>
                <span className="zahl text-grau-stark">
                  {eurCent(aufteilen(z, stichtag)!.gegenseite)}
                </span>
              </li>
            ))}
          </ul>
          {!bank.iban && (
            <p className="mt-2 text-[0.68rem] font-semibold text-[#8A5608]">
              Keine IBAN hinterlegt — in den Einstellungen unter „Bankverbindung“ eintragen.
            </p>
          )}
          <p className="mt-2 text-[0.66rem] text-grau">
            Danach stehen die Zeilen auf „gemeldet“, und in 14 Tagen erinnert eine Aufgabe an den
            Zahlungseingang.
          </p>
        </>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-2.5 border-t border-linie pt-4">
        <button
          type="button"
          onClick={schliessen}
          className="druckbar rounded-full px-4 py-2.5 text-[0.7rem] font-medium text-grau-stark"
        >
          Abbrechen
        </button>
        {gewaehlt.length > 0 && (
          <>
            <button
              type="button"
              onClick={drucken}
              className="druckbar flex items-center gap-1.5 rounded-full border border-linie-stark px-4 py-2.5 text-[0.7rem] font-semibold text-tinte"
            >
              <Printer size={12} />
              Aufstellung drucken / PDF
            </button>
            <button
              type="button"
              onClick={() => {
                const q = new URLSearchParams({
                  view: "cm",
                  fs: "1",
                  to: an ?? "",
                  su: t.betreff,
                  body: t.text,
                });
                window.open(`https://mail.google.com/mail/?${q.toString()}`, "_blank", "noopener");
                vermerken(gewaehlt.map((z) => z.id));
                anlegen({
                  titel: `Zahlung Nachberechnung prüfen: ${e?.bezeichnung ?? objekt.strasse}`,
                  beschreibung: `${eurCent(t.summe)} von ${e?.kaeufer ?? "Käufer"}`,
                  objektId: objekt.id,
                  art: "sonst",
                  dringlichkeit: "normal",
                  faelligAm: new Date(Date.now() + 14 * 86_400_000).toISOString(),
                });
                schliessen();
              }}
              className="druckbar rounded-full bg-tinte px-5 py-2.5 text-[0.7rem] font-semibold text-grund"
            >
              Gmail-Entwurf öffnen
            </button>
          </>
        )}
      </div>
    </Dialog>
  );
}
