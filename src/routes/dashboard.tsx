/**
 * Die frühere Übersicht. Das Cockpit hat sie ersetzt; alte Lesezeichen und
 * Links landen dort.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/cockpit", replace: true });
  },
});
