/**
 * Mieter-Leads.
 *
 * Lag früher als eigener Hauptreiter in der Navigation — falsch, denn es sind
 * keine Objekt-Leads. Wer hier steht, sucht eine Wohnung oder ein WG-Zimmer in
 * einer Einheit, für die Revest eine Mietgarantie trägt. Damit gehört die
 * Liste genau dorthin, wo das Loch entsteht, das sie schließen soll: in die
 * Mietverwaltung.
 *
 * Der Trichter ist bewusst flach: eine Liste, ein Status pro Lead, ein Klick
 * zum Weiterschieben. Alles, was ein CRM sonst noch kann, würde hier nur davon
 * ablenken, dass ein neuer Lead innerhalb von Stunden einen Anruf braucht.
 */
import { Link } from "@tanstack/react-router";
import { Check, Mail, Phone, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Schublade } from "./AppLayout";
import { Auswahlfeld, Bereich, Segmente, Textfeld, Zahlfeld } from "./Felder";
import {
  LEADINTERESSEN,
  LEADQUELLEN,
  LEADRICHTUNGEN,
  LEADSTATUS,
  LEADSTATUS_REIHENFOLGE,
  tageOffen,
  type Lead,
  type Leadinteresse,
  type Leadquelle,
  type Leadrichtung,
  type Leadstatus,
} from "../lib/leads";
import { useLeads, type LeadEntwurf } from "../lib/leadStore";
import { f } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { cn } from "../lib/utils";

