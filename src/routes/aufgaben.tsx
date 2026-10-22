/**
 * Aufgaben.
 *
 * Die Seite, auf der man morgens landet. Sie beantwortet eine Frage —
 * „was mache ich jetzt?“ — und zwar durch Gruppieren statt durch Sortieren:
 * Überfällig, Heute, Diese Woche, Später, Ohne Frist. Fünf Blöcke, jeder mit
 * eigener Überschrift, weil eine durchlaufende Liste aus 20 Zeilen zwar
 * dieselbe Reihenfolge hätte, aber nicht dieselbe Aussage.
 *
 * Erledigtes verschwindet nicht, es klappt zusammen. Was man abgehakt hat,
 * will man am Abend noch sehen können — aber nicht am Morgen.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Schublade, Seitenkopf } from "../components/AppLayout";
import { Auswahlfeld, Bereich, Segmente, Textfeld } from "../components/Felder";
import {
  AUFGABENARTEN,
  AUFGABENART_REIHENFOLGE,
  DRINGLICHKEITEN,
  DRINGLICHKEIT_REIHENFOLGE,
  faelligkeit,
  fristText,
  sortiereOffen,
  type Aufgabe,
  type Aufgabenart,
  type AufgabenEntwurf,
  type Dringlichkeit,
  type Faelligkeit,
} from "../lib/aufgaben";
import { useAufgaben } from "../lib/aufgabenStore";
import { useObjekte } from "../lib/objekteStore";
import { f, type Objekt } from "../lib/objekte";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/aufgaben")({ component: AufgabenSeite });

/**
 * Wohin ein Objekt führt. Gekaufte Objekte liegen in den Projekten, alle
 * anderen im Ankauf — die Stufe entscheidet, nicht die Aufgabe.
 */
function objektZiel(o: Objekt) {
  return {
    to: o.stufe === "angekauft" ? ("/projekte" as const) : ("/ankauf" as const),
    search: { objekt: o.id },
  };
}

/** Reihenfolge und Beschriftung der Blöcke. Oben, was drängt. */
const GRUPPEN: { schluessel: Faelligkeit; titel: string; ton: "warnung" | "jetzt" | "ruhig" }[] = [
  { schluessel: "ueberfaellig", titel: "Überfällig", ton: "warnung" },
  { schluessel: "heute", titel: "Heute", ton: "jetzt" },
  { schluessel: "bald", titel: "Diese Woche", ton: "ruhig" },
  { schluessel: "spaeter", titel: "Später", ton: "ruhig" },
  { schluessel: "ohne", titel: "Ohne Frist", ton: "ruhig" },
];

function AufgabenSeite() {
  const { aufgaben, bereit } = useAufgaben();
  const { objekte } = useObjekte();
  const [objektFilter, setObjektFilter] = useState("");
  const [artFilter, setArtFilter] = useState<"" | Aufgabenart>("");
  const [anlegen, setAnlegen] = useState(false);
  const [erledigteOffen, setErledigteOffen] = useState(false);

  const gefiltert = useMemo(
    () =>
      aufgaben.filter((a) => {
        if (objektFilter && a.objektId !== objektFilter) return false;
        if (artFilter && a.art !== artFilter) return false;
        return true;
      }),
    [aufgaben, objektFilter, artFilter],
  );

  const offen = useMemo(
    () => gefiltert.filter((a) => !a.erledigtAm).sort(sortiereOffen),
    [gefiltert],
  );

  const erledigt = useMemo(
    () =>
      gefiltert
        .filter((a) => a.erledigtAm)
        .sort((a, b) => b.erledigtAm!.localeCompare(a.erledigtAm!)),
    [gefiltert],
  );

  const bloecke = GRUPPEN.map((g) => ({
    ...g,
    aufgaben: offen.filter((a) => faelligkeit(a) === g.schluessel),
  })).filter((g) => g.aufgaben.length > 0);

  return (
    <>
      <Seitenkopf
        label="Was als Nächstes dran ist"
        titel="Aufgaben"
        beschreibung="Jede Aufgabe hängt an einem Objekt, damit beim Anruf der Zusammenhang schon da ist. Überfälliges steht oben — nicht das Wichtigste, sondern das, was blockiert."
        aktion={
          <button
            type="button"
            onClick={() => setAnlegen(true)}
            className="druckbar flex items-center gap-2 rounded-full bg-tinte px-5 py-3 text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte"
          >
            <Plus size={14} strokeWidth={2.25} />
            Aufgabe anlegen
          </button>
        }
      />

      <Kennzahlen aufgaben={aufgaben} />

      {/* ----- Filter ----- */}
      <div className="sticky top-0 z-20 border-b border-linie bg-grund/95 backdrop-blur-sm">
        <div className="scroll-reihe flex items-center gap-2 overflow-x-auto px-6 py-3 md:px-10">
          <select
            value={objektFilter}
            onChange={(e) => setObjektFilter(e.target.value)}
            aria-label="Nach Objekt filtern"
            className="shrink-0 rounded-full border border-linie bg-flaeche px-3.5 py-1.5 text-[0.68rem] text-grau-stark focus:border-linie-stark focus:outline-none"
          >
            <option value="">Alle Objekte</option>
            {objekte.map((o) => (
              <option key={o.id} value={o.id}>
                {o.strasse}
              </option>
            ))}
          </select>

          <span aria-hidden className="my-1 w-px shrink-0 bg-linie" />

          {AUFGABENART_REIHENFOLGE.map((art) => {
            const an = artFilter === art;
            return (
              <button
                key={art}
                type="button"
                onClick={() => setArtFilter(an ? "" : art)}
                aria-pressed={an}
                className={cn(
                  "druckbar shrink-0 rounded-full border px-3.5 py-1.5 text-[0.68rem] whitespace-nowrap",
                  an ? "border-tinte bg-tinte text-grund" : "border-linie bg-flaeche text-grau-stark",
                )}
              >
                {AUFGABENARTEN[art]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ----- Blöcke ----- */}
      {!bereit ? (
        <div className="h-48" />
      ) : offen.length === 0 ? (
        <p className="px-6 py-20 text-center text-[0.85rem] text-grau md:px-10">
          {aufgaben.some((a) => !a.erledigtAm)
            ? "Keine offene Aufgabe passt zu diesen Filtern."
            : "Nichts offen. Alles abgehakt."}
        </p>
      ) : (
        <div className="px-6 py-6 md:px-10">
          {bloecke.map((g, bi) => (
            <section key={g.schluessel} className={cn(bi > 0 && "mt-9")}>
              <div className="flex items-baseline gap-3">
                <h2
                  className={cn(
                    "text-[0.72rem] font-semibold tracking-[0.18em] uppercase",
                    g.ton === "warnung"
                      ? "text-[#8A2822]"
                      : g.ton === "jetzt"
                        ? "text-tinte"
                        : "text-grau",
                  )}
                >
                  {g.titel}
                </h2>
                <span className="zahl text-[0.68rem] text-grau">{g.aufgaben.length}</span>
                <span aria-hidden className="h-px flex-1 bg-linie" />
              </div>

              <ul className="mt-3 space-y-2">
                {g.aufgaben.map((a, i) => (
                  <Aufgabenzeile
                    key={a.id}
                    aufgabe={a}
                    objekt={objekte.find((o) => o.id === a.objektId) ?? null}
                    verzoegerung={Math.min(bi * 2 + i, 8) * 28}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* ----- Erledigt ----- */}
      {bereit && erledigt.length > 0 && (
        <section className="border-t border-linie px-6 py-5 md:px-10">
          <button
            type="button"
            onClick={() => setErledigteOffen((o) => !o)}
            aria-expanded={erledigteOffen}
            className="druckbar flex items-center gap-2 text-[0.7rem] font-medium tracking-[0.14em] uppercase text-grau"
          >
            <ChevronDown
              size={13}
              strokeWidth={2}
              className={cn(
                "transition-transform duration-200 ease-out-stark",
                erledigteOffen && "rotate-180",
              )}
            />
            Erledigt
            <span className="zahl">{erledigt.length}</span>
          </button>

          {erledigteOffen && (
            <ul className="mt-4 space-y-2">
              {erledigt.map((a) => (
                <Aufgabenzeile
                  key={a.id}
                  aufgabe={a}
                  objekt={objekte.find((o) => o.id === a.objektId) ?? null}
                  verzoegerung={0}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      <Schublade offen={anlegen} schliessen={() => setAnlegen(false)} titel="Aufgabe anlegen">
        <AufgabenFormular onFertig={() => setAnlegen(false)} onAbbrechen={() => setAnlegen(false)} />
      </Schublade>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Kennzahlen                                                           */
/* ------------------------------------------------------------------ */

function Kennzahlen({ aufgaben }: { aufgaben: Aufgabe[] }) {
  const z = useMemo(() => {
    const offen = aufgaben.filter((a) => !a.erledigtAm);
    const ueberfaellig = offen.filter((a) => faelligkeit(a) === "ueberfaellig");
    const heute = offen.filter((a) => faelligkeit(a) === "heute");
    const woche = offen.filter((a) => ["ueberfaellig", "heute", "bald"].includes(faelligkeit(a)));
    // Innerhalb der letzten sieben Tage abgehakt — das Gegengewicht zur
    // Liste der offenen Punkte.
    const grenze = Date.now() - 7 * 86_400_000;
    const geschafft = aufgaben.filter(
      (a) => a.erledigtAm && new Date(a.erledigtAm).getTime() >= grenze,
    );
    return {
      offen: offen.length,
      ueberfaellig: ueberfaellig.length,
      heute: heute.length,
      woche: woche.length,
      geschafft: geschafft.length,
    };
  }, [aufgaben]);

  return (
    <dl className="grid grid-cols-2 gap-3 px-6 py-5 md:px-10 lg:grid-cols-4">
      {[
        {
          titel: "Überfällig",
          wert: String(z.ueberfaellig),
          unten: z.ueberfaellig === 0 ? "nichts liegen geblieben" : "blockiert den Rest",
          warnung: z.ueberfaellig > 0,
        },
        {
          titel: "Heute fällig",
          wert: String(z.heute),
          unten: z.heute === 0 ? "heute frei" : "bis Feierabend",
        },
        { titel: "Diese Woche", wert: String(z.woche), unten: "inklusive überfällig" },
        {
          titel: "Offen gesamt",
          wert: String(z.offen),
          unten: `${z.geschafft} in sieben Tagen erledigt`,
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
/* Zeile                                                                */
/* ------------------------------------------------------------------ */

/**
 * Eine Zeile, kein Kärtchen. Aufgaben liest man im Stapel — ein Raster aus
 * Karten würde pro Eintrag dreimal so viel Höhe brauchen und die Liste
 * unlesbar machen.
 */
function Aufgabenzeile({
  aufgabe: a,
  objekt,
  verzoegerung,
}: {
  aufgabe: Aufgabe;
  objekt: Objekt | null;
  verzoegerung: number;
}) {
  const { umschalten, loeschen } = useAufgaben();
  const [offen, setOffen] = useState(false);
  const erledigt = a.erledigtAm !== null;
  const d = DRINGLICHKEITEN[a.dringlichkeit];
  const ueberfaellig = !erledigt && faelligkeit(a) === "ueberfaellig";

  return (
    <li
      className={cn(
        "eintritt rounded-xl border bg-flaeche",
        ueberfaellig ? "border-[#E3BDB9]" : "border-linie",
        erledigt && "opacity-55",
      )}
      style={{ animationDelay: `${verzoegerung}ms` }}
    >
      <div className="flex items-start gap-3 p-3.5">
        {/* Der Haken sitzt links und ist 36px groß — er wird am häufigsten
            getroffen und darf auf dem Handy nicht danebengehen. */}
        <button
          type="button"
          onClick={() => umschalten(a.id)}
          aria-label={erledigt ? "Wieder öffnen" : "Als erledigt markieren"}
          aria-pressed={erledigt}
          className={cn(
            "druckbar mt-px flex size-[22px] shrink-0 items-center justify-center rounded-full border",
            erledigt ? "border-tinte bg-tinte text-grund" : "border-linie-stark text-transparent hover:border-tinte",
          )}
        >
          <Check size={12} strokeWidth={3} />
        </button>

        <button
          type="button"
          onClick={() => setOffen((o) => !o)}
          aria-expanded={offen}
          className="min-w-0 flex-1 text-left"
        >
          <div
            className={cn(
              "truncate text-[0.88rem] leading-snug font-medium",
              erledigt ? "text-grau line-through" : "text-tinte",
            )}
          >
            {a.titel}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.66rem] text-grau">
            {!erledigt && (
              <span
                className="zahl font-medium"
                style={{ color: ueberfaellig ? "#8A2822" : undefined }}
              >
                {fristText(a.faelligAm)}
              </span>
            )}
            {erledigt && <span className="zahl">erledigt {f.datum(a.erledigtAm!)}</span>}
            <span aria-hidden className="size-[3px] rounded-full bg-linie-stark" />
            <span>{AUFGABENARTEN[a.art]}</span>
            {a.dringlichkeit !== "normal" && !erledigt && (
              <>
                <span aria-hidden className="size-[3px] rounded-full bg-linie-stark" />
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-[6px] rounded-full"
                    style={{ background: d.farbe }}
                  />
                  {d.titel}
                </span>
              </>
            )}
          </div>
        </button>

        {objekt && (
          <Link
            {...objektZiel(objekt)}
            className="druckbar hidden max-w-[11rem] shrink-0 truncate rounded-full border border-linie px-3 py-1.5 text-[0.64rem] text-grau-stark hover:border-linie-stark hover:text-tinte sm:block"
          >
            {objekt.strasse}
          </Link>
        )}
      </div>

      {offen && (
        <div className="border-t border-linie px-3.5 py-3 pl-[2.9rem]">
          <p className="text-[0.78rem] leading-relaxed text-grau-stark">
            {a.beschreibung ?? "Keine weitere Beschreibung."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[0.64rem] text-grau">
            {objekt && (
              <Link
                {...objektZiel(objekt)}
                className="underline decoration-linie-stark underline-offset-2 hover:text-tinte sm:hidden"
              >
                {objekt.strasse}, {objekt.stadt}
              </Link>
            )}
            <span className="zahl">angelegt {f.datum(a.angelegtAm)}</span>
            <button
              type="button"
              onClick={() => loeschen(a.id)}
              className="druckbar ml-auto flex items-center gap-1.5 text-grau hover:text-[#8A2822]"
            >
              <Trash2 size={12} strokeWidth={2} />
              Löschen
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Anlegen                                                              */
/* ------------------------------------------------------------------ */

function AufgabenFormular({
  onFertig,
  onAbbrechen,
}: {
  onFertig: () => void;
  onAbbrechen: () => void;
}) {
  const { anlegen } = useAufgaben();
  const { objekte } = useObjekte();

  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [objektId, setObjektId] = useState("");
  const [art, setArt] = useState<Aufgabenart>("anruf");
  const [dringlichkeit, setDringlichkeit] = useState<Dringlichkeit>("normal");
  // Vorbelegt auf morgen: eine Aufgabe ohne Frist wird selten erledigt, und
  // „heute“ ist beim Anlegen fast immer gelogen.
  const [faelligAm, setFaelligAm] = useState(() =>
    new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  );
  const [fehler, setFehler] = useState<Record<string, string>>({});

  function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!titel.trim()) {
      setFehler({ titel: "Titel fehlt." });
      return;
    }

    const entwurf: AufgabenEntwurf = {
      titel: titel.trim(),
      beschreibung: beschreibung.trim() || null,
      objektId: objektId || null,
      art,
      dringlichkeit,
      faelligAm: faelligAm === "" ? null : new Date(faelligAm).toISOString(),
    };

    anlegen(entwurf);
    onFertig();
  }

  return (
    <form onSubmit={absenden} className="pb-20">
      <Bereich
        titel="Aufgabe"
        hinweis="Ein Satz, der sagt, was zu tun ist. „Verwalter anrufen“ ist besser als „Traminerweg“."
      >
        <Textfeld
          id="titel"
          label="Titel"
          wert={titel}
          setWert={setTitel}
          platzhalter="Teilungserklärung anfordern"
          pflicht
          fehler={fehler.titel}
          breit
        />
        <Textfeld
          id="beschreibung"
          label="Beschreibung"
          wert={beschreibung}
          setWert={setBeschreibung}
          zeilen={3}
          platzhalter="Was dazu zu wissen ist."
          breit
        />
      </Bereich>

      <Bereich titel="Zuordnung">
        <Auswahlfeld
          id="objekt"
          label="Objekt"
          wert={objektId}
          setWert={setObjektId}
          leerText="Ohne Objektbezug"
          optionen={objekte.map((o) => ({ wert: o.id, titel: `${o.strasse}, ${o.stadt}` }))}
          breit
          hinweis="Hängt die Aufgabe an einem Objekt, kommt man von hier aus direkt hinein."
        />
        <Auswahlfeld
          id="art"
          label="Art"
          wert={art}
          setWert={setArt}
          optionen={AUFGABENART_REIHENFOLGE.map((x) => ({ wert: x, titel: AUFGABENARTEN[x] }))}
        />
        <div>
          <label htmlFor="faellig" className="mini-label block">
            Fällig am
          </label>
          <input
            id="faellig"
            type="date"
            value={faelligAm}
            onChange={(e) => setFaelligAm(e.target.value)}
            className="mt-2 w-full border border-linie bg-flaeche px-3 py-2.5 text-[0.82rem] text-tinte focus:border-linie-stark focus:outline-none"
          />
          <p className="mt-1.5 text-[0.66rem] text-grau">
            Leer lassen heißt „irgendwann“ — die Aufgabe landet dann hinten.
          </p>
        </div>
        <Segmente
          label="Dringlichkeit"
          wert={dringlichkeit}
          setWert={setDringlichkeit}
          optionen={DRINGLICHKEIT_REIHENFOLGE.map((x) => ({
            wert: x,
            titel: DRINGLICHKEITEN[x].titel,
          }))}
          breit
          hinweis="Entscheidet nur die Reihenfolge innerhalb eines Tages — die Frist zählt zuerst."
        />
      </Bereich>

      <div className="sticky bottom-0 flex gap-3 border-t border-linie bg-grund/95 px-5 py-4 backdrop-blur-sm md:px-7">
        <button
          type="submit"
          className="druckbar flex-1 rounded-full bg-tinte px-5 py-3 text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte"
        >
          Aufgabe anlegen
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
