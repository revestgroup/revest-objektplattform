/**
 * Erster Schritt beim Anlegen: Was wird es?
 *
 * Zwei Wege von Hand (Wohnung oder Mehrfamilienhaus) und ein dritter mit KI:
 * Exposé hochladen, bei einem MFH zusätzlich die Mietliste als Excel oder
 * Google Sheet. Der KI-Weg ist in Phase 1 reine Oberfläche — die Dropzonen
 * nehmen Dateien an und zeigen sie, ausgelesen wird erst mit dem Backend.
 *
 * Die Schublade ist schmal — alles ist für eine Spalte gebaut, ohne `md:`.
 */
import {
  ArrowRight,
  Building2,
  FileSpreadsheet,
  FileText,
  Home,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import type { Objektart } from "../lib/objekte";
import { cn } from "../lib/utils";

export function AnlegeEinstieg({
  onWahl,
  onAbbrechen,
}: {
  /** Timo hat sich entschieden — das Formular übernimmt mit dieser Objektart. */
  onWahl: (art: Objektart) => void;
  onAbbrechen: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col px-6 py-7">
      <p className="mini-label eintritt">Neues Objekt</p>
      <h2 className="eintritt mt-2 text-[1.05rem] leading-snug font-semibold text-tinte" style={{ animationDelay: "24ms" }}>
        Womit fängst du an?
      </h2>

      <div className="mt-5 flex flex-col gap-2.5">
        <WahlKachel
          titel="Wohnung"
          beschreibung="Einzelne Eigentumswohnung — eine Einheit, kurze Maske."
          Zeichen={Home}
          verzoegerung={48}
          onClick={() => onWahl("etw")}
        />
        <WahlKachel
          titel="Mehrfamilienhaus"
          beschreibung="Ganzes Haus mit mehreren Einheiten, aufteilbar."
          Zeichen={Building2}
          verzoegerung={72}
          onClick={() => onWahl("mfh")}
        />
      </div>

      {/* „oder" als echte Weggabelung, nicht als dritte Kachel gleicher Art. */}
      <div className="eintritt mt-6 mb-4 flex items-center gap-3" style={{ animationDelay: "96ms" }}>
        <span className="h-px flex-1 bg-linie" />
        <span className="text-[0.62rem] font-semibold tracking-[0.18em] uppercase text-grau">
          oder mit KI
        </span>
        <span className="h-px flex-1 bg-linie" />
      </div>

      <KiEinstieg verzoegerung={120} />

      <div className="mt-auto flex justify-end pt-7">
        <button
          type="button"
          onClick={onAbbrechen}
          className="druckbar rounded-full border border-linie px-5 py-3 text-[0.68rem] font-medium tracking-[0.16em] uppercase text-grau-stark"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function WahlKachel({
  titel,
  beschreibung,
  Zeichen,
  verzoegerung,
  onClick,
}: {
  titel: string;
  beschreibung: string;
  Zeichen: typeof Home;
  verzoegerung: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${verzoegerung}ms` }}
      className="kachel eintritt group flex w-full items-center gap-4 rounded-2xl border border-linie bg-flaeche px-5 py-4.5 text-left shadow-karte"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-flaeche-hoch text-tinte">
        <Zeichen size={19} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9rem] font-semibold text-tinte">{titel}</span>
        <span className="mt-0.5 block text-[0.72rem] leading-relaxed text-grau">
          {beschreibung}
        </span>
      </span>
      <ArrowRight
        size={16}
        strokeWidth={2}
        className="shrink-0 text-grau transition-transform duration-200 ease-out-stark group-hover:translate-x-0.5 group-hover:text-tinte"
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* KI-Weg — in Phase 1 nur Oberfläche                                   */
/* ------------------------------------------------------------------ */

function KiEinstieg({ verzoegerung }: { verzoegerung: number }) {
  const [expose, setExpose] = useState<string | null>(null);
  const [mietliste, setMietliste] = useState<string | null>(null);
  const [hinweis, setHinweis] = useState(false);

  return (
    <div
      style={{ animationDelay: `${verzoegerung}ms` }}
      className="eintritt rounded-2xl bg-tinte px-5 py-5 text-grund shadow-hoch"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-grund/10">
          <Sparkles size={16} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[0.88rem] font-semibold">Aus Exposé anlegen</div>
          <div className="mt-0.5 text-[0.7rem] leading-relaxed text-grund/60">
            Die KI liest Lage, Flächen, Mieten, Baujahr und den Ansprechpartner aus und füllt die Maske vor.
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-grund/25 px-2.5 py-1 text-[0.56rem] font-semibold tracking-[0.16em] uppercase text-grund/70">
          Phase 2
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Ablagefeld
          titel="Exposé"
          detail="PDF"
          Zeichen={FileText}
          datei={expose}
          setDatei={setExpose}
        />
        <Ablagefeld
          titel="Mietliste"
          detail="Excel oder Google Sheet · bei MFH"
          Zeichen={FileSpreadsheet}
          datei={mietliste}
          setDatei={setMietliste}
        />
      </div>

      <button
        type="button"
        onClick={() => setHinweis(true)}
        disabled={!expose}
        className="druckbar mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-grund px-5 py-3 text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-tinte transition-opacity duration-150 disabled:opacity-35"
      >
        <Sparkles size={13} strokeWidth={2} />
        Objekt mit KI anlegen
      </button>

      {hinweis && (
        <p className="schleier mt-3 text-center text-[0.68rem] leading-relaxed text-grund/60">
          Das Auslesen kommt in Phase 2 mit dem Backend. Die Dateien bleiben in
          dieser Sitzung — lege das Objekt so lange von Hand an.
        </p>
      )}
    </div>
  );
}

/** Dunkle Dropzone im KI-Block. Nimmt Klick und Drop an, merkt sich den Namen. */
function Ablagefeld({
  titel,
  detail,
  Zeichen,
  datei,
  setDatei,
}: {
  titel: string;
  detail: string;
  Zeichen: typeof FileText;
  datei: string | null;
  setDatei: (name: string | null) => void;
}) {
  const [ueber, setUeber] = useState(false);

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setUeber(true);
      }}
      onDragLeave={() => setUeber(false)}
      onDrop={(e) => {
        e.preventDefault();
        setUeber(false);
        const name = e.dataTransfer.files[0]?.name;
        if (name) setDatei(name);
      }}
      className={cn(
        "druckbar flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-left transition-colors duration-150 ease-out has-focus-visible:outline-2 has-focus-visible:outline-grund",
        ueber
          ? "border-grund/60 bg-grund/10"
          : datei
            ? "border-grund/40 bg-grund/5"
            : "border-grund/25 hover:border-grund/45",
      )}
    >
      <Zeichen size={16} strokeWidth={1.75} className="shrink-0 text-grund/70" />
      <span className="min-w-0 flex-1">
        {datei ? (
          <span className="block truncate text-[0.74rem] font-medium text-grund">{datei}</span>
        ) : (
          <span className="block text-[0.74rem] font-medium text-grund/85">{titel}</span>
        )}
        <span className="mt-0.5 block truncate text-[0.62rem] text-grund/50">
          {datei ? "Zum Austauschen antippen" : detail}
        </span>
      </span>
      <span className="shrink-0 text-[0.6rem] font-semibold tracking-[0.14em] uppercase text-grund/50">
        {datei ? "Bereit" : "Wählen"}
      </span>
      <input
        type="file"
        className="sr-only"
        aria-label={`${titel} hochladen`}
        onChange={(e) => {
          const name = e.target.files?.[0]?.name;
          if (name) setDatei(name);
          e.target.value = "";
        }}
      />
    </label>
  );
}
