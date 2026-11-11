/**
 * Mail & Aktivitäten: der Reiter (Zeitleiste mit Filtern) und die mittlere
 * Spalte der Übersicht (Kurznotiz, Schnellknöpfe, letzte Einträge).
 *
 * Schnellknöpfe: Neue E-Mail (Gmail-Entwurf mit [Kürzel] und Vorlage) ·
 * Telefonat (mit Wiedervorlage → Aufgabe) · Notiz · Termin (→ Aufgabe, damit
 * er auf der Startseite unter „Termine“ steht) · Mail einfügen (von Hand).
 */
import {
  CalendarPlus,
  ChevronDown,
  Clipboard,
  Mail,
  MessageSquarePlus,
  Phone,
  Reply,
  Sparkles,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import {
  AKTIVITAETSFILTER,
  MAILVORLAGEN,
  TERMINARTEN_AKTIVITAET,
  anredeFuer,
  antwortBetreff,
  fremdesKuerzel,
  kategorieVon,
  mitKuerzel,
  nachMonaten,
  telefonatText,
  terminText,
  type Aktivitaetsfilter,
} from "../lib/aktivitaeten";
import { useAufgaben } from "../lib/aufgabenStore";
import { useAuth } from "../lib/auth";
import { mailtextAuslesen } from "../lib/mailToBoard";
import {
  andereKuerzel,
  f,
  kuerzelVorschlag,
  type Objekt,
  type Verlaufseintrag,
} from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { cn } from "../lib/utils";
import { Dialog } from "./Dialog";

type Aktion = "mail" | "telefonat" | "notiz" | "termin" | "einfuegen";

/** Kürzel des Objekts — fehlt es, bekommt das Objekt jetzt seinen Vorschlag. */
function useKuerzel(objekt: Objekt): { kuerzel: string; sichern: () => void } {
  const { objekte, aendern } = useObjekte();
  const kuerzel =
    objekt.kuerzel ?? kuerzelVorschlag(objekt.strasse, andereKuerzel(objekte, objekt.id));
  return {
    kuerzel,
    sichern: () => {
      if (!objekt.kuerzel) aendern(objekt.id, { kuerzel });
    },
  };
}

/* ------------------------------------------------------------------ */
/* Schnellknöpfe                                                        */
/* ------------------------------------------------------------------ */

export function Schnellknoepfe({ objekt, kompakt }: { objekt: Objekt; kompakt?: boolean }) {
  const [offen, setOffen] = useState<Aktion | null>(null);
  const knopf = (aktion: Aktion, Zeichen: typeof Mail, titel: string, haupt?: boolean) => (
    <button
      type="button"
      onClick={() => setOffen(aktion)}
      className={cn(
        "druckbar flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.66rem] font-semibold",
        haupt ? "bg-tinte text-grund" : "border border-linie-stark text-tinte",
      )}
    >
      <Zeichen size={12} strokeWidth={2} />
      {titel}
    </button>
  );
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {knopf("mail", Mail, "Neue E-Mail", true)}
        {knopf("telefonat", Phone, "Telefonat")}
        {knopf("notiz", MessageSquarePlus, "Notiz")}
        {knopf("termin", CalendarPlus, "Termin")}
        {!kompakt && knopf("einfuegen", Clipboard, "Mail einfügen")}
      </div>
      {offen === "mail" && <NeueMail objekt={objekt} schliessen={() => setOffen(null)} />}
      {offen === "telefonat" && <Telefonat objekt={objekt} schliessen={() => setOffen(null)} />}
      {offen === "notiz" && <Notiz objekt={objekt} schliessen={() => setOffen(null)} />}
      {offen === "termin" && <Termin objekt={objekt} schliessen={() => setOffen(null)} />}
      {offen === "einfuegen" && <MailEinfuegen objekt={objekt} schliessen={() => setOffen(null)} />}
    </>
  );
}

const FELD =
  "h-9 w-full rounded-xl border border-linie bg-flaeche px-3 text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none";
const TEXTFELD =
  "w-full resize-y rounded-xl border border-linie bg-flaeche px-3 py-2.5 text-[0.78rem] leading-relaxed text-tinte focus:border-linie-stark focus:outline-none";

function Feld({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="mini-label">{titel}</span>
      {children}
    </label>
  );
}

