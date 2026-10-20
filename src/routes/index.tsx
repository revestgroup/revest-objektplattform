import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../lib/auth";

export const Route = createFileRoute("/")({ component: Anmeldung });

function Anmeldung() {
  const { nutzer, bereit, anmelden } = useAuth();
  const navigate = useNavigate();

  const [kennung, setKennung] = useState("");
  const [kennwort, setKennwort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);

  // Wer schon angemeldet ist, landet direkt auf der Karte.
  useEffect(() => {
    if (bereit && nutzer) navigate({ to: "/karte", replace: true });
  }, [bereit, nutzer, navigate]);

  function absenden(e: React.FormEvent) {
    e.preventDefault();
    const ergebnis = anmelden(kennung, kennwort);
    if (!ergebnis.ok) {
      setFehler(ergebnis.fehler ?? "Anmeldung fehlgeschlagen.");
      return;
    }
    setFehler(null);
    navigate({ to: "/karte", replace: true });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-flaeche">
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[360px]">
          <img
            src={`${import.meta.env.BASE_URL}logo/revest-wortmarke-schwarz.png`}
            alt="REVEST"
            className="eintritt mx-auto h-[72px] w-auto"
            width={443}
            height={72}
            style={{ animationDelay: "0ms" }}
          />

          <form
            onSubmit={absenden}
            className="eintritt mt-12 space-y-5"
            style={{ animationDelay: "80ms" }}
          >
            <Feld
              id="kennung"
              label="E-Mail"
              typ="email"
              wert={kennung}
              setWert={setKennung}
              autoComplete="username"
              autoFocus
            />
            <Feld
              id="kennwort"
              label="Passwort"
              typ="password"
              wert={kennwort}
              setWert={setKennwort}
              autoComplete="current-password"
            />

            {/* Höhe reserviert, damit das Formular beim Fehler nicht springt. */}
            <div className="min-h-[1.1rem] text-[0.72rem] text-grau-stark" aria-live="polite">
              {fehler}
            </div>

            <button
              type="submit"
              className="druckbar group flex w-full items-center justify-center gap-2.5 rounded-full bg-tinte px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.18em] uppercase text-grund shadow-karte hover:bg-grau-stark"
            >
              Anmelden
              <ArrowRight
                size={14}
                strokeWidth={2.25}
                className="transition-transform duration-200 ease-out-stark group-hover:translate-x-1"
              />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Feld({
  id,
  label,
  typ,
  wert,
  setWert,
  autoComplete,
  autoFocus,
}: {
  id: string;
  label: string;
  typ: string;
  wert: string;
  setWert: (v: string) => void;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mini-label block">
        {label}
      </label>
      <input
        id={id}
        type={typ}
        value={wert}
        onChange={(e) => setWert(e.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        className="mt-2 w-full border border-linie bg-flaeche px-3.5 py-3 text-sm text-tinte transition-colors duration-150 ease-out placeholder:text-grau focus:border-linie-stark focus:outline-none"
      />
    </div>
  );
}
