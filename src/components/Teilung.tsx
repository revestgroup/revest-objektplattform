/**
 * Die Teilungserklärung.
 *
 * Ein eigener Reiter, weil die Aufteilung eines Hauses ein Vorgang über
 * Monate ist: Aufteilungsplan, Abgeschlossenheitsbescheinigung, Beurkundung,
 * Eintragung — vier Stationen bei drei verschiedenen Stellen. Dieser Reiter
 * beantwortet eine Frage: wo hängt es gerade, und was fehlt noch?
 *
 * Er wird nur nutzbar, wenn die Teilung beim Deal angestoßen wurde. Ein Haus,
 * das als Ganzes gehalten oder verkauft wird, hat hier nichts abzulegen.
 */
import { Check, Scale } from "lucide-react";
import { useState } from "react";

import {
  TEILUNGSSTATUS,
  TEILUNGSSTATUS_REIHENFOLGE,
  aufteilungText,
  f,
  type Objekt,
  type Teilungserklaerung,
} from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { cn } from "../lib/utils";
/**
 * Die vier Unterlagen, ohne die keine Eintragung zustande kommt — als kleine
 * Checkliste wie im Ankauf. Ein Haken setzt sich selbst, wenn eine passende
 * Datei in den Teilungsordnern liegt; sonst von Hand. Die Ablage selbst steht
 * im Reiter „Drive“.
 */
const UNTERLAGEN = [
  { id: "aufteilungsplan", titel: "Aufteilungsplan", muster: /aufteilungsplan/i },
  {
    id: "abgeschlossenheit",
    titel: "Abgeschlossenheitsbescheinigung",
    muster: /abgeschlossenheit/i,
  },
  {
    id: "teilungserklaerung",
    titel: "Teilungserklärung mit Gemeinschaftsordnung",
    muster: /teilungserkl|gemeinschaftsordnung/i,
  },
  { id: "eintragung", titel: "Eintragungsnachricht des Grundbuchamts", muster: /eintragung/i },
];

/** Die beiden Ordner, in denen Teilungsunterlagen liegen. */
const ORDNER = [
  "01_Unterlagen/01_Unterlagen zum Objekt",
  "01_Unterlagen/03_Notar_Grundbuchsachen",
] as const;

export function Teilung({ objekt }: { objekt: Objekt }) {
  // Ohne Teilung ist der Reiter gesperrt — sichtbar wird dieser Fall nur,
  // wenn jemand sie nach dem Öffnen zurückzieht. Die Weiche steht außen,
  // damit das Blatt seine Felder bedingungslos vorbelegen kann.
  if (!objekt.teilung) return <Gesperrt />;
  return <Teilungsblatt objekt={objekt} t={objekt.teilung} />;
}

