# Kalkulation Eigentumswohnung (Basis)

Vorlage: Timos Excel „Sanierungskalkulation“. Diese Rechnung wird 1:1 in der Plattform abgebildet.
Gilt vorerst für **Eigentumswohnungen**. Eine Variante für Mehrfamilienhäuser folgt später.
Alle Prozentsätze und Preise sind **Vorgabewerte**, die je Objekt überschrieben werden können
und deren Standardwerte in den Einstellungen gepflegt werden.

## 1. Eingaben

| Bereich | Feld | Vorgabe | Hinweis |
|---|---|---|---|
| Objekt | Wohnfläche m² | aus Objekt | |
| Ankauf | Kaufpreis | aus Objekt | |
| Ankauf | Grunderwerbsteuer % | nach Bundesland | BW 5 %, BY 3,5 % … |
| Ankauf | Notar/Grundbuch % | 2,0 % | |
| Ankauf | Maklerprovision % | 0 % | |
| Aufwertung | Kostenschätzung € | = Summe Aufwertungskatalog | von Hand überschreibbar (z. B. runden) |
| Aufwertung | Dauer der Maßnahme in Monaten | 4 | inkl. Verkaufszeit; treibt Bewirtschaftung und Zinsen |
| Bewirtschaftung | Kosten pro Monat € | 100 | |
| Finanzierung Bank | Finanzierungsbetrag € | = Kaufpreis | überschreibbar |
| Finanzierung Bank | Zinssatz p. a. % | 5,5 % | |
| Finanzierung Bank | Bearbeitungsgebühr % | 1,5 % | auf Finanzierungsbetrag |
| Co-Investor | Kapitaleinsatz € | 0 | |
| Co-Investor | Zinssatz p. a. % | 8 % | |
| Vermarktung | Maklerkosten Verkauf % | 0 % | auf den jeweiligen Verkaufspreis |
| Vermarktung | Home Staging € | 0 | |
| Verkauf | Verkaufspreis Worst / Mid / Best € | – | drei Szenarien |
| Verkauf | Abzug für €/m²-Betrachtung € | 30.000 | **Bedeutung bei Timo erfragen** (z. B. Stellplatz/TG) |
| Marktwert | Pricehubble, PropRate, Interhyp, eigene Einschätzung € | – | je mit €/m² |

## 2. Rechnung

```
Grunderwerbsteuer      = Kaufpreis × GrESt %
Notar/Grundbuch        = Kaufpreis × Notar %
Makler Ankauf          = Kaufpreis × Makler %
Ankaufsnebenkosten     = Summe der drei
Bewirtschaftung        = Kosten p. M. × Monate
Zinsen Bank            = Finanzierungsbetrag × Zins % / 12 × Monate
Bearbeitungsgebühr     = Finanzierungsbetrag × Gebühr %
Kosten Co-Investor     = Kapitaleinsatz × Zins % / 12 × Monate
Finanzierungskosten    = Zinsen Bank + Bearbeitungsgebühr + Kosten Co-Investor

je Szenario (Worst / Mid / Best):
  Vermarktungskosten   = Verkaufspreis × Makler Verkauf % + Home Staging
  Gesamtinvestition    = Kaufpreis + Ankaufsnebenkosten + Aufwertung
                         + Bewirtschaftung + Vermarktung + Finanzierungskosten
  Gewinn vor Steuer    = Verkaufspreis − Gesamtinvestition
  Gewinn in %          = Gewinn / Gesamtinvestition
  €/m² Verkauf         = (Verkaufspreis − Abzug) / Wohnfläche
```

**Ansicht „Bank“:** dieselbe Rechnung, nur mit dem Mid-Case-Verkaufspreis, als eigene kompakte Tabelle.

## 3. Prüfwerte (aus der Excel-Vorlage, zum Testen)

Kaufpreis 185.000 · 55 m² · GrESt 5 % · Notar 2 % · Aufwertung 29.000 · 4 Monate · Bewirtschaftung 100 €/M ·
Finanzierung 185.000 zu 5,5 % + 1,5 % Gebühr · Verkauf 249.000 / 285.000 / 299.000

| | Worst | Mid | Best |
|---|---|---|---|
| Ankaufsnebenkosten | 12.950 | 12.950 | 12.950 |
| Finanzierungskosten | 6.167 | 6.167 | 6.167 |
| Gesamtinvestition | 233.517 | 233.517 | 233.517 |
| Gewinn vor Steuer | 15.483 | 51.483 | 65.483 |
| Gewinn in % | 6,6 % | 22,0 % | 28,0 % |
| €/m² (nach 30.000 Abzug) | 3.982 | 4.636 | 4.891 |

