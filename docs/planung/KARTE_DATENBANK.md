# Karte = Objektdatenbank (Konzept, Entwurf 1)

Stand 08.11.2026 · Grundlage: Timos monday-Board „Objektliste“, gegliedert nach Informationsdichte.

## Idee

Die Karte ist nicht nur die Pipeline auf einer Landkarte, sondern die **zentrale Datenbank aller Gebäude im Zielgebiet**,
auch solcher, die nie angeboten wurden. Jedes Gebäude sammelt über Jahre alles, was Revest weiß:
Eigentümer, Gespräche, Angebote, Transaktionen. Wichtigste Information ist der Eigentümer.

Ein Gebäude ist der dauerhafte Datensatz. Ein Ankaufs-Objekt (Pipeline) ist ein Vorgang an diesem Gebäude.
Ein Gebäude kann viele Vorgänge haben (2024 angeboten, abgesagt, 2026 wieder angeboten).

## Informationsstufen (aus monday übernommen)

| Stufe | Bedeutung | Farbe auf der Karte |
|---|---|---|
| 1 Erfasst | Adresse und Eckdaten bekannt, Eigentümer unbekannt | Blau, hell |
| 2 Eigentümer bekannt | Eigentümer im Kontaktregister verknüpft | Orange |
| 3 Im Gespräch | Kontakt aufgenommen, Gesprächsstand dokumentiert | Orange, kräftig |
| 4 Deal | Läuft in der Ankaufs-Pipeline (Link zum Vorgang) | Gelb/Gold |
| Gekauft | Revest-Bestand oder -Projekt | Grün |
| Ausgeschlossen | Sozial / Städtisch / Genossenschaft, kein Ziel | Grau |

Zusätzlich als Merkmal (nicht als Stufe): **WEG** (aufgeteilt, Einzelwohnungen möglich, Hausverwaltung bekannt?).

Die Stufe ergibt sich soweit möglich automatisch: Eigentümer verknüpft → mind. Stufe 2; Vorgang in Pipeline → Stufe 4;
Vorgang „Gekauft“ → Gekauft. Von Hand nur „Im Gespräch“ und „Ausgeschlossen“.

## Datensatz Gebäude

- **Lage:** Adresse, Stadtteil, Koordinate, Umriss (bestehende Kartenlogik)
- **Eckdaten:** Objektart, Baujahr, Einheiten, Wohn-/Gewerbefläche, Grundstück, Zustand, WEG ja/nein,
  Hausverwaltung (Kontakt), Denkmalschutz
- **Eigentümer:** ein oder mehrere Kontakte aus dem Register mit Anteil/Rolle (Eigentümer, Erbengemeinschaft, Bevollmächtigter),
  **Quelle der Angabe und Datum** (z. B. „Gespräch mit Nachbar 03/2026“, „Exposé“, „Grundbuch im Kaufprozess“)
- **Gesprächsstand:** Notizverlauf mit Datum, nächste Wiedervorlage (erzeugt Aufgabe)
- **Vorgänge:** alle Ankaufs-Objekte an dieser Adresse mit Stufe und Preisgeschichte
- **Transaktionsdaten:** Tabelle je Verkauf: Datum, Einheit (ganzes Haus oder WE-Nr.), Preis, m², €/m², Käufer (optional),
  Quelle (eigene Prüfung, Notarvertrag, Makler, Gutachterausschuss/BORIS). Entspricht monday „Verkauft – Daten aus Prüfung“.

## Ansichten

- **Karte:** alle Gebäude als Punkte/Umrisse in Stufenfarbe, Filter nach Stufe, Objektart, Einheiten, WEG, Stadtteil.
  Klick öffnet das Gebäude im großen Fenster (wie Objekt, Punkt 3b).
- **Liste:** gleiche Daten als Tabelle, gruppiert nach Stufe wie in monday (Erfasst 36 · Eigentümer bekannt 23 · …).
- **Zahlenleiste:** Anzahl je Stufe, z. B. „36 erfasst · 23 Eigentümer bekannt · 9 Deals“.

## Verknüpfungen (der eigentliche Mehrwert)

1. **Ankauf-Eingang:** Jedes eingehende Angebot wird über die Adresse einem Gebäude zugeordnet oder legt eines an.
   So wächst die Datenbank automatisch mit den 60 Angeboten pro Woche.
2. **Kalkulation:** Im Reiter Kalkulation „Vergleichstransaktionen“: Verkäufe im selben Gebäude und im Umkreis
   (z. B. 500 m, letzte 3 Jahre) mit €/m², als Grundlage für Worst/Mid/Best.
3. **Kontaktregister:** Am Eigentümer-Kontakt sieht man alle seine Gebäude.
4. **Aufgaben:** Wiedervorlage am Gebäude („Eigentümer in 6 Monaten erneut ansprechen“).

## Datenschutz (kurz)

Eigentümerdaten sind personenbezogen. Deshalb je Angabe Quelle und Datum speichern, Zugriff nur für Revest-intern,
und ein Feld „Kontakt nicht gewünscht“, das die Person für Ansprache sperrt. Löschfristen später festlegen.

## Übernahme aus monday

CSV-Export des Boards „Objektliste“ je Gruppe → Import mit Zuordnung der Gruppen zu den Stufen
(Erfasste Objekte → 1, Eigentümerkontakt → 2/3, Sozial/Städtisch → Ausgeschlossen, DEALS → 4,
Verkauft – Daten aus Prüfung → Transaktionsdaten, WEG-Objektliste → Merkmal WEG). Adressen werden geokodiert.
