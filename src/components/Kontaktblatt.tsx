/**
 * Kontakt — alle Beteiligten eines Objekts an einer Stelle.
 *
 * Eigentümer, Makler, Verwalter, Notar. Bewusst eine Liste statt fester
 * Felder: bei einer Direktansprache gibt es keinen Makler, bei einer
 * Erbengemeinschaft zwei Anwälte. Feste Felder hätten für jeden dieser Fälle
 * die falsche Zahl von Zeilen — mal leere, mal zu wenige.
 *
 * Direkt bearbeitbar, weil der Weg über „Bearbeiten“ und acht andere Bereiche
 * zu weit ist für eine Nummer, die man beim Telefonieren notiert.
 *
 * Die Zeile, auf die es ankommt, steht oben: ein abgesagtes Objekt ohne
 * Eigentümer ist ein verlorener Vorgang. Der Kontakt war das Ergebnis, nicht
 * der Kauf. Das ist der einzige Ort, an dem diese Plattform mahnt.
 */
import { AlertCircle, Check, Mail, Phone, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  KONTAKTROLLEN,
  KONTAKTROLLEN_REIHENFOLGE,
  STUFEN,
  f,
  type Kontakt,
  type Kontaktrolle,
  type Objekt,
} from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { cn } from "../lib/utils";

let zaehler = 0;
function neueId() {
  zaehler += 1;
  return `kon-${Date.now().toString(36)}-${zaehler}`;
}

function leererKontakt(rolle: Kontaktrolle): Kontakt {
  return { id: neueId(), rolle, name: "", telefon: null, email: null, notiz: null };
}

/** Leere Eingabe heißt „nicht hinterlegt“, nicht „leerer Text“. */
function wert(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}

