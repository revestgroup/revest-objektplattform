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

## Objektfenster

Ein Objekt öffnet als großes Fenster über der Liste (`Fenster` in `AppLayout.tsx`): 92 % breit,
höchstens 1440 px, am Telefon Vollbild. Esc, X oder Klick daneben schließen; J/K blättern in
derselben Stufe. Das offene Objekt steht in `?objekt=`. Kopf, Stufenleiste und Reiter stehen
fest (sticky), nur der Inhalt scrollt. Die Übersicht steht ab `lg:` in drei Spalten.

## Kalkulation ETW

Vorgabe ist `docs/planung/KALKULATION_ETW.md` (Timos Excel). Der Rechenkern steht in
`src/lib/kalkulationEtw.ts` und rechnet ungerundet; gerundet wird nur in der Anzeige.
`src/lib/kalkulationEtw.test.ts` prüft die Werte aus Abschnitt 3 der Vorgabe —
nach jeder Änderung an der Rechnung `bun run test` laufen lassen. Standardwerte und
Katalogpreise liegen in den Einstellungen, Abweichungen je Objekt in `kalkulationEtw`.

## Objektprüfung

Listen, Pflichtpunkte, Ampel und Warnregel stehen in `src/lib/pruefung.ts` (Tests daneben).
Wer irgendwo eine Stufe setzt, nimmt `useStufenwechsel()` aus `components/Pruefung.tsx`
statt `stufeSetzen` direkt und rendert dessen `dialog` mit — sonst fehlt der Prüfhinweis
beim Wechsel nach „Angebot abgegeben“ oder „Gekauft“.

## Ummeldungen

`src/lib/ummeldungen.ts` (Tests daneben). Angelegt wird zentral in `mutieren` im
Objektspeicher, sobald `besitzuebergangAm` gesetzt ist — kein Aufrufer muss daran denken.
Abmeldungen entstehen in `einheitVerkaufen`, unberührte verschwinden bei der Rücknahme.

## Kontaktregister

`src/lib/kontakte.ts` (Tests daneben), Seite `routes/kontakte.tsx`. Ein Kontakt ist ein
Datensatz im Register; am Objekt steht eine Verknüpfung (`Kontakt.kontaktId`, Rolle, Notiz)
mit einer Kopie von Name, Telefon, E-Mail. Stammdaten nur über `kontaktSpeichern` ändern —
das zieht alle Kopien nach. Neue Kontakte am Objekt ohne `kontaktId` übernimmt der
Objektspeicher automatisch ins Register (Dubletten über E-Mail, Telefon, Name).

## Backoffice

`src/lib/backoffice.ts` + `backofficeStore.tsx` (Tests daneben), Seite `routes/backoffice.tsx`.
Weiterleiten (→ Qonto / Projekt / Ablage) verschiebt nach „Erledigt“ und vermerkt die Übergabe
als „wartet“ — die echte Übergabe kommt mit Phase 2. Seitliches Ziehen für breite Boards:
`useSeitlichScroll` in `components/SeitlichScroll.tsx` (auch die Pipeline nutzt ihn).

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