export function Mieterleads({
  anlegenOffen,
  anlegenSchliessen,
}: {
  anlegenOffen: boolean;
  anlegenSchliessen: () => void;
}) {
  const { leads, bereit } = useLeads();
  const [richtung, setRichtung] = useState<"" | Leadrichtung>("");
  const [status, setStatus] = useState<"" | Leadstatus>("");
  const [quelle, setQuelle] = useState<"" | Leadquelle>("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const gewaehlt = detailId ? (leads.find((l) => l.id === detailId) ?? null) : null;

  const liste = useMemo(
    () =>
      leads
        .filter((l) => {
          if (richtung && l.richtung !== richtung) return false;
          if (status && l.status !== status) return false;
          if (quelle && l.quelle !== quelle) return false;
          return true;
        })
        .sort((a, b) => {
          // Offene vor erledigten, danach der jüngste zuerst. Ein neuer Lead
          // ist nur so lange wertvoll, wie er noch warm ist.
          const ao = LEADSTATUS[a.status].offen;
          const bo = LEADSTATUS[b.status].offen;
          if (ao !== bo) return ao ? -1 : 1;
          return new Date(b.eingegangenAm).getTime() - new Date(a.eingegangenAm).getTime();
        }),
    [leads, richtung, status, quelle],
  );

  return (
    <>
      <Kennzahlen leads={leads} />

      <Trichter leads={leads} aktiv={status} setzen={setStatus} />

      {/* ----- Filter ----- */}
      <div className="sticky top-0 z-20 border-b border-linie bg-grund/95 backdrop-blur-sm">
        <div className="scroll-reihe flex items-center gap-2 overflow-x-auto px-6 py-3 md:px-10">
          <div className="flex shrink-0 gap-1 rounded-full border border-linie bg-flaeche-hoch p-1">
            {(["", "verkaeufer", "kaeufer"] as const).map((r) => (
              <button
                key={r || "alle"}
                type="button"
                onClick={() => setRichtung(r)}
                aria-pressed={richtung === r}
                className={cn(
                  "druckbar rounded-full px-3 py-1 text-[0.68rem] whitespace-nowrap",
                  richtung === r ? "bg-tinte text-grund shadow-karte" : "text-grau-stark",
                )}
              >
                {r ? LEADRICHTUNGEN[r].kurz : "Alle"}
              </button>
            ))}
          </div>

          <span aria-hidden className="my-1 w-px shrink-0 bg-linie" />

          {(Object.keys(LEADQUELLEN) as Leadquelle[]).map((q) => {
            const an = quelle === q;
            return (
              <button
                key={q}
                type="button"
                onClick={() => setQuelle(an ? "" : q)}
                aria-pressed={an}
                className={cn(
                  "druckbar shrink-0 rounded-full border px-3.5 py-1.5 text-[0.68rem] whitespace-nowrap",
                  an ? "border-tinte bg-tinte text-grund" : "border-linie bg-flaeche text-grau-stark",
                )}
              >
                {LEADQUELLEN[q]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ----- Liste ----- */}
      {!bereit ? (
        <div className="h-48" />
      ) : liste.length === 0 ? (
        <p className="px-6 py-20 text-center text-[0.85rem] text-grau md:px-10">
          Kein Lead passt zu diesen Filtern.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 px-6 py-6 md:gap-4 md:px-10 xl:grid-cols-2">
            {liste.map((l, i) => (
              <LeadKachel
                key={l.id}
                lead={l}
                verzoegerung={Math.min(i, 8) * 28}
                beiKlick={() => setDetailId(l.id)}
              />
            ))}
          </ul>
          <p className="border-t border-linie px-6 py-5 text-[0.68rem] text-grau md:px-10">
            {liste.length} {liste.length === 1 ? "Lead" : "Leads"}
            {liste.length !== leads.length && ` von ${leads.length}`}
          </p>
        </>
      )}

      <Schublade
        offen={anlegenOffen || detailId !== null}
        schliessen={() => {
          anlegenSchliessen();
          setDetailId(null);
        }}
        titel={anlegenOffen ? "Lead anlegen" : (gewaehlt?.name ?? "Lead")}
      >
        {anlegenOffen ? (
          <LeadFormular
            onFertig={(id) => {
              anlegenSchliessen();
              setDetailId(id);
            }}
            onAbbrechen={anlegenSchliessen}
          />
        ) : (
          gewaehlt && <LeadDetail lead={gewaehlt} onGeloescht={() => setDetailId(null)} />
        )}
      </Schublade>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Kennzahlen                                                           */
/* ------------------------------------------------------------------ */

function Kennzahlen({ leads }: { leads: Lead[] }) {
  const z = useMemo(() => {
    const offen = leads.filter((l) => LEADSTATUS[l.status].offen);
    const neu = leads.filter((l) => l.status === "neu");
    // Älteste unbearbeitete Anfrage — die Zahl, die weh tut.
    const liegen = neu.length === 0 ? 0 : Math.max(...neu.map((l) => tageOffen(l)));
    const deals = leads.filter((l) => l.status === "deal");
    const entschieden = leads.filter((l) => !LEADSTATUS[l.status].offen).length;
    return {
      offen: offen.length,
      neu: neu.length,
      liegen,
      ueberLeadseite: leads.filter((l) => l.quelle === "leadseite").length,
      quote: entschieden === 0 ? null : (deals.length / entschieden) * 100,
      deals: deals.length,
    };
  }, [leads]);

  const dringend = z.liegen >= 2;

  return (
    <dl className="grid grid-cols-2 gap-3 px-6 py-5 md:px-10 lg:grid-cols-4">
      {[
        { titel: "Offen im Trichter", wert: String(z.offen), unten: "noch nicht entschieden" },
        {
          titel: "Unbearbeitet",
          wert: String(z.neu),
          unten:
            z.neu === 0
              ? "alles angefasst"
              : z.liegen === 0
                ? "heute eingegangen"
                : `ältester liegt ${z.liegen} ${z.liegen === 1 ? "Tag" : "Tage"}`,
          warnung: dringend,
        },
        {
          titel: "Über Leadseite",
          wert: String(z.ueberLeadseite),
          unten: "automatisch eingegangen",
        },
        {
          titel: "Abschlussquote",
          wert: z.quote === null ? "—" : f.prozent(z.quote),
          unten: `${z.deals} ${z.deals === 1 ? "Abschluss" : "Abschlüsse"}`,
        },
      ].map((k, i) => (
        <div
          key={k.titel}
          className={cn(
            "eintritt rounded-2xl border bg-flaeche px-4 py-4 md:px-5",
            k.warnung ? "border-[#E3BDB9]" : "border-linie",
          )}
          style={{ animationDelay: `${i * 28}ms` }}
        >
          <dt className="mini-label">{k.titel}</dt>
          <dd
            className={cn(
              "zahl mt-2 text-[1.3rem] leading-none font-semibold md:text-[1.6rem]",
              k.warnung ? "text-[#8A2822]" : "text-tinte",
            )}
          >
            {k.wert}
          </dd>
          <div className="mt-1.5 text-[0.65rem] text-grau">{k.unten}</div>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ */
/* Trichter                                                             */
/* ------------------------------------------------------------------ */

/**
 * Die sechs Stufen als Band. Jede Stufe ist gleichzeitig Filter — man sieht
 * die Verteilung und kann sofort hineingreifen, ohne ein Menü zu öffnen.
 */
function Trichter({
  leads,
  aktiv,
  setzen,
}: {
  leads: Lead[];
  aktiv: "" | Leadstatus;
  setzen: (s: "" | Leadstatus) => void;
}) {
  const gesamt = leads.length || 1;

  return (
    <div className="scroll-reihe flex gap-2 overflow-x-auto px-6 pb-5 md:px-10">
      {LEADSTATUS_REIHENFOLGE.map((s) => {
        const st = LEADSTATUS[s];
        const anzahl = leads.filter((l) => l.status === s).length;
        const an = aktiv === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => setzen(an ? "" : s)}
            aria-pressed={an}
            className={cn(
              "druckbar min-w-[7.5rem] flex-1 shrink-0 overflow-hidden rounded-xl border bg-flaeche px-3.5 pt-3 pb-0 text-left",
              an ? "border-tinte" : "border-linie",
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[0.66rem] font-medium text-grau-stark">
                {st.titel}
              </span>
              <span className="zahl text-[1.05rem] leading-none font-semibold text-tinte">
                {anzahl}
              </span>
            </div>
            {/* Anteil am Gesamtbestand als Fußlinie — ohne Achsen, ohne Legende. */}
            <div className="mt-3 h-[3px] w-full rounded-full bg-[#E6E9EE]">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out-stark"
                style={{ width: `${(anzahl / gesamt) * 100}%`, background: st.farbe }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kachel                                                               */
/* ------------------------------------------------------------------ */

function LeadKachel({
  lead: l,
  beiKlick,
  verzoegerung,
}: {
  lead: Lead;
  beiKlick: () => void;
  verzoegerung: number;
}) {
  const st = LEADSTATUS[l.status];
  const tage = tageOffen(l);

  return (
    <li className="eintritt" style={{ animationDelay: `${verzoegerung}ms` }}>
      <button
        type="button"
        onClick={beiKlick}
        className="kachel flex w-full flex-col items-stretch rounded-2xl border border-linie bg-flaeche p-5 text-left shadow-karte"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.58rem] font-semibold tracking-[0.12em] uppercase"
            style={{ background: st.weich, color: st.tief }}
          >
            <span aria-hidden className="size-[6px] rounded-full" style={{ background: st.farbe }} />
            {st.titel}
          </span>
          <span className="rounded-full border border-linie-stark px-2.5 py-1 text-[0.58rem] font-semibold tracking-[0.12em] uppercase text-grau-stark">
            {LEADRICHTUNGEN[l.richtung].kurz}
          </span>
          <span className="text-[0.62rem] text-grau">{LEADQUELLEN[l.quelle]}</span>
          <span className="zahl ml-auto text-[0.62rem] text-grau">
            {tage === 0 ? "heute" : `vor ${tage} ${tage === 1 ? "Tag" : "Tagen"}`}
          </span>
        </div>

        <div className="mt-3.5 truncate text-[1.02rem] leading-tight font-semibold text-tinte">
          {l.name}
        </div>
        <div className="mt-1 truncate text-[0.74rem] text-grau">
          {LEADINTERESSEN[l.interesse]}
          {l.budget !== null && ` · ${f.eurKurz(l.budget)}`}
        </div>

        {l.nachricht && (
          <p className="mt-3 line-clamp-2 text-[0.76rem] leading-relaxed text-grau-stark">
            {l.nachricht}
          </p>
        )}

        <div className="mt-4 flex items-center gap-4 border-t border-linie pt-3 text-[0.68rem] text-grau">
          {l.telefon && (
            <span className="zahl flex min-w-0 items-center gap-1.5">
              <Phone size={11} strokeWidth={2} className="shrink-0" />
              <span className="truncate">{l.telefon}</span>
            </span>
          )}
          {l.email && (
            <span className="flex min-w-0 items-center gap-1.5">
              <Mail size={11} strokeWidth={2} className="shrink-0" />
              <span className="truncate">{l.email}</span>
            </span>
          )}
          {!l.telefon && !l.email && <span>Kein Kontaktweg hinterlegt</span>}
        </div>
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Detail                                                               */
/* ------------------------------------------------------------------ */

function LeadDetail({ lead: l, onGeloescht }: { lead: Lead; onGeloescht: () => void }) {
  const { aendern, statusSetzen, loeschen } = useLeads();
  const { objekte } = useObjekte();
  const st = LEADSTATUS[l.status];
  const objekt = objekte.find((o) => o.id === l.objektId) ?? null;

  return (
    <div className="pb-16">
      <div className="px-5 py-6 md:px-7">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6rem] font-semibold tracking-[0.12em] uppercase"
            style={{ background: st.weich, color: st.tief }}
          >
            <span aria-hidden className="size-[6px] rounded-full" style={{ background: st.farbe }} />
            {st.titel}
          </span>
          <span className="rounded-full border border-linie-stark px-2.5 py-1 text-[0.6rem] font-semibold tracking-[0.12em] uppercase text-grau-stark">
            {LEADRICHTUNGEN[l.richtung].titel}
          </span>
        </div>

        <h1 className="headline mt-4 text-[1.6rem] md:text-[2rem]">{l.name}</h1>
        <p className="mt-2 text-[0.8rem] text-grau">
          {LEADQUELLEN[l.quelle]} · eingegangen {f.datumZeit(l.eingegangenAm)}
        </p>

        {/* Kontaktwege als erstes Handwerkszeug — anrufen schlägt tippen. */}
        <div className="mt-5 flex flex-wrap gap-2">
          {l.telefon && (
            <a
              href={`tel:${l.telefon.replace(/[^+\d]/g, "")}`}
              className="druckbar flex items-center gap-2 rounded-full bg-tinte px-4 py-2.5 text-[0.68rem] font-semibold tracking-[0.1em] uppercase text-grund shadow-karte"
            >
              <Phone size={13} strokeWidth={2.25} />
              Anrufen
            </a>
          )}
          {l.email && (
            <a
              href={`mailto:${l.email}`}
              className="druckbar flex items-center gap-2 rounded-full border border-linie-stark px-4 py-2.5 text-[0.68rem] font-medium tracking-[0.1em] uppercase text-tinte"
            >
              <Mail size={13} strokeWidth={2} />
              Schreiben
            </a>
          )}
        </div>
      </div>

      {/* ----- Trichterstufe setzen ----- */}
      <section className="border-t border-linie px-5 py-6 md:px-7">
        <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
          Stand
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {LEADSTATUS_REIHENFOLGE.map((s) => {
            const an = l.status === s;
            const es = LEADSTATUS[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => statusSetzen(l.id, s)}
                aria-pressed={an}
                className={cn(
                  "druckbar flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.7rem] font-medium",
                  an ? "border-tinte bg-tinte text-grund" : "border-linie bg-flaeche text-grau-stark",
                )}
              >
                {an ? (
                  <Check size={12} strokeWidth={2.5} />
                ) : (
                  <span
                    aria-hidden
                    className="size-[7px] rounded-full"
                    style={{ background: es.farbe }}
                  />
                )}
                {es.titel}
              </button>
            );
          })}
        </div>

        {/* Was aus dem Lead wird, wenn er zum Abschluss kommt. */}
        {l.status === "deal" && (
          <p className="mt-4 text-[0.72rem] leading-relaxed text-grau-stark">
            {l.richtung === "verkaeufer"
              ? "Nächster Schritt: das Objekt im Ankauf anlegen."
              : "Nächster Schritt: den Mieter in der passenden Garantie eintragen."}{" "}
            {l.richtung === "verkaeufer" && (
              <Link
                to="/ankauf"
                className="underline decoration-linie-stark underline-offset-2 hover:text-tinte"
              >
                Zum Ankauf
              </Link>
            )}
          </p>
        )}
      </section>

      {/* ----- Anfrage ----- */}
      <section className="border-t border-linie px-5 py-6 md:px-7">
        <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
          Anfrage
        </h2>
        <dl className="mt-4 divide-y divide-linie">
          {[
            ["Interesse", LEADINTERESSEN[l.interesse]],
            [l.richtung === "kaeufer" ? "Budget" : "Preisvorstellung", f.eur(l.budget)],
            ["E-Mail", l.email ?? "—"],
            ["Telefon", l.telefon ?? "—"],
            ["Bezug", objekt ? `${objekt.strasse}, ${objekt.stadt}` : "—"],
          ].map(([t, v]) => (
            <div key={t} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-[0.76rem] text-grau">{t}</dt>
              <dd className="zahl text-right text-[0.8rem] text-tinte">{v}</dd>
            </div>
          ))}
        </dl>

        {l.nachricht && (
          <blockquote className="mt-4 border-l-2 border-linie-stark pl-4 text-[0.8rem] leading-relaxed text-grau-stark">
            {l.nachricht}
          </blockquote>
        )}
      </section>

      {/* ----- Notiz ----- */}
      <section className="border-t border-linie px-5 py-6 md:px-7">
        <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
          Notiz
        </h2>
        <textarea
          value={l.notiz ?? ""}
          onChange={(e) => aendern(l.id, { notiz: e.target.value.trim() || null })}
          rows={3}
          placeholder="Was im Gespräch gesagt wurde."
          className="mt-3 w-full resize-y border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] leading-relaxed text-tinte placeholder:text-grau focus:border-linie-stark focus:outline-none"
        />
      </section>

      <section className="border-t border-linie px-5 py-6 md:px-7">
        <button
          type="button"
          onClick={() => {
            loeschen(l.id);
            onGeloescht();
          }}
          className="druckbar flex items-center gap-2 rounded-full border border-linie px-4 py-2 text-[0.64rem] font-medium tracking-[0.14em] uppercase text-grau hover:border-[#E3BDB9] hover:text-[#8A2822]"
        >
          <Trash2 size={12} strokeWidth={2} />
          Lead löschen
        </button>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Anlegen                                                              */
/* ------------------------------------------------------------------ */

function LeadFormular({
  onFertig,
  onAbbrechen,
}: {
  onFertig: (id: string) => void;
  onAbbrechen: () => void;
}) {
  const { anlegen } = useLeads();
  const { objekte } = useObjekte();

  const [name, setName] = useState("");
  const [telefon, setTelefon] = useState("");
  const [email, setEmail] = useState("");
  const [richtung, setRichtung] = useState<Leadrichtung>("kaeufer");
  const [quelle, setQuelle] = useState<Leadquelle>("telefon");
  const [interesse, setInteresse] = useState<Leadinteresse>("kapitalanlage");
  const [budget, setBudget] = useState("");
  const [objektId, setObjektId] = useState("");
  const [nachricht, setNachricht] = useState("");
  const [fehler, setFehler] = useState<Record<string, string>>({});

  function absenden(e: React.FormEvent) {
    e.preventDefault();
    const neu: Record<string, string> = {};
    if (!name.trim()) neu.name = "Name fehlt.";
    if (!telefon.trim() && !email.trim()) neu.telefon = "Mindestens ein Kontaktweg.";
    setFehler(neu);
    if (Object.keys(neu).length > 0) return;

    const entwurf: LeadEntwurf = {
      name: name.trim(),
      email: email.trim() || null,
      telefon: telefon.trim() || null,
      richtung,
      quelle,
      status: "neu",
      interesse,
      budget: budget.trim() === "" ? null : Number(budget),
      nachricht: nachricht.trim() || null,
      objektId: objektId || null,
      notiz: null,
    };

    onFertig(anlegen(entwurf).id);
  }

  return (
    <form onSubmit={absenden} className="pb-20">
      <Bereich
        titel="Kontakt"
        hinweis="Für Leads aus Telefonaten, Empfehlungen oder Portalen. Anfragen über die Leadseite landen später von selbst hier."
      >
        <Textfeld
          id="name"
          label="Name"
          wert={name}
          setWert={setName}
          pflicht
          fehler={fehler.name}
          breit
        />
        <Textfeld
          id="telefon"
          label="Telefon"
          wert={telefon}
          setWert={setTelefon}
          platzhalter="+49 731 …"
          fehler={fehler.telefon}
        />
        <Textfeld
          id="email"
          label="E-Mail"
          wert={email}
          setWert={setEmail}
          platzhalter="name@beispiel.de"
        />
      </Bereich>

      <Bereich titel="Anliegen">
        <Segmente
          label="Richtung"
          wert={richtung}
          setWert={setRichtung}
          optionen={[
            { wert: "kaeufer", titel: "Sucht Anlage" },
            { wert: "verkaeufer", titel: "Bietet an" },
          ]}
          breit
          hinweis={
            richtung === "verkaeufer"
              ? "Wird daraus ein Deal, entsteht ein Objekt im Ankauf."
              : "Wird daraus ein Deal, entsteht eine Mietgarantie."
          }
        />
        <Auswahlfeld
          id="interesse"
          label="Interesse"
          wert={interesse}
          setWert={setInteresse}
          optionen={(Object.keys(LEADINTERESSEN) as Leadinteresse[]).map((i) => ({
            wert: i,
            titel: LEADINTERESSEN[i],
          }))}
        />
        <Auswahlfeld
          id="quelle"
          label="Herkunft"
          wert={quelle}
          setWert={setQuelle}
          optionen={(Object.keys(LEADQUELLEN) as Leadquelle[]).map((q) => ({
            wert: q,
            titel: LEADQUELLEN[q],
          }))}
        />
        <Zahlfeld
          id="budget"
          label={richtung === "kaeufer" ? "Budget" : "Preisvorstellung"}
          wert={budget}
          setWert={setBudget}
          einheit="€"
        />
        <Auswahlfeld
          id="objekt"
          label="Bezug zu Objekt"
          wert={objektId}
          setWert={setObjektId}
          leerText="Ohne Objektbezug"
          optionen={objekte.map((o) => ({ wert: o.id, titel: `${o.strasse}, ${o.stadt}` }))}
        />
        <Textfeld
          id="nachricht"
          label="Nachricht"
          wert={nachricht}
          setWert={setNachricht}
          zeilen={3}
          platzhalter="Was der Lead sucht oder anbietet."
          breit
        />
      </Bereich>

      <div className="sticky bottom-0 flex gap-3 border-t border-linie bg-grund/95 px-5 py-4 backdrop-blur-sm md:px-7">
        <button
          type="submit"
          className="druckbar flex-1 rounded-full bg-tinte px-5 py-3 text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte"
        >
          Lead anlegen
        </button>
        <button
          type="button"
          onClick={onAbbrechen}
          className="druckbar rounded-full border border-linie-stark px-5 py-3 text-[0.68rem] font-medium tracking-[0.14em] uppercase text-grau-stark"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
