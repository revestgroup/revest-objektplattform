# REVEST Objektplattform

Interne Ankaufs- und Projektverwaltung der Revest Projekt GmbH.

## Stand

Phase 1: **reines Frontend mit Mock-Daten.** Kein Backend, keine Datenbank, kein echtes
Auth. Alle Daten kommen aus `src/lib/mockDaten.ts` und leben im Browser-State.
Das ist Absicht — das Design wird erst final gemacht, dann kommt das Backend.

## Design-Regeln

- **Hell und freundlich.** Grund hell, Flächen leicht abgesetzt. Tokens in `src/styles.css`.
- **Alles leicht abgerundet.** Fester Wortschatz, keine Einzelfallentscheidungen:
  - `rounded-full` — Icon-Buttons, Aktionspillen, Plaketten, Filterchips, Balken
  - `rounded-lg` (14 px) — Listenzeilen, Navigationspunkte
  - `rounded-xl` (18 px) — innere Steuerelemente, Dropzones, Kennzahlkacheln
  - `rounded-2xl` (24 px) — Karten, Container, Schubladenkante
  - Eingaben und Buttons holen ihren Radius zentral aus `@layer base` in `styles.css`.
- **Status ist eine Ampel, keine Helligkeit.** Grün angekauft, Gelb in Prüfung, Rot abgesagt.
  Jede Stufe trägt in `STUFEN` (`src/lib/objekte.ts`) ein Tripel `{farbe, weich, tief}`:
  `farbe` für Punkte auf der Karte, `weich` als Fläche, `tief` als Schrift.
- Versal-Labels gesperrt (`tracking-[0.18em] uppercase`), Headlines in Archivo.
- Animationen unter 300 ms, nur `transform` und `opacity`, Staffelung 24–28 ms,
  `.druckbar` drückt beim Klick auf `scale(0.97)`.
- **Alles ist deutsch benannt** — Komponenten, Props, Variablen, Dateien.

## Breite Beträge

Schmale Kacheln bekommen `f.eurKurz` („2,45 Mio €"), nicht `f.eur`. Ausgeschrieben
läuft ein Millionenbetrag auf dem Telefon über den Rand.

## Schubladen sind schmal

Die Objektschublade ist rund 480 px breit — unabhängig vom Fenster. `md:`-Klassen messen
aber das Fenster, nicht die Schublade. Darin also **keine** `md:`-Umbrüche verwenden,
sondern gleich für die schmale Spalte gestalten.

## Anlegemaske

Offen stehen nur Lage, Objekt, Preis und Miete, Bilder, Notiz. Alles weitere liegt in
`Klappbereich`en (`src/components/Felder.tsx`) und ist zugeklappt — die Maske soll beim
Öffnen wie ein kurzes Formular wirken, ohne ein Feld zu verlieren.

## Karte

MapLibre GL JS mit CARTO Positron als Basiskarte (kein API-Key nötig), Esri World Imagery
als zuschaltbares Luftbild darunter. Objekte werden als **eigene GeoJSON-Ebene** darüber
gezeichnet — nicht als OSM-Gebäude markiert.

**Wichtig:** OSM-Gebäude-IDs sind nicht stabil und dürfen nie als Schlüssel dienen.
Jedes Objekt speichert seine eigene Koordinate und seinen eigenen Umriss als Snapshot.

## Später (Phase 2)

- Supabase für Daten + echtes Auth
- Google-Drive-Spiegelung der Dokumentenordner (Struktur steht schon in `DOKUMENT_ORDNER`)
- Übergabe von Einheiten an AUVERO, sobald Status `im_vertrieb`
