/** Hinweis, solange keine Google-Kalender-ID hinterlegt ist. */
import { Link } from "@tanstack/react-router";

export function KeineId() {
  return (
    <p className="rounded-2xl border border-dashed border-linie-stark px-4 py-6 text-center text-[0.76rem] text-grau">
      Noch keine Google-Kalender-ID hinterlegt —{" "}
      <Link to="/einstellungen" className="text-tinte underline">
        in den Einstellungen eintragen
      </Link>
      .
    </p>
  );
}
