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

Vorgabe ist `KALKULATION_ETW.md` (Timos Excel, liegt lokal unter `docs/planung`, nicht im Repo). Der Rechenkern steht in
`src/lib/kalkulationEtw.ts` und rechnet ungerundet; gerundet wird nur in der Anzeige.
`src/lib/kalkulationEtw.test.ts` prüft die Werte aus Abschnitt 3 der Vorgabe. Stellplatz/Garage steht je Szenario, zählt zum Gesamtverkaufspreis (Vermarktung, Gewinn), nicht zum €/m² —
nach jeder Änderung an der Rechnung `bun run test` laufen lassen. Standardwerte und
Katalogpreise liegen in den Einstellungen, Abweichungen je Objekt in `kalkulationEtw`.

## Checkliste Ankauf

`src/lib/pruefung.ts` (Tests daneben): 24 Unterlagen in drei Gruppen (Basis · Objektart · Intern),
die Liste stellt sich nach Objektart (WEG = ETW, Haus = EFH/MFH/WGH) und Steckbrief (vermietet,
Erbbaurecht) selbst zusammen. Gewarnt wird beim Wechsel ins Angebot/Gekauft nur bei fehlenden
Basis-Unterlagen oder kritischen Prüfpunkten. Frühere IDs (z. B. `aufteilungsplan`) gelten über
`ALTE_IDS` weiter. Wer irgendwo eine Stufe setzt, nimmt `useStufenwechsel()` aus
`components/Pruefung.tsx` statt `stufeSetzen` direkt und rendert dessen `dialog` mit.
„Fehlende Unterlagen anfordern“ öffnet nur einen Gmail-Entwurf (nichts wird gesendet).
Eigentümerliste WEG: `lib/eigentuemerliste.ts`, Übernahme ins Register über `eigentuemerSpeichern`.

## Abwicklung nach Kauf und Verkauf (Ummeldungen)

`src/lib/ummeldungen.ts` (Tests daneben). Die Liste je Richtung stellt sich nach der Objektart
zusammen (`artenFuer`: ETW, Haus = EFH/MFH/WGH, Grundstück; verkaufte Einheit = ETW). Angelegt
bzw. ergänzt wird zentral in `mutieren` (`mitUmmeldungen`), Abmeldungen in `einheitVerkaufen`;
gelöscht wird nichts, `sichtbareUmmeldungen` blendet unberührte, nicht zutreffende Punkte aus.
Kopf „Übergabe“, Zähler, Objektinfos und Vorlage: `components/Abwicklung.tsx`. Der
Schlüsselbox-Code steht nur in `infos.schluesselboxCode` (verdecktes Feld) — nie in Notizen,
Verlauf, Listen oder Beispieldaten; `infosText` lässt ihn weg.
Übergabeprotokoll (Block O): `lib/uebergabe.ts` (Tests daneben), `Objekt.uebergaben` je Richtung
und Einheit; Zähler bleiben in `Objekt.zaehler` (eine Liste für Protokoll und Ab-/Ummeldungen).
`ausAnkaufUebernehmen` übernimmt Zähler/Schlüssel in den Verkauf, nur Stände sind neu.

## Nachberechnung

`src/lib/nachberechnung.ts` (Tests daneben, inkl. Prüfwert 480 €/Jahr, Stichtag 15.08. → 297,21 /
182,79), Reiter `components/Nachberechnung.tsx`. Taggenau, von/bis eingeschlossen, der Stichtag
zählt zur neuen Seite; Revest-Anteil auf Cent gerundet, die Gegenseite ist der Rest. Platzhalter
entstehen in `einheitVerkaufen` (`mitPlatzhaltern`), der Abgleich mit den Abmeldungen läuft in
`mutieren` (`mitAbgleich`). Beträge hier immer mit Cent anzeigen.

## Projektabschluss

`src/lib/projektabschluss.ts` (Tests daneben), Reiter `components/Abschluss.tsx`: Verkaufsunterlagen
für den Datenraum (Vorrang Ordner `05_Verkauf/00_Vertrieb`), Nachkalkulation Soll (ETW-Kalkulation
Mid-Case bzw. Verkaufsplanung) gegen Ist (von Hand, vorbelegt aus Kaufpreis, Gewerken,
Nachberechnung, verkauften Einheiten), Abschluss-Checkliste mit automatisch erkannten Punkten.

## Auswertung

`src/lib/auswertung.ts` (Tests daneben), oberer Teil der Seite in `components/Leadauswertung.tsx`.
Alles aus der Pipeline-Historie: Stufenwechsel tragen seit Block M `stufe` im Verlaufseintrag,
ältere werden aus dem Text gelesen (`ALTE_NAMEN`). Übersprungene Stufen zählen mit. Ziele stehen
in den Einstellungen (`revest.ziele.v1`) und werden auf den gewählten Zeitraum umgerechnet.

## Cockpit

Startseite `/cockpit` (`routes/cockpit.tsx`, `/dashboard` leitet um), Logik `src/lib/cockpit.ts` +
`cockpitStore.tsx` (Tests daneben). Rollen **Geschäftsführung** und **Backoffice** über den Umschalter
„Ich arbeite gerade als …“ (`revest.rolle.v1`), bis Phase 2 ohne echte Rechte. GF sieht die Reiter
Alltag und Persönlich · Visionboard, das Backoffice nur seine Ansicht — `reiterWaehlen` lässt den
persönlichen Reiter für das Backoffice nie zu, auch nicht über `?reiter=`. `zustaendig` an Aufgaben
und Backoffice-Karten ist optional: fehlt es, gilt `zustaendigAufgabe` (GF) bzw. `zustaendigKarte`
(Backoffice). Keine Beispielzahlen aus dem Entwurf — alles aus den vorhandenen Daten zählen.

