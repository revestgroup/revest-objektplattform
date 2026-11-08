import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Gmail-Entwurf statt `mailto:`: Revest arbeitet in Google Workspace, und
 * `mailto:` öffnet auf vielen Rechnern ein Mailprogramm, das niemand nutzt.
 */
export function gmailLink(an: string, betreff = ""): string {
  const q = new URLSearchParams({ view: "cm", fs: "1", to: an, su: betreff });
  return `https://mail.google.com/mail/?${q.toString()}`;
}
