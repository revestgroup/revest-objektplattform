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
import { EinstellungenProvider } from "../lib/einstellungenStore";
import { LeadProvider } from "../lib/leadStore";
import { ObjekteProvider } from "../lib/objekteStore";
import { AufgabenProvider } from "../lib/aufgabenStore";
import { VermietungProvider } from "../lib/vermietungStore";
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
        <EinstellungenProvider>
          <ObjekteProvider>
            <AufgabenProvider>
              <VermietungProvider>
                <LeadProvider>
                  <Schleuse />
                </LeadProvider>
              </VermietungProvider>
            </AufgabenProvider>
          </ObjekteProvider>
        </EinstellungenProvider>
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
      <Link
        to="/karte"
        className="druckbar mt-8 rounded-full border border-linie-stark px-6 py-2.5 text-xs font-medium tracking-[0.18em] uppercase text-tinte"
      >
        Zur Karte
      </Link>
    </div>
  );
}

/**
 * Ein offener Tab überlebt den nächsten Deploy nicht: die Seite hält die alte
 * index.html im Speicher und lädt beim Seitenwechsel ein Teilstück nach, dessen
 * Dateiname es nach dem Neubau nicht mehr gibt. Der Fehler sieht aus wie ein
 * Defekt, ist aber nur ein veralteter Tab.
 *
 * Deshalb lädt die Seite in genau diesem Fall einmal selbst neu. Das Merkzeichen
 * liegt in der Sitzung, damit aus einem echten Netzfehler keine Schleife wird —
 * beim zweiten Mal bleibt die Meldung stehen.
 */
function istVeralteterStand(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(
    text,
  );
}

const NEU_GELADEN = "revest.neugeladen";

function Fehler({ error, reset }: ErrorComponentProps) {
  const veraltet = istVeralteterStand(error);

  useEffect(() => {
    if (!veraltet || sessionStorage.getItem(NEU_GELADEN)) return;
    sessionStorage.setItem(NEU_GELADEN, "1");
    window.location.reload();
  }, [veraltet]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mini-label">Fehler</div>
      <div className="headline mt-3 text-3xl">
        {veraltet ? "Neue Fassung verfügbar" : "Diese Seite ist nicht geladen"}
      </div>
      <p className="mt-3 max-w-sm text-sm text-grau">
        {veraltet
          ? "Dieser Tab lief noch auf einem älteren Stand. Die Seite lädt sich gerade neu."
          : error instanceof Error
            ? error.message
            : "Unbekannter Fehler."}
      </p>
      <button
        type="button"
        onClick={() => (veraltet ? window.location.reload() : reset())}
        className="druckbar mt-8 rounded-full border border-linie-stark px-6 py-2.5 text-xs font-medium tracking-[0.18em] uppercase text-tinte"
      >
        {veraltet ? "Jetzt neu laden" : "Nochmal versuchen"}
      </button>
    </div>
  );
}
