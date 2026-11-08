import { describe, expect, test } from "bun:test";

import {
  emlAuslesen,
  kopfzeileEntschluesseln,
  mailtextAuslesen,
  objektInMail,
} from "./mailToBoard";
import { MOCK_OBJEKTE } from "./mockDaten";

const EML = [
  'From: "Stadtwerke Ulm" <rechnung@swu-beispiel.de>',
  "To: backoffice@revest-projekt.de",
  "Subject: =?UTF-8?Q?Abschlagsrechnung_M=C3=A4rz?= Rebhangweg 9",
  "Date: Sun, 08 Nov 2026 09:14:00 +0100",
  "MIME-Version: 1.0",
  'Content-Type: multipart/mixed; boundary="XYZ"',
  "",
  "--XYZ",
  "Content-Type: text/plain; charset=utf-8",
  "Content-Transfer-Encoding: quoted-printable",
  "",
  "Sehr geehrte Damen und Herren,=0Aanbei die Rechnung f=C3=BCr M=C3=A4rz.",
  "--XYZ",
  'Content-Type: application/pdf; name="Rechnung_2026-03.pdf"',
  'Content-Disposition: attachment; filename="Rechnung_2026-03.pdf"',
  "Content-Transfer-Encoding: base64",
  "",
  "JVBERi0xLjQK",
  "--XYZ--",
  "",
].join("\r\n");

describe("Mail to Board", () => {
  test("Kopfzeile nach RFC 2047", () => {
    expect(kopfzeileEntschluesseln("=?UTF-8?B?UHLDvGZ1bmc=?=")).toBe("Prüfung");
  });

  test(".eml mit Text und PDF-Anhang", () => {
    const m = emlAuslesen(EML);
    expect(m.betreff).toBe("Abschlagsrechnung März Rebhangweg 9");
    expect(m.absender).toBe("Stadtwerke Ulm");
    expect(m.absenderEmail).toBe("rechnung@swu-beispiel.de");
    expect(m.datum).toBe("2026-11-08T08:14:00.000Z");
    expect(m.text).toContain("Rechnung für März");
    expect(m.anhaenge).toHaveLength(1);
    expect(m.anhaenge[0].name).toBe("Rechnung_2026-03.pdf");
    expect(m.anhaenge[0].inhalt?.length).toBeGreaterThan(0);
  });

  test("eingefügter Mailtext aus Outlook", () => {
    const m = mailtextAuslesen(`Von: Kessler Haustechnik <info@kessler-beispiel.de>
Gesendet: 05.11.2026 14:30
An: Timo Birk
Betreff: Angebot Sanitär FAH6

Hallo Herr Birk,
anbei unser Angebot.`);
    expect(m.betreff).toBe("Angebot Sanitär FAH6");
    expect(m.absender).toBe("Kessler Haustechnik");
    expect(m.text.startsWith("Hallo Herr Birk")).toBe(true);
    expect(m.datum?.slice(0, 10)).toBe("2026-11-05");
  });

  test("Objekt über Kürzel oder Adresse, aber nicht über eine längere Hausnummer", () => {
    const leer = { betreff: null, absender: null, absenderEmail: null, datum: null, anhaenge: [] };
    expect(objektInMail({ ...leer, text: "Betrifft FAH6" }, MOCK_OBJEKTE)?.kuerzel).toBe("FAH6");
    expect(objektInMail({ ...leer, text: "Wohnung Rebhangweg 9, Ulm" }, MOCK_OBJEKTE)?.id).toBe(
      "obj-011",
    );
    expect(objektInMail({ ...leer, text: "Rebhangweg 91" }, MOCK_OBJEKTE)).toBeNull();
    expect(objektInMail({ ...leer, text: "Hallo zusammen" }, MOCK_OBJEKTE)).toBeNull();
  });
});
