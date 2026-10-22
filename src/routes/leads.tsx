/**
 * Die Leads sind in die Mietverwaltung gewandert — es sind Mieter-Leads, keine
 * Objekt-Leads. Die Adresse bleibt erreichbar, weil ein Lesezeichen sonst ins
 * Leere zeigt.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/leads")({
  beforeLoad: () => {
    throw redirect({ to: "/mietverwaltung" });
  },
});
