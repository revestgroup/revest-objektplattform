/**
 * Mieter.
 *
 * Hier stand früher eine Lead-Liste mit Richtung „Käufer / Verkäufer". Das war
 * falsch: wer sich auf eine Garantieeinheit bewirbt, kauft nichts, sondern
 * zieht ein. Ein Mieter hat deshalb keine Abschlussquote, sondern eine Akte —
 * Unterlagen, einen Bürgen, einen Vertrag — und einen Platz, dem er zugeordnet
 * wird.
 *
 * Die Reihenfolge der Blöcke im Mieterblatt folgt dem Weg durchs Haus:
 * Zuordnung (wohin), Prüfung (darf er), Unterlagen (ist es belegt), Bürge
 * (wenn nicht), Vertrag (raus damit).
 */
import { Check, FileUp, Mail, Phone, Trash2, Upload, UserMinus, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Schublade } from "./AppLayout";
import { Auswahlfeld, Bereich, Textfeld, Zahlfeld } from "./Felder";
import {
  BELASTUNGSFARBEN,
  MIETERQUELLEN,
  MIETERSTATUS,
  MIETERSTATUS_REIHENFOLGE,
  UNTERLAGENARTEN,
  belastungsurteil,
  istAbgelaufen,
  mietbelastung,
  unterlagenstand,
  VERTRAGSKANAELE,
  VERTRAGSSTATUS,
  type Mieter,
  type Mieterquelle,
  type Mieterstatus,
  type Mieterunterlage,
  type Unterlagenart,
  type Vertragskanal,
} from "../lib/mieter";
import { f } from "../lib/objekte";
import { freiePlaetze, type Mietgarantie } from "../lib/vermietung";
import { useVermietung, type MieterEntwurf } from "../lib/vermietungStore";
import { cn } from "../lib/utils";

