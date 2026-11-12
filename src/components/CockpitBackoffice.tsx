/**
 * Cockpit · Backoffice-Ansicht (Ausbau 4, P4). Tagesroutine mit
 * Wochenroutine, Zeit Backoffice, Posteingang vorsortiert, Fragen an Timo
 * und was Timo ans Backoffice übergeben hat. Nie der persönliche Reiter.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { FrageAnTimo } from "./FrageAnTimo";
import { fristText } from "../lib/aufgaben";
import { useAufgaben } from "../lib/aufgabenStore";
import { artAusName } from "../lib/backoffice";
import { useBackoffice } from "../lib/backofficeStore";
import { ROLLEN, ROLLEN_REIHENFOLGE, tagIso, type Zustaendig } from "../lib/cockpit";
import { useCockpit } from "../lib/cockpitStore";
import { textAuslesen } from "../lib/eingang";
import { neueEingangsId, useEingang } from "../lib/eingangStore";
import { objektInMail } from "../lib/mailToBoard";
import { f, type Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import {
  MAILAKTIONEN,
  MAILKATEGORIEN,
  POSTFAECHER,
  absenderLesen,
  antwortAdresse,
  vorschlagFuer,
  type Mailaktion,
  type Postfach,
  type Posteingangsmail,
} from "../lib/posteingang";
import {
  WOCHENTAGE,
  abgehakt,
  stundenText,
  wochenzeit,
  zeitposten,
  type Routinepunkt,
} from "../lib/routine";
import { cn } from "../lib/utils";

const feld =
  "h-8 w-full min-w-0 rounded-lg border border-linie bg-flaeche px-2.5 text-[0.74rem] text-tinte focus:border-linie-stark focus:outline-none";

const objektName = (o: Objekt) =>
  `${o.kuerzel ? `${o.kuerzel} · ` : ""}${o.bezeichnung?.trim() || o.strasse}`;

function Karte({
  titel,
  zusatz,
  aktion,
  children,
}: {
  titel: string;
  zusatz?: ReactNode;
  aktion?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-linie bg-flaeche shadow-karte">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 pb-2 md:px-6">
        <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
          {titel}
        </h2>
        <div className="flex items-center gap-2">
          {zusatz && <span className="zahl text-[0.68rem] text-grau">{zusatz}</span>}
          {aktion}
        </div>
      </div>
      {children}
    </section>
  );
}

function Balken({ anteil, farbe }: { anteil: number; farbe: string }) {
  return (
    <span className="block h-1.5 overflow-hidden rounded-full bg-flaeche-aktiv">
      <span
        className="block h-full rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, anteil * 100))}%`, background: farbe }}
      />
    </span>
  );
}

export function CockpitBackoffice() {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <Tagesroutine />
        <ZeitBackoffice />
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <Posteingang />
        <FragenAnTimo />
        <VonTimo />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tagesroutine                                                         */
/* ------------------------------------------------------------------ */

function Hakenzeile({
  punkt: p,
  an,
  umschalten,
  unter,
}: {
  punkt: Routinepunkt;
  an: boolean;
  umschalten: () => void;
  unter: string;
}) {
  return (
    <li className="flex items-center gap-3 px-5 py-2.5 md:px-6">
      <button
        type="button"
        onClick={umschalten}
        aria-pressed={an}
        aria-label={`${p.titel} erledigt`}
        className={cn(
          "druckbar flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px]",
          an ? "border-[#17935C] bg-[#17935C]" : "border-linie-stark bg-flaeche",
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
      </button>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[0.8rem]",
            an ? "text-grau line-through" : "text-tinte",
          )}
        >
          {p.titel}
        </span>
        {unter && <span className="mt-0.5 block truncate text-[0.64rem] text-grau">{unter}</span>}
      </span>
      <span className="zahl shrink-0 text-[0.68rem] text-grau">{p.minuten} min</span>
    </li>
  );
}