Die Plattform muss mit diesen Eingaben exakt diese Werte liefern.

## 4. Aufwertungskatalog

Je Position eine Eingabe; die Summe je Gewerk und die Gesamtsumme werden angezeigt.
Rechenarten:
- **Ja/Nein (pauschal):** Ja → Preis, Nein → 0
- **Ja/Nein × Wohnfläche:** Ja → Preis × Wohnfläche des Objekts
- **Menge × Preis:** Stück, m², lfm oder Tage

Preise sind Standardwerte (in den Einstellungen pflegbar) und je Objekt überschreibbar.
Nur Positionen mit Wert anzeigen bzw. leere Gewerke eingeklappt lassen, damit es übersichtlich bleibt.
Hinweis: In der Excel fehlt „Garagentore“ in der Gewerk-Summe „Sonstiges“, ist aber in der Gesamtsumme. In der Plattform gehört es zu „Sonstiges“.

**Projektplanung**

| Position | Eingabe | Preis je Einheit | Rechnung |
|---|---|---|---|
| Architekt | Ja/Nein | 5000 € | Ja/Nein (pauschal) |
| Statik | Ja/Nein | 200 € | Ja/Nein (pauschal) |
| Prüfstatik | Ja/Nein | 100 € | Ja/Nein (pauschal) |
| Teilung Notar | Ja/Nein | 3600 € | Ja/Nein (pauschal) |

**Errichtung & Erschließung**

| Position | Eingabe | Preis je Einheit | Rechnung |
|---|---|---|---|
| Wasseranschluß | Ja/Nein | 5000 € | Ja/Nein (pauschal) |
| Gasanschluß | Ja/Nein | 5000 € | Ja/Nein (pauschal) |
| Stromanschluß | Ja/Nein | 5000 € | Ja/Nein (pauschal) |
| Internet & Kabelanschluss | Ja/Nein | 5000 € | Ja/Nein (pauschal) |

**Entkernung & Entsorgung**

| Position | Eingabe | Preis je Einheit | Rechnung |
|---|---|---|---|
| Tagessatz 3 Pers. a 30€/h | Tage | 900 (30 €/h × 3 Pers. × 10 h) € | Menge (Tage) × Preis |
| Entsorgung klein | Ja/Nein | 1000 € | Ja/Nein (pauschal) |
| Entsorgung mittel | Ja/Nein | 5000 € | Ja/Nein (pauschal) |
| Entsorgung groß | Ja/Nein | 10000 € | Ja/Nein (pauschal) |

**Fenster und Hauseingangstüre**

| Position | Eingabe | Preis je Einheit | Rechnung |
|---|---|---|---|
| Fenster Standard inkl. Einbau | Menge (Stück) | 700 € | Menge (Stück) × Preis |
| Rolladen inkl. Einbau | Menge (Stück) | 300 € | Menge (Stück) × Preis |
| Balkontüre inkl. Einbau | Menge (Stück) | 950 € | Menge (Stück) × Preis |
| Hauseingangstüre inkl. Einbau | Menge (Stück) | 2250 € | Menge (Stück) × Preis |
| Elektrisches Rolltor Garage inkl. Einbau | Menge (Stück) | 2250 € | Menge (Stück) × Preis |
| Garagentor lackieren | Menge (Stück) | 500 € | Menge (Stück) × Preis |

**Elektrik**

| Position | Eingabe | Preis je Einheit | Rechnung |
|---|---|---|---|
| Komplette Elektriksanierung | Ja/Nein | 100 € | Ja/Nein × Wohnfläche |
| Steckdosen & Schalter wechseln | Ja/Nein | 35 € | Ja/Nein × Wohnfläche |
| Klingelanlage | Ja/Nein | 1500 € | Ja/Nein (pauschal) |
| Unterverteiler | Menge (Stück) | 750 € | Menge (Stück) × Preis |
| Zählerkasten (Hauptkasten) | Menge (Stück) | 3000 € | Menge (Stück) × Preis |
| Lüftungsanlage pro Inneneinheit inkl. Kernbohrung | Menge (Stück) | 750 € | Menge (Stück) × Preis |
| PV - Anlage | Ja/Nein | 25000 € | Ja/Nein (pauschal) |

**Heizung**

