/**
 * Dokumentenablage je Objekt.
 *
 * Die Ordner sind die bestehende Google-Drive-Struktur samt Unterordnern.
 * Deshalb kann hier nichts umbenannt oder neu erfunden werden — jede Datei
 * landet in genau einem Ordner, auf Wunsch auch direkt in einem Elternordner.
 *
 * Phase 1 speichert keine Dateien. Was hochgeladen wird, erscheint als
 * Eintrag mit Name und Größe; der Inhalt bleibt im Browser der Sitzung.
 */
import { ChevronDown, FileText, FolderOpen, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import {
  DOKUMENT_ORDNER,
  ORDNER_BEISPIELE,
  STANDARD_ORDNER,
  f,
  liegtIn,
  ordnerVon,
  type Dokument,
  type Dokumentordner,
} from "../lib/objekte";
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
   * Beschränkt die Ansicht auf einzelne Ordner (samt ihren Unterordnern).
   * Gedacht für Reiter, die nur einen Teilvorgang zeigen — die Teilungs-
   * erklärung braucht nicht die ganze Ablage.
   */
  nurOrdner?: readonly string[];
}) {
  // Ordner mit Inhalt stehen offen, leere bleiben zu — spart Scrollen.
  // Offen heißt auch: jeder Elternordner auf dem Weg dorthin.
  const [offen, setOffen] = useState<Set<string>>(
    () =>
      new Set(
        DOKUMENT_ORDNER.filter((o) => dokumente.some((d) => liegtIn(d.ordner, o.schluessel))).map(
          (o) => o.schluessel,
        ),
      ),
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
      {sichtbareOrdner(nurOrdner, offen).map(({ ordner, einzug }) => (
        <Ordner
          key={ordner.schluessel}
          ordner={ordner}
          einzug={einzug}
          dokumente={dokumente.filter((d) => d.ordner === ordner.schluessel)}
          gesamt={dokumente.filter((d) => liegtIn(d.ordner, ordner.schluessel)).length}
          offen={offen.has(ordner.schluessel)}
          umschalten={() => umschalten(ordner.schluessel)}
          onHochladen={onHochladen}
          onLoeschen={onLoeschen}
        />
      ))}
    </div>
  );
}

/**
 * Welche Ordner gerade zu sehen sind: Unterordner nur, wenn alle Eltern
 * offen stehen. Bei `nurOrdner` zählt der gewählte Ordner als Wurzel — der
 * Einzug beginnt dort bei null, egal wie tief er im Drive liegt.
 */
function sichtbareOrdner(nurOrdner: readonly string[] | undefined, offen: Set<string>) {
  const wurzeln = nurOrdner ?? DOKUMENT_ORDNER.filter((o) => o.tiefe === 0).map((o) => o.schluessel);
  return DOKUMENT_ORDNER.flatMap((ordner) => {
    const wurzel = wurzeln.find((w) => liegtIn(ordner.schluessel, w));
    if (!wurzel) return [];
    // Jeder Vorfahr zwischen Wurzel und Ordner muss offen sein.
    let eltern = ordner.eltern;
    while (eltern && liegtIn(eltern, wurzel)) {
      if (!offen.has(eltern)) return [];
      eltern = ordnerVon(eltern)?.eltern ?? null;
    }
    return [{ ordner, einzug: ordner.tiefe - (ordnerVon(wurzel)?.tiefe ?? 0) }];
  });
}

function Ordner({
  ordner,
  einzug,
  dokumente,
  gesamt,
  offen,
  umschalten,
  onHochladen,
  onLoeschen,
}: {
  ordner: Dokumentordner;
  einzug: number;
  /** Dateien direkt in diesem Ordner. */
  dokumente: Dokument[];
  /** Dateien hier und in allen Unterordnern — steht in der Zeile. */
  gesamt: number;
  offen: boolean;
  umschalten: () => void;
  onHochladen: (neue: NeuesDokument[]) => void;
  onLoeschen?: (id: string) => void;
}) {
  const { schluessel, nummer, titel, hatUnterordner } = ordner;
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
        e.stopPropagation();
        setUeber(true);
      }}
      onDragLeave={() => setUeber(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
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
          style={{ paddingLeft: `${1 + einzug * 1.25}rem` }}
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
            {nummer}
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[0.8rem]",
              gesamt > 0 ? "text-tinte" : "text-grau",
            )}
          >
            {titel}
          </span>
          <span
            className={cn(
              "zahl shrink-0 text-[0.68rem] tabular-nums",
              gesamt > 0 ? "text-grau-stark" : "text-linie-stark",
            )}
          >
            {gesamt}
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

      {/* Ein Elternordner zeigt nur seine eigenen Dateien — die Unterordner
          stehen ohnehin direkt darunter. Leer bleibt er dann stumm. */}
      {offen && (dokumente.length > 0 || !hatUnterordner) && (
        <div
          className="px-4 pb-4"
          style={{ paddingLeft: `${2.6 + einzug * 1.25}rem` }}
        >
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
  const [ziel, setZiel] = useState<string>(STANDARD_ORDNER);
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
          {/* <option> kennt kein Padding — der Einzug kommt aus geschützten Leerzeichen. */}
          {DOKUMENT_ORDNER.map((o) => (
            <option key={o.schluessel} value={o.schluessel}>
              {"\u00a0\u00a0\u00a0".repeat(o.tiefe)}
              {o.nummer} · {o.titel}
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
                  {ordnerVon(d.ordner)?.titel}
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