function Tagesroutine() {
  const { routinen, haken, routineUmschalten } = useCockpit();
  const heute = new Date();
  const erledigt = routinen.tag.filter((p) => abgehakt(haken, p.id, "tag", heute)).length;
  const wochentag = ((heute.getDay() + 6) % 7) + 1;

  return (
    <Karte titel="Tagesroutine" zusatz={`${erledigt} von ${routinen.tag.length} erledigt`}>
      <div className="px-5 pb-3 md:px-6">
        <Balken anteil={routinen.tag.length ? erledigt / routinen.tag.length : 0} farbe="#17935C" />
      </div>
      <ul className="divide-y divide-linie border-t border-linie">
        {routinen.tag.map((p) => (
          <Hakenzeile
            key={p.id}
            punkt={p}
            an={!!abgehakt(haken, p.id, "tag", heute)}
            umschalten={() => routineUmschalten(p, "tag")}
            unter={p.hinweis}
          />
        ))}
      </ul>
      {routinen.woche.length > 0 && (
        <>
          <div className="mini-label border-t border-linie px-5 pt-3 pb-1 md:px-6">
            Wochenroutine
          </div>
          <ul className="divide-y divide-linie">
            {routinen.woche.map((p) => (
              <Hakenzeile
                key={p.id}
                punkt={p}
                an={!!abgehakt(haken, p.id, "woche", heute)}
                umschalten={() => routineUmschalten(p, "woche")}
                unter={[
                  p.wochentag
                    ? `${WOCHENTAGE[p.wochentag]}${p.wochentag === wochentag ? " · heute dran" : ""}`
                    : null,
                  p.hinweis || null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))}
          </ul>
        </>
      )}
      <div className="border-t border-linie px-5 py-2.5 md:px-6">
        <Link to="/einstellungen" className="text-[0.64rem] text-grau-stark hover:text-tinte">
          Liste in den Einstellungen pflegen
        </Link>
      </div>
    </Karte>
  );
}

/* ------------------------------------------------------------------ */
/* Zeit                                                                 */
/* ------------------------------------------------------------------ */

function ZeitBackoffice() {
  const { haken, mails } = useCockpit();
  const { karten } = useBackoffice();
  const zeit = useMemo(
    () =>
      wochenzeit(
        zeitposten(
          haken,
          karten,
          mails.map((m) => m.erledigtAm).filter((x): x is string => !!x),
        ),
      ),
    [haken, karten, mails],
  );
  const max = Math.max(1, ...zeit.jeKategorie.map((k) => k.minuten));

  return (
    <Karte titel="Zeit Backoffice diese Woche" zusatz={stundenText(zeit.summe)}>
      {zeit.jeKategorie.length === 0 ? (
        <p className="mx-5 mb-3 rounded-xl border border-dashed border-linie-stark px-4 py-6 text-center text-[0.74rem] text-grau md:mx-6">
          Noch keine Zeit erfasst. Abgehakte Routine, erledigte Karten und übernommene Mails zählen
          hier.
        </p>
      ) : (
        <ul className="divide-y divide-linie border-t border-linie">
          {zeit.jeKategorie.map((k) => (
            <li
              key={k.kategorie}
              className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-3 px-5 py-2 md:px-6"
            >
              <span className="flex min-w-0 flex-col gap-1.5">
                <span className="truncate text-[0.78rem] text-tinte">{k.kategorie}</span>
                <Balken anteil={k.minuten / max} farbe="#38506E" />
              </span>
              <span className="zahl text-right text-[0.7rem] text-grau">
                {stundenText(k.minuten)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="border-t border-linie px-5 py-2.5 text-[0.7rem] text-grau-stark md:px-6">
        {zeit.wochen > 0
          ? `Hochrechnung: ca. ${Math.round(zeit.monatStunden).toLocaleString("de-DE")} Std. im Monat (Ø aus ${zeit.wochen} ${zeit.wochen === 1 ? "Woche" : "Wochen"}). Grundlage für Stellenumfang und Stellenbeschreibung.`
          : "Hochrechnung pro Monat, sobald Zeit erfasst ist."}
        <span className="mt-1 block text-[0.62rem] text-grau">
          Routine mit ihren Minuten, Karten und Mails mit einem Schätzwert je Art.
        </span>
      </p>
    </Karte>
  );
}

/* ------------------------------------------------------------------ */
/* Posteingang                                                          */
/* ------------------------------------------------------------------ */

function Posteingang() {
  const { mails, mailVorschlagSetzen, mailUebernommen, mailZuruecknehmen, mailLoeschen } =
    useCockpit();
  const { objekte, aktivitaetEintragen } = useObjekte();
  const { anlegen: aufgabeAnlegen } = useAufgaben();
  const { todoAnlegen, aendern: karteAendern, weiterleiten } = useBackoffice();
  const { erfassen } = useEingang();
  const [formular, setFormular] = useState(false);
  const heute = tagIso(new Date());

  const sichtbar = mails.filter(
    (m) => m.status === "offen" || (m.erledigtAm && tagIso(new Date(m.erledigtAm)) === heute),
  );
  const offen = mails.filter((m) => m.status === "offen").length;
  const heuteErledigt = sichtbar.length - offen;
  const auswahl = useMemo(
    () =>
      [...objekte]
        .filter((o) => o.stufe !== "abgesagt")
        .sort((a, b) => objektName(a).localeCompare(objektName(b), "de")),
    [objekte],
  );

  /** „Übernehmen“: führt den Vorschlag aus. Gesendet wird nichts. */
  function uebernehmen(m: Posteingangsmail) {
    const v = m.vorschlag;
    const o = v.objektId ? objekte.find((x) => x.id === v.objektId) : undefined;
    const notiz = [`Aus ${m.postfach} · ${m.absender}`, m.text || null]
      .filter(Boolean)
      .join("\n\n");
    if (o) {
      aktivitaetEintragen(o.id, {
        art: "mail",
        text: `Mail an ${m.postfach}: ${m.betreff} (von ${m.absender})`,
        mail: {
          richtung: "ein",
          von: m.absenderEmail ? `${m.absender} <${m.absenderEmail}>` : m.absender,
          an: `${m.postfach}revest-projekt.de`,
          betreff: m.betreff,
          text: m.text,
        },
        quelle: "hand",
      });
    }
    const karte = (art = artAusName(m.betreff)) => {
      const k = todoAnlegen(m.betreff);
      karteAendern(k.id, {
        art,
        objektId: o?.id ?? null,
        zustaendig: v.zustaendig,
        notizen: notiz,
      });
      return k;
    };
    let verweis: string | null = null;
    if (v.aktion === "eingang") {
      const r = textAuslesen(`${m.betreff}\n${m.text}`);
      if (r.strasse) {
        const id = neueEingangsId();
        erfassen({
          id,
          strasse: r.strasse,
          plz: r.plz ?? "",
          stadt: r.stadt ?? "Ulm",
          stadtteil: null,
          preis: r.preis,
          flaeche: r.flaeche,
          zimmer: r.zimmer,
          objektart: r.objektart,
          absender: r.absender ?? m.absender,
          absenderEmail: r.absenderEmail ?? m.absenderEmail,
          kontaktId: null,
          eingangAm: m.eingangAm,
          quelle: r.quelle,
          expose: null,
          mailtext: m.text || m.betreff,
          status: "offen",
          grund: null,
          objektId: null,
          gesichtetAm: null,
        });
        verweis = "Ankauf-Eingang";
      } else {
        // Ohne erkennbare Adresse lieber eine Karte als ein leeres Angebot.
        const k = todoAnlegen(`Angebot im Ankauf-Eingang erfassen: ${m.betreff}`);
        karteAendern(k.id, { notizen: notiz });
        verweis = "Karte: Angebot erfassen";
      }
    } else if (v.aktion === "qonto") {
      const k = karte("rechnung");
      weiterleiten(k.id, "qonto", `Aus ${m.postfach}: ${m.absender}`);
      verweis = "Karte → Qonto";
    } else if (v.aktion === "karte") {
      karte();
      verweis = "Backoffice-Karte";
    } else if (v.aktion === "aufgabe") {
      const frist = v.frist ?? tagIso(new Date(Date.now() + 7 * 86_400_000));
      aufgabeAnlegen({
        titel: m.betreff,
        beschreibung: notiz,
        objektId: o?.id ?? null,
        art: "sonst",
        dringlichkeit: "normal",
        faelligAm: new Date(frist).toISOString(),
        zustaendig: v.zustaendig,
      });
      verweis = `Aufgabe bis ${frist.split("-").reverse().join(".")}`;
    } else if (v.aktion === "antwort") {
      window.open(antwortAdresse(m), "_blank", "noopener");
      verweis = "Antwort-Entwurf geöffnet";
    } else {
      verweis = "abgelegt";
    }
    mailUebernommen(m.id, verweis);
  }

  return (
    <Karte
      titel="Posteingang vorsortiert"
      zusatz={`${offen} offen · ${heuteErledigt} heute bearbeitet`}
      aktion={
        <button
          type="button"
          onClick={() => setFormular((x) => !x)}
          aria-expanded={formular}
          className="druckbar flex items-center gap-1 rounded-full bg-tinte px-3 py-1.5 text-[0.66rem] font-semibold text-grund"
        >
          <Plus size={12} strokeWidth={2.25} />
          Mail
        </button>
      }
    >
      <p className="px-5 pb-3 text-[0.68rem] text-grau md:px-6">
        ankauf@ · info@ · timo.birk@ — bis zur Gmail-Anbindung von Hand anlegen. Nichts wird ohne
        Bestätigung gesendet, verschoben oder gelöscht.
      </p>
      {formular && <Mailformular schliessen={() => setFormular(false)} />}
      {sichtbar.length === 0 ? (
        <p className="mx-5 mb-4 rounded-xl border border-dashed border-linie-stark px-4 py-6 text-center text-[0.74rem] text-grau md:mx-6">
          Keine offenen Mails.
        </p>
      ) : (
        <ul className="divide-y divide-linie border-t border-linie">
          {sichtbar.map((m) => (
            <li key={m.id} className="flex flex-col gap-2 px-5 py-3 md:px-6">
              <div className="flex flex-wrap items-start gap-2">
                <span className="min-w-[4.6rem] shrink-0 rounded-full bg-flaeche-hoch px-2 py-0.5 text-center text-[0.6rem] font-semibold text-grau-stark">
                  {m.postfach}
                </span>
                <span className="min-w-0 flex-[1_1_14rem]">
                  <span
                    className={cn(
                      "block truncate text-[0.8rem]",
                      m.status === "offen" ? "text-tinte" : "text-grau line-through",
                    )}
                  >
                    {m.betreff}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.64rem] text-grau">
                    {m.absender}
                    {m.absenderEmail && m.absenderEmail !== m.absender
                      ? ` <${m.absenderEmail}>`
                      : ""}{" "}
                    · {f.datumZeit(m.eingangAm)}
                  </span>
                </span>
                {m.status === "offen" ? (
                  <span className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => uebernehmen(m)}
                      className="druckbar rounded-full bg-[#17935C] px-3 py-1 text-[0.64rem] font-semibold text-white"
                    >
                      Übernehmen
                    </button>
                    <button
                      type="button"
                      onClick={() => mailLoeschen(m.id)}
                      aria-label={`Mail ${m.betreff} entfernen`}
                      title="Entfernen (nur hier, nicht im Postfach)"
                      className="druckbar flex size-7 items-center justify-center rounded-full text-grau hover:text-[#9A2727]"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-[#DBF2E6] px-2 py-0.5 text-[0.6rem] font-semibold text-[#0C5E3A]">
                      ✓ {m.verweis ?? "übernommen"}
                    </span>
                    <button
                      type="button"
                      onClick={() => mailZuruecknehmen(m.id)}
                      className="druckbar text-[0.62rem] text-grau hover:text-tinte"
                    >
                      zurück
                    </button>
                  </span>
                )}
              </div>
              {m.status === "offen" && (
                <>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    <select
                      value={m.vorschlag.kategorie}
                      onChange={(e) => mailVorschlagSetzen(m.id, { kategorie: e.target.value })}
                      aria-label="Kategorie"
                      className={feld}
                    >
                      {MAILKATEGORIEN.map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                    <select
                      value={m.vorschlag.objektId ?? ""}
                      onChange={(e) =>
                        mailVorschlagSetzen(m.id, { objektId: e.target.value || null })
                      }
                      aria-label="Objekt"
                      className={feld}
                    >
                      <option value="">ohne Objekt</option>
                      {auswahl.map((o) => (
                        <option key={o.id} value={o.id}>
                          {objektName(o)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={m.vorschlag.aktion}
                      onChange={(e) =>
                        mailVorschlagSetzen(m.id, { aktion: e.target.value as Mailaktion })
                      }
                      aria-label="Aktion"
                      className={feld}
                    >
                      {(Object.keys(MAILAKTIONEN) as Mailaktion[]).map((a) => (
                        <option key={a} value={a}>
                          {MAILAKTIONEN[a]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={m.vorschlag.zustaendig}
                      onChange={(e) =>
                        mailVorschlagSetzen(m.id, { zustaendig: e.target.value as Zustaendig })
                      }
                      aria-label="Zuständig"
                      className={feld}
                    >
                      {ROLLEN_REIHENFOLGE.map((r) => (
                        <option key={r} value={r}>
                          {ROLLEN[r].titel}
                        </option>
                      ))}
                    </select>
                    {m.vorschlag.aktion === "aufgabe" && (
                      <label className="col-span-2 flex items-center gap-2 text-[0.66rem] text-grau sm:col-span-4">
                        Frist
                        <input
                          type="date"
                          value={m.vorschlag.frist ?? ""}
                          onChange={(e) =>
                            mailVorschlagSetzen(m.id, { frist: e.target.value || null })
                          }
                          className={cn(feld, "zahl max-w-[11rem]")}
                        />
                        {!m.vorschlag.frist && <span>leer = in 7 Tagen</span>}
                      </label>
                    )}
                  </div>
                  <FrageAnTimo
                    bezug={{ art: "mail", id: m.id, titel: m.betreff }}
                    objektId={m.vorschlag.objektId}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Karte>
  );
}

function Mailformular({ schliessen }: { schliessen: () => void }) {
  const { mailAnlegen } = useCockpit();
  const { objekte } = useObjekte();
  const [postfach, setPostfach] = useState<Postfach>("info@");
  const [absender, setAbsender] = useState("");
  const [betreff, setBetreff] = useState("");
  const [text, setText] = useState("");

  function speichern(e: React.FormEvent) {
    e.preventDefault();
    if (!betreff.trim() || !absender.trim()) return;
    const a = absenderLesen(absender);
    // Objekt nur vorschlagen, wenn Kürzel oder Adresse sicher im Text stehen.
    const o = objektInMail(
      { betreff, absender: a.name, absenderEmail: a.email, datum: null, text, anhaenge: [] },
      objekte,
    );
    mailAnlegen({
      postfach,
      absender: a.name,
      absenderEmail: a.email,
      betreff: betreff.trim(),
      text: text.trim(),
      eingangAm: new Date().toISOString(),
      vorschlag: vorschlagFuer(postfach, o?.id ?? null),
    });
    schliessen();
  }

  const gross =
    "h-9 w-full min-w-0 rounded-lg border border-linie bg-flaeche px-3 text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none";

  return (
    <form
      onSubmit={speichern}
      className="mx-5 mb-3 grid grid-cols-1 gap-2 rounded-xl border border-linie bg-flaeche-hoch p-3 sm:grid-cols-[8rem_minmax(0,1fr)] md:mx-6"
    >
      <label className="flex flex-col gap-1">
        <span className="mini-label">Postfach</span>
        <select
          value={postfach}
          onChange={(e) => setPostfach(e.target.value as Postfach)}
          className={gross}
        >
          {POSTFAECHER.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="mini-label">Absender</span>
        <input
          autoFocus
          value={absender}
          onChange={(e) => setAbsender(e.target.value)}
          placeholder="Name <adresse@beispiel.de>"
          className={gross}
        />
      </label>
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="mini-label">Betreff</span>
        <input value={betreff} onChange={(e) => setBetreff(e.target.value)} className={gross} />
      </label>
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="mini-label">Text (optional)</span>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mailtext einfügen — Kürzel oder Adresse schlagen das Objekt vor"
          className="w-full resize-y rounded-lg border border-linie bg-flaeche px-3 py-2 text-[0.78rem] text-tinte focus:border-linie-stark focus:outline-none"
        />
      </label>
      <div className="flex items-center justify-end gap-2 sm:col-span-2">
        <button
          type="button"
          onClick={schliessen}
          className="druckbar rounded-full px-3 py-1.5 text-[0.66rem] text-grau hover:text-tinte"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={!betreff.trim() || !absender.trim()}
          className="druckbar rounded-full bg-tinte px-3.5 py-1.5 text-[0.66rem] font-semibold text-grund disabled:opacity-30"
        >
          Anlegen
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Fragen an Timo                                                       */
/* ------------------------------------------------------------------ */

function FragenAnTimo() {
  const { fragen } = useCockpit();
  const offen = fragen.filter((x) => !x.antwort).length;
  const liste = [...fragen].sort((a, b) => {
    if (!a.antwort !== !b.antwort) return a.antwort ? 1 : -1;
    return b.gestelltAm.localeCompare(a.gestelltAm);
  });

  return (
    <Karte titel="Fragen an Timo" zusatz={`${offen} offen`}>
      {liste.length === 0 ? (
        <p className="mx-5 mb-4 rounded-xl border border-dashed border-linie-stark px-4 py-6 text-center text-[0.74rem] text-grau md:mx-6">
          Noch keine Fragen. „Frage an Timo“ steht an jeder Mail und jeder Backoffice-Karte.
        </p>
      ) : (
        <ul className="divide-y divide-linie border-t border-linie">
          {liste.slice(0, 12).map((x) => (
            <li key={x.id} className="flex items-start gap-2 px-5 py-2.5 md:px-6">
              <span className="min-w-0 flex-1">
                <span className="block text-[0.8rem] text-tinte">{x.text}</span>
                <span className="mt-0.5 block truncate text-[0.64rem] text-grau">
                  {x.bezug ? `${x.bezug.titel} · ` : ""}
                  {f.datumZeit(x.gestelltAm)}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold",
                  x.antwort ? "bg-[#DBF2E6] text-[#0C5E3A]" : "bg-[#FBEBD1] text-[#8A5A08]",
                )}
              >
                {x.antwort ? `beantwortet: ${x.antwort}` : "wartet auf Timo"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  );
}

/* ------------------------------------------------------------------ */
/* Von Timo übergeben                                                   */
/* ------------------------------------------------------------------ */

function VonTimo() {
  const { aufgaben, umschalten } = useAufgaben();
  const { objekte } = useObjekte();
  const liste = aufgaben.filter((a) => !a.erledigtAm && a.zustaendig === "backoffice");
  if (!liste.length) return null;

  return (
    <Karte
      titel="Von Timo übergeben"
      zusatz={`${liste.length} offen`}
      aktion={
        <Link
          to="/backoffice"
          className="druckbar flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.64rem] font-medium text-grau-stark hover:text-tinte"
        >
          Board
          <ArrowRight size={11} />
        </Link>
      }
    >
      <ul className="divide-y divide-linie border-t border-linie">
        {liste.map((a) => {
          const o = objekte.find((x) => x.id === a.objektId);
          return (
            <li key={a.id} className="flex items-center gap-3 px-5 py-2.5 md:px-6">
              <button
                type="button"
                onClick={() => umschalten(a.id)}
                aria-label={`${a.titel} erledigt`}
                className="druckbar size-5 shrink-0 rounded-full border-[1.5px] border-linie-stark bg-flaeche"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8rem] text-tinte">{a.titel}</span>
                <span className="mt-0.5 block truncate text-[0.64rem] text-grau">
                  {[o ? objektName(o) : null, fristText(a.faelligAm)].filter(Boolean).join(" · ")}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Karte>
  );
}