function Fuss({
  schliessen,
  los,
  titel,
  aus,
}: {
  schliessen: () => void;
  los: () => void;
  titel: string;
  aus?: boolean;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2.5 border-t border-linie pt-4">
      <button
        type="button"
        onClick={schliessen}
        className="druckbar rounded-full px-4 py-2.5 text-[0.7rem] font-medium text-grau-stark"
      >
        Abbrechen
      </button>
      <button
        type="button"
        disabled={aus}
        onClick={los}
        className="druckbar rounded-full bg-tinte px-5 py-2.5 text-[0.7rem] font-semibold text-grund disabled:opacity-30"
      >
        {titel}
      </button>
    </div>
  );
}

/** Kontakte des Objekts mit E-Mail — als Empfänger-Vorschläge. */
function mitEmail(o: Objekt) {
  return o.kontakte.filter((k) => k.email);
}

function NeueMail({
  objekt,
  schliessen,
  antwortAuf,
}: {
  objekt: Objekt;
  schliessen: () => void;
  antwortAuf?: Verlaufseintrag;
}) {
  const { aktivitaetEintragen } = useObjekte();
  const { nutzer } = useAuth();
  const { kuerzel, sichern } = useKuerzel(objekt);
  const absender = nutzer?.name ?? "Timo Birk";
  const kontakte = mitEmail(objekt);
  const start = antwortAuf?.mail?.von
    ? (antwortAuf.mail.von.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/)?.[0] ?? "")
    : (kontakte.find((k) => k.rolle === "makler")?.email ?? kontakte[0]?.email ?? "");
  const [an, setAn] = useState(start);
  const [vorlage, setVorlage] = useState(antwortAuf ? "frei" : "frei");
  const name = () => objekt.kontakte.find((k) => k.email === an)?.name ?? null;
  const fuellen = (id: string) => {
    const v = MAILVORLAGEN.find((x) => x.id === id) ?? MAILVORLAGEN[0];
    return {
      betreff: antwortAuf
        ? antwortBetreff(antwortAuf.mail?.betreff ?? null, kuerzel)
        : mitKuerzel(v.betreff(objekt), kuerzel),
      text: v.text({ ...objekt, kuerzel }, anredeFuer(name()), absender),
    };
  };
  const [betreff, setBetreff] = useState(() => fuellen("frei").betreff);
  const [text, setText] = useState(() => fuellen("frei").text);

  return (
    <Dialog
      titel={antwortAuf ? "Antworten" : "Neue E-Mail"}
      unterzeile="Öffnet einen Entwurf in Gmail — gesendet wird erst von dir."
      schliessen={schliessen}
    >
      <div className="flex flex-col gap-2.5">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Feld titel="An">
            <input
              className={FELD}
              list="mail-empfaenger"
              value={an}
              onChange={(e) => setAn(e.target.value)}
            />
            <datalist id="mail-empfaenger">
              {kontakte.map((k) => (
                <option key={k.id} value={k.email ?? ""}>
                  {k.name}
                </option>
              ))}
            </datalist>
          </Feld>
          {!antwortAuf && (
            <Feld titel="Vorlage">
              <select
                className={FELD}
                value={vorlage}
                onChange={(e) => {
                  setVorlage(e.target.value);
                  const neu = fuellen(e.target.value);
                  setBetreff(neu.betreff);
                  setText(neu.text);
                }}
              >
                {MAILVORLAGEN.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.titel}
                  </option>
                ))}
              </select>
            </Feld>
          )}
        </div>
        <Feld titel="Betreff">
          <input className={FELD} value={betreff} onChange={(e) => setBetreff(e.target.value)} />
        </Feld>
        <Feld titel="Text">
          <textarea
            rows={10}
            className={TEXTFELD}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Feld>
      </div>
      <Fuss
        schliessen={schliessen}
        titel="Gmail-Entwurf öffnen"
        los={() => {
          const q = new URLSearchParams({ view: "cm", fs: "1", to: an, su: betreff, body: text });
          window.open(`https://mail.google.com/mail/?${q.toString()}`, "_blank", "noopener");
          sichern();
          aktivitaetEintragen(objekt.id, {
            art: "mail",
            text: `Mail-Entwurf an ${an || "?"}: ${betreff}`,
            mail: { richtung: "aus", von: absender, an: an || null, betreff, text },
          });
          schliessen();
        }}
      />
    </Dialog>
  );
}