export function Mieterliste({
  anlegenOffen,
  anlegenSchliessen,
}: {
  anlegenOffen: boolean;
  anlegenSchliessen: () => void;
}) {
  const { mieter, bereit } = useVermietung();
  const [status, setStatus] = useState<"" | Mieterstatus>("");
  const [suche, setSuche] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const gewaehlt = detailId ? (mieter.find((m) => m.id === detailId) ?? null) : null;

  const liste = useMemo(() => {
    const begriff = suche.trim().toLowerCase();
    return mieter
      .filter((m) => {
        if (status && m.status !== status) return false;
        if (!begriff) return true;
        return `${m.name} ${m.email ?? ""} ${m.beruf ?? ""}`.toLowerCase().includes(begriff);
      })
      .sort((a, b) => {
        // Wer noch keinen Platz hat, steht oben — das ist die Arbeit, die
        // offen liegt. Danach der jüngste Eingang.
        const ao = MIETERSTATUS[a.status].offen;
        const bo = MIETERSTATUS[b.status].offen;
        if (ao !== bo) return ao ? -1 : 1;
        return new Date(b.angelegtAm).getTime() - new Date(a.angelegtAm).getTime();
      });
  }, [mieter, status, suche]);

  return (
    <>
      <Statusband mieter={mieter} aktiv={status} setzen={setStatus} />

      {/* ----- Suche ----- */}
      <div className="sticky top-0 z-20 border-b border-linie bg-grund/95 px-6 py-3 backdrop-blur-sm md:px-10">
        <label className="flex items-center gap-2 rounded-full border border-linie bg-flaeche px-4 py-2">
          <span className="sr-only">Mieter suchen</span>
          <input
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Name, E-Mail oder Beruf"
            className="min-w-0 flex-1 border-none bg-transparent p-0 text-[0.8rem] text-tinte placeholder:text-grau focus:outline-none"
          />
          {suche && (
            <button
              type="button"
              onClick={() => setSuche("")}
              aria-label="Suche leeren"
              className="druckbar text-grau hover:text-tinte"
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </label>
      </div>

      {/* ----- Liste ----- */}
      {!bereit ? (
        <div className="h-48" />
      ) : liste.length === 0 ? (
        <p className="px-6 py-20 text-center text-[0.85rem] text-grau md:px-10">
          Kein Mieter passt zu dieser Auswahl.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 px-6 py-6 md:gap-4 md:px-10 xl:grid-cols-2">
            {liste.map((m, i) => (
              <MieterKachel
                key={m.id}
                mieter={m}
                verzoegerung={Math.min(i, 8) * 28}
                beiKlick={() => setDetailId(m.id)}
              />
            ))}
          </ul>
          <p className="border-t border-linie px-6 py-5 text-[0.68rem] text-grau md:px-10">
            {liste.length} {liste.length === 1 ? "Mieter" : "Mieter"}
            {liste.length !== mieter.length && ` von ${mieter.length}`}
          </p>
        </>
      )}

      <Schublade
        offen={anlegenOffen || detailId !== null}
        schliessen={() => {
          anlegenSchliessen();
          setDetailId(null);
        }}
        titel={anlegenOffen ? "Mieter anlegen" : (gewaehlt?.name ?? "Mieter")}
      >
        {anlegenOffen ? (
          <MieterFormular
            onFertig={(id) => {
              anlegenSchliessen();
              setDetailId(id);
            }}
            onAbbrechen={anlegenSchliessen}
          />
        ) : (
          gewaehlt && <Mieterblatt mieter={gewaehlt} onGeloescht={() => setDetailId(null)} />
        )}
      </Schublade>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Statusband                                                           */
/* ------------------------------------------------------------------ */

function Statusband({
  mieter,
  aktiv,
  setzen,
}: {
  mieter: Mieter[];
  aktiv: "" | Mieterstatus;
  setzen: (s: "" | Mieterstatus) => void;
}) {
  return (
    <div className="scroll-reihe flex gap-2 overflow-x-auto px-6 pb-5 md:px-10">
      {MIETERSTATUS_REIHENFOLGE.map((s) => {
        const st = MIETERSTATUS[s];
        const anzahl = mieter.filter((m) => m.status === s).length;
        const an = aktiv === s;
        // Eine Stufe ohne Mieter ist kein Filter, sondern eine Sackgasse.
        return (
          <button
            key={s}
            type="button"
            disabled={anzahl === 0 && !an}
            onClick={() => setzen(an ? "" : s)}
            aria-pressed={an}
            className={cn(
              "druckbar flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[0.68rem] whitespace-nowrap",
              an
                ? "border-tinte bg-tinte text-grund"
                : anzahl === 0
                  ? "cursor-default border-linie bg-flaeche-hoch text-grau opacity-60"
                  : "border-linie bg-flaeche text-grau-stark",
            )}
          >
            <span
              aria-hidden
              className="size-[7px] shrink-0 rounded-full"
              style={{ background: an ? "#ffffff" : st.farbe }}
            />
            {st.titel}
            <span className="zahl text-[0.6rem] opacity-70">{anzahl}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kachel                                                               */
/* ------------------------------------------------------------------ */

function MieterKachel({
  mieter: m,
  beiKlick,
  verzoegerung,
}: {
  mieter: Mieter;
  beiKlick: () => void;
  verzoegerung: number;
}) {
  const { garantien } = useVermietung();
  const st = MIETERSTATUS[m.status];
  const u = unterlagenstand(m);
  const quote = mietbelastung(m);
  const g = m.garantieId ? (garantien.find((x) => x.id === m.garantieId) ?? null) : null;

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
          <span className="text-[0.62rem] text-grau">{MIETERQUELLEN[m.quelle]}</span>
          {m.buerge && (
            <span className="rounded-full border border-linie-stark px-2.5 py-1 text-[0.58rem] font-semibold tracking-[0.12em] uppercase text-grau-stark">
              Bürge
            </span>
          )}
        </div>

        <div className="mt-3.5 truncate text-[1.02rem] leading-tight font-semibold text-tinte">
          {m.name}
        </div>
        <div className="mt-1 truncate text-[0.74rem] text-grau">
          {m.beruf ?? "Beruf offen"}
          {m.nettoeinkommen !== null && ` · ${f.eur(m.nettoeinkommen)} netto`}
        </div>

        {/* Wo er sitzt — oder dass er noch nirgends sitzt. */}
        <div className="mt-4 rounded-xl border border-linie bg-flaeche-hoch px-3.5 py-2.5">
          {g ? (
            <>
              <div className="mini-label text-[0.55rem]">Zugeordnet</div>
              <div className="mt-1 truncate text-[0.78rem] font-medium text-tinte">{g.adresse}</div>
              <div className="mt-0.5 truncate text-[0.68rem] text-grau">
                {platzTitel(g, m.zimmerId)}
                {m.miete !== null && ` · ${f.eur(m.miete)} / Mon.`}
              </div>
            </>
          ) : (
            <div className="text-[0.74rem] text-grau">Noch kein Platz zugeordnet</div>
          )}
        </div>

        {/* Zwei Zahlen, die über eine Zuordnung entscheiden. */}
        <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-linie bg-linie">
          <div className="bg-flaeche px-3 py-2.5">
            <dt className="mini-label text-[0.55rem]">Unterlagen</dt>
            <dd
              className={cn(
                "zahl mt-1 text-[0.82rem] font-semibold",
                u.vollstaendig ? "text-[#0C5E3A]" : "text-[#8A2822]",
              )}
            >
              {u.erledigt}/{u.noetig}
            </dd>
          </div>
          <div className="bg-flaeche px-3 py-2.5">
            <dt className="mini-label text-[0.55rem]">Mietbelastung</dt>
            <dd
              className="zahl mt-1 text-[0.82rem] font-semibold"
              style={{ color: quote === null ? undefined : BELASTUNGSFARBEN[belastungsurteil(quote)] }}
            >
              {quote === null ? "—" : f.prozent(quote)}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex items-center gap-4 border-t border-linie pt-3 text-[0.68rem] text-grau">
          {m.telefon && (
            <span className="zahl flex min-w-0 items-center gap-1.5">
              <Phone size={11} strokeWidth={2} className="shrink-0" />
              <span className="truncate">{m.telefon}</span>
            </span>
          )}
          {m.email && (
            <span className="flex min-w-0 items-center gap-1.5">
              <Mail size={11} strokeWidth={2} className="shrink-0" />
              <span className="truncate">{m.email}</span>
            </span>
          )}
          {!m.telefon && !m.email && <span>Kein Kontaktweg hinterlegt</span>}
        </div>
      </button>
    </li>
  );
}

function platzTitel(g: Mietgarantie, zimmerId: string | null): string {
  if (!zimmerId) return g.einheitTitel;
  const z = g.zimmer.find((x) => x.id === zimmerId);
  return z ? `${g.einheitTitel} · ${z.bezeichnung}` : g.einheitTitel;
}

/* ------------------------------------------------------------------ */
/* Mieterblatt                                                          */
/* ------------------------------------------------------------------ */

function Mieterblatt({ mieter: m, onGeloescht }: { mieter: Mieter; onGeloescht: () => void }) {
  const { garantien, mieter: alle, mieterAendern, mieterLoeschen, zuordnen, freigeben } =
    useVermietung();
  const st = MIETERSTATUS[m.status];
  const quote = mietbelastung(m);
  const u = unterlagenstand(m);
  const g = m.garantieId ? (garantien.find((x) => x.id === m.garantieId) ?? null) : null;
  const plaetze = useMemo(() => freiePlaetze(garantien, alle), [garantien, alle]);

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
            {MIETERQUELLEN[m.quelle]}
          </span>
        </div>

        <h1 className="headline mt-4 text-[1.6rem] md:text-[2rem]">{m.name}</h1>
        <p className="mt-2 text-[0.8rem] text-grau">
          {[m.beruf, m.arbeitgeber].filter(Boolean).join(" · ") || "Beruf nicht hinterlegt"}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {m.telefon && (
            <a
              href={`tel:${m.telefon.replace(/[^+\d]/g, "")}`}
              className="druckbar flex items-center gap-2 rounded-full bg-tinte px-4 py-2.5 text-[0.68rem] font-semibold tracking-[0.1em] uppercase text-grund shadow-karte"
            >
              <Phone size={13} strokeWidth={2.25} />
              Anrufen
            </a>
          )}
          {m.email && (
            <a
              href={`mailto:${m.email}`}
              className="druckbar flex items-center gap-2 rounded-full border border-linie-stark px-4 py-2.5 text-[0.68rem] font-medium tracking-[0.1em] uppercase text-tinte"
            >
              <Mail size={13} strokeWidth={2} />
              Schreiben
            </a>
          )}
        </div>
      </div>

      {/* ----- Zuordnung ----- */}
      <section className="border-t border-linie px-5 py-6 md:px-7">
        <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
          Zuordnung
        </h2>

        {g ? (
          <>
            <div className="mt-4 rounded-xl border border-linie bg-flaeche px-4 py-3.5">
              <div className="text-[0.88rem] font-semibold text-tinte">{g.adresse}</div>
              <div className="mt-1 text-[0.74rem] text-grau">{platzTitel(g, m.zimmerId)}</div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                <span className="mini-label block">Vereinbarte Kaltmiete</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={m.miete ?? ""}
                  onChange={(e) =>
                    mieterAendern(m.id, {
                      miete: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="zahl mt-2 w-full border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] text-tinte focus:border-linie-stark focus:outline-none"
                />
              </label>
              <label>
                <span className="mini-label block">Einzug</span>
                <input
                  type="date"
                  value={m.einzugAm ? m.einzugAm.slice(0, 10) : ""}
                  onChange={(e) =>
                    mieterAendern(m.id, {
                      einzugAm: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                  className="mt-2 w-full border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] text-tinte focus:border-linie-stark focus:outline-none"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => freigeben(m.id)}
              className="druckbar mt-4 flex items-center gap-2 rounded-full border border-linie-stark px-4 py-2 text-[0.64rem] font-medium tracking-[0.12em] uppercase text-grau-stark"
            >
              <UserMinus size={12} strokeWidth={2} />
              Platz freigeben
            </button>
          </>
        ) : (
          <>
            {!u.vollstaendig && (
              <p className="mt-3 text-[0.74rem] leading-relaxed text-[#8A2822]">
                {u.noetig - u.erledigt} Pflichtunterlagen fehlen noch.
              </p>
            )}
            {plaetze.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-linie-stark px-4 py-8 text-center text-[0.76rem] text-grau">
                Kein freier Platz im Bestand.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {plaetze.map((p) => (
                  <li
                    key={`${p.garantieId}-${p.zimmerId ?? "whg"}`}
                    className="flex items-center gap-3 rounded-xl border border-linie bg-flaeche px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[0.82rem] font-medium text-tinte">
                        {p.adresse}
                      </div>
                      <div className="mt-0.5 truncate text-[0.7rem] text-grau">
                        {p.bezeichnung}
                        {p.sollmiete !== null && ` · ${f.eur(p.sollmiete)} Sollmiete`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => zuordnen(m.id, p.garantieId, p.zimmerId)}
                      className="druckbar shrink-0 rounded-full bg-tinte px-3.5 py-2 text-[0.62rem] font-semibold tracking-[0.12em] uppercase text-grund"
                    >
                      Zuordnen
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* ----- Prüfung ----- */}
      <section className="border-t border-linie px-5 py-6 md:px-7">
        <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
          Prüfung
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {[
            { t: "Nettoeinkommen", v: `${f.eur(m.nettoeinkommen)} / Mon.` },
            { t: "Kaltmiete", v: m.miete === null ? "—" : `${f.eur(m.miete)} / Mon.` },
            {
              t: "Mietbelastung",
              v: quote === null ? "—" : f.prozent(quote),
              farbe: quote === null ? undefined : BELASTUNGSFARBEN[belastungsurteil(quote)],
            },
          ].map((z) => (
            <div key={z.t} className="rounded-xl border border-linie bg-flaeche px-4 py-3.5">
              <dt className="mini-label text-[0.55rem]">{z.t}</dt>
              <dd
                className="zahl mt-1.5 text-[0.95rem] font-semibold text-tinte"
                style={{ color: z.farbe }}
              >
                {z.v}
              </dd>
            </div>
          ))}
        </dl>
        {quote !== null && belastungsurteil(quote) !== "gut" && !m.buerge && (
          <p className="mt-3 text-[0.74rem] leading-relaxed text-[#8A2822]">
            Über 33 % Belastung ohne Bürgen. Darüber redet man, bevor der Vertrag rausgeht.
          </p>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label>
            <span className="mini-label block">Nettoeinkommen</span>
            <input
              type="number"
              inputMode="numeric"
              value={m.nettoeinkommen ?? ""}
              onChange={(e) =>
                mieterAendern(m.id, {
                  nettoeinkommen: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="zahl mt-2 w-full border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] text-tinte focus:border-linie-stark focus:outline-none"
            />
          </label>
          <label>
            <span className="mini-label block">Arbeitgeber</span>
            <input
              value={m.arbeitgeber ?? ""}
              onChange={(e) => mieterAendern(m.id, { arbeitgeber: e.target.value.trim() || null })}
              className="mt-2 w-full border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] text-tinte placeholder:text-grau focus:border-linie-stark focus:outline-none"
            />
          </label>
        </div>
      </section>

      {/* ----- Unterlagen ----- */}
      <Unterlagenblock
        titel="Unterlagen"
        unterlagen={m.unterlagen}
        pflicht={u.offen}
        setzen={(neu) => mieterAendern(m.id, { unterlagen: neu })}
        praefix={m.id}
      />

      {/* ----- Bürge ----- */}
      <section className="border-t border-linie px-5 py-6 md:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
            Bürge
          </h2>
          <button
            type="button"
            onClick={() =>
              mieterAendern(m.id, {
                buerge: m.buerge
                  ? null
                  : {
                      name: "",
                      beziehung: null,
                      telefon: null,
                      email: null,
                      nettoeinkommen: null,
                      unterlagen: [],
                    },
              })
            }
            className="druckbar rounded-full border border-linie-stark px-3 py-1.5 text-[0.62rem] font-medium tracking-[0.12em] uppercase text-tinte"
          >
            {m.buerge ? "Entfernen" : "Hinzufügen"}
          </button>
        </div>

        {m.buerge ? (
          <>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["Name", "name", "text"],
                  ["Beziehung", "beziehung", "text"],
                  ["Telefon", "telefon", "text"],
                  ["E-Mail", "email", "text"],
                ] as const
              ).map(([label, feld]) => (
                <label key={feld}>
                  <span className="mini-label block">{label}</span>
                  <input
                    value={(m.buerge?.[feld] as string | null) ?? ""}
                    onChange={(e) =>
                      m.buerge &&
                      mieterAendern(m.id, {
                        buerge: {
                          ...m.buerge,
                          [feld]: feld === "name" ? e.target.value : e.target.value.trim() || null,
                        },
                      })
                    }
                    placeholder={feld === "beziehung" ? "Vater, Arbeitgeber, …" : undefined}
                    className="mt-2 w-full border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] text-tinte placeholder:text-grau focus:border-linie-stark focus:outline-none"
                  />
                </label>
              ))}
              <label>
                <span className="mini-label block">Nettoeinkommen</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={m.buerge.nettoeinkommen ?? ""}
                  onChange={(e) =>
                    m.buerge &&
                    mieterAendern(m.id, {
                      buerge: {
                        ...m.buerge,
                        nettoeinkommen: e.target.value === "" ? null : Number(e.target.value),
                      },
                    })
                  }
                  className="zahl mt-2 w-full border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] text-tinte focus:border-linie-stark focus:outline-none"
                />
              </label>
            </div>

            <Unterlagenblock
              titel="Unterlagen des Bürgen"
              unterlagen={m.buerge.unterlagen}
              pflicht={[]}
              eingerueckt
              setzen={(neu) =>
                m.buerge && mieterAendern(m.id, { buerge: { ...m.buerge, unterlagen: neu } })
              }
              praefix={`${m.id}-b`}
            />
          </>
        ) : (
          <p className="mt-4 text-[0.76rem] text-grau">
            Kein Bürge hinterlegt.
            {quote !== null && belastungsurteil(quote) === "kritisch" && " Bei dieser Quote nötig."}
          </p>
        )}
      </section>

      {/* ----- Mietvertrag ----- */}
      <Vertragsblock mieter={m} />

      {/* ----- Stand ----- */}
      <section className="border-t border-linie px-5 py-6 md:px-7">
        <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
          Stand
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {MIETERSTATUS_REIHENFOLGE.map((s) => {
            const an = m.status === s;
            const es = MIETERSTATUS[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => mieterAendern(m.id, { status: s })}
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
      </section>

      {/* ----- Notiz ----- */}
      <section className="border-t border-linie px-5 py-6 md:px-7">
        <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
          Notiz
        </h2>
        <textarea
          value={m.notiz ?? ""}
          onChange={(e) => mieterAendern(m.id, { notiz: e.target.value.trim() || null })}
          rows={3}
          placeholder="Was im Gespräch gesagt wurde."
          className="mt-3 w-full resize-y border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] leading-relaxed text-tinte placeholder:text-grau focus:border-linie-stark focus:outline-none"
        />
      </section>

      <section className="border-t border-linie px-5 py-6 md:px-7">
        <button
          type="button"
          onClick={() => {
            mieterLoeschen(m.id);
            onGeloescht();
          }}
          className="druckbar flex items-center gap-2 rounded-full border border-linie px-4 py-2 text-[0.64rem] font-medium tracking-[0.14em] uppercase text-grau hover:border-[#E3BDB9] hover:text-[#8A2822]"
        >
          <Trash2 size={12} strokeWidth={2} />
          Mieter löschen
        </button>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Unterlagen                                                           */
/* ------------------------------------------------------------------ */

/**
 * Die Akte. Fehlende Pflichtunterlagen stehen oben als Lücke, damit man sie
 * nicht in der Liste des Vorhandenen suchen muss.
 *
 * Die Datei selbst verlässt in Phase 1 den Browser nicht: der Eintrag hält
 * nur den Namen. In Phase 2 füllt der Upload `speicherpfad` (Supabase Storage,
 * Wahrheit und Backup) und `driveId` (Google Drive, Arbeitsablage).
 */
function Unterlagenblock({
  titel,
  unterlagen,
  pflicht,
  setzen,
  praefix,
  eingerueckt,
}: {
  titel: string;
  unterlagen: Mieterunterlage[];
  pflicht: Unterlagenart[];
  setzen: (neu: Mieterunterlage[]) => void;
  praefix: string;
  eingerueckt?: boolean;
}) {
  const [art, setArt] = useState<Unterlagenart>("gehaltsnachweis");
  const datei = useRef<HTMLInputElement>(null);

  function hochladen(dateien: FileList | null) {
    if (!dateien || dateien.length === 0) return;
    const neu: Mieterunterlage[] = Array.from(dateien).map((d, i) => ({
      id: `${praefix}-u${Date.now().toString(36)}${i}`,
      art,
      titel: UNTERLAGENARTEN[art].titel,
      dateiname: d.name,
      hochgeladenAm: new Date().toISOString(),
      speicherpfad: null,
      driveId: null,
      gueltigBis: null,
    }));
    setzen([...unterlagen, ...neu]);
  }

  return (
    <section
      className={cn(
        eingerueckt ? "mt-6" : "border-t border-linie px-5 py-6 md:px-7",
      )}
    >
      <h2
        className={cn(
          "font-semibold tracking-[0.18em] uppercase",
          eingerueckt ? "text-[0.62rem] text-grau-stark" : "text-[0.72rem] text-tinte",
        )}
      >
        {titel}
      </h2>

      {pflicht.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {pflicht.map((a) => (
            <li
              key={a}
              className="rounded-full border border-[#E3BDB9] bg-[#F8DEDC] px-3 py-1.5 text-[0.66rem] font-medium text-[#8A2822]"
            >
              {UNTERLAGENARTEN[a].titel} fehlt
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-4 space-y-2">
        {unterlagen.map((d) => {
          const ab = istAbgelaufen(d);
          return (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-xl border border-linie bg-flaeche px-3.5 py-3"
            >
              <FileUp
                size={14}
                strokeWidth={1.75}
                className={cn("shrink-0", ab ? "text-[#8A2822]" : "text-grau")}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.8rem] font-medium text-tinte">{d.titel}</div>
                <div className="zahl mt-0.5 truncate text-[0.66rem] text-grau">
                  {d.dateiname} · {f.datum(d.hochgeladenAm)}
                  {d.gueltigBis && ` · gültig bis ${f.datum(d.gueltigBis)}`}
                </div>
              </div>
              {ab && (
                <span className="shrink-0 rounded-full bg-[#F8DEDC] px-2.5 py-1 text-[0.58rem] font-semibold tracking-[0.1em] uppercase text-[#8A2822]">
                  abgelaufen
                </span>
              )}
              <button
                type="button"
                onClick={() => setzen(unterlagen.filter((x) => x.id !== d.id))}
                aria-label={`${d.titel} entfernen`}
                className="druckbar flex size-8 shrink-0 items-center justify-center rounded-full text-grau hover:text-[#8A2822]"
              >
                <Trash2 size={13} strokeWidth={1.75} />
              </button>
            </li>
          );
        })}
        {unterlagen.length === 0 && (
          <li className="rounded-xl border border-dashed border-linie-stark px-4 py-6 text-center text-[0.76rem] text-grau">
            Noch keine Unterlage hinterlegt.
          </li>
        )}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={art}
          onChange={(e) => setArt(e.target.value as Unterlagenart)}
          aria-label="Art der Unterlage"
          className="border border-linie bg-flaeche px-3 py-2 text-[0.76rem] text-tinte focus:border-linie-stark focus:outline-none"
        >
          {(Object.keys(UNTERLAGENARTEN) as Unterlagenart[]).map((a) => (
            <option key={a} value={a}>
              {UNTERLAGENARTEN[a].titel}
            </option>
          ))}
        </select>
        <input
          ref={datei}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            hochladen(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => datei.current?.click()}
          className="druckbar flex items-center gap-2 rounded-full border border-linie-stark px-4 py-2 text-[0.64rem] font-medium tracking-[0.12em] uppercase text-tinte"
        >
          <Upload size={12} strokeWidth={2} />
          Hochladen
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Mietvertrag                                                          */
/* ------------------------------------------------------------------ */

/**
 * Der Versand ist hier ein Zustandswechsel, kein Versand: Phase 2 hängt n8n
 * und den Signaturanbieter dahinter, der Rücklauf setzt `unterschriebenAm`
 * über `anbieterId` zurück. Die Maske bleibt dieselbe.
 */
function Vertragsblock({ mieter: m }: { mieter: Mieter }) {
  const { mieterAendern } = useVermietung();
  const [kanal, setKanal] = useState<Vertragskanal>("e_signatur");
  const v = m.vertrag;
  const vs = v ? VERTRAGSSTATUS[v.status] : null;

  return (
    <section className="border-t border-linie px-5 py-6 md:px-7">
      <h2 className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-tinte">
        Mietvertrag
      </h2>

      {v && vs ? (
        <>
          <div className="mt-4 rounded-xl border border-linie bg-flaeche px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="flex items-center gap-1.5 text-[0.8rem] font-semibold"
                style={{ color: vs.farbe }}
              >
                <span aria-hidden className="size-2 rounded-full" style={{ background: vs.farbe }} />
                {vs.titel}
              </span>
              <span className="text-[0.7rem] text-grau">über {VERTRAGSKANAELE[v.kanal]}</span>
            </div>
            <dl className="mt-3 divide-y divide-linie">
              {[
                ["Versendet", v.versendetAm ? f.datum(v.versendetAm) : "—"],
                ["Unterschrieben", v.unterschriebenAm ? f.datum(v.unterschriebenAm) : "—"],
              ].map(([t, w]) => (
                <div key={t} className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-[0.74rem] text-grau">{t}</dt>
                  <dd className="zahl text-[0.78rem] text-tinte">{w}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {v.status === "versendet" && (
              <button
                type="button"
                onClick={() =>
                  mieterAendern(m.id, {
                    vertrag: {
                      ...v,
                      status: "unterschrieben",
                      unterschriebenAm: new Date().toISOString(),
                    },
                    status: "eingezogen",
                  })
                }
                className="druckbar flex items-center gap-2 rounded-full bg-tinte px-4 py-2.5 text-[0.66rem] font-semibold tracking-[0.12em] uppercase text-grund shadow-karte"
              >
                <Check size={13} strokeWidth={2.25} />
                Rücklauf erfassen
              </button>
            )}
            <button
              type="button"
              onClick={() => mieterAendern(m.id, { vertrag: null })}
              className="druckbar rounded-full border border-linie-stark px-4 py-2.5 text-[0.66rem] font-medium tracking-[0.12em] uppercase text-grau-stark"
            >
              Zurücksetzen
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              value={kanal}
              onChange={(e) => setKanal(e.target.value as Vertragskanal)}
              aria-label="Versandweg"
              className="border border-linie bg-flaeche px-3 py-2 text-[0.76rem] text-tinte focus:border-linie-stark focus:outline-none"
            >
              {(Object.keys(VERTRAGSKANAELE) as Vertragskanal[]).map((k) => (
                <option key={k} value={k}>
                  {VERTRAGSKANAELE[k]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!m.garantieId}
              onClick={() =>
                mieterAendern(m.id, {
                  vertrag: {
                    id: `vv-${Date.now().toString(36)}`,
                    kanal,
                    status: "versendet",
                    versendetAm: new Date().toISOString(),
                    unterschriebenAm: null,
                    anbieterId: null,
                  },
                  status: "vertrag_raus",
                })
              }
              className={cn(
                "druckbar flex items-center gap-2 rounded-full px-4 py-2.5 text-[0.66rem] font-semibold tracking-[0.12em] uppercase",
                m.garantieId
                  ? "bg-tinte text-grund shadow-karte"
                  : "cursor-default bg-flaeche-aktiv text-grau",
              )}
            >
              <Mail size={13} strokeWidth={2.25} />
              Vertrag senden
            </button>
          </div>
          {!m.garantieId && (
            <p className="mt-3 text-[0.74rem] text-grau">
              Erst zuordnen — ohne Einheit steht im Vertrag keine Adresse.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Anlegen                                                              */
/* ------------------------------------------------------------------ */

function MieterFormular({
  onFertig,
  onAbbrechen,
}: {
  onFertig: (id: string) => void;
  onAbbrechen: () => void;
}) {
  const { mieterAnlegen } = useVermietung();

  const [name, setName] = useState("");
  const [telefon, setTelefon] = useState("");
  const [email, setEmail] = useState("");
  const [beruf, setBeruf] = useState("");
  const [arbeitgeber, setArbeitgeber] = useState("");
  const [netto, setNetto] = useState("");
  const [quelle, setQuelle] = useState<Mieterquelle>("leadseite");
  const [notiz, setNotiz] = useState("");
  const [fehler, setFehler] = useState<Record<string, string>>({});

  function absenden(e: React.FormEvent) {
    e.preventDefault();
    const neu: Record<string, string> = {};
    if (!name.trim()) neu.name = "Name fehlt.";
    if (!telefon.trim() && !email.trim()) neu.telefon = "Mindestens ein Kontaktweg.";
    setFehler(neu);
    if (Object.keys(neu).length > 0) return;

    const entwurf: MieterEntwurf = {
      name: name.trim(),
      email: email.trim() || null,
      telefon: telefon.trim() || null,
      geburtsdatum: null,
      beruf: beruf.trim() || null,
      arbeitgeber: arbeitgeber.trim() || null,
      nettoeinkommen: netto.trim() === "" ? null : Number(netto),
      status: "interessent",
      quelle,
      garantieId: null,
      zimmerId: null,
      miete: null,
      einzugAm: null,
      auszugAm: null,
      buerge: null,
      unterlagen: [],
      vertrag: null,
      notiz: notiz.trim() || null,
      angelegtAm: new Date().toISOString(),
    };

    onFertig(mieterAnlegen(entwurf).id);
  }

  return (
    <form onSubmit={absenden} className="pb-20">
      <Bereich titel="Kontakt">
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

      <Bereich titel="Einkommen">
        <Textfeld id="beruf" label="Beruf" wert={beruf} setWert={setBeruf} />
        <Textfeld
          id="arbeitgeber"
          label="Arbeitgeber"
          wert={arbeitgeber}
          setWert={setArbeitgeber}
        />
        <Zahlfeld
          id="netto"
          label="Nettoeinkommen je Monat"
          wert={netto}
          setWert={setNetto}
          einheit="€"
        />
        <Auswahlfeld
          id="quelle"
          label="Herkunft"
          wert={quelle}
          setWert={setQuelle}
          optionen={(Object.keys(MIETERQUELLEN) as Mieterquelle[]).map((q) => ({
            wert: q,
            titel: MIETERQUELLEN[q],
          }))}
        />
        <Textfeld
          id="notiz"
          label="Notiz"
          wert={notiz}
          setWert={setNotiz}
          zeilen={3}
          platzhalter="Was der Interessent sucht."
          breit
        />
      </Bereich>

      <div className="sticky bottom-0 flex gap-3 border-t border-linie bg-grund/95 px-5 py-4 backdrop-blur-sm md:px-7">
        <button
          type="submit"
          className="druckbar flex-1 rounded-full bg-tinte px-5 py-3 text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte"
        >
          Mieter anlegen
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
