/**
 * Cockpit · Reiter Persönlich · Visionboard (Ausbau 4, P3). Nur die
 * Geschäftsführung sieht ihn. Tagesfokus, „Mein Warum“, täglicher Impuls,
 * Visionboard, Ziele des Jahres und Ideen. Keine Beispielinhalte.
 */
import { ArrowLeft, ArrowRight, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { useAufgaben } from "../lib/aufgabenStore";
import { kennzahlen, tagIso } from "../lib/cockpit";
import { useCockpit } from "../lib/cockpitStore";
import { useEingang } from "../lib/eingangStore";
import { useEinstellungen } from "../lib/einstellungenStore";
import { f } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import {
  STARTKATEGORIEN,
  flaecheFuer,
  fokusSerie,
  impulsFuer,
  wochenstand,
  type Kachel,
} from "../lib/persoenlich";
import { usePersoenlich } from "../lib/persoenlichStore";
import { cn } from "../lib/utils";

const feld =
  "h-9 w-full min-w-0 rounded-lg border border-linie bg-flaeche px-3 text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none";

function Karte({
  titel,
  zusatz,
  aktion,
  children,
  className,
}: {
  titel: string;
  zusatz?: ReactNode;
  aktion?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("min-w-0 rounded-2xl border border-linie bg-flaeche shadow-karte", className)}
    >
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

/** Ankäufe und Gewinn im laufenden Jahr — dieselben Zahlen wie die Kennzahlen im Alltag. */
function useJahresziele() {
  const { objekte } = useObjekte();
  const { eingaenge } = useEingang();
  const { vorgaben, ziele } = useEinstellungen();
  return useMemo(() => {
    const k = kennzahlen(objekte, eingaenge, vorgaben, ziele);
    return { ankaeufe: k[3], gewinn: k[4] };
  }, [objekte, eingaenge, vorgaben, ziele]);
}

export function CockpitPersoenlich() {
  const { speicherFehler } = usePersoenlich();
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <HeuteZaehlt />
        <Impuls />
      </div>
      <Visionboard />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Ziele />
        <Ideen />
      </div>
      <p className="text-[0.68rem] text-grau">
        Persönliche Daten liegen nur in diesem Browser.
        {speicherFehler && (
          <span className="ml-1 font-semibold text-[#9A2727]">
            Der Browserspeicher ist voll — die letzte Änderung (meist ein Bild) ist nicht gesichert.
            Ein Bild entfernen oder kleiner wählen.
          </span>
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Heute zählt                                                          */
/* ------------------------------------------------------------------ */

function HeuteZaehlt() {
  const { fokus, fokusSetzen, warum, warumSetzen } = usePersoenlich();
  const { aufgaben } = useAufgaben();
  const { sprintpunkte } = useCockpit();
  const { ankaeufe } = useJahresziele();
  const heute = new Date();
  const text = fokus[tagIso(heute)] ?? "";
  const serie = fokusSerie(fokus, heute);
  const woche = wochenstand(aufgaben, sprintpunkte, heute);

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-tinte bg-tinte p-5 text-grund shadow-karte md:p-6">
      <span className="text-[0.72rem] font-semibold tracking-[0.18em] text-[#A9B0BB] uppercase">
        Heute zählt
      </span>
      <input
        value={text}
        onChange={(e) => fokusSetzen(e.target.value)}
        placeholder="Die eine Sache, die heute zählt …"
        aria-label="Tagesfokus"
        className="h-12 w-full rounded-xl border border-[#2C333E] bg-[#1D222B] px-4 text-[1.05rem] font-semibold text-grund placeholder:text-[#7D8592] focus:border-[#4A5260] focus:outline-none"
      />
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[0.78rem] text-[#C9CED6]">
        <span>
          Fokus gesetzt:{" "}
          <strong className="zahl text-grund">
            {serie} {serie === 1 ? "Tag" : "Tage"} in Folge
          </strong>
        </span>
        <span>
          Ankäufe {heute.getFullYear()}:{" "}
          <strong className="zahl text-grund">
            {ankaeufe.ist}
            {ankaeufe.ziel !== null ? ` von ${ankaeufe.ziel}` : ""}
          </strong>
          {ankaeufe.ziel !== null && ankaeufe.ziel > ankaeufe.ist
            ? `, noch ${ankaeufe.ziel - ankaeufe.ist}`
            : ""}
        </span>
        <span>
          Woche:{" "}
          <strong className="zahl text-grund">
            {woche.gesamt
              ? `${woche.erledigt} von ${woche.gesamt} Sprint-Punkten`
              : "noch nichts geplant"}
          </strong>
        </span>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-[#2C333E] pt-3">
        <span className="text-[0.66rem] font-semibold tracking-[0.18em] text-[#A9B0BB] uppercase">
          Mein Warum
        </span>
        <input
          value={warum}
          onChange={(e) => warumSetzen(e.target.value)}
          placeholder="Dein Warum in einem Satz"
          aria-label="Mein Warum"
          className="h-9 w-full rounded-lg border border-[#2C333E] bg-transparent px-3 text-[0.82rem] text-grund placeholder:text-[#7D8592] focus:border-[#4A5260] focus:outline-none"
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Täglicher Impuls                                                     */
/* ------------------------------------------------------------------ */

function Impuls() {
  const { board, impuls, impulsWeiter } = usePersoenlich();
  const kachel = impulsFuer(board, impuls);
  const mehrere = board.filter((k) => k.satz.trim() || k.bild).length > 1;

  return (
    <Karte
      titel="Dein Board erinnert dich heute an"
      aktion={
        mehrere && (
          <button
            type="button"
            onClick={impulsWeiter}
            className="druckbar rounded-full border border-linie px-3 py-1 text-[0.64rem] font-semibold text-grau-stark hover:border-tinte hover:text-tinte"
          >
            nächste
          </button>
        )
      }
      className="flex flex-col"
    >
      <div className="flex flex-1 px-5 pb-5 md:px-6">
        {kachel ? (
          <KachelFlaeche kachel={kachel} gross />
        ) : (
          <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-linie-stark px-4 py-8 text-center text-[0.74rem] text-grau">
            Sobald auf dem Board ein Satz oder Bild steht, erscheint hier jeden Tag eine Kachel.
          </p>
        )}
      </div>
    </Karte>
  );
}

function KachelFlaeche({ kachel: k, gross }: { kachel: Kachel; gross?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col justify-between gap-2 overflow-hidden rounded-xl",
        gross ? "min-h-[10rem]" : "min-h-[9.5rem]",
      )}
      style={{ background: flaecheFuer(k.kategorie) }}
    >
      {k.bild && <img src={k.bild} alt="" className="h-28 w-full object-cover" />}
      <div className="flex flex-1 flex-col justify-between gap-2 p-3.5">
        <span className="w-fit rounded-full bg-white/70 px-2 py-0.5 text-[0.6rem] font-semibold text-tinte">
          {k.kategorie || "Ohne Kategorie"}
        </span>
        {k.satz.trim() ? (
          <span
            className={cn(
              "font-display leading-tight font-extrabold tracking-[-0.01em]",
              gross ? "text-[1.2rem]" : "text-[1rem]",
            )}
          >
            {k.satz}
          </span>
        ) : (
          <span className="text-[0.78rem] text-grau">[Bild und Satz einfügen]</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Visionboard                                                          */
/* ------------------------------------------------------------------ */

/** Bild im Browser auf höchstens 800 px verkleinern, als JPEG-data:-URL. */
async function bildVerkleinern(datei: File, maxKante = 800): Promise<string> {
  const url = URL.createObjectURL(datei);
  try {
    const bild = await new Promise<HTMLImageElement>((ok, fehler) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => fehler(new Error("Bild lässt sich nicht lesen."));
      i.src = url;
    });
    const faktor = Math.min(1, maxKante / Math.max(bild.naturalWidth, bild.naturalHeight));
    const leinwand = document.createElement("canvas");
    leinwand.width = Math.round(bild.naturalWidth * faktor);
    leinwand.height = Math.round(bild.naturalHeight * faktor);
    leinwand.getContext("2d")!.drawImage(bild, 0, 0, leinwand.width, leinwand.height);
    return leinwand.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Visionboard() {
  const { board, kachelAnlegen, kachelVerschieben } = usePersoenlich();
  const [bearbeitet, setBearbeitet] = useState<string | null>(null);
  const [gezogen, setGezogen] = useState<string | null>(null);
  const [ueber, setUeber] = useState<string | null>(null);

  return (
    <Karte titel="Visionboard" zusatz="Bilder und Sätze, wächst mit dir">
      <datalist id="board-kategorien">
        {STARTKATEGORIEN.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      <ul className="grid grid-cols-1 gap-3 px-5 pt-1 pb-5 sm:grid-cols-2 md:px-6 lg:grid-cols-3 xl:grid-cols-4">
        {board.map((k) =>
          bearbeitet === k.id ? (
            <li key={k.id}>
              <Kachelformular kachel={k} fertig={() => setBearbeitet(null)} />
            </li>
          ) : (
            <li
              key={k.id}
              draggable
              onDragStart={(e) => {
                setGezogen(k.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (!gezogen || gezogen === k.id) return;
                e.preventDefault();
                setUeber(k.id);
              }}
              onDragLeave={() => setUeber((u) => (u === k.id ? null : u))}
              onDrop={(e) => {
                e.preventDefault();
                if (gezogen) kachelVerschieben(gezogen, k.id);
                setGezogen(null);
                setUeber(null);
              }}
              onDragEnd={() => {
                setGezogen(null);
                setUeber(null);
              }}
              className={cn(
                "group relative cursor-grab rounded-xl transition-opacity duration-150 active:cursor-grabbing",
                gezogen === k.id && "opacity-40",
                ueber === k.id && "ring-2 ring-tinte ring-offset-2",
              )}
            >
              <button
                type="button"
                onClick={() => setBearbeitet(k.id)}
                aria-label={`Kachel ${k.kategorie} bearbeiten`}
                className="block h-full w-full text-left"
              >
                <KachelFlaeche kachel={k} />
              </button>
              <span
                aria-hidden
                className="pointer-events-none absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full bg-white/80 text-grau-stark opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              >
                <Pencil size={12} />
              </span>
            </li>
          ),
        )}
        <li>
          <NeueKachel
            anlegen={(kategorie, satz) => kachelAnlegen({ kategorie, satz, bild: null })}
          />
        </li>
      </ul>
      <p className="border-t border-linie px-5 py-2.5 text-[0.64rem] text-grau md:px-6">
        Kachel anklicken zum Bearbeiten, ziehen zum Sortieren (am Telefon: Pfeile beim Bearbeiten).
      </p>
    </Karte>
  );
}

function NeueKachel({ anlegen }: { anlegen: (kategorie: string, satz: string) => void }) {
  const [kategorie, setKategorie] = useState("");
  const [satz, setSatz] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!satz.trim() && !kategorie.trim()) return;
        anlegen(kategorie.trim(), satz.trim());
        setKategorie("");
        setSatz("");
      }}
      className="flex min-h-[9.5rem] flex-col justify-between gap-2 rounded-xl border-[1.5px] border-dashed border-linie-stark p-3.5"
    >
      <span className="mini-label">Neue Kachel</span>
      <input
        value={kategorie}
        onChange={(e) => setKategorie(e.target.value)}
        list="board-kategorien"
        placeholder="Kategorie"
        aria-label="Kategorie der neuen Kachel"
        className={feld}
      />
      <input
        value={satz}
        onChange={(e) => setSatz(e.target.value)}
        placeholder="Satz oder Ziel"
        aria-label="Satz der neuen Kachel"
        className={feld}
      />
      <button
        type="submit"
        disabled={!satz.trim() && !kategorie.trim()}
        className="druckbar flex w-fit items-center gap-1 rounded-full bg-tinte px-3 py-1.5 text-[0.66rem] font-semibold text-grund disabled:opacity-30"
      >
        <Plus size={12} strokeWidth={2.25} />
        aufs Board
      </button>
    </form>
  );
}

function Kachelformular({ kachel: k, fertig }: { kachel: Kachel; fertig: () => void }) {
  const { board, kachelAendern, kachelEntfernen, kachelSchieben } = usePersoenlich();
  const dateiFeld = useRef<HTMLInputElement>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [arbeitet, setArbeitet] = useState(false);
  const stelle = board.findIndex((x) => x.id === k.id);

  async function bildWaehlen(datei: File | undefined) {
    if (!datei) return;
    if (!datei.type.startsWith("image/")) {
      setFehler("Bitte eine Bilddatei wählen.");
      return;
    }
    setArbeitet(true);
    setFehler(null);
    try {
      kachelAendern(k.id, { bild: await bildVerkleinern(datei) });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Bild lässt sich nicht lesen.");
    } finally {
      setArbeitet(false);
    }
  }

  const knopf =
    "druckbar flex size-8 items-center justify-center rounded-full border border-linie bg-flaeche text-grau-stark hover:text-tinte disabled:opacity-30";

  return (
    <div
      className="flex min-h-[9.5rem] flex-col gap-2 rounded-xl p-3 ring-2 ring-tinte"
      style={{ background: flaecheFuer(k.kategorie) }}
    >
      <input
        value={k.kategorie}
        onChange={(e) => kachelAendern(k.id, { kategorie: e.target.value })}
        list="board-kategorien"
        placeholder="Kategorie"
        aria-label="Kategorie"
        className={feld}
      />
      <textarea
        autoFocus
        rows={2}
        value={k.satz}
        onChange={(e) => kachelAendern(k.id, { satz: e.target.value })}
        placeholder="Satz oder Ziel"
        aria-label="Satz"
        className="w-full resize-y rounded-lg border border-linie bg-flaeche px-3 py-2 text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none"
      />
      {k.bild && (
        <div className="relative">
          <img src={k.bild} alt="" className="h-24 w-full rounded-lg object-cover" />
          <button
            type="button"
            onClick={() => kachelAendern(k.id, { bild: null })}
            aria-label="Bild entfernen"
            className="druckbar absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-white/90 text-grau-stark hover:text-tinte"
          >
            <X size={13} />
          </button>
        </div>
      )}
      <input
        ref={dateiFeld}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void bildWaehlen(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {fehler && <span className="text-[0.64rem] text-[#9A2727]">{fehler}</span>}
      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => dateiFeld.current?.click()}
          disabled={arbeitet}
          aria-label={k.bild ? "Bild ersetzen" : "Bild hinzufügen"}
          title={k.bild ? "Bild ersetzen" : "Bild hinzufügen"}
          className={knopf}
        >
          <ImagePlus size={14} />
        </button>
        <button
          type="button"
          onClick={() => kachelSchieben(k.id, -1)}
          disabled={stelle <= 0}
          aria-label="Nach vorn"
          className={knopf}
        >
          <ArrowLeft size={14} />
        </button>
        <button
          type="button"
          onClick={() => kachelSchieben(k.id, 1)}
          disabled={stelle >= board.length - 1}
          aria-label="Nach hinten"
          className={knopf}
        >
          <ArrowRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => {
            kachelEntfernen(k.id);
            fertig();
          }}
          aria-label="Kachel entfernen"
          title="Kachel entfernen"
          className={cn(knopf, "hover:text-[#9A2727]")}
        >
          <Trash2 size={13} />
        </button>
        <button
          type="button"
          onClick={fertig}
          className="druckbar ml-auto rounded-full bg-tinte px-3.5 py-1.5 text-[0.66rem] font-semibold text-grund"
        >
          Fertig
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ziele                                                                */
/* ------------------------------------------------------------------ */

function Quartale({ werte, umschalten }: { werte: boolean[]; umschalten: (q: number) => void }) {
  return (
    <span className="flex gap-1">
      {werte.map((an, q) => (
        <button
          key={q}
          type="button"
          aria-pressed={an}
          onClick={() => umschalten(q)}
          className={cn(
            "druckbar rounded-full px-2 py-0.5 text-[0.6rem] font-semibold",
            an ? "bg-[#DBF2E6] text-[#0C5E3A]" : "bg-flaeche-hoch text-grau",
          )}
        >
          Q{q + 1}
        </button>
      ))}
    </span>
  );
}

function Fortschritt({ anteil }: { anteil: number }) {
  return (
    <span className="block h-1.5 overflow-hidden rounded-full bg-flaeche-aktiv">
      <span
        className="block h-full rounded-full bg-[#17935C]"
        style={{ width: `${Math.min(100, Math.max(0, anteil * 100))}%` }}
      />
    </span>
  );
}

function Ziele() {
  const {
    geschaeftQuartale,
    geschaeftQuartalUmschalten,
    privateZiele,
    zielAnlegen,
    zielAendern,
    zielEntfernen,
  } = usePersoenlich();
  const { ankaeufe, gewinn } = useJahresziele();
  const [neu, setNeu] = useState("");
  const jahr = new Date().getFullYear();
  const leer = [false, false, false, false];

  const geschaeft = [
    { schluessel: `${jahr}:ankaeufe`, name: "Ankäufe", k: ankaeufe },
    { schluessel: `${jahr}:gewinn`, name: "Gewinn", k: gewinn },
  ];
  const wert = (n: number, geld: boolean) => (geld ? f.eurKurz(n) : n.toLocaleString("de-DE"));

  return (
    <Karte titel={`Ziele ${jahr}`} zusatz="Quartale Q1 bis Q4">
      <ul className="divide-y divide-linie border-t border-linie">
        {geschaeft.map((g) => (
          <li key={g.schluessel} className="flex flex-col gap-1.5 px-5 py-2.5 md:px-6">
            <span className="flex items-center justify-between gap-2 text-[0.8rem]">
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-tinte px-2 py-0.5 text-[0.6rem] font-semibold text-grund">
                  Geschäft
                </span>
                {g.name}
              </span>
              <span className="zahl text-[0.7rem] text-grau">
                {wert(g.k.ist, g.k.geld)}
                {g.k.ziel !== null
                  ? ` / ${wert(g.k.ziel, g.k.geld)}`
                  : " · kein Ziel in den Einstellungen"}
              </span>
            </span>
            {g.k.ziel !== null && <Fortschritt anteil={g.k.ziel ? g.k.ist / g.k.ziel : 0} />}
            <Quartale
              werte={geschaeftQuartale[g.schluessel] ?? leer}
              umschalten={(q) => geschaeftQuartalUmschalten(g.schluessel, q)}
            />
          </li>
        ))}
        {privateZiele.map((z) => (
          <li key={z.id} className="flex flex-col gap-1.5 px-5 py-2.5 md:px-6">
            <span className="flex flex-wrap items-center gap-2 text-[0.8rem]">
              <span className="rounded-full bg-flaeche-hoch px-2 py-0.5 text-[0.6rem] font-semibold text-grau-stark">
                Privat
              </span>
              <input
                value={z.name}
                onChange={(e) => zielAendern(z.id, { name: e.target.value })}
                aria-label="Name des Ziels"
                className="min-w-0 flex-[1_1_8rem] bg-transparent text-tinte focus:outline-none"
              />
              <input
                value={z.stand}
                onChange={(e) => zielAendern(z.id, { stand: e.target.value })}
                placeholder="Stand"
                aria-label={`Stand ${z.name}`}
                className="zahl w-28 rounded-md border border-linie bg-flaeche px-2 py-0.5 text-right text-[0.7rem] text-grau-stark focus:border-linie-stark focus:outline-none"
              />
              <button
                type="button"
                onClick={() => zielEntfernen(z.id)}
                aria-label={`Ziel ${z.name} entfernen`}
                className="druckbar text-grau hover:text-[#9A2727]"
              >
                <Trash2 size={12} />
              </button>
            </span>
            <span className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={z.fortschritt}
                onChange={(e) => zielAendern(z.id, { fortschritt: Number(e.target.value) })}
                aria-label={`Fortschritt ${z.name}`}
                className="h-1.5 flex-1 accent-[#17935C]"
              />
              <span className="zahl w-9 text-right text-[0.66rem] text-grau">
                {z.fortschritt} %
              </span>
            </span>
            <Quartale
              werte={z.quartale}
              umschalten={(q) => {
                const neuQ = [...z.quartale] as typeof z.quartale;
                neuQ[q] = !neuQ[q];
                zielAendern(z.id, { quartale: neuQ });
              }}
            />
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          zielAnlegen(neu);
          setNeu("");
        }}
        className="flex gap-2 border-t border-linie px-5 py-3 md:px-6"
      >
        <input
          value={neu}
          onChange={(e) => setNeu(e.target.value)}
          placeholder="Privates Ziel hinzufügen, Enter"
          aria-label="Neues privates Ziel"
          className={feld}
        />
      </form>
    </Karte>
  );
}

/* ------------------------------------------------------------------ */
/* Ideen                                                                */
/* ------------------------------------------------------------------ */

function Ideen() {
  const { ideen, ideeAnlegen, ideeEntfernen } = usePersoenlich();
  const { gedanken } = useCockpit();
  const [neu, setNeu] = useState("");
  const ausGedanken = gedanken.filter((g) => g.ziel === "idee");
  const anzahl = ausGedanken.length + ideen.length;

  return (
    <Karte titel="Ideen" zusatz={`${anzahl} gesammelt`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ideeAnlegen(neu);
          setNeu("");
        }}
        className="px-5 pb-3 md:px-6"
      >
        <input
          value={neu}
          onChange={(e) => setNeu(e.target.value)}
          placeholder="Idee festhalten, Enter"
          aria-label="Neue Idee"
          className={feld}
        />
      </form>
      {anzahl === 0 ? (
        <p className="mx-5 mb-4 rounded-xl border border-dashed border-linie-stark px-4 py-6 text-center text-[0.74rem] text-grau md:mx-6">
          Noch keine Ideen. „→ Ideen“ im Gedanken-Eingang landet auch hier.
        </p>
      ) : (
        <ul className="divide-y divide-linie border-t border-linie">
          {ausGedanken.map((g) => (
            <li key={g.id} className="flex items-start gap-2 px-5 py-2.5 md:px-6">
              <span className="shrink-0 rounded-full bg-[#E4EAF2] px-2 py-0.5 text-[0.6rem] font-semibold text-[#38506E]">
                aus Gedanken
              </span>
              <span className="min-w-0 flex-1 text-[0.8rem] text-tinte">{g.text}</span>
            </li>
          ))}
          {ideen.map((i) => (
            <li key={i.id} className="flex items-start gap-2 px-5 py-2.5 md:px-6">
              <span className="shrink-0 rounded-full bg-flaeche-hoch px-2 py-0.5 text-[0.6rem] font-semibold text-grau-stark">
                Idee
              </span>
              <span className="min-w-0 flex-1 text-[0.8rem] text-tinte">{i.text}</span>
              <button
                type="button"
                onClick={() => ideeEntfernen(i.id)}
                aria-label={`Idee ${i.text} entfernen`}
                className="druckbar text-grau hover:text-[#9A2727]"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  );
}
