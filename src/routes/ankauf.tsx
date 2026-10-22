/**
 * Ankauf — alles, worüber noch entschieden wird.
 *
 * Die Seite ist bewusst nur ein Aufruf: Ankauf und Projekte unterscheiden sich
 * in vier Kopfzahlen und einer Filterzeile, nicht in ihrem Wesen. Zwei Kopien
 * derselben Liste wären zwei Orte, an denen man dieselbe Änderung vergisst.
 *
 * `?objekt=` öffnet ein Objekt direkt. Darüber verlinken die Aufgaben — eine
 * Aufgabe ohne Weg zum Objekt ist nur eine Erinnerung.
 */
import { createFileRoute } from "@tanstack/react-router";

import { Objektliste } from "../components/Objektliste";

export const Route = createFileRoute("/ankauf")({
  validateSearch: (such: Record<string, unknown>): { objekt?: string } =>
    typeof such.objekt === "string" ? { objekt: such.objekt } : {},
  component: AnkaufSeite,
});

function AnkaufSeite() {
  const { objekt } = Route.useSearch();
  return <Objektliste bereich="ankauf" oeffne={objekt} />;
}
