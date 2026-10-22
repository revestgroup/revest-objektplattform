/**
 * Dokumentenablage je Objekt.
 *
 * Die zehn Ordner stehen fest, weil sie später 1:1 im Google Drive angelegt
 * werden. Deshalb kann hier nichts umbenannt oder neu erfunden werden —
 * jede Datei landet in genau einem der zehn Ordner.
 *
 * Phase 1 speichert keine Dateien. Was hochgeladen wird, erscheint als
 * Eintrag mit Name und Größe; der Inhalt bleibt im Browser der Sitzung.
 */
import { ChevronDown, FileText, FolderOpen, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { DOKUMENT_ORDNER, ORDNER_BEISPIELE, f, type Dokument } from "../lib/objekte";
import { cn } from "../lib/utils";

export interface NeuesDokument {
  name: string;
  ordner: string;
  groesseKb: number;
}

export function Dokumentenablage({
  dokumente,
  onHochladen,
  onLoeschen,
  nurOrdner,
}: {
  dokumente: Dokument[];
  onHochladen: (neue: NeuesDokument[]) => void;
  /** Fehlt der Handler, ist die Ablage nur lesbar. */
  onLoeschen?: (id: string) => void;
  /**
   * Beschränkt die Ansicht auf einzelne Ordner. Gedacht für Reiter, die nur
   * einen Teilvorgang zeigen — die Teilungserklärung braucht nicht zehn
   * Ordner, von denen neun sie nichts angehen.
   */
  nurOrdner?: readonly string[];
}) {
  // Ordner mit Inhalt stehen offen, leere bleiben zu — spart Scrollen.
  const [offen, setOffen] = useState<Set<string>>(
    () => new Set(dokumente.map((d) => d.ordner)),
  );

  function umschalten(schluessel: string) {
    setOffen((alt) => {
      const neu = new Set(alt);
      if (neu.has(schluessel)) neu.delete(schluessel);
      else neu.add(schluessel);
      return neu;
    });
  }

  return (
    <div className="divide-y divide-linie overflow-hidden rounded-2xl border border-linie bg-flaeche">
      {/* Die Nummer kommt aus der festen Reihenfolge, nicht aus der gefilterten
          Ansicht: Ordner 02 heißt überall 02, auch wenn er allein steht. */}
      {DOKUMENT_ORDNER.map((ordner, i) => ({ ordner, nummer: i + 1 }))
        .filter(({ ordner }) => !nurOrdner || nurOrdner.includes(ordner.schluessel))
        .map(({ ordner, nummer }) => {
          const inhalt = dokumente.filter((d) => d.ordner === ordner.schluessel);
          return (
            <Ordner
              key={ordner.schluessel}
              nummer={nummer}
              schluessel={ordner.schluessel}
              titel={ordner.titel}
              dokumente={inhalt}
              offen={offen.has(ordner.schluessel)}
              umschalten={() => umschalten(ordner.schluessel)}
              onHochladen={onHochladen}
              onLoeschen={onLoeschen}
            />
          );
        })}
    </div>
  );
}

function Ordner({
  nummer,
  schluessel,
  titel,
  dokumente,
  offen,
  umschalten,
  onHochladen,
  onLoeschen,
}: {
  nummer: number;
  schluessel: string;
  titel: string;
  dokumente: Dokument[];
  offen: boolean;
  umschalten: () => void;
  onHochladen: (neue: NeuesDokument[]) => void;
  onLoeschen?: (id: string) => void;
}) {
  const eingabeRef = useRef<HTMLInputElement>(null);
  const [ueber, setUeber] = useState(false);

  function uebernehmen(dateien: FileList | null) {
    if (!dateien || dateien.length === 0) return;
    onHochladen(
      Array.from(dateien).map((d) => ({
        name: d.name,
        ordner: schluessel,
        groesseKb: Math.max(1, Math.round(d.size / 1024)),
      })),
    );
    if (!offen) umschalten();
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setUeber(true);
      }}
      onDragLeave={() => setUeber(false)}
      onDrop={(e) => {
        e.preventDefault();
        setUeber(false);
        uebernehmen(e.dataTransfer.files);
      }}
      className={cn("transition-colors duration-150 ease-out", ueber && "bg-flaeche-aktiv")}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={umschalten}
          aria-expanded={offen}
          className="druckbar flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
        >
          <ChevronDown
            size={14}
            strokeWidth={2}
            className={cn(
              "shrink-0 text-grau transition-transform duration-200 ease-out-stark",
              !offen && "-rotate-90",
            )}
          />
          <span className="zahl shrink-0 text-[0.62rem] tracking-wider text-grau">
            {String(nummer).padStart(2, "0")}
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[0.8rem]",
              dokumente.length > 0 ? "text-tinte" : "text-grau",
            )}
          >
            {titel}
          </span>
          <span
            className={cn(
              "zahl shrink-0 text-[0.68rem] tabular-nums",
              dokumente.length > 0 ? "text-grau-stark" : "text-linie-stark",
            )}
          >
            {dokumente.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => eingabeRef.current?.click()}
          aria-label={`Datei zu ${titel} hinzufügen`}
          title={`Datei zu ${titel} hinzufügen`}
          className="druckbar mr-2 flex size-8 shrink-0 items-center justify-center rounded-full text-grau hover:text-tinte"
        >
          <Upload size={14} strokeWidth={1.75} />
        </button>
        <input
          ref={eingabeRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            uebernehmen(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {offen && (
        <div className="px-4 pb-4 pl-[2.6rem]">
          {dokumente.length === 0 ? (
            <button
              type="button"
              onClick={() => eingabeRef.current?.click()}
              className="druckbar flex w-full flex-col gap-1.5 rounded-xl border border-dashed border-linie-stark px-3 py-4 text-left"
            >
              <span className="flex items-center gap-2 text-[0.72rem] text-grau-stark">
                <FolderOpen size={13} strokeWidth={1.75} />
                Noch leer — Dateien hierher ziehen
              </span>
              <span className="text-[0.62rem] leading-relaxed text-grau">
                {ORDNER_BEISPIELE[schluessel]}
              </span>
            </button>
          ) : (
            <ul className="flex flex-col gap-1">
              {dokumente.map((d, i) => (
                <li
                  key={d.id}
                  className="eintritt group flex items-center gap-3 rounded-lg bg-flaeche-hoch px-3 py-2"
                  style={{ animationDelay: `${Math.min(i, 6) * 25}ms` }}
                >
                  <FileText size={13} strokeWidth={1.75} className="shrink-0 text-grau" />
                  <span className="min-w-0 flex-1 truncate text-[0.74rem] text-grau-stark">
                    {d.name}
                  </span>
                  <span className="zahl shrink-0 text-[0.62rem] text-grau">
                    {d.groesseKb >= 1024
                      ? `${(d.groesseKb / 1024).toFixed(1)} MB`
                      : `${d.groesseKb} KB`}
                  </span>
                  <span className="zahl hidden shrink-0 text-[0.62rem] text-grau sm:block">
                    {f.datum(d.hochgeladenAm)}
                  </span>
                  {onLoeschen && (
                    <button
                      type="button"
                      onClick={() => onLoeschen(d.id)}
                      aria-label={`${d.name} entfernen`}
                      className="druckbar flex size-6 shrink-0 items-center justify-center rounded-full text-grau opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 hover:text-tinte focus-visible:opacity-100"
                    >
                      <Trash2 size={12} strokeWidth={1.75} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Kurze Variante für die Anlagemaske: ein Feld, Ordnerwahl per Auswahlliste.
 * In der Maske zählt Geschwindigkeit, nicht Übersicht.
 */
export function Dokumentenfeld({
  dokumente,
  setDokumente,
}: {
  dokumente: NeuesDokument[];
  setDokumente: (d: NeuesDokument[]) => void;
}) {
  const eingabeRef = useRef<HTMLInputElement>(null);
  const [ziel, setZiel] = useState<string>(DOKUMENT_ORDNER[0].schluessel);
  const [ueber, setUeber] = useState(false);

  function uebernehmen(dateien: FileList | null) {
    if (!dateien || dateien.length === 0) return;
    setDokumente([
      ...dokumente,
      ...Array.from(dateien).map((d) => ({
        name: d.name,
        ordner: ziel,
        groesseKb: Math.max(1, Math.round(d.size / 1024)),
      })),
    ]);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="mini-label">Unterlagen</span>
        <span className="zahl text-[0.65rem] text-grau">
          {dokumente.length === 0 ? "keine" : `${dokumente.length} ausgewählt`}
        </span>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
        <select
          value={ziel}
          onChange={(e) => setZiel(e.target.value)}
          aria-label="Zielordner"
          className="w-full border border-linie bg-flaeche px-3 py-2.5 text-[0.78rem] text-tinte focus:border-linie-stark focus:outline-none sm:w-auto sm:flex-1"
        >
          {DOKUMENT_ORDNER.map((o, i) => (
            <option key={o.schluessel} value={o.schluessel}>
              {String(i + 1).padStart(2, "0")} · {o.titel}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => eingabeRef.current?.click()}
          className="druckbar flex items-center justify-center gap-2 rounded-full border border-linie-stark px-4 py-2.5 text-[0.68rem] font-medium tracking-[0.14em] uppercase text-tinte"
        >
          <Upload size={13} strokeWidth={2} />
          Dateien wählen
        </button>
      </div>

      <p className="mt-2 text-[0.62rem] leading-relaxed text-grau">
        {ORDNER_BEISPIELE[ziel]}
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setUeber(true);
        }}
        onDragLeave={() => setUeber(false)}
        onDrop={(e) => {
          e.preventDefault();
          setUeber(false);
          uebernehmen(e.dataTransfer.files);
        }}
        className={cn(
          "mt-2.5 overflow-hidden rounded-xl border border-dashed transition-colors duration-150 ease-out",
          ueber ? "border-tinte bg-flaeche-aktiv" : "border-linie-stark bg-flaeche",
        )}
      >
        {dokumente.length === 0 ? (
          <p className="px-4 py-6 text-center text-[0.72rem] text-grau">
            Dateien hierher ziehen — sie landen im gewählten Ordner
          </p>
        ) : (
          <ul className="divide-y divide-linie">
            {dokumente.map((d, i) => (
              <li key={`${d.name}-${i}`} className="flex items-center gap-3 px-3 py-2">
                <FileText size={13} strokeWidth={1.75} className="shrink-0 text-grau" />
                <span className="min-w-0 flex-1 truncate text-[0.74rem] text-grau-stark">
                  {d.name}
                </span>
                <span className="shrink-0 text-[0.6rem] tracking-wider uppercase text-grau">
                  {DOKUMENT_ORDNER.find((o) => o.schluessel === d.ordner)?.titel}
                </span>
                <button
                  type="button"
                  onClick={() => setDokumente(dokumente.filter((_, j) => j !== i))}
                  aria-label={`${d.name} entfernen`}
                  className="druckbar flex size-6 shrink-0 items-center justify-center rounded-full text-grau hover:text-tinte"
                >
                  <Trash2 size={12} strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
