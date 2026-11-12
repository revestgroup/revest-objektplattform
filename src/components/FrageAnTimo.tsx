/**
 * „Frage an Timo“ (Cockpit, P2 Punkt 7): überall dort, wo das Backoffice
 * arbeitet. Die Frage erscheint im Cockpit unter „Entscheidungen“; die Antwort
 * steht hier an derselben Stelle, sobald Timo geklickt hat.
 */
import { MessageCircleQuestion } from "lucide-react";
import { useState } from "react";

import { type Frage } from "../lib/cockpit";
import { useCockpit } from "../lib/cockpitStore";
import { f } from "../lib/objekte";
import { cn } from "../lib/utils";

export function FrageAnTimo({
  bezug,
  objektId,
}: {
  bezug: NonNullable<Frage["bezug"]>;
  objektId: string | null;
}) {
  const { fragen, frageStellen } = useCockpit();
  const [offen, setOffen] = useState(false);
  const [text, setText] = useState("");
  const [freigabe, setFreigabe] = useState(false);
  const hier = fragen.filter((x) => x.bezug?.art === bezug.art && x.bezug.id === bezug.id);

  function stellen() {
    const t = text.trim();
    if (!t) return;
    frageStellen({
      text: t,
      von: "backoffice",
      bezug,
      objektId,
      antworten: freigabe ? ["Freigeben", "Rückfrage"] : ["Ja", "Nein"],
    });
    setText("");
    setOffen(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {hier.map((x) => (
        <div key={x.id} className="flex items-start gap-2 text-[0.72rem]">
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold",
              x.antwort ? "bg-[#DBF2E6] text-[#0C5E3A]" : "bg-[#FBEBD1] text-[#8A5A08]",
            )}
          >
            {x.antwort ? `beantwortet: ${x.antwort}` : "wartet auf Timo"}
          </span>
          <span className="min-w-0 flex-1 text-grau-stark">
            {x.text} <span className="zahl text-grau">· {f.datum(x.gestelltAm)}</span>
          </span>
        </div>
      ))}
      {offen ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            stellen();
          }}
          className="flex flex-col gap-2"
        >
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Was soll Timo entscheiden?"
            aria-label="Frage an Timo"
            className="h-8 w-full rounded-lg border border-linie bg-flaeche px-2.5 text-[0.78rem] text-tinte focus:border-linie-stark focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[0.68rem] text-grau-stark">
              <input
                type="checkbox"
                checked={freigabe}
                onChange={(e) => setFreigabe(e.target.checked)}
                className="size-3.5 accent-[#10131a]"
              />
              Freigabe (Freigeben / Rückfrage)
            </label>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setOffen(false)}
              className="druckbar rounded-full px-3 py-1.5 text-[0.66rem] text-grau hover:text-tinte"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="druckbar rounded-full bg-tinte px-3.5 py-1.5 text-[0.66rem] font-semibold text-grund disabled:opacity-30"
            >
              Fragen
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOffen(true)}
          className="druckbar flex w-fit items-center gap-1.5 rounded-full border border-linie-stark px-3.5 py-2 text-[0.68rem] font-semibold text-tinte"
        >
          <MessageCircleQuestion size={12} />
          Frage an Timo
        </button>
      )}
    </div>
  );
}
