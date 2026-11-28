/**
 * Interpretazione di un importo detto a voce in italiano.
 * "venticinque e cinquanta" → "25,50" · "duemilacinquecento" → "2500" · "dodici euro e trenta centesimi" → "12,30"
 * Restituisce il testo da mettere nel campo importo, oppure "" se non riconosciuto.
 */

const NUM_WORDS = [
  ["diciassette", 17], ["diciannove", 19], ["quattordici", 14], ["quindici", 15], ["tredici", 13], ["dodici", 12], ["undici", 11],
  ["sedici", 16], ["diciotto", 18], ["dieci", 10], ["venti", 20], ["vent", 20], ["trenta", 30], ["trent", 30], ["quaranta", 40], ["quarant", 40],
  ["cinquanta", 50], ["cinquant", 50], ["sessanta", 60], ["sessant", 60], ["settanta", 70], ["settant", 70], ["ottanta", 80], ["ottant", 80],
  ["novanta", 90], ["novant", 90], ["cento", 100], ["mille", 1000], ["mila", 1000], ["quattro", 4], ["cinque", 5], ["sette", 7], ["otto", 8],
  ["nove", 9], ["zero", 0], ["uno", 1], ["una", 1], ["un", 1], ["due", 2], ["tré", 3], ["tre", 3], ["sei", 6]
];

export function italianWordsToNumber(text) {
  const s = text.replace(/[^a-zàèéìòù]/g, "");
  let total = 0, current = 0, i = 0, found = false;
  while (i < s.length) {
    const hit = NUM_WORDS.find(([w]) => s.startsWith(w, i));
    if (!hit) { i++; continue; }
    found = true;
    const v = hit[1];
    if (v === 100) current = (current || 1) * 100;
    else if (v === 1000) { total += (current || 1) * 1000; current = 0; }
    else current += v;
    i += hit[0].length;
  }
  return found ? total + current : NaN;
}

function partToNumber(part) {
  const digits = part.match(/\d+/g);
  if (digits) return parseInt(digits.join(""), 10);
  return italianWordsToNumber(part);
}

export function parseItalianSpokenAmount(text) {
  const t = String(text).toLocaleLowerCase("it-IT").replace(/€/g, " euro ").trim();
  const direct = t.replace(/\s|euro|eur/g, "");
  if (/^\d+([.,]\d{1,2})?$/.test(direct)) return direct.replace(".", ",");
  const parts = t.split(/\s*(?:virgola|,|\beuro e\b|\be\b(?=\s*\d|\s*[a-z]+\s*(?:centesimi)?\s*$)|\beuro\b)\s*/).filter((p) => p && p.trim());
  const whole = partToNumber(parts[0] || "");
  if (!Number.isFinite(whole)) return "";
  let cents = parts[1] ? partToNumber(parts[1]) : 0;
  if (!Number.isFinite(cents)) cents = 0;
  if (parts[1] && (/^\s*\d\s*$/.test(parts[1]) || (/virgola/.test(t) && cents < 10))) cents *= 10;
  cents = Math.min(99, cents);
  return cents ? `${whole},${String(cents).padStart(2, "0")}` : String(whole);
}
