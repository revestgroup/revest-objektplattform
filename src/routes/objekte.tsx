/**
 * Die frühere Objektliste liegt jetzt in „Ankauf“ und „Projekte“.
 *
 * Die Adresse bleibt trotzdem bestehen: ein Lesezeichen oder ein geteilter Link
 * soll nicht ins Leere führen, nur weil wir die Navigation umgebaut haben.
 * Wer hierher kommt, landet im Ankauf — dort beginnt jeder Vorgang.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/objekte")({
  beforeLoad: () => {
    throw redirect({ to: "/ankauf" });
  },
});