| Position | Eingabe | Preis je Einheit | Rechnung |
|---|---|---|---|
| Wartung | Menge (Stück) | 300 € | Menge (Stück) × Preis |
| Austausch Gas-Öltherme | Menge (Stück) | 7500 € | Menge (Stück) × Preis |
| Austausch Heizkörper | Menge (Stück) | 350 € | Menge (Stück) × Preis |
| Heizkörper lackieren | Menge (Stück) | 100 € | Menge (Stück) × Preis |
| Thermostate wechseln | Menge (Stück) | 50 € | Menge (Stück) × Preis |
| Verlegung Heizungsrohre inkl. Heizkörper | qm | 80 € | Menge (qm) × Preis |
| Verlegung Fußbodenheizung inkl. Unterverteiler (schlitzen) | qm | 45 € | Menge (qm) × Preis |
| Dämmung  & Tackerplatte | qm | 80 € | Menge (qm) × Preis |
| Estrich verlegen | qm | 30 € | Menge (qm) × Preis |
| Elektrische Heizkörper Infrarot | Menge (Stück) | 400 € | Menge (Stück) × Preis |
| Elektrische Heizkörper Direktheizung | Menge (Stück) | 700 € | Menge (Stück) × Preis |
| Luft-Luft Klima Wärmepumpe (Anzahl Räume) | Menge (Stück) | 2000 € | Menge (Stück) × Preis |

**Sanitär**

| Position | Eingabe | Preis je Einheit | Rechnung |
|---|---|---|---|
| Wasser / Abwasser Küche/Bad/WC inkl. Hauptwasserstrang | Menge (Stück) | 4000 € | Menge (Stück) × Preis |
| Wasser / Abwasser Küche/Bad/WC | Menge (Stück) | 2000 € | Menge (Stück) × Preis |
| Austausch alle Keramik, Armaturen, Kabinen | Menge (Stück) | 2000 € | Menge (Stück) × Preis |
| Austausch Duschkabine | Menge (Stück) | 750 € | Menge (Stück) × Preis |
| Austausch WC | Menge (Stück) | 300 € | Menge (Stück) × Preis |
| Austausch Waschbecken inkl. Armaturen | Menge (Stück) | 300 € | Menge (Stück) × Preis |
| Austausch Durchlauferhitzer | Menge (Stück) | 500 € | Menge (Stück) × Preis |
| Austausch Boiler | Menge (Stück) | 1500 € | Menge (Stück) × Preis |
| Fliesen inkl. Trockebauverkleidung & Silikon & Material | qm | 150 € | Menge (qm) × Preis |

**Roh- und Trockenbau**

| Position | Eingabe | Preis je Einheit | Rechnung |
|---|---|---|---|
| Ständerwand Standard mit Gipskarton | qm | 60 € | Menge (qm) × Preis |
| F90-Wand | qm | 95 € | Menge (qm) × Preis |
| F60-Wand | qm | 65 € | Menge (qm) × Preis |
| Decke Abhängen UK & verkleiden | qm | 60 € | Menge (qm) × Preis |
| Wand mauern (nicht tragend) | qm | 95 € | Menge (qm) × Preis |
| Wand mauern (tragend) | qm | 120 € | Menge (qm) × Preis |
| Stahlträger | Menge (Stück) | 2500 € | Menge (Stück) × Preis |
| Mauerwerk abdichten (außen) | qm | 200 € | Menge (qm) × Preis |
| Betontreppe bauen | Menge (Stück) | 5000 € | Menge (Stück) × Preis |
| Außenbalkone bauen | Menge (Stück) | 5000 € | Menge (Stück) × Preis |
| Abdichtarbeiten Balkon | qm | 90 € | Menge (qm) × Preis |

**Wände & Decken**

| Position | Eingabe | Preis je Einheit | Rechnung |
|---|---|---|---|
| Spachteln (Q2) & Tapezieren & Streichen | qm | 30 € | Menge (qm) × Preis |
| Tapezieren & streichen | qm | 20 € | Menge (qm) × Preis |
| Gewebespachtel | qm | 20 € | Menge (qm) × Preis |
| Spachteln (Q2) & Putz & Streichen | qm | 33 € | Menge (qm) × Preis |
| Wand & Decke Streichen | qm | 14 € | Menge (qm) × Preis |
| Holzdecke streichen | qm | 25 € | Menge (qm) × Preis |
| Kellerdecke dämmen | qm | 25 € | Menge (qm) × Preis |

**Boden & Innentüren**

