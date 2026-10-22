/**
 * Die Objektliste — einmal gebaut, zweimal gezeigt.
 *
 * „Ankauf“ und „Projekte“ sind keine zwei Bestände, sondern zwei Sichten auf
 * denselben. Getrennt werden sie allein durch die Stufe: alles vor dem Kauf
 * steht im Ankauf, alles danach in den Projekten. Ein Objekt wandert von
 * selbst hinüber, sobald die Stufe auf „Angekauft“ springt — niemand muss es
 * umziehen, und es kann nicht an zwei Orten gleichzeitig stehen.
 *
 * Die Karte bleibt davon unberührt. Sie liest den ganzen Bestand, weil die
 * Frage „was liegt hier?“ nichts mit der Frage „kaufen wir das?“ zu tun hat.
 *
 * Was sich zwischen beiden Sichten unterscheidet, steht in BEREICHE: die
 * Sortierung und die Stufen im Filter. Der Rest ist identisch, damit man sich
 * beim Wechsel nicht neu orientieren muss.
 *
 * Summen stehen hier bewusst nicht. Wer eine Liste öffnet, will Objekte sehen
 * und nicht erst vier Kacheln wegscrollen; die Zahlen zum Bestand stehen in
 * der Auswertung.
 */
import { Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Schublade, Seitenkopf } from "./AppLayout";
import type { NeuesDokument } from "./Dokumente";
import { ObjektDetail, ObjektKachel } from "./ObjektDetail";
import { ObjektFormular } from "./ObjektFormular";
import {
  STUFEN,
  STUFEN_REIHENFOLGE,
  berechneKennzahlen,
  kontakteAlsText,
  type Ankaufsstufe,
} from "../lib/objekte";
import { useObjekte, type ObjektEntwurf } from "../lib/objekteStore";
import { cn } from "../lib/utils";

export type Bereich = "ankauf" | "projekte";

const SORTIERUNGEN = {
  neu: "Zuletzt angelegt",
  preis: "Kaufpreis",
  faktor: "Faktor",
  rendite: "Rendite",
  stufe: "Ankaufsstufe",
  einheiten: "Einheiten",
} as const;

type Sortierung = keyof typeof SORTIERUNGEN;

interface Bereichsangaben {
  label: string;
  titel: string;
  /** Welche Stufen gehören hierher. */
  stufen: Ankaufsstufe[];
  sortierungen: Sortierung[];
  standardSortierung: Sortierung;
  /** Stufenfilter nur dort, wo es mehr als eine Stufe zu filtern gibt. */
  stufenfilter: boolean;
  leer: string;
}

const VOR_DEM_KAUF = STUFEN_REIHENFOLGE.filter((s) => s !== "angekauft");

const BEREICHE: Record<Bereich, Bereichsangaben> = {
  ankauf: {
    label: "Prüfen und entscheiden",
    titel: "Ankauf",
    stufen: VOR_DEM_KAUF,
    sortierungen: ["neu", "stufe", "preis", "faktor", "rendite"],
    standardSortierung: "neu",
    stufenfilter: true,
    leer: "Noch kein Objekt in Prüfung.",
  },
  projekte: {
    label: "Gekauft und in Arbeit",
    titel: "Projekte",
    stufen: ["angekauft"],
    sortierungen: ["neu", "preis", "einheiten", "rendite"],
    standardSortierung: "neu",
    stufenfilter: false,
    leer: "Noch kein Objekt angekauft.",
  },
};

type Modus =
  | { art: "zu" }
  | { art: "detail"; id: string }
  | { art: "bearbeiten"; id: string }
  | { art: "anlegen" };

