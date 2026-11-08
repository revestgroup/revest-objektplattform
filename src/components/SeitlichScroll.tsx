/**
 * Seitlich bewegen für breite Boards (Pipeline, Backoffice) — Punkt 1b aus
 * Feinschliff 1: Trackpad und Shift + Mausrad können es von selbst. Dazu
 * kommen Greifen auf freier Fläche, Pfeilknöpfe am Rand und Mitscrollen,
 * wenn eine Karte an den Rand gezogen wird.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type DependencyList, type ReactNode } from "react";

export function useSeitlichScroll(abhaengigkeiten: DependencyList) {
  const leiste = useRef<HTMLDivElement>(null);
  const greifen = useRef<{ x: number; links: number } | null>(null);
  const [rand, setRand] = useState({ links: false, rechts: false });

  function randPruefen() {
    const el = leiste.current;
    if (!el) return;
    setRand({
      links: el.scrollLeft > 4,
      rechts: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }

  useEffect(() => {
    randPruefen();
    window.addEventListener("resize", randPruefen);
    return () => window.removeEventListener("resize", randPruefen);
    // Die Aufrufer sagen, wann sich die Breite ändern kann.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, abhaengigkeiten);

  function blaettern(richtung: -1 | 1) {
    const el = leiste.current;
    if (!el) return;
    el.scrollBy({ left: richtung * el.clientWidth * 0.6, behavior: "smooth" });
    // Nicht jeder Browser meldet das Ende des sanften Scrollens zuverlässig.
    setTimeout(randPruefen, 400);
  }

  const leisteProps = {
    ref: leiste,
    onScroll: randPruefen,
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      // Nur auf freier Fläche und nur mit der Maus — Karten, Knöpfe und Links
      // behalten ihr eigenes Verhalten, am Telefon wischt der Finger ohnehin.
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      if (
        (e.target as HTMLElement).closest(
          "li, button, a, input, select, textarea, [draggable=true]",
        )
      )
        return;
      greifen.current = { x: e.clientX, links: e.currentTarget.scrollLeft };
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.style.cursor = "grabbing";
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!greifen.current) return;
      e.currentTarget.scrollLeft = greifen.current.links - (e.clientX - greifen.current.x);
      randPruefen();
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      greifen.current = null;
      e.currentTarget.style.cursor = "";
    },
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => {
      greifen.current = null;
      e.currentTarget.style.cursor = "";
    },
  };

  /** Beim Ziehen einer Karte: am Rand der Leiste weiterschieben. */
  function randScroll(e: React.DragEvent<HTMLDivElement>) {
    const el = leiste.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (e.clientX < r.left + 70) el.scrollLeft -= 18;
    else if (e.clientX > r.right - 70) el.scrollLeft += 18;
  }

  const knopf =
    "druckbar absolute top-8 z-10 hidden size-9 items-center justify-center rounded-full border border-linie bg-flaeche text-grau-stark shadow-karte hover:text-tinte md:flex";
  const pfeile: ReactNode = (
    <>
      {rand.links && (
        <button
          type="button"
          onClick={() => blaettern(-1)}
          aria-label="Nach links"
          className={`${knopf} left-1`}
        >
          <ChevronLeft size={16} strokeWidth={2.2} />
        </button>
      )}
      {rand.rechts && (
        <button
          type="button"
          onClick={() => blaettern(1)}
          aria-label="Nach rechts"
          className={`${knopf} right-1`}
        >
          <ChevronRight size={16} strokeWidth={2.2} />
        </button>
      )}
    </>
  );

  return { leisteProps, randScroll, pfeile };
}
