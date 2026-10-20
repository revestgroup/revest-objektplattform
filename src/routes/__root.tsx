import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useNavigate,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { AppLayout } from "../components/AppLayout";
import { AuthProvider, useAuth } from "../lib/auth";
import { ObjekteProvider } from "../lib/objekteStore";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "REVEST Objektplattform" },
      {
        name: "description",
        content: "Interne Ankaufs- und Projektverwaltung der Revest Projekt GmbH",
      },
      // Interne Plattform — darf nicht in Suchmaschinen landen.
      { name: "robots", content: "noindex, nofollow, noarchive" },
      { name: "theme-color", content: "#0a0a0a" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Inter:wght@400;500;600&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        href: `${import.meta.env.BASE_URL}logo/revest-icon-schwarz.png`,
        type: "image/png",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NichtGefunden,
  errorComponent: Fehler,
});

/** Grundfarbe direkt im Kopf, damit beim ersten Bild kein Farbsprung entsteht. */
const BOOT_CSS = `html,body{margin:0;background:#f5f6f8;color:#10131a}`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <head>
        <style dangerouslySetInnerHTML={{ __html: BOOT_CSS }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ObjekteProvider>
          <Schleuse />
        </ObjekteProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Leitet auf die Anmeldung um, solange keine Sitzung besteht.
 * Die Karte braucht den vollen Viewport und bekommt deshalb kein Padding.
 */
function Schleuse() {
  const { nutzer, bereit } = useAuth();
  const pfad = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const istAnmeldung = pfad === "/";

  useEffect(() => {
    if (!bereit) return;
    if (!nutzer && !istAnmeldung) navigate({ to: "/", replace: true });
  }, [bereit, nutzer, istAnmeldung, navigate]);

  if (istAnmeldung) return <Outlet />;

  // Bis die Sitzung geprüft ist: Rahmen steht, Inhalt bleibt leer.
  if (!bereit || !nutzer) return <AppLayout />;

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function NichtGefunden() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="headline text-[7rem] text-linie-stark">404</div>
      <div className="mt-2 text-base font-medium text-tinte">Diese Seite gibt es nicht.</div>
      <p className="mt-2 max-w-xs text-sm text-grau">
        Entweder ein Tippfehler in der Adresse oder ein Link, der ins Leere führt.
      </p>
      <Link
        to="/karte"
        className="druckbar mt-8 border border-linie-stark px-6 py-2.5 text-xs font-medium tracking-[0.18em] uppercase text-tinte"
      >
        Zur Karte
      </Link>
    </div>
  );
}

function Fehler({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mini-label">Fehler</div>
      <div className="headline mt-3 text-3xl">Diese Seite ist nicht geladen</div>
      <p className="mt-3 max-w-sm text-sm text-grau">
        {error instanceof Error ? error.message : "Unbekannter Fehler."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="druckbar mt-8 rounded-full border border-linie-stark px-6 py-2.5 text-xs font-medium tracking-[0.18em] uppercase text-tinte"
      >
        Nochmal versuchen
      </button>
    </div>
  );
}