function Teilungsblatt({ objekt, t }: { objekt: Objekt; t: Teilungserklaerung }) {
  const { teilungSetzen } = useObjekte();
  const dateien = objekt.dokumente.filter((d) => ORDNER.some((o) => d.ordner === o));
  const vonHand = new Set(t.unterlagen ?? []);

  const [notar, setNotar] = useState(t.notar ?? "");
  const [erwartet, setErwartet] = useState(t.erwartetAm ?? "");
  const [einheiten, setEinheiten] = useState(t.einheiten !== null ? String(t.einheiten) : "");
  const [notiz, setNotiz] = useState(t.notiz ?? "");

  const geaendert =
    notar !== (t.notar ?? "") ||
    erwartet !== (t.erwartetAm ?? "") ||
    einheiten !== (t.einheiten !== null ? String(t.einheiten) : "") ||
    notiz !== (t.notiz ?? "");

  function speichern() {
    const n = Number(einheiten);
    teilungSetzen(objekt.id, {
      ...t,
      notar: notar.trim() || null,
      erwartetAm: erwartet || null,
      einheiten: einheiten.trim() === "" || Number.isNaN(n) ? null : Math.round(n),
      notiz: notiz.trim() || null,
    });
  }

  const aktuell = TEILUNGSSTATUS_REIHENFOLGE.indexOf(t.status);
  const verwertung = aufteilungText(objekt);

  return (
    <div className="divide-y divide-linie">
      {/* ----- Wo es steht ----- */}
      {/* Vier Stufen klein nebeneinander als Schrittleiste; am Telefon wischbar. */}
      <div className="px-4 py-5 md:px-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="mini-label">Stand</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-grau">
            <span>Angestoßen am {f.datum(t.gestartetAm)}</span>
            {verwertung && <span>{verwertung}</span>}
          </div>
        </div>
        <ol className="scroll-reihe mt-3 flex items-center overflow-x-auto">
          {TEILUNGSSTATUS_REIHENFOLGE.map((s, i) => {
            const erledigt = i < aktuell;
            const an = i === aktuell;
            return (
              <li key={s} className="flex min-w-max flex-1 items-center">
                <button
                  type="button"
                  onClick={() => teilungSetzen(objekt.id, { ...t, status: s })}
                  aria-current={an ? "step" : undefined}
                  className={cn(
                    "druckbar flex shrink-0 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-[0.74rem]",
                    an ? "bg-tinte text-grund" : erledigt ? "text-grau-stark" : "text-grau",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[0.58rem] font-semibold",
                      an
                        ? "bg-grund text-tinte"
                        : erledigt
                          ? "bg-[#17935C] text-white"
                          : "bg-flaeche-hoch text-grau",
                    )}
                  >
                    {erledigt ? <Check size={11} strokeWidth={2.5} /> : i + 1}
                  </span>
                  {TEILUNGSSTATUS[s].titel}
                </button>
                {i < TEILUNGSSTATUS_REIHENFOLGE.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      "mx-2 h-px min-w-6 flex-1",
                      erledigt ? "bg-[#17935C]" : "bg-linie-stark",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* ----- Angaben ----- */}
      <div className="px-4 py-5 md:px-7">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <Feld label="Notariat" id="teil-notar">
            <input
              id="teil-notar"
              type="text"
              value={notar}
              onChange={(e) => setNotar(e.target.value)}
              placeholder="Notariat Dr. Winterberg, Ulm"
              className={EINGABE}
            />
          </Feld>
          <Feld label="Wohnungsgrundbücher" id="teil-einheiten">
            <input
              id="teil-einheiten"
              type="number"
              inputMode="numeric"
              value={einheiten}
              onChange={(e) => setEinheiten(e.target.value)}
              className={cn(
                EINGABE,
                "zahl [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
              )}
            />
          </Feld>
          <Feld label="Eintragung erwartet" id="teil-erwartet">
            <input
              id="teil-erwartet"
              type="date"
              value={erwartet}
              onChange={(e) => setErwartet(e.target.value)}
              className={cn(EINGABE, "zahl")}
            />
          </Feld>
        </div>
        <div className="mt-3">
          <Feld label="Notiz" id="teil-notiz">
            <input
              id="teil-notiz"
              type="text"
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              placeholder="Was zuletzt besprochen wurde"
              className={EINGABE}
            />
          </Feld>
        </div>

        {/* Der Knopf erscheint erst, wenn es etwas zu speichern gibt — ein
            dauerhaft sichtbarer, meist sinnloser Knopf erzieht zum Ignorieren. */}
        {geaendert && (
          <button
            type="button"
            onClick={speichern}
            className="druckbar eintritt mt-3 rounded-full bg-tinte px-5 py-2 text-[0.66rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte"
          >
            Speichern
          </button>
        )}
      </div>

      {/* ----- Was gebraucht wird ----- */}
      <div className="px-4 py-5 md:px-7">
        <div className="mini-label">
          Was gebraucht wird ·{" "}
          {
            UNTERLAGEN.filter(
              (u) => vonHand.has(u.id) || dateien.some((d) => u.muster.test(d.name)),
            ).length
          }{" "}
          von {UNTERLAGEN.length}
        </div>
        <ul className="mt-2.5 flex max-w-xl flex-col gap-1">
          {UNTERLAGEN.map((u) => {
            const datei = dateien.find((d) => u.muster.test(d.name));
            const da = Boolean(datei) || vonHand.has(u.id);
            return (
              <li key={u.id} className="flex items-center gap-2.5 rounded-lg px-1 py-1">
                <button
                  type="button"
                  disabled={Boolean(datei)}
                  onClick={() => {
                    const neu = new Set(vonHand);
                    if (neu.has(u.id)) neu.delete(u.id);
                    else neu.add(u.id);
                    teilungSetzen(objekt.id, { ...t, unterlagen: [...neu] });
                  }}
                  aria-pressed={da}
                  aria-label={`${u.titel} ${da ? "liegt vor" : "fehlt"}`}
                  title={
                    datei ? `Liegt im Drive: ${datei.name}` : da ? "Von Hand abgehakt" : "Abhaken"
                  }
                  className={cn(
                    "druckbar flex size-5 shrink-0 items-center justify-center rounded-full border",
                    da
                      ? "border-[#17935C] bg-[#17935C] text-white"
                      : "border-linie-stark bg-flaeche text-transparent hover:border-grau",
                  )}
                >
                  <Check size={11} strokeWidth={3} />
                </button>
                <span
                  className={cn(
                    "min-w-0 flex-1 text-[0.78rem]",
                    da ? "text-tinte" : "text-grau-stark",
                  )}
                >
                  {u.titel}
                </span>
                {datei && (
                  <span
                    title={datei.name}
                    className="max-w-[12rem] truncate text-[0.64rem] text-grau"
                  >
                    {datei.name}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[0.66rem] text-grau">
          Dateien liegen im Reiter „Drive“ unter {ORDNER.join(" und ")}.
        </p>
      </div>

      {/* ----- Zurückziehen ----- */}
      <div className="px-6 py-8 md:px-9">
        <button
          type="button"
          onClick={() => teilungSetzen(objekt.id, null)}
          className="druckbar rounded-full border border-linie px-4 py-2.5 text-[0.68rem] font-medium text-grau hover:border-[#E3BDB9] hover:text-[#8A2822]"
        >
          Teilung zurückziehen
        </button>
      </div>
    </div>
  );
}

const EINGABE =
  "w-full rounded-xl border border-linie bg-flaeche px-3 py-1.5 text-[0.8rem] text-tinte transition-colors duration-150 ease-out placeholder:text-grau focus:border-linie-stark focus:outline-none";

function Feld({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mini-label block">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Gesperrt() {
  return (
    <div className="px-6 py-16 text-center md:px-9">
      <Scale size={22} strokeWidth={1.5} className="mx-auto text-grau" />
      <p className="mx-auto mt-4 max-w-sm text-[0.82rem] leading-relaxed text-grau">
        Keine Teilungserklärung hinterlegt.
      </p>
    </div>
  );
}

/**
 * Die Einladung für ein gekauftes Objekt ohne Teilung. Steht im Projekt unter
 * der Übersicht, nicht im gesperrten Reiter: wer den Reiter anklickt, hat die
 * Entscheidung schon getroffen — wer die Übersicht liest, trifft sie gerade.
 */
export function TeilungAnstossen({ objekt }: { objekt: Objekt }) {
  const { teilungSetzen } = useObjekte();
  if (objekt.teilung) return null;

  return (
    <button
      type="button"
      onClick={() =>
        teilungSetzen(objekt.id, {
          gestartetAm: new Date().toISOString().slice(0, 10),
          status: "vorbereitung",
          notar: objekt.kontakte.find((k) => k.rolle === "notar")?.name ?? null,
          einheiten: objekt.aufteilung
            ? objekt.aufteilung.etw + objekt.aufteilung.wg || objekt.anzahlEinheiten
            : objekt.anzahlEinheiten,
          erwartetAm: null,
          notiz: null,
        })
      }
      className="druckbar flex items-center gap-2 rounded-full border border-linie-stark px-4 py-2.5 text-[0.68rem] font-medium tracking-[0.1em] uppercase text-tinte"
    >
      <Scale size={13} strokeWidth={2} />
      Teilung anstoßen
    </button>
  );
}