Reiter Alltag: `components/CockpitAlltag.tsx`. Kennzahlen über `kennzahlen` (dieselben Funktionen
wie die Auswertung). Sprint-Balken kommen aus Terminen (Aufgaben der Art Termin/Besichtigung),
Aufgaben mit `zeitblock` (von–bis am Fälligkeitstag) und eigenen `Sprintpunkt`en; `sprintZeilen`
schneidet aufs Fenster, belegt in Woche/Monat ganze Tage und legt Überschneidungen in Spuren.
Gedanken, Fragen an Timo, Sprint-Punkte, Bereiche und Tisch-Vermerke stehen in `revest.cockpit.v1`.
„Heute auf dem Tisch“: „Backoffice“ setzt `zustaendig` (Aufgabe/Karte) oder legt eine Backoffice-Karte
an, „später“ gilt nur heute (Aufgaben rücken auf morgen). „Frage an Timo“ (`components/FrageAnTimo.tsx`)
hängt am Kartenfenster im Backoffice; „Interessant“ in den Entscheidungen nimmt
`useAngebotUebernehmen` aus `components/Eingang.tsx`. „+ Termin“ legt eine Termin-Aufgabe an, schreibt
in den Objektverlauf und öffnet Google Kalender vorausgefüllt (`googleTerminAdresse`).

Reiter Persönlich · Visionboard: `components/CockpitPersoenlich.tsx`, Logik `lib/persoenlich.ts`,
Speicher `persoenlichStore.tsx` unter eigenem Schlüssel `revest.persoenlich.v1` (getrennt von den
Geschäftsdaten). Keine Beispielinhalte: Das Board startet mit leeren Kacheln je Startkategorie.
Tagesfokus je Datum (`fokusSerie` zählt die Tage in Folge), täglicher Impuls über `impulsFuer` (nur
gefüllte Kacheln, „nächste“ gilt nur am selben Tag). Bilder werden im Browser auf 800 px verkleinert
und als data:-URL gespeichert; ist der Speicher voll, zeigt der Reiter einen Hinweis. Kachel-Sätze
nicht mit `.headline` setzen (Versalien), sondern `font-display`.

## Kontaktregister

`src/lib/kontakte.ts` (Tests daneben), Seite `routes/kontakte.tsx`. Ein Kontakt ist ein
Datensatz im Register; am Objekt steht eine Verknüpfung (`Kontakt.kontaktId`, Rolle, Notiz)
mit einer Kopie von Name, Telefon, E-Mail. Stammdaten nur über `kontaktSpeichern` ändern —
das zieht alle Kopien nach. Neue Kontakte am Objekt ohne `kontaktId` übernimmt der
Objektspeicher automatisch ins Register (Dubletten über E-Mail, Telefon, Name).

## Backoffice

`src/lib/backoffice.ts` + `backofficeStore.tsx` (Tests daneben), Seite `routes/backoffice.tsx`.
Grundregel: Nichts verschwindet, bis die Übergabe bestätigt ist. Weiterleiten (→ Qonto / Projekt /
Ablage) startet eine Übergabe (wartet → übertragen → bestätigt | fehlgeschlagen); die Karte steht
bis dahin in der Spalte ihres Ziels (`ortVon`). „bestätigt“ braucht einen Link/Nachweis und legt
sie ins Archiv (`archiviertAm`); `haengtFest` (2 Tage) speist die Warnung auf der Startseite. Seitliches Ziehen für breite Boards:
`useSeitlichScroll` in `components/SeitlichScroll.tsx` (auch die Pipeline nutzt ihn).

## Mail to Board

`src/lib/mailToBoard.ts` (Tests daneben) liest eingefügten Mailtext und rohe .eml (MIME,
RFC 2047, quoted-printable/base64, Anhänge) und erkennt das Objekt über Kürzel oder Adresse.
Dialog `components/MailToBoard.tsx`, Karte über `mailAufnehmen` im Backoffice-Speicher.
`BOARD_ADRESSE` ist bis Phase 2 ein Platzhalter.

## Mail & Aktivitäten

`src/lib/aktivitaeten.ts` (Tests daneben), Oberfläche `components/Aktivitaeten.tsx`. Der Verlauf
ist die Zeitleiste: Einträge vom Typ `mail`, `telefonat`, `termin` tragen ihre Details in eigenen
Feldern, `quelle`/`externeId` sind für Gmail und Kalender in Phase 2 vorbereitet. Neue Einträge
über `aktivitaetEintragen`. Termin und Telefonat mit Wiedervorlage legen zusätzlich eine Aufgabe an.

## Ankauf-Eingang

`src/lib/eingang.ts` + `eingangStore.tsx` (Tests daneben), Ansicht `components/Eingang.tsx`,
im Ankauf als dritte Ansicht „Eingang“ neben Liste und Pipeline. `textAuslesen` füllt nur,
was sicher erkannt wird — lieber leer als falsch. `wiedererkennen` gleicht über die
vereinheitlichte Adresse mit Objekten und früheren Angeboten ab. „Interessant“ legt das Objekt
auf „Neu“ an (Punkt per `geocode`, Treffer außerhalb Ulm/Neu-Ulm zählen nicht) oder hängt bei
bekannten Objekten die Preisnennung an. Das Suchprofil steht in den Einstellungen.

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