function Telefonat({ objekt, schliessen }: { objekt: Objekt; schliessen: () => void }) {
  const { aktivitaetEintragen } = useObjekte();
  const { anlegen } = useAufgaben();
  // Makler zuerst — mit ihm telefoniert man im Ankauf am häufigsten.
  const namen = [...objekt.kontakte]
    .sort((x, y) => Number(y.rolle === "makler") - Number(x.rolle === "makler"))
    .map((k) => k.name)
    .filter(Boolean);
  const [mit, setMit] = useState(namen[0] ?? "");
  const [ergebnis, setErgebnis] = useState("");
  const [wiedervorlage, setWiedervorlage] = useState("");

  return (
    <Dialog
      titel="Telefonat"
      unterzeile="Kurzprotokoll — mit Wiedervorlage wird daraus eine Aufgabe."
      schliessen={schliessen}
    >
      <div className="flex flex-col gap-2.5">
        <Feld titel="Mit wem">
          <input
            className={FELD}
            list="tel-mit"
            value={mit}
            onChange={(e) => setMit(e.target.value)}
          />
          <datalist id="tel-mit">
            {namen.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Feld>
        <Feld titel="Ergebnis">
          <textarea
            autoFocus
            rows={4}
            className={TEXTFELD}
            value={ergebnis}
            onChange={(e) => setErgebnis(e.target.value)}
            placeholder="Was ist herausgekommen? Was ist der nächste Schritt?"
          />
        </Feld>
        <Feld titel="Wiedervorlage (optional)">
          <input
            type="date"
            className={FELD}
            value={wiedervorlage}
            onChange={(e) => setWiedervorlage(e.target.value)}
          />
        </Feld>
      </div>
      <Fuss
        schliessen={schliessen}
        titel="Eintragen"
        aus={!mit.trim() && !ergebnis.trim()}
        los={() => {
          const t = {
            mit: mit.trim(),
            ergebnis: ergebnis.trim(),
            wiedervorlage: wiedervorlage || null,
          };
          aktivitaetEintragen(objekt.id, {
            art: "telefonat",
            text: telefonatText(t),
            telefonat: t,
          });
          if (t.wiedervorlage) {
            anlegen({
              titel: `Wiedervorlage: ${t.mit || "Telefonat"}`,
              beschreibung: t.ergebnis || null,
              objektId: objekt.id,
              art: "anruf",
              dringlichkeit: "normal",
              faelligAm: new Date(t.wiedervorlage).toISOString(),
            });
          }
          schliessen();
        }}
      />
    </Dialog>
  );
}

function Notiz({ objekt, schliessen }: { objekt: Objekt; schliessen: () => void }) {
  const { notizAnhaengen } = useObjekte();
  const [text, setText] = useState("");
  return (
    <Dialog
      titel="Notiz"
      unterzeile="Erscheint in der Zeitleiste und in der Übersicht."
      schliessen={schliessen}
    >
      <textarea
        autoFocus
        rows={5}
        className={TEXTFELD}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Was ist passiert? Was ist der nächste Schritt?"
      />
      <Fuss
        schliessen={schliessen}
        titel="Eintragen"
        aus={!text.trim()}
        los={() => {
          notizAnhaengen(objekt.id, text.trim());
          schliessen();
        }}
      />
    </Dialog>
  );
}

function Termin({ objekt, schliessen }: { objekt: Objekt; schliessen: () => void }) {
  const { aktivitaetEintragen } = useObjekte();
  const { anlegen } = useAufgaben();
  const [art, setArt] = useState<keyof typeof TERMINARTEN_AKTIVITAET>("besichtigung");
  const [datum, setDatum] = useState(() =>
    new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  );
  const [uhrzeit, setUhrzeit] = useState("");
  const [ort, setOrt] = useState(`${objekt.strasse}, ${objekt.stadt}`);

  return (
    <Dialog
      titel="Termin"
      unterzeile="Erscheint in der Zeitleiste und auf der Startseite unter „Termine“."
      schliessen={schliessen}
    >
      <div className="grid gap-2.5 sm:grid-cols-3">
        <Feld titel="Art">
          <select
            className={FELD}
            value={art}
            onChange={(e) => setArt(e.target.value as typeof art)}
          >
            {Object.entries(TERMINARTEN_AKTIVITAET).map(([w, t]) => (
              <option key={w} value={w}>
                {t}
              </option>
            ))}
          </select>
        </Feld>
        <Feld titel="Tag">
          <input
            type="date"
            className={FELD}
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
          />
        </Feld>
        <Feld titel="Uhrzeit">
          <input
            type="time"
            className={FELD}
            value={uhrzeit}
            onChange={(e) => setUhrzeit(e.target.value)}
          />
        </Feld>
      </div>
      <div className="mt-2.5">
        <Feld titel="Ort">
          <input className={FELD} value={ort} onChange={(e) => setOrt(e.target.value)} />
        </Feld>
      </div>
      <Fuss
        schliessen={schliessen}
        titel="Eintragen"
        aus={!datum}
        los={() => {
          const t = {
            art: TERMINARTEN_AKTIVITAET[art],
            datum,
            uhrzeit: uhrzeit || null,
            ort: ort.trim() || null,
          };
          aktivitaetEintragen(objekt.id, { art: "termin", text: terminText(t), termin: t });
          anlegen({
            titel: `${t.art} ${objekt.strasse}${t.uhrzeit ? ` · ${t.uhrzeit}` : ""}`,
            beschreibung: t.ort,
            objektId: objekt.id,
            art: art === "besichtigung" ? "besichtigung" : "termin",
            dringlichkeit: "normal",
            faelligAm: new Date(`${datum}T${uhrzeit || "09:00"}`).toISOString(),
          });
          schliessen();
        }}
      />
    </Dialog>
  );
}

function MailEinfuegen({ objekt, schliessen }: { objekt: Objekt; schliessen: () => void }) {
  const { aktivitaetEintragen } = useObjekte();
  const [roh, setRoh] = useState("");
  const erkannt = useMemo(() => (roh.trim() ? mailtextAuslesen(roh) : null), [roh]);
  const [von, setVon] = useState<string | null>(null);
  const [betreff, setBetreff] = useState<string | null>(null);
  const [datum, setDatum] = useState<string | null>(null);
  const v =
    von ??
    (erkannt
      ? [erkannt.absender, erkannt.absenderEmail && `<${erkannt.absenderEmail}>`]
          .filter(Boolean)
          .join(" ")
      : "");
  const b = betreff ?? erkannt?.betreff ?? "";
  const d =
    datum ?? (erkannt?.datum ? erkannt.datum.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const fremd = fremdesKuerzel(b, objekt.kuerzel ?? null);

  return (
    <Dialog
      titel="Mail einfügen"
      unterzeile="Text aus dem Mailprogramm kopieren — Absender, Datum und Betreff werden erkannt."
      schliessen={schliessen}
    >
      <textarea
        autoFocus
        rows={8}
        className={TEXTFELD}
        value={roh}
        onChange={(e) => setRoh(e.target.value)}
        placeholder={"Von: …\nGesendet: …\nBetreff: …\n\nMailtext"}
      />
      {erkannt && (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-[2fr_1fr]">
          <Feld titel="Absender">
            <input className={FELD} value={v} onChange={(e) => setVon(e.target.value)} />
          </Feld>
          <Feld titel="Datum">
            <input
              type="date"
              className={FELD}
              value={d}
              onChange={(e) => setDatum(e.target.value)}
            />
          </Feld>
          <div className="sm:col-span-2">
            <Feld titel="Betreff">
              <input className={FELD} value={b} onChange={(e) => setBetreff(e.target.value)} />
            </Feld>
          </div>
          {fremd && (
            <p className="text-[0.7rem] text-[#8A5A08] sm:col-span-2">
              Im Betreff steht [{fremd}] — gehört die Mail vielleicht zu einem anderen Objekt?
            </p>
          )}
        </div>
      )}
      <Fuss
        schliessen={schliessen}
        titel="Eintragen"
        aus={!erkannt}
        los={() => {
          if (!erkannt) return;
          aktivitaetEintragen(objekt.id, {
            art: "mail",
            // Erkannte Uhrzeit behalten, solange niemand den Tag geändert hat.
            zeitpunkt:
              datum === null && erkannt.datum
                ? erkannt.datum
                : new Date(`${d}T12:00`).toISOString(),
            text: `Mail von ${v || "?"}: ${b || "(ohne Betreff)"}`,
            mail: {
              richtung: "ein",
              von: v || null,
              an: null,
              betreff: b || null,
              text: erkannt.text,
            },
          });
          schliessen();
        }}
      />
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Einträge                                                             */
/* ------------------------------------------------------------------ */

const ART_TITEL: Record<Verlaufseintrag["art"], string> = {
  anlage: "Anlage",
  status: "Stufe",
  dokument: "Datei",
  notiz: "Notiz",
  mail: "Mail",
  telefonat: "Telefonat",
  termin: "Termin",
};

const ART_ZEICHEN: Partial<Record<Verlaufseintrag["art"], typeof Mail>> = {
  mail: Mail,
  telefonat: Phone,
  termin: CalendarPlus,
};

function Eintrag({ e, objekt, letzter }: { e: Verlaufseintrag; objekt: Objekt; letzter: boolean }) {
  const [mehr, setMehr] = useState(false);
  const [antwort, setAntwort] = useState(false);
  const Zeichen = ART_ZEICHEN[e.art];
  const system = kategorieVon(e) === "system";
  return (
    <li className="relative flex gap-3.5 pb-4 last:pb-0">
      <div className="relative flex w-5 shrink-0 justify-center">
        <span
          aria-hidden
          className={cn(
            "absolute top-[3px] flex size-5 items-center justify-center rounded-full",
            Zeichen ? "bg-tinte text-grund" : system ? "bg-flaeche-hoch" : "bg-linie-stark",
          )}
        >
          {Zeichen ? (
            <Zeichen size={10} strokeWidth={2.2} />
          ) : (
            <span className="size-[5px] rounded-full bg-grund" />
          )}
        </span>
        {!letzter && (
          <span aria-hidden className="absolute top-[26px] bottom-[-4px] w-px bg-linie" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span className="text-[0.58rem] font-semibold tracking-[0.16em] uppercase text-grau">
            {ART_TITEL[e.art]}
            {e.mail && (e.mail.richtung === "ein" ? " · eingehend" : " · ausgehend")}
          </span>
          <span className="zahl text-[0.62rem] text-grau">{f.datumZeit(e.zeitpunkt)}</span>
        </div>
        {e.mail ? (
          <div className="mt-1 rounded-xl border border-linie bg-flaeche px-3 py-2">
            <div className="text-[0.8rem] font-semibold text-tinte">
              {e.mail.betreff ?? "(ohne Betreff)"}
            </div>
            <div className="text-[0.66rem] text-grau">
              {e.mail.richtung === "ein" ? `von ${e.mail.von ?? "?"}` : `an ${e.mail.an ?? "?"}`}
            </div>
            <p
              className={cn(
                "mt-1.5 text-[0.76rem] leading-relaxed whitespace-pre-line text-grau-stark",
                !mehr && "line-clamp-3",
              )}
            >
              {e.mail.text}
            </p>
            <div className="mt-1.5 flex gap-3">
              {e.mail.text.split("\n").length > 3 || e.mail.text.length > 240 ? (
                <button
                  type="button"
                  onClick={() => setMehr((m) => !m)}
                  className="flex items-center gap-1 text-[0.66rem] font-semibold text-grau-stark hover:text-tinte"
                >
                  <ChevronDown size={11} className={cn(mehr && "rotate-180")} />
                  {mehr ? "Weniger" : "Mehr anzeigen"}
                </button>
              ) : null}
              {e.mail.richtung === "ein" && (
                <button
                  type="button"
                  onClick={() => setAntwort(true)}
                  className="flex items-center gap-1 text-[0.66rem] font-semibold text-grau-stark hover:text-tinte"
                >
                  <Reply size={11} />
                  Antworten
                </button>
              )}
            </div>
          </div>
        ) : (
          <p
            className={cn(
              "mt-0.5 text-[0.8rem] leading-relaxed whitespace-pre-line",
              system ? "text-grau" : "text-tinte",
            )}
          >
            {e.text}
          </p>
        )}
        {e.telefonat?.wiedervorlage && (
          <p className="mt-0.5 text-[0.66rem] text-grau">
            Wiedervorlage {f.datum(e.telefonat.wiedervorlage)} · als Aufgabe angelegt
          </p>
        )}
      </div>
      {antwort && <NeueMail objekt={objekt} antwortAuf={e} schliessen={() => setAntwort(false)} />}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Reiter                                                               */
/* ------------------------------------------------------------------ */

export function AktivitaetenReiter({ objekt }: { objekt: Objekt }) {
  const [filter, setFilter] = useState<Aktivitaetsfilter>("alle");
  const gruppen = useMemo(() => nachMonaten([...objekt.verlauf], filter), [objekt.verlauf, filter]);

  return (
    <div className="px-4 py-5 md:px-7">
      <div className="flex flex-wrap items-center gap-3">
        <Schnellknoepfe objekt={objekt} />
        <button
          type="button"
          disabled
          title="Kommt mit Phase 2: KI fasst den Verlauf in fünf Sätzen zusammen."
          className="ml-auto flex h-8 items-center gap-1.5 rounded-full border border-dashed border-linie-stark px-3 text-[0.66rem] font-semibold text-grau"
        >
          <Sparkles size={12} />
          Zusammenfassen · Phase 2
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(Object.keys(AKTIVITAETSFILTER) as Aktivitaetsfilter[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            aria-pressed={filter === k}
            className={cn(
              "druckbar rounded-full border px-3 py-1 text-[0.68rem]",
              filter === k
                ? "border-tinte bg-tinte text-grund"
                : "border-linie bg-flaeche text-grau-stark",
            )}
          >
            {AKTIVITAETSFILTER[k]}
          </button>
        ))}
      </div>

      {gruppen.length === 0 ? (
        <p className="py-12 text-center text-[0.8rem] text-grau">Noch nichts eingetragen.</p>
      ) : (
        gruppen.map((g) => (
          <section key={g.schluessel} className="mt-6">
            <h3 className="mb-3 text-[0.66rem] font-semibold tracking-[0.18em] uppercase text-grau-stark">
              {g.titel}
            </h3>
            <ol>
              {g.eintraege.map((e, i) => (
                <Eintrag key={e.id} e={e} objekt={objekt} letzter={i === g.eintraege.length - 1} />
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Übersicht, mittlere Spalte                                           */
/* ------------------------------------------------------------------ */

export function AktivitaetenSpalte({
  objekt,
  alleAnzeigen,
}: {
  objekt: Objekt;
  alleAnzeigen: () => void;
}) {
  const { aendern } = useObjekte();
  const [kurz, setKurz] = useState(objekt.kurznotiz ?? "");
  const letzte = useMemo(
    () =>
      [...objekt.verlauf]
        .filter((e) => kategorieVon(e) !== "system")
        .sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt))
        .slice(0, 5),
    [objekt.verlauf],
  );

  // Die Kurznotiz wird überschrieben, nicht fortgeschrieben — kein Verlaufseintrag.
  function kurzSpeichern() {
    const wert = kurz.trim() || null;
    if (wert !== (objekt.kurznotiz ?? null)) aendern(objekt.id, { kurznotiz: wert });
  }

  return (
    <section className="bg-grund px-6 py-8 md:px-9">
      <label htmlFor="kurznotiz" className="mini-label block">
        Kurznotiz
      </label>
      <textarea
        id="kurznotiz"
        rows={2}
        value={kurz}
        onChange={(e) => setKurz(e.target.value)}
        onBlur={kurzSpeichern}
        placeholder="Das Wesentliche in einer Zeile, z. B. „18k für TG locker, eigenes Grundbuch TG?“"
        className="mt-2.5 w-full resize-y rounded-xl border border-[#EFD9A6] bg-[#FDF8EC] px-3.5 py-2.5 text-[0.8rem] leading-relaxed text-tinte placeholder:text-grau focus:border-[#E0B85C] focus:outline-none"
      />

      <div className="mt-7 flex items-baseline justify-between">
        <div className="mini-label">Aktivitäten</div>
        <button
          type="button"
          onClick={alleAnzeigen}
          className="text-[0.66rem] font-semibold text-grau-stark hover:text-tinte"
        >
          Alle anzeigen
        </button>
      </div>
      <div className="mt-2.5">
        <Schnellknoepfe objekt={objekt} kompakt />
      </div>

      {letzte.length === 0 ? (
        <p className="mt-4 text-[0.74rem] text-grau">Noch keine Aktivitäten.</p>
      ) : (
        <ol className="mt-4">
          {letzte.map((e, i) => (
            <Eintrag key={e.id} e={e} objekt={objekt} letzter={i === letzte.length - 1} />
          ))}
        </ol>
      )}

      {objekt.notiz && (
        <div className="mt-7">
          <div className="mini-label">Beschreibung</div>
          <p className="mt-2.5 text-[0.76rem] leading-relaxed whitespace-pre-line text-grau-stark">
            {objekt.notiz}
          </p>
        </div>
      )}
    </section>
  );
}
