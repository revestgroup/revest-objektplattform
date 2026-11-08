/**
 * Reiter „Ummeldungen“ im Projekt: oben die Ummeldungen zum Besitzübergang,
 * darunter je verkaufter Einheit die Abmeldungen an den Käufer.
 */
import { AlertTriangle, FolderOpen } from "lucide-react";
import { useState } from "react";

import { f, liegtIn, type Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import {
  UMMELDEARTEN,
  UMMELDESTATUS,
  istUeberfaellig,
  stichtag,
  type Ummeldestatus,
  type Ummeldung,
} from "../lib/ummeldungen";
import { cn } from "../lib/utils";
import { anzeigename } from "../lib/kontakte";

/** Welche Kategorien im Register als Anbieter in Frage kommen. */
const ANBIETER_KATEGORIEN: Record<Ummeldung["art"], string[]> = {
  hausverwaltung: ["Hausverwaltung"],
  gas: ["Versorger"],
  strom: ["Versorger"],
  wasser: ["Versorger"],
  versicherung: ["Versicherung"],
  schornsteinfeger: ["Handwerker / Dienstleister"],
  grundbesitzabgaben: ["Amt / Behörde"],
};

const TON: Record<Ummeldestatus, string> = {
  offen: "bg-tinte text-grund",
  gemeldet: "bg-[#FAE8CD] text-[#8A5608]",
  bestaetigt: "bg-[#DBF2E6] text-[#0C5E3A]",
  entfaellt: "bg-[#EDEDED] text-[#555555]",
};

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export function Ummeldungsblatt({ objekt }: { objekt: Objekt }) {
  const { aendern } = useObjekte();
  const [datum, setDatum] = useState("");
  const liste = objekt.ummeldungen ?? [];
  const an = liste.filter((u) => u.richtung === "an");

  if (!objekt.besitzuebergangAm && an.length === 0) {
    return (
      <div className="px-6 py-10 md:px-9">
        <div className="max-w-md rounded-2xl border border-linie bg-flaeche px-5 py-5">
          <div className="text-[0.84rem] font-medium text-tinte">
            Besitzübergang noch nicht eingetragen
          </div>
          <p className="mt-1.5 text-[0.72rem] leading-relaxed text-grau">
            Mit dem Übergang von Besitz, Nutzen und Lasten entstehen die sieben Ummeldungen —
            Hausverwaltung, Gas, Strom, Wasser, Versicherung, Schornsteinfeger, Grundbesitzabgaben.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="mini-label">Besitzübergang am</span>
              <input
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className="zahl rounded-xl border border-linie bg-grund px-3 py-2 text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none"
              />
            </label>
            <button
              type="button"
              disabled={!datum}
              onClick={() => aendern(objekt.id, { besitzuebergangAm: datum })}
              className="druckbar rounded-full bg-tinte px-4 py-2.5 text-[0.66rem] font-medium tracking-[0.12em] uppercase text-grund disabled:opacity-30"
            >
              Eintragen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Besitzübergang steht, aber die Liste fehlt (etwa nach einem Import):
  // ein Knopf statt einer leeren Seite. Jede Änderung legt sie an.
  if (an.length === 0) {
    return (
      <div className="px-6 py-10 md:px-9">
        <div className="max-w-md rounded-2xl border border-linie bg-flaeche px-5 py-5">
          <div className="text-[0.84rem] font-medium text-tinte">
            Besitzübergang am {f.datum(objekt.besitzuebergangAm!)}, aber noch keine Ummeldungen
          </div>
          <button
            type="button"
            onClick={() => aendern(objekt.id, {})}
            className="druckbar mt-4 rounded-full bg-tinte px-4 py-2.5 text-[0.66rem] font-medium tracking-[0.12em] uppercase text-grund"
          >
            Ummeldungen anlegen
          </button>
        </div>
      </div>
    );
  }

  const verkaufte = objekt.einheiten.filter((e) =>
    liste.some((u) => u.richtung === "ab" && u.einheitId === e.id),
  );

  return (
    <div className="flex flex-col gap-10 px-6 py-8 md:px-9">
      <Liste
        objekt={objekt}
        titel="Ummeldungen zum Besitzübergang"
        unterzeile={
          objekt.besitzuebergangAm
            ? `Besitzübergang ${f.datum(objekt.besitzuebergangAm)}`
            : undefined
        }
        eintraege={an}
      />
      {verkaufte.map((e) => (
        <Liste
          key={e.id}
          objekt={objekt}
          titel={`Abmeldungen ${e.bezeichnung}${e.kaeufer ? ` → ${e.kaeufer}` : ""}`}
          unterzeile={[
            e.verkauftAm
              ? `verkauft ${f.datum(e.verkauftAm)}`
              : e.status !== "verkauft"
                ? "Verkauf zurückgenommen"
                : null,
            e.kaeuferKontakt,
          ]
            .filter(Boolean)
            .join(" · ")}
          eintraege={liste.filter((u) => u.richtung === "ab" && u.einheitId === e.id)}
        />
      ))}
    </div>
  );
}

function Liste({
  objekt,
  titel,
  unterzeile,
  eintraege,
}: {
  objekt: Objekt;
  titel: string;
  unterzeile?: string;
  eintraege: Ummeldung[];
}) {
  const erledigt = eintraege.filter(
    (u) => u.status === "bestaetigt" || u.status === "entfaellt",
  ).length;
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="mini-label">{titel}</div>
          {unterzeile && <div className="mt-1 text-[0.68rem] text-grau">{unterzeile}</div>}
        </div>
        <div className="zahl text-[0.74rem] text-grau-stark">
          {erledigt} von {eintraege.length} erledigt
        </div>
      </div>
      <ul className="mt-3 divide-y divide-linie overflow-hidden rounded-2xl border border-linie bg-flaeche">
        {UMMELDEARTEN.map((a) => {
          const u = eintraege.find((x) => x.art === a.art);
          return u ? <Eintrag key={u.id} objekt={objekt} u={u} art={a} /> : null;
        })}
      </ul>
    </section>
  );
}

function Eintrag({
  objekt,
  u,
  art,
}: {
  objekt: Objekt;
  u: Ummeldung;
  art: (typeof UMMELDEARTEN)[number];
}) {
  const { ummeldungSetzen, register } = useObjekte();
  const vorschlaege = register
    .filter((r) => r.kategorien.some((k) => ANBIETER_KATEGORIEN[u.art].includes(k)))
    .map((r) => anzeigename(r));
  const setze = (teil: Partial<Ummeldung>) => ummeldungSetzen(objekt.id, u.id, teil);
  const ueberfaellig = istUeberfaellig(objekt, u);
  const dateien = objekt.dokumente.filter((d) => liegtIn(d.ordner, art.ordner)).length;

  function status(neu: Ummeldestatus) {
    // Wer „gemeldet“ oder „bestätigt“ klickt, hat es heute getan — das Datum
    // steht schon drin und lässt sich ändern.
    const teil: Partial<Ummeldung> = { status: neu };
    if (neu === "gemeldet" && !u.gemeldetAm) teil.gemeldetAm = heute();
    if (neu === "bestaetigt") {
      if (!u.bestaetigtAm) teil.bestaetigtAm = heute();
      if (!u.gemeldetAm) teil.gemeldetAm = heute();
    }
    setze(teil);
  }

  return (
    <li className={cn("px-4 py-3.5", ueberfaellig && "bg-[#FDF8EC]")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[0.8rem] font-medium text-tinte">
            {art.titel}
            {ueberfaellig && (
              <span
                title={`Seit mehr als 14 Tagen ohne Fortschritt (Stichtag ${stichtag(objekt, u) ? f.datum(stichtag(objekt, u)!) : "—"})`}
                className="flex items-center gap-1 text-[0.6rem] font-semibold text-[#8A5608]"
              >
                <AlertTriangle size={11} strokeWidth={2.25} />
                überfällig
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[0.62rem] text-grau">
            <FolderOpen size={11} strokeWidth={1.75} />
            {dateien === 0
              ? "keine Dateien"
              : dateien === 1
                ? "1 Datei"
                : `${dateien} Dateien`} in {art.ordner.split("/").at(-1)}
          </div>
        </div>
        <div
          role="radiogroup"
          aria-label={`Status ${art.titel}`}
          className="flex shrink-0 rounded-full bg-flaeche-hoch p-0.5"
        >
          {(Object.keys(UMMELDESTATUS) as Ummeldestatus[]).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={u.status === s}
              onClick={() => status(s)}
              className={cn(
                "druckbar rounded-full px-2.5 py-1 text-[0.64rem] font-medium whitespace-nowrap",
                u.status === s ? TON[s] : "text-grau hover:text-grau-stark",
              )}
            >
              {UMMELDESTATUS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("mt-3 grid gap-2", art.zaehler ? "sm:grid-cols-5" : "sm:grid-cols-3")}>
        <Feld
          label="Anbieter / Kontakt"
          wert={u.anbieter}
          setWert={(v) => setze({ anbieter: v })}
          breit
          vorschlaege={vorschlaege}
          listeId={`anbieter-${u.id}`}
        />
        {art.zaehler && (
          <>
            <Feld
              label="Zählernummer"
              wert={u.zaehlernummer}
              setWert={(v) => setze({ zaehlernummer: v })}
            />
            <Feld
              label="Zählerstand"
              wert={u.zaehlerstand}
              setWert={(v) => setze({ zaehlerstand: v })}
            />
          </>
        )}
        <Datum label="Gemeldet am" wert={u.gemeldetAm} setWert={(v) => setze({ gemeldetAm: v })} />
        <Datum
          label="Bestätigt am"
          wert={u.bestaetigtAm}
          setWert={(v) => setze({ bestaetigtAm: v })}
        />
      </div>
      <Feld label="Notiz" wert={u.notiz} setWert={(v) => setze({ notiz: v })} ohneLabel />
    </li>
  );
}

function Feld({
  label,
  wert,
  setWert,
  breit,
  ohneLabel,
  vorschlaege,
  listeId,
}: {
  label: string;
  wert: string | null | undefined;
  setWert: (v: string | null) => void;
  breit?: boolean;
  ohneLabel?: boolean;
  /** Vorschläge aus dem Kontaktregister; frei tippen bleibt möglich. */
  vorschlaege?: string[];
  listeId?: string;
}) {
  const [text, setText] = useState(wert ?? "");
  return (
    <label className={cn("flex flex-col gap-1", breit && "sm:col-span-1", ohneLabel && "mt-2")}>
      {!ohneLabel && (
        <span className="text-[0.58rem] tracking-[0.12em] uppercase text-grau">{label}</span>
      )}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        // Gespeichert beim Verlassen — sonst schreibt jeder Buchstabe einen Stand.
        onBlur={() => text !== (wert ?? "") && setWert(text.trim() || null)}
        placeholder={ohneLabel ? "Notiz …" : undefined}
        aria-label={label}
        list={vorschlaege?.length ? listeId : undefined}
        className="w-full rounded-lg border border-linie bg-grund px-2.5 py-1.5 text-[0.72rem] text-grau-stark placeholder:text-grau focus:border-linie-stark focus:outline-none"
      />
      {vorschlaege?.length ? (
        <datalist id={listeId}>
          {vorschlaege.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      ) : null}
    </label>
  );
}

function Datum({
  label,
  wert,
  setWert,
}: {
  label: string;
  wert: string | null | undefined;
  setWert: (v: string | null) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.58rem] tracking-[0.12em] uppercase text-grau">{label}</span>
      <input
        type="date"
        value={wert ?? ""}
        onChange={(e) => setWert(e.target.value || null)}
        aria-label={label}
        className="zahl w-full rounded-lg border border-linie bg-grund px-2 py-1.5 text-[0.72rem] text-grau-stark focus:border-linie-stark focus:outline-none"
      />
    </label>
  );
}