export function Objektliste({ bereich, oeffne }: { bereich: Bereich; oeffne?: string }) {
  const b = BEREICHE[bereich];
  const { objekte, bereit, anlegen, aendern, dokumenteAnhaengen } = useObjekte();

  const [suche, setSuche] = useState("");
  const [stufen, setStufen] = useState<Set<Ankaufsstufe>>(new Set());
  const [stadt, setStadt] = useState<"" | "Ulm" | "Neu-Ulm">("");
  const [sortierung, setSortierung] = useState<Sortierung>(b.standardSortierung);
  // Kommt eine Objekt-ID aus der Adresse — etwa aus einer Aufgabe —, öffnet
  // sich das Detail sofort. Danach ist es normaler Zustand: Zumachen soll
  // nicht die Adresse umschreiben müssen.
  const [modus, setModus] = useState<Modus>(() =>
    oeffne ? { art: "detail", id: oeffne } : { art: "zu" },
  );

  // Der Bestand dieses Bereichs. Alles Weitere — Suche, Stadt, Stufe — filtert
  // nur noch darin, damit die Zahl unter der Liste eine ehrliche Bezugsgröße hat.
  const bestand = useMemo(
    () => objekte.filter((o) => b.stufen.includes(o.stufe)),
    [objekte, b.stufen],
  );

  const gewaehlt =
    modus.art === "detail" || modus.art === "bearbeiten"
      ? (objekte.find((o) => o.id === modus.id) ?? null)
      : null;

  const liste = useMemo(() => {
    const begriff = suche.trim().toLowerCase();
    const gefiltert = bestand.filter((o) => {
      if (stufen.size > 0 && !stufen.has(o.stufe)) return false;
      if (stadt && o.stadt !== stadt) return false;
      if (!begriff) return true;
      // Auch über die Kontakte: „Keller“ findet das Objekt, von dem man nur
      // noch weiß, dass der Makler so hieß.
      return [o.strasse, o.stadtteil, o.stadt, o.plz, o.quelle ?? "", kontakteAlsText(o)]
        .join(" ")
        .toLowerCase()
        .includes(begriff);
    });

    const nach = [...gefiltert];
    nach.sort((a, c) => {
      switch (sortierung) {
        case "preis":
          return (c.kaufpreis ?? 0) - (a.kaufpreis ?? 0);
        case "faktor":
          return (berechneKennzahlen(a).faktor ?? 99) - (berechneKennzahlen(c).faktor ?? 99);
        case "rendite":
          return (
            (berechneKennzahlen(c).bruttoMietrendite ?? 0) -
            (berechneKennzahlen(a).bruttoMietrendite ?? 0)
          );
        case "einheiten":
          return (c.einheiten.length || (c.anzahlEinheiten ?? 0)) -
            (a.einheiten.length || (a.anzahlEinheiten ?? 0));
        case "stufe":
          return STUFEN_REIHENFOLGE.indexOf(c.stufe) - STUFEN_REIHENFOLGE.indexOf(a.stufe);
        default:
          return c.angelegtAm.localeCompare(a.angelegtAm);
      }
    });
    return nach;
  }, [bestand, suche, stufen, stadt, sortierung]);

  function speichern(entwurf: ObjektEntwurf, dokumente: NeuesDokument[]) {
    if (modus.art === "bearbeiten") {
      aendern(modus.id, entwurf, "Objektdaten bearbeitet");
      if (dokumente.length > 0) dokumenteAnhaengen(modus.id, dokumente);
      setModus({ art: "detail", id: modus.id });
      return;
    }
    const neu = anlegen(entwurf);
    if (dokumente.length > 0) dokumenteAnhaengen(neu.id, dokumente);
    setModus({ art: "detail", id: neu.id });
  }

  function stufeUmschalten(s: Ankaufsstufe) {
    setStufen((alt) => {
      const neu = new Set(alt);
      if (neu.has(s)) neu.delete(s);
      else neu.add(s);
      return neu;
    });
  }

  const gefiltert = stufen.size > 0 || stadt !== "" || suche.trim() !== "";

  return (
    <>
      <Seitenkopf
        label={b.label}
        titel={b.titel}
        aktion={
          // Angelegt wird im Ankauf. Ein Objekt entsteht nicht als Projekt —
          // es wird eines, wenn der Kauf durch ist.
          bereich === "ankauf" ? (
            <button
              type="button"
              onClick={() => setModus({ art: "anlegen" })}
              className="druckbar flex items-center gap-2 rounded-full bg-tinte px-5 py-3 text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-grund shadow-karte"
            >
              <Plus size={14} strokeWidth={2.25} />
              Objekt anlegen
            </button>
          ) : undefined
        }
      />

      {/* ----- Filterleiste ----- */}
      <div className="sticky top-0 z-20 border-b border-linie bg-grund/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-6 py-3 md:gap-3 md:px-10">
          <label className="relative min-w-0 flex-1">
            <Search
              size={14}
              strokeWidth={1.75}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-grau"
            />
            <input
              type="search"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder="Straße, Stadtteil, Eigentümer, Quelle"
              aria-label="Objekte durchsuchen"
              className="w-full rounded-full border border-linie bg-flaeche py-2.5 pr-4 pl-9 text-[0.8rem] text-tinte placeholder:text-grau focus:border-linie-stark focus:outline-none"
            />
          </label>

          <select
            value={sortierung}
            onChange={(e) => setSortierung(e.target.value as Sortierung)}
            aria-label="Sortierung"
            className="shrink-0 border border-linie bg-flaeche px-3.5 py-2.5 text-[0.76rem] text-tinte focus:border-linie-stark focus:outline-none"
          >
            {b.sortierungen.map((s) => (
              <option key={s} value={s}>
                {SORTIERUNGEN[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Stadt und Stufe teilen sich eine Reihe. Auf dem Telefon schiebt sie
            sich seitwärts, statt in drei Zeilen die halbe Höhe zu fressen. */}
        <div className="scroll-reihe flex gap-2 overflow-x-auto px-6 pb-3 md:flex-wrap md:px-10">
          <div className="flex shrink-0 gap-1 rounded-full border border-linie bg-flaeche-hoch p-1">
            {(["", "Ulm", "Neu-Ulm"] as const).map((s) => (
              <button
                key={s || "alle"}
                type="button"
                onClick={() => setStadt(s)}
                aria-pressed={stadt === s}
                className={cn(
                  "druckbar rounded-full px-3 py-1 text-[0.68rem] whitespace-nowrap",
                  stadt === s ? "bg-tinte text-grund shadow-karte" : "text-grau-stark",
                )}
              >
                {s || "Beide"}
              </button>
            ))}
          </div>

          {b.stufenfilter && (
            <>
              <span aria-hidden className="my-1 w-px shrink-0 bg-linie" />

              {b.stufen.map((s) => {
                const aktiv = stufen.has(s);
                const anzahl = bestand.filter((o) => o.stufe === s).length;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => stufeUmschalten(s)}
                    aria-pressed={aktiv}
                    className={cn(
                      "druckbar flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[0.68rem] whitespace-nowrap",
                      aktiv
                        ? "border-tinte bg-tinte text-grund"
                        : "border-linie bg-flaeche text-grau-stark",
                    )}
                  >
                    <span
                      aria-hidden
                      className="size-[7px] shrink-0 rounded-full"
                      style={{ background: aktiv ? "#ffffff" : STUFEN[s].farbe }}
                    />
                    {STUFEN[s].titel}
                    <span className="zahl text-[0.6rem] opacity-60">{anzahl}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ----- Liste ----- */}
      {!bereit ? (
        <div className="h-48" />
      ) : liste.length === 0 ? (
        <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
          <p className="text-[0.85rem] text-grau">
            {gefiltert ? "Kein Objekt passt zu diesen Filtern." : b.leer}
          </p>
          {gefiltert && (
            <button
              type="button"
              onClick={() => {
                setSuche("");
                setStufen(new Set());
                setStadt("");
              }}
              className="druckbar flex items-center gap-2 rounded-full border border-linie-stark px-4 py-2 text-[0.66rem] tracking-[0.14em] uppercase text-tinte"
            >
              <X size={12} strokeWidth={2} />
              Filter zurücksetzen
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Auf dem Telefon eine Kachel pro Reihe: Straßenname, Preis und
              Frist müssen vollständig lesbar bleiben, nicht nur angedeutet. */}
          <ul className="grid grid-cols-1 gap-3 px-6 py-6 sm:grid-cols-2 md:gap-4 md:px-10 lg:grid-cols-3 xl:grid-cols-4">
            {liste.map((o, i) => (
              <ObjektKachel
                key={o.id}
                objekt={o}
                beiKlick={() => setModus({ art: "detail", id: o.id })}
                verzoegerung={Math.min(i, 10) * 24}
              />
            ))}
          </ul>
          <p className="border-t border-linie px-6 py-5 text-[0.68rem] text-grau md:px-10">
            {liste.length} {liste.length === 1 ? "Objekt" : "Objekte"}
            {gefiltert && ` von ${bestand.length}`}
          </p>
        </>
      )}

      <Schublade
        offen={modus.art !== "zu"}
        schliessen={() => setModus({ art: "zu" })}
        titel={
          modus.art === "anlegen"
            ? "Objekt anlegen"
            : modus.art === "bearbeiten"
              ? "Objekt bearbeiten"
              : (gewaehlt?.strasse ?? "Objekt")
        }
      >
        {modus.art === "anlegen" && (
          <ObjektFormular onSpeichern={speichern} onAbbrechen={() => setModus({ art: "zu" })} />
        )}
        {modus.art === "bearbeiten" && gewaehlt && (
          <ObjektFormular
            bestehend={gewaehlt}
            onSpeichern={speichern}
            onAbbrechen={() => setModus({ art: "detail", id: gewaehlt.id })}
          />
        )}
        {modus.art === "detail" && gewaehlt && (
          <ObjektDetail
            objekt={gewaehlt}
            onBearbeiten={() => setModus({ art: "bearbeiten", id: gewaehlt.id })}
          />
        )}
      </Schublade>
    </>
  );
}