| Position | Eingabe | Preis je Einheit | Rechnung |
|---|---|---|---|
| Laminat inkl. Trittschall & Sockelleisten | Ja/Nein | 50 € | Ja/Nein × Wohnfläche |
| Vinyl inkl. Trittschall & Sockelleisten | Ja/Nein | 40 € | Ja/Nein × Wohnfläche |
| Parkett inkl. Trittschall & Sockelleisten | Ja/Nein | 70 € | Ja/Nein × Wohnfläche |
| Boden ausgleichen | Ja/Nein | 15 € | Ja/Nein × Wohnfläche |
| Wohnungseingangstüre | Menge (Stück) | 875 € | Menge (Stück) × Preis |
| Wohnungsinnentüre | Menge (Stück) | 400 € | Menge (Stück) × Preis |
| T30-RS Tür | Menge (Stück) | 1000 € | Menge (Stück) × Preis |
| T90-RS Tür | Menge (Stück) | 2000 € | Menge (Stück) × Preis |
| Innentüren lackieren | Menge (Stück) | 100 € | Menge (Stück) × Preis |
| Türgrriffe tauschen | Menge (Stück) | 50 € | Menge (Stück) × Preis |

**Fassade**

| Position | Eingabe | Preis je Einheit | Rechnung |
|---|---|---|---|
| Fassade dämmen, verputzen, streichen | qm | 140 € | Menge (qm) × Preis |
| Fassade neu verputzen, streichen | qm | 35 € | Menge (qm) × Preis |
| Fassade streichen | qm | 18 € | Menge (qm) × Preis |
| Gerüst stellen | qm | 10 € | Menge (qm) × Preis |

**Dach**

| Position | Eingabe | Preis je Einheit | Rechnung |
|---|---|---|---|
| Dachsanierung komplett inkl. Dachrinnen | qm | 325 € | Menge (qm) × Preis |
| Nur Ziegel | qm | 50 € | Menge (qm) × Preis |
| Dachdämmung (Zwischensparren) | qm | 50 € | Menge (qm) × Preis |
| Dachreinigung | qm | 20 € | Menge (qm) × Preis |
| Dachreinigung und lackieren | qm | 30 € | Menge (qm) × Preis |
| Regenrinnen & Fallrohre | lfm | 130 € | Menge (lfm) × Preis |
| Dachgaube errichten | Menge (Stück) | 7000 € | Menge (Stück) × Preis |
| Dachgaube neu verkleiden (Blech) | lfm | 500 € | Menge (lfm) × Preis |
| Dachfenster tauschen | Menge (Stück) | 1800 € | Menge (Stück) × Preis |

**Außenanlage**

| Position | Eingabe | Preis je Einheit | Rechnung |
|---|---|---|---|
| Neuer Außenparkplatz herstellen | Ja/Nein | 5000 € | Ja/Nein (pauschal) |
| Bäume & Sträuchen schneiden | Ja/Nein | 1000 € | Ja/Nein (pauschal) |
| Garten anlegen | Ja/Nein | 2000 € | Ja/Nein (pauschal) |
| Terrasse errichten | Ja/Nein | 3000 € | Ja/Nein (pauschal) |
| Carport | Ja/Nein | 3000 € | Ja/Nein (pauschal) |
| Balkon- und Treppengeländer | lfm | 300 € | Menge (lfm) × Preis |

**Reinigung**

| Position | Eingabe | Preis je Einheit | Rechnung |
|---|---|---|---|
| Außenanalage reinigen | Ja/Nein | 500 € | Ja/Nein (pauschal) |
| Endreinigung | Ja/Nein | 250 € | Ja/Nein (pauschal) |

**Sonstiges**

| Position | Eingabe | Preis je Einheit | Rechnung |
|---|---|---|---|
| Küchenzeile | Menge (Stück) | 3500 € | Menge (Stück) × Preis |
| Treppenhaus | Menge (Stück) | 1000 € | Menge (Stück) × Preis |
| Innentreppe (Raumspartreppe) | Menge (Stück) | 2000 € | Menge (Stück) × Preis |
| Briefkasten | Menge (Stück) | 150 € | Menge (Stück) × Preis |
| Garagentore | Menge (Stück) | 2000 € | Menge (Stück) × Preis |

**Puffer**

| Position | Eingabe | Preis je Einheit | Rechnung |
|---|---|---|---|
| Großer Puffer bei Sanierung | Ja/Nein | 5000 € | Ja/Nein (pauschal) |
| Kleiner Puffer bei Renovierung light | Ja/Nein | 2500 € | Ja/Nein (pauschal) |