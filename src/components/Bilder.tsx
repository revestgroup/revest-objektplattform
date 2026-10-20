/**
 * Bildergalerie und Bild-Upload.
 *
 * Ein Eintrag in `bilder` ist entweder eine echte Quelle (blob:, data:, /, http)
 * oder — in den Mock-Daten — nur eine Beschriftung. Beschriftungen werden als
 * Platzhalterkachel gezeichnet. Dadurch läuft dieselbe Komponente in Phase 1
 * mit erfundenen Daten und in Phase 2 mit echten Dateien aus dem Drive.
 */
import { ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "../lib/utils";

export function istQuelle(eintrag: string) {
  return /^(blob:|data:|https?:|\/)/.test(eintrag);
}

/**
 * Stabiler Grauwert aus der Beschriftung — gleiche Kachel, gleiche Helligkeit.
 * Hell gehalten, damit die Platzhalter im hellen Layout nicht wie Löcher wirken.
 */
function schattierung(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) % 1000;
  return 226 + (h % 10);
}

/**
 * Eine Bildfläche: echtes Foto oder gemusterter Platzhalter. Füllt immer den
 * Elternrahmen, damit der Aufrufer das Seitenverhältnis bestimmt.
 */
export function Bildflaeche({ eintrag, className }: { eintrag: string; className?: string }) {
  if (istQuelle(eintrag)) {
    return (
      <img
        src={eintrag}
        alt=""
        loading="lazy"
        className={cn("size-full object-cover", className)}
      />
    );
  }

  const g = schattierung(eintrag);
  return (
    <div
      // Beschriftung mittig: an den Rändern liegen Plakette und Preispille.
      className={cn("relative flex size-full items-center justify-center overflow-hidden p-4", className)}
      style={{
        background: `repeating-linear-gradient(135deg, rgb(${g} ${g} ${g}) 0px, rgb(${g} ${g} ${g}) 7px, rgb(${g - 6} ${g - 6} ${g - 6}) 7px, rgb(${g - 6} ${g - 6} ${g - 6}) 14px)`,
      }}
    >
      <span className="mini-label line-clamp-2 text-center !text-grau">{eintrag}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Galerie mit Vollbild                                                 */
/* ------------------------------------------------------------------ */

export function Bildergalerie({ bilder }: { bilder: string[] }) {
  const [vollbild, setVollbild] = useState<number | null>(null);

  if (bilder.length === 0) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-2xl border border-linie bg-flaeche">
        <span className="mini-label">Keine Bilder hinterlegt</span>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-1.5">
        {/* Erstes Bild groß — es ist die Straßenansicht und trägt das Objekt. */}
        <button
          type="button"
          onClick={() => setVollbild(0)}
          className="druckbar col-span-4 aspect-[16/9] overflow-hidden rounded-2xl sm:col-span-2 sm:row-span-2 sm:aspect-auto"
        >
          <Bildflaeche eintrag={bilder[0]} />
        </button>
        {bilder.slice(1, 5).map((b, i) => (
          <button
            key={`${b}-${i}`}
            type="button"
            onClick={() => setVollbild(i + 1)}
            className="druckbar relative col-span-2 aspect-[4/3] overflow-hidden rounded-xl sm:col-span-1"
          >
            <Bildflaeche eintrag={b} />
            {/* Rest zählen, statt eine zweite Reihe anzufangen. */}
            {i === 3 && bilder.length > 5 && (
              <span className="absolute inset-0 flex items-center justify-center bg-tinte/55 text-sm font-semibold text-white backdrop-blur-[2px]">
                +{bilder.length - 5}
              </span>
            )}
          </button>
        ))}
      </div>

      {vollbild !== null && (
        <Vollbild
          bilder={bilder}
          index={vollbild}
          setIndex={setVollbild}
          schliessen={() => setVollbild(null)}
        />
      )}
    </>
  );
}

function Vollbild({
  bilder,
  index,
  setIndex,
  schliessen,
}: {
  bilder: string[];
  index: number;
  setIndex: (i: number) => void;
  schliessen: () => void;
}) {
  useEffect(() => {
    const beiTaste = (e: KeyboardEvent) => {
      if (e.key === "Escape") schliessen();
      if (e.key === "ArrowRight") setIndex((index + 1) % bilder.length);
      if (e.key === "ArrowLeft") setIndex((index - 1 + bilder.length) % bilder.length);
    };
    window.addEventListener("keydown", beiTaste);
    return () => window.removeEventListener("keydown", beiTaste);
  }, [index, bilder.length, setIndex, schliessen]);

  return (
    // Das Vollbild ist bewusst dunkel — nur so steht das Foto für sich.
    // Deshalb werden die Farben hier explizit gesetzt und nicht aus den
    // Tokens der hellen Oberfläche gezogen.
    <div className="schleier fixed inset-0 z-[60] flex flex-col bg-[#0b0d12]/95 backdrop-blur-sm">
      <div className="flex h-14 shrink-0 items-center justify-between px-5">
        <span className="zahl mini-label !text-white/55">
          {index + 1} / {bilder.length}
        </span>
        <button
          type="button"
          onClick={schliessen}
          aria-label="Schließen"
          className="flex size-9 items-center justify-center rounded-full text-white/60 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-white active:scale-[0.97]"
        >
          <X size={18} strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center gap-2 px-3 pb-10">
        <Pfeil
          richtung="links"
          beiKlick={() => setIndex((index - 1 + bilder.length) % bilder.length)}
          aus={bilder.length < 2}
        />
        <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
          <div className="max-h-full max-w-[1100px] overflow-hidden rounded-2xl border border-white/10 shadow-schwebe">
            <div className="aspect-[16/10] w-[min(1100px,88vw)]">
              <Bildflaeche eintrag={bilder[index]} />
            </div>
          </div>
        </div>
        <Pfeil
          richtung="rechts"
          beiKlick={() => setIndex((index + 1) % bilder.length)}
          aus={bilder.length < 2}
        />
      </div>
    </div>
  );
}

function Pfeil({
  richtung,
  beiKlick,
  aus,
}: {
  richtung: "links" | "rechts";
  beiKlick: () => void;
  aus: boolean;
}) {
  const Icon = richtung === "links" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={beiKlick}
      disabled={aus}
      aria-label={richtung === "links" ? "Vorheriges Bild" : "Nächstes Bild"}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-white active:scale-[0.97] disabled:opacity-25 disabled:hover:bg-transparent"
    >
      <Icon size={20} strokeWidth={1.75} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Upload-Feld für die Anlagemaske                                      */
/* ------------------------------------------------------------------ */

export function Bilderfeld({
  bilder,
  setBilder,
}: {
  bilder: string[];
  setBilder: (b: string[]) => void;
}) {
  const eingabeRef = useRef<HTMLInputElement>(null);
  const [ueber, setUeber] = useState(false);
  // Nur selbst erzeugte Blob-URLs wieder freigeben, nicht die Mock-Beschriftungen.
  const eigene = useRef<string[]>([]);

  useEffect(
    () => () => {
      for (const url of eigene.current) URL.revokeObjectURL(url);
    },
    [],
  );

  function uebernehmen(dateien: FileList | null) {
    if (!dateien || dateien.length === 0) return;
    const neue = Array.from(dateien)
      .filter((d) => d.type.startsWith("image/"))
      .map((d) => {
        const url = URL.createObjectURL(d);
        eigene.current.push(url);
        return url;
      });
    if (neue.length > 0) setBilder([...bilder, ...neue]);
  }

  function entfernen(i: number) {
    const weg = bilder[i];
    if (eigene.current.includes(weg)) {
      URL.revokeObjectURL(weg);
      eigene.current = eigene.current.filter((u) => u !== weg);
    }
    setBilder(bilder.filter((_, j) => j !== i));
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="mini-label">Bilder</span>
        <span className="zahl text-[0.65rem] text-grau">
          {bilder.length === 0 ? "keine" : `${bilder.length} ausgewählt`}
        </span>
      </div>

      {bilder.length > 0 && (
        <div className="mt-2.5 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {bilder.map((b, i) => (
            <div
              key={`${b}-${i}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-linie"
            >
              <Bildflaeche eintrag={b} />
              {i === 0 && (
                <span className="absolute top-1.5 left-1.5 rounded-full bg-tinte px-2 py-0.5 text-[0.52rem] font-semibold tracking-[0.12em] uppercase text-grund">
                  Titel
                </span>
              )}
              <button
                type="button"
                onClick={() => entfernen(i)}
                aria-label={`Bild ${i + 1} entfernen`}
                className="druckbar absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-flaeche/90 text-grau-stark opacity-0 shadow-karte transition-opacity duration-150 ease-out group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X size={13} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => eingabeRef.current?.click()}
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
          "druckbar mt-2.5 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed py-7 transition-colors duration-150 ease-out",
          ueber ? "border-tinte bg-flaeche-aktiv" : "border-linie-stark bg-flaeche",
        )}
      >
        <ImagePlus size={18} strokeWidth={1.75} className="text-grau" />
        <span className="text-[0.75rem] text-grau-stark">
          Bilder hierher ziehen oder klicken
        </span>
        <span className="text-[0.62rem] text-grau">
          Erstes Bild wird das Titelbild · JPG, PNG, WebP
        </span>
      </button>

      <input
        ref={eingabeRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          uebernehmen(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