export function Kontaktblatt({ objekt }: { objekt: Objekt }) {
  const { objekte, aendern } = useObjekte();
  const [liste, setListe] = useState<Kontakt[]>(() => objekt.kontakte);

  const geaendert = useMemo(
    () => JSON.stringify(liste) !== JSON.stringify(objekt.kontakte),
    [liste, objekt.kontakte],
  );

  const eigentuemer = liste.find((k) => k.rolle === "eigentuemer" && k.name.trim() !== "") ?? null;
  const fehltBeiAbsage = objekt.stufe === "abgesagt" && !eigentuemer;

  // Derselbe Eigentümer an anderer Stelle: das ist der Grund, warum diese
  // Angaben überhaupt gepflegt werden. Ohne Namen gibt es nichts zu verbinden.
  const weitere = useMemo(() => {
    const name = eigentuemer?.name.trim().toLowerCase();
    if (!name) return [];
    return objekte.filter(
      (o) =>
        o.id !== objekt.id &&
        o.kontakte.some(
          (k) => k.rolle === "eigentuemer" && k.name.trim().toLowerCase() === name,
        ),
    );
  }, [objekte, objekt.id, eigentuemer]);

  function setzen(id: string, teil: Partial<Kontakt>) {
    setListe((alt) => alt.map((k) => (k.id === id ? { ...k, ...teil } : k)));
  }

  function hinzufuegen(rolle: Kontaktrolle) {
    setListe((alt) => [...alt, leererKontakt(rolle)]);
  }

  function entfernen(id: string) {
    setListe((alt) => alt.filter((k) => k.id !== id));
  }

  function speichern() {
    // Zeilen ohne Namen sind vergessene Anfänge, keine Kontakte.
    const sauber = liste.filter((k) => k.name.trim() !== "");
    aendern(objekt.id, { kontakte: sauber }, "Kontakte gepflegt");
    setListe(sauber);
  }

  // Nach Rolle gruppiert, in fester Reihenfolge: der Eigentümer entscheidet,
  // der Makler vermittelt, der Rest kommt später dazu.
  const gruppen = KONTAKTROLLEN_REIHENFOLGE.map((rolle) => ({
    rolle,
    kontakte: liste.filter((k) => k.rolle === rolle),
  })).filter((g) => g.kontakte.length > 0);

  return (
    <div className="pb-24">
      {fehltBeiAbsage && (
        <div className="flex items-start gap-3 border-b border-linie px-6 py-5 md:px-9">
          <AlertCircle size={15} strokeWidth={2} className="mt-px shrink-0 text-tinte" />
          <p className="max-w-lg text-[0.76rem] leading-relaxed text-tinte">
            Abgesagt, aber kein Eigentümer hinterlegt.
          </p>
        </div>
      )}

      {liste.length === 0 ? (
        <div className="flex flex-col items-center gap-5 px-6 py-20 text-center md:px-9">
          <p className="max-w-sm text-[0.82rem] leading-relaxed text-grau">
            Noch kein Kontakt hinterlegt.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {(["eigentuemer", "makler"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => hinzufuegen(r)}
                className="druckbar flex items-center gap-2 rounded-full border border-linie-stark px-4 py-2.5 text-[0.66rem] font-medium tracking-[0.14em] uppercase text-tinte"
              >
                <Plus size={12} strokeWidth={2.25} />
                {KONTAKTROLLEN[r]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-linie">
          {gruppen.map((g) => (
            <section key={g.rolle} className="px-6 py-9 md:px-9">
              <h2 className="mini-label">{KONTAKTROLLEN[g.rolle]}</h2>
              <div className="mt-6 flex flex-col gap-9">
                {g.kontakte.map((k) => (
                  <Kontaktzeile
                    key={k.id}
                    kontakt={k}
                    setzen={(teil) => setzen(k.id, teil)}
                    entfernen={() => entfernen(k.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {liste.length > 0 && (
        <div className="border-t border-linie px-6 py-7 md:px-9">
          <div className="mini-label">Beteiligten hinzufügen</div>
          <div className="scroll-reihe mt-4 flex gap-2 overflow-x-auto">
            {KONTAKTROLLEN_REIHENFOLGE.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => hinzufuegen(r)}
                className="druckbar flex shrink-0 items-center gap-2 rounded-full border border-linie px-3.5 py-2 text-[0.7rem] text-grau-stark hover:border-linie-stark hover:text-tinte"
              >
                <Plus size={11} strokeWidth={2.25} />
                {KONTAKTROLLEN[r]}
              </button>
            ))}
          </div>
        </div>
      )}

      {weitere.length > 0 && (
        <section className="border-t border-linie px-6 py-9 md:px-9">
          <h2 className="mini-label">Weitere Objekte dieses Eigentümers</h2>
          <ul className="mt-5 flex flex-col gap-1">
            {weitere.map((o) => (
              <li key={o.id} className="flex items-baseline gap-3 py-1 text-left">
                <span
                  aria-hidden
                  className="relative top-[-1px] size-[7px] shrink-0 rounded-full"
                  style={{ background: STUFEN[o.stufe].farbe }}
                />
                <span className="min-w-0 flex-1 truncate text-[0.82rem] text-tinte">
                  {o.strasse}
                  <span className="text-grau"> · {o.stadtteil}</span>
                </span>
                <span className="zahl shrink-0 text-[0.72rem] text-grau-stark">
                  {f.eurKurz(o.kaufpreis)}
                </span>
                <span className="hidden shrink-0 text-[0.62rem] tracking-[0.12em] uppercase text-grau sm:block">
                  {STUFEN[o.stufe].titel}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {geaendert && (
        <div className="eintritt sticky bottom-0 border-t border-linie bg-flaeche/97 px-6 py-4 backdrop-blur-sm md:px-9">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setListe(objekt.kontakte)}
              className="druckbar flex items-center gap-2 rounded-full px-3 py-2.5 text-[0.66rem] tracking-[0.14em] uppercase text-grau hover:text-tinte"
            >
              <RotateCcw size={12} strokeWidth={2} />
              Verwerfen
            </button>
            <button
              type="button"
              onClick={speichern}
              className="druckbar flex items-center gap-2 rounded-full bg-tinte px-5 py-2.5 text-[0.66rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte"
            >
              <Check size={13} strokeWidth={2.5} />
              Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Ein Kontakt.
 *
 * Name breit, Telefon und E-Mail nebeneinander, Notiz darunter. Die Rolle
 * steht in der Überschrift der Gruppe und lässt sich hier trotzdem ändern —
 * wer merkt, dass der Verwalter eigentlich der Eigentümer ist, soll ihn nicht
 * löschen und neu anlegen müssen.
 */
function Kontaktzeile({
  kontakt,
  setzen,
  entfernen,
}: {
  kontakt: Kontakt;
  setzen: (teil: Partial<Kontakt>) => void;
  entfernen: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <Feld
            label="Name"
            wert={kontakt.name}
            setWert={(v) => setzen({ name: v })}
            platzhalter="Name oder Gesellschaft"
          />
        </div>
        {/* Rolle als Auswahl, nicht als Reiter: sie wird einmal gesetzt und
            selten geändert. */}
        <select
          value={kontakt.rolle}
          onChange={(e) => setzen({ rolle: e.target.value as Kontaktrolle })}
          aria-label="Rolle"
          className="shrink-0 rounded-lg border border-linie bg-flaeche px-2.5 py-2 text-[0.72rem] text-grau-stark focus:border-linie-stark focus:outline-none"
        >
          {KONTAKTROLLEN_REIHENFOLGE.map((r) => (
            <option key={r} value={r}>
              {KONTAKTROLLEN[r]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={entfernen}
          aria-label={`${kontakt.name || "Kontakt"} entfernen`}
          className="druckbar shrink-0 rounded-lg p-2 text-linie-stark hover:bg-flaeche hover:text-tinte"
        >
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Feld
          label="Telefon"
          wert={kontakt.telefon ?? ""}
          setWert={(v) => setzen({ telefon: wert(v) })}
          platzhalter="0731 …"
          art="tel"
        />
        <Feld
          label="E-Mail"
          wert={kontakt.email ?? ""}
          setWert={(v) => setzen({ email: wert(v) })}
          platzhalter="name@…"
          art="email"
        />
      </div>

      {/* Die Nummer steht hier, weil sie beim Telefonieren notiert wird — und
          genau deshalb wird sie von hier aus auch gewählt. Zwei stille Knöpfe,
          keine Marke: bei vier Beteiligten wären acht laute Pillen die halbe
          Seite. Sie erscheinen erst, wenn etwas drinsteht. */}
      {(kontakt.telefon || kontakt.email) && (
        <div className="flex flex-wrap gap-2">
          {kontakt.telefon && (
            <a
              href={`tel:${kontakt.telefon.replace(/[^+\d]/g, "")}`}
              className="druckbar flex items-center gap-1.5 rounded-full border border-linie px-3 py-1.5 text-[0.68rem] text-grau-stark hover:border-linie-stark hover:text-tinte"
            >
              <Phone size={11} strokeWidth={2.25} />
              Anrufen
            </a>
          )}
          {kontakt.email && (
            <a
              href={`mailto:${kontakt.email}`}
              className="druckbar flex items-center gap-1.5 rounded-full border border-linie px-3 py-1.5 text-[0.68rem] text-grau-stark hover:border-linie-stark hover:text-tinte"
            >
              <Mail size={11} strokeWidth={2.25} />
              Schreiben
            </a>
          )}
        </div>
      )}

      <Feld
        label="Gesprächsnotiz"
        wert={kontakt.notiz ?? ""}
        setWert={(v) => setzen({ notiz: wert(v) })}
        platzhalter="Worüber gesprochen wurde, was er vorhat, wann man sich wieder melden sollte"
        zeilen={3}
      />
    </div>
  );
}

/**
 * Feld ohne Rahmen.
 *
 * Bei vier Kontakten mit je vier Feldern wären umrandete Kästen zweiunddreißig
 * Linien. Die Beschriftung trägt das Feld, der Hintergrund erscheint erst beim
 * Anfassen.
 */
function Feld({
  label,
  wert: v,
  setWert,
  platzhalter,
  zeilen,
  art,
}: {
  label: string;
  wert: string;
  setWert: (v: string) => void;
  platzhalter?: string;
  zeilen?: number;
  art?: "tel" | "email";
}) {
  const klasse = cn(
    "-mx-2 mt-2 w-[calc(100%+1rem)] rounded-lg bg-transparent px-2 py-2 text-[0.84rem] text-tinte",
    "placeholder:text-grau/70 hover:bg-flaeche focus:bg-flaeche-hoch focus:ring-1 focus:ring-linie-stark focus:outline-none",
  );
  return (
    <label className="block min-w-0">
      <span className="mini-label">{label}</span>
      {zeilen ? (
        <textarea
          value={v}
          onChange={(x) => setWert(x.target.value)}
          placeholder={platzhalter}
          rows={zeilen}
          className={cn(klasse, "resize-none leading-relaxed")}
        />
      ) : (
        <input
          type={art ?? "text"}
          value={v}
          onChange={(x) => setWert(x.target.value)}
          placeholder={platzhalter}
          className={klasse}
        />
      )}
    </label>
  );
}
