/**
 * Eigentümerliste WEG (Checkliste Nr. 23): die übrigen Eigentümer im Haus
 * erfassen — aus der Liste einfügen oder von Hand —, mit Quelle und Datum der
 * Angabe. „Übernehmen“ legt sie im Kontaktregister an (Kategorie Eigentümer)
 * und verknüpft sie mit dem Objekt, für eine spätere Ansprache wegen weiterer
 * Wohnungen. „Kontakt nicht gewünscht“ gilt vor jeder Ansprache.
 */
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { eigentuemerAuslesen, neueEigentuemerId } from "../lib/eigentuemerliste";
import type { Eigentuemereintrag, Objekt } from "../lib/objekte";
import { useObjekte } from "../lib/objekteStore";
import { Dialog } from "./Dialog";

export function Eigentuemerdialog({
  objekt,
  schliessen,
}: {
  objekt: Objekt;
  schliessen: () => void;
}) {
  const { eigentuemerSpeichern } = useObjekte();
  const heute = new Date().toISOString().slice(0, 10);
  const [quelle, setQuelle] = useState(objekt.eigentuemer?.[0]?.quelle ?? "Eigentümerliste WEG");
  const [angabeAm, setAngabeAm] = useState(objekt.eigentuemer?.[0]?.angabeAm ?? heute);
  const [liste, setListe] = useState<Eigentuemereintrag[]>(objekt.eigentuemer ?? []);
  const [text, setText] = useState("");

  const setze = (id: string, teil: Partial<Eigentuemereintrag>) =>
    setListe((alt) => alt.map((e) => (e.id === id ? { ...e, ...teil } : e)));

  const feld =
    "h-8 w-full min-w-0 rounded-lg border border-linie bg-flaeche px-2 text-[0.76rem] text-tinte focus:border-linie-stark focus:outline-none";

  return (
    <Dialog
      titel="Eigentümerliste WEG"
      unterzeile={`${objekt.strasse} · für eine spätere Ansprache wegen weiterer Wohnungen`}
      schliessen={schliessen}
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="mini-label">Quelle der Angabe</span>
            <input className={feld} value={quelle} onChange={(e) => setQuelle(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="mini-label">Stand vom</span>
            <input
              type="date"
              className={feld}
              value={angabeAm}
              onChange={(e) => setAngabeAm(e.target.value)}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="mini-label">Aus der Liste einfügen</span>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Name ⇥ Anschrift ⇥ WE — eine Zeile je Eigentümer (aus Excel kopieren)"}
            className="w-full resize-y rounded-xl border border-linie bg-flaeche px-3 py-2 text-[0.74rem] leading-relaxed text-tinte focus:border-linie-stark focus:outline-none"
          />
        </label>
        {text.trim() && (
          <button
            type="button"
            onClick={() => {
              setListe((alt) => [
                ...alt,
                ...eigentuemerAuslesen(text, {
                  quelle: quelle || null,
                  angabeAm: angabeAm || null,
                }),
              ]);
              setText("");
            }}
            className="druckbar self-start rounded-full border border-linie-stark px-3.5 py-1.5 text-[0.68rem] font-semibold text-tinte"
          >
            Zeilen einlesen
          </button>
        )}

        {/* ----- Liste ----- */}
        <div className="overflow-x-auto rounded-xl border border-linie">
          <table className="w-full min-w-[34rem] text-left text-[0.74rem]">
            <thead>
              <tr className="bg-flaeche-hoch text-[0.58rem] font-semibold tracking-[0.12em] text-grau uppercase">
                <th className="px-2 py-1.5">Name</th>
                <th className="px-2 py-1.5">Anschrift</th>
                <th className="w-16 px-2 py-1.5">WE</th>
                <th className="w-24 px-2 py-1.5">Kein Kontakt</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {liste.map((e) => (
                <tr key={e.id} className="border-t border-linie">
                  <td className="px-1.5 py-1">
                    <input
                      className={feld}
                      value={e.name}
                      onChange={(ev) => setze(e.id, { name: ev.target.value })}
                      aria-label="Name"
                    />
                  </td>
                  <td className="px-1.5 py-1">
                    <input
                      className={feld}
                      value={e.anschrift ?? ""}
                      onChange={(ev) => setze(e.id, { anschrift: ev.target.value || null })}
                      aria-label="Anschrift"
                    />
                  </td>
                  <td className="px-1.5 py-1">
                    <input
                      className={feld}
                      value={e.weNr ?? ""}
                      onChange={(ev) => setze(e.id, { weNr: ev.target.value || null })}
                      aria-label="WE-Nr."
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={e.kontaktNichtGewuenscht}
                      onChange={(ev) => setze(e.id, { kontaktNichtGewuenscht: ev.target.checked })}
                      aria-label={`${e.name}: Kontakt nicht gewünscht`}
                      className="size-4 accent-[#CF4848]"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <button
                      type="button"
                      onClick={() => setListe((alt) => alt.filter((x) => x.id !== e.id))}
                      aria-label={`${e.name} entfernen`}
                      className="druckbar flex size-6 items-center justify-center rounded-full text-grau hover:text-[#9A2727]"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {liste.length === 0 && (
            <p className="px-3 py-4 text-center text-[0.72rem] text-grau">
              Noch kein Eigentümer erfasst.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            setListe((alt) => [
              ...alt,
              {
                id: neueEigentuemerId(),
                name: "",
                anschrift: null,
                weNr: null,
                kontaktNichtGewuenscht: false,
                quelle: quelle || null,
                angabeAm: angabeAm || null,
                kontaktId: null,
              },
            ])
          }
          className="druckbar flex items-center gap-1.5 self-start text-[0.7rem] font-semibold text-grau-stark hover:text-tinte"
        >
          <Plus size={12} />
          Eigentümer von Hand
        </button>
        <p className="text-[0.64rem] text-grau">
          Phase 2: Die Liste wird aus der hochgeladenen Datei ausgelesen. Quelle und Datum gelten
          für neu eingelesene Zeilen.
        </p>
      </div>

      <div className="mt-5 flex justify-end gap-2.5 border-t border-linie pt-4">
        <button
          type="button"
          onClick={schliessen}
          className="druckbar rounded-full px-4 py-2.5 text-[0.7rem] font-medium text-grau-stark"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={() => {
            eigentuemerSpeichern(
              objekt.id,
              liste.filter((e) => e.name.trim()).map((e) => ({ ...e, name: e.name.trim() })),
            );
            schliessen();
          }}
          className="druckbar rounded-full bg-tinte px-5 py-2.5 text-[0.7rem] font-semibold text-grund"
        >
          Übernehmen ins Kontaktregister
        </button>
      </div>
    </Dialog>
  );
}
