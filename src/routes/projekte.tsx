/**
 * Projekte — was gekauft ist.
 *
 * Siehe `ankauf.tsx`: dieselbe Liste, andere Stufe.
 */
import { createFileRoute } from "@tanstack/react-router";

import { Objektliste } from "../components/Objektliste";

export const Route = createFileRoute("/projekte")({
  validateSearch: (such: Record<string, unknown>): { objekt?: string } =>
    typeof such.objekt === "string" ? { objekt: such.objekt } : {},
  component: ProjekteSeite,
});

function ProjekteSeite() {
  const { objekt } = Route.useSearch();
  return <Objektliste bereich="projekte" oeffne={objekt} />;
}
