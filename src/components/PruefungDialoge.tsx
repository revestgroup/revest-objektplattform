/**
 * Zwei Dialoge der Checkliste Ankauf:
 *
 * - „Fehlende Unterlagen anfordern“: Gmail-Entwurf an den Makler mit allen
 *   fehlenden Basis- und zutreffenden Objektart-Unterlagen, Betreff mit
 *   Kürzel. Gesendet wird nichts — der Entwurf öffnet sich in Gmail. Danach
 *   stehen die Punkte auf „angefordert“, ein neues Objekt auf „Unterlagen
 *   angefordert“.
 * - „Finanzierungsunterlagen“: alle Basis-Unterlagen mit Stand und Datei, als
 *   Liste für die Bank. Das Paket zum Herunterladen kommt mit Phase 2, wenn
 *   die Dateien wirklich im Drive liegen.
 */
import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

import { useAuth } from "../lib/auth";
import { STUFEN, andereKuerzel, istAktiv, kuerzelVorschlag, type Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import {
  UNTERLAGENSTATUS,
  anforderungsMail,
  finanzierungsunterlagen,
  gmailEntwurfLink,
} from "../lib/pruefung";
import { cn } from "../lib/utils";
import { Dialog } from "./Dialog";

function kopieren(text: string, fertig: () => void) {
  void navigator.clipboard?.writeText(text).then(fertig);
}

/* ------------------------------------------------------------------ */

export function Anforderungsdialog({
  objekt,
  schliessen,
}: {
  objekt: Objekt;
  schliessen: () => void;
}) {
  const { aendern, stufeSetzen, objekte } = useObjekte();
  const { nutzer } = useAuth();
  const makler = objekt.kontakte.find((k) => k.rolle === "makler") ?? null;
  // Ohne Kürzel bekommt das Objekt jetzt seinen Vorschlag — damit die
  // Antwort des Maklers über „[REB9]“ im Betreff zuordenbar bleibt.
  const kuerzel =
    objekt.kuerzel ?? kuerzelVorschlag(objekt.strasse, andereKuerzel(objekte, objekt.id));
  const vorschlag = anforderungsMail(
    { ...objekt, kuerzel },
    makler ? { name: makler.name, email: makler.email } : null,
    nutzer?.name ?? "Timo Birk",
  );
  const [an, setAn] = useState(vorschlag.an);
  const [betreff, setBetreff] = useState(vorschlag.betreff);
  const [text, setText] = useState(vorschlag.text);
  const [kopiert, setKopiert] = useState(false);

  // Nur aus „Neu“ oder der Ablage nach vorn — ein besichtigtes Objekt fällt
  // nicht zurück, nur weil noch ein Papier fehlt.
  const stufeWechselt = objekt.stufe === "neu" || !istAktiv(objekt.stufe);

  function vermerken() {
    const p = objekt.pruefung ?? {};
    const unterlagen = { ...p.unterlagen };
    for (const id of vorschlag.ids) {
      unterlagen[id] = { ...unterlagen[id], status: "angefordert" };
    }
    aendern(
      objekt.id,
      { pruefung: { ...p, unterlagen }, kuerzel },
      `Unterlagen angefordert (${vorschlag.ids.length}) bei ${makler?.name ?? an ?? "Makler"}`,
    );
    if (stufeWechselt && objekt.stufe !== "angekauft") stufeSetzen(objekt.id, "unterlagen");
  }

  const feld =
    "h-9 w-full rounded-xl border border-linie bg-flaeche px-3 text-[0.8rem] text-tinte focus:border-linie-stark focus:outline-none";

  return (
    <Dialog
      titel="Fehlende Unterlagen anfordern"
      unterzeile={`${vorschlag.ids.length} Unterlagen · Entwurf in Gmail, gesendet wird erst von dir`}
      schliessen={schliessen}
    >
      {vorschlag.ids.length === 0 ? (
        <p className="text-[0.8rem] text-grau-stark">
          Es fehlt keine Basis- oder Objektart-Unterlage. Nichts anzufordern.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          <label className="flex flex-col gap-1">
            <span className="mini-label">An</span>
            <input
              className={feld}
              value={an}
              onChange={(e) => setAn(e.target.value)}
              placeholder="E-Mail des Maklers"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="mini-label">Betreff</span>
            <input className={feld} value={betreff} onChange={(e) => setBetreff(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="mini-label">Text</span>
            <textarea
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full resize-y rounded-xl border border-linie bg-flaeche px-3 py-2.5 text-[0.76rem] leading-relaxed text-tinte focus:border-linie-stark focus:outline-none"
            />
          </label>
          <p className="text-[0.66rem] text-grau">
            Danach stehen die {vorschlag.ids.length} Punkte auf „angefordert“
            {stufeWechselt
              ? ` und das Objekt auf „${STUFEN.unterlagen.titel}“.`
              : ". Die Stufe bleibt, wie sie ist."}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2.5 border-t border-linie pt-4">
        <button
          type="button"
          onClick={schliessen}
          className="druckbar rounded-full px-4 py-2.5 text-[0.7rem] font-medium text-grau-stark"
        >
          Abbrechen
        </button>
        {vorschlag.ids.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => kopieren(`${betreff}\n\n${text}`, () => setKopiert(true))}
              className="druckbar flex items-center gap-1.5 rounded-full border border-linie-stark px-4 py-2.5 text-[0.7rem] font-semibold text-tinte"
            >
              <Copy size={12} />
              {kopiert ? "Kopiert" : "Text kopieren"}
            </button>
            <button
              type="button"
              onClick={() => {
                window.open(gmailEntwurfLink({ an, betreff, text }), "_blank", "noopener");
                vermerken();
                schliessen();
              }}
              className="druckbar flex items-center gap-1.5 rounded-full bg-tinte px-5 py-2.5 text-[0.7rem] font-semibold text-grund"
            >
              <ExternalLink size={12} />
              Gmail-Entwurf öffnen
            </button>
          </>
        )}
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

const TON = {
  fehlt: "bg-[#FBE2E2] text-[#9A2727]",
  angefordert: "bg-[#FBEBD1] text-[#8A5A08]",
  liegt_vor: "bg-[#DBF2E6] text-[#0C5E3A]",
  entfaellt: "bg-flaeche-hoch text-grau-stark",
} as const;

export function Finanzierungsdialog({
  objekt,
  schliessen,
}: {
  objekt: Objekt;
  schliessen: () => void;
}) {
  const liste = finanzierungsunterlagen(objekt);
  const da = liste.filter((x) => x.status === "liegt_vor").length;
  const [kopiert, setKopiert] = useState(false);
  const alsText = [
    `Finanzierungsunterlagen ${objekt.kuerzel ? `[${objekt.kuerzel}] ` : ""}${objekt.strasse}, ${objekt.plz} ${objekt.stadt}`,
    "",
    ...liste.map(
      (x) =>
        `${x.status === "liegt_vor" ? "✓" : "–"} ${x.unterlage.titel}${x.datei ? ` (${x.datei.name})` : ` — ${UNTERLAGENSTATUS[x.status]}`}`,
    ),
  ].join("\n");

  return (
    <Dialog
      titel="Finanzierungsunterlagen"
      unterzeile={`${da} von ${liste.length} Basis-Unterlagen liegen vor`}
      schliessen={schliessen}
    >
      <ul className="flex flex-col divide-y divide-linie rounded-xl border border-linie">
        {liste.map((x) => (
          <li key={x.unterlage.id} className="flex items-center gap-2.5 px-3 py-2 text-[0.78rem]">
            <span className="zahl w-5 text-right text-[0.66rem] text-grau">{x.unterlage.nr}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-tinte">{x.unterlage.titel}</span>
              {x.datei && (
                <span className="block truncate text-[0.66rem] text-grau">{x.datei.name}</span>
              )}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-semibold",
                TON[x.status],
              )}
            >
              {UNTERLAGENSTATUS[x.status]}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.66rem] text-grau">
        Download als Paket für die Bank kommt mit Phase 2, wenn die Dateien im Drive liegen. Bis
        dahin die Liste kopieren und die Dateien aus dem Reiter „Dateien“ anhängen.
      </p>
      <div className="mt-5 flex justify-end gap-2.5 border-t border-linie pt-4">
        <button
          type="button"
          onClick={schliessen}
          className="druckbar rounded-full px-4 py-2.5 text-[0.7rem] font-medium text-grau-stark"
        >
          Schließen
        </button>
        <button
          type="button"
          onClick={() => kopieren(alsText, () => setKopiert(true))}
          className="druckbar flex items-center gap-1.5 rounded-full bg-tinte px-5 py-2.5 text-[0.7rem] font-semibold text-grund"
        >
          <Copy size={12} />
          {kopiert ? "Kopiert" : "Liste kopieren"}
        </button>
      </div>
    </Dialog>
  );
}
