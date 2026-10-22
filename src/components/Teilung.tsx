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
import { Scale } from "lucide-react";
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
import { Dokumentenablage } from "./Dokumente";

/**
 * Die Unterlagen, ohne die keine Eintragung zustande kommt. Als Liste und
 * nicht als Haken: ob ein Dokument wirklich das richtige ist, kann die
 * Plattform nicht wissen — sie kann nur daran erinnern, dass es fehlt.
 */
const UNTERLAGEN = [
  { titel: "Aufteilungsplan" },
  { titel: "Abgeschlossenheitsbescheinigung" },
  { titel: "Teilungserklärung mit Gemeinschaftsordnung" },
  { titel: "Eintragungsnachricht des Grundbuchamts" },
];

/** Die beiden Ordner, in denen Teilungsunterlagen liegen. */
const ORDNER = ["02_grundbuch", "04_plaene"] as const;

export function Teilung({ objekt }: { objekt: Objekt }) {
  // Ohne Teilung ist der Reiter gesperrt — sichtbar wird dieser Fall nur,
  // wenn jemand sie nach dem Öffnen zurückzieht. Die Weiche steht außen,
  // damit das Blatt seine Felder bedingungslos vorbelegen kann.
  if (!objekt.teilung) return <Gesperrt />;
  return <Teilungsblatt objekt={objekt} t={objekt.teilung} />;
}

function Teilungsblatt({ objekt, t }: { objekt: Objekt; t: Teilungserklaerung }) {
  const { teilungSetzen, dokumenteAnhaengen, dokumentLoeschen } = useObjekte();

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
      <div className="px-6 py-8 md:px-9">
        <div className="mini-label">Stand</div>

        {/* Der Weg als Kette. Vier Stationen passen auf dem Telefon nicht
            nebeneinander, also untereinander — so bleibt jede lesbar und
            anklickbar, ohne zu wischen. */}
        <ol className="mt-5 grid gap-2 sm:grid-cols-2">
          {TEILUNGSSTATUS_REIHENFOLGE.map((s, i) => {
            const erledigt = i < aktuell;
            const an = i === aktuell;
            const st = TEILUNGSSTATUS[s];
            return (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => teilungSetzen(objekt.id, { ...t, status: s })}
                  aria-current={an ? "step" : undefined}
                  className={cn(
                    "druckbar flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left",
                    an ? "border-transparent shadow-karte" : "border-linie bg-flaeche",
                  )}
                  style={an ? { background: st.weich, borderColor: st.farbe } : undefined}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-semibold",
                      erledigt || an ? "text-white" : "bg-flaeche-hoch text-grau",
                    )}
                    style={erledigt || an ? { background: st.farbe } : undefined}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-[0.78rem] font-medium",
                        an ? "" : erledigt ? "text-grau-stark" : "text-grau",
                      )}
                      style={an ? { color: st.tief } : undefined}
                    >
                      {st.titel}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] text-grau">
          <span>Angestoßen am {f.datum(t.gestartetAm)}</span>
          {verwertung && (
            <>
              <span aria-hidden className="size-[3px] rounded-full bg-linie-stark" />
              <span>{verwertung}</span>
            </>
          )}
        </div>
      </div>

      {/* ----- Angaben ----- */}
      <div className="px-6 py-8 md:px-9">
        <div className="mini-label">Angaben</div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Feld label="Notariat" id="teil-notar">
            <input
              id="teil-notar"
              type="text"
              value={notar}
              onChange={(e) => setNotar(e.target.value)}
              placeholder="Notariat Dr. Bäuerle, Ulm"
              className={EINGABE}
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
        </div>

        <div className="mt-5">
          <Feld label="Notiz" id="teil-notiz">
            <textarea
              id="teil-notiz"
              rows={3}
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              placeholder="Was zuletzt besprochen wurde"
              className={cn(EINGABE, "resize-y leading-relaxed")}
            />
          </Feld>
        </div>

        {/* Der Knopf erscheint erst, wenn es etwas zu speichern gibt — ein
            dauerhaft sichtbarer, meist sinnloser Knopf erzieht zum Ignorieren. */}
        {geaendert && (
          <button
            type="button"
            onClick={speichern}
            className="druckbar eintritt mt-5 rounded-full bg-tinte px-5 py-2.5 text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte"
          >
            Speichern
          </button>
        )}
      </div>

      {/* ----- Was gebraucht wird ----- */}
      <div className="px-6 py-8 md:px-9">
        <div className="mini-label">Was gebraucht wird</div>
        <ul className="mt-4 grid gap-2.5">
          {UNTERLAGEN.map((u) => (
            <li
              key={u.titel}
              className="rounded-2xl border border-linie bg-flaeche px-4 py-3.5 shadow-karte"
            >
              <div className="text-[0.8rem] font-medium text-tinte">{u.titel}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* ----- Ablage ----- */}
      <div className="px-6 py-8 md:px-9">
        <div className="mini-label">Ablage</div>
        <div className="mt-4">
          <Dokumentenablage
            dokumente={objekt.dokumente}
            nurOrdner={ORDNER}
            onHochladen={(neue) => dokumenteAnhaengen(objekt.id, neue)}
            onLoeschen={(dokumentId) => dokumentLoeschen(objekt.id, dokumentId)}
          />
        </div>
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
  "w-full rounded-xl border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] text-tinte transition-colors duration-150 ease-out placeholder:text-grau focus:border-linie-stark focus:outline-none";

function Feld({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mini-label block">
        {label}
      </label>
      <div className="mt-2">{children}</div>
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
