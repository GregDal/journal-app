interface ParsedEntry {
  date: Date;
  text: string;
}

const DATE_PATTERNS = [
  // "March 15, 2024" or "March 15 2024"
  /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
  // "Mar 15, 2024"
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i,
  // "3/15/2024" or "03/15/2024" or "3/15/24"
  /^\d{1,2}\/\d{1,2}\/\d{2,4}/,
  // "2024-03-15"
  /^\d{4}-\d{2}-\d{2}/,
  // "March 15" (no year — will default to current year)
  /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}$/i,
];

function isDateLine(line: string): Date | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 50) return null;

  for (const pattern of DATE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const parsed = new Date(match[0]);
      if (!isNaN(parsed.getTime())) return parsed;

      // Handle "March 15" without year
      if (pattern === DATE_PATTERNS[4]) {
        const withYear = `${match[0]}, ${new Date().getFullYear()}`;
        const p = new Date(withYear);
        if (!isNaN(p.getTime())) return p;
      }
    }
  }

  return null;
}

export function parseJournalText(text: string): ParsedEntry[] {
  const lines = text.split("\n");
  const entries: ParsedEntry[] = [];
  let currentDate: Date | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const dateMatch = isDateLine(line);

    if (dateMatch) {
      // Save previous entry
      if (currentDate && currentLines.length > 0) {
        entries.push({
          date: currentDate,
          text: currentLines.join("\n").trim(),
        });
      }
      currentDate = dateMatch;
      currentLines = [];
    } else if (currentDate) {
      currentLines.push(line);
    }
  }

  // Save last entry
  if (currentDate && currentLines.length > 0) {
    entries.push({
      date: currentDate,
      text: currentLines.join("\n").trim(),
    });
  }

  return entries.sort((a, b) => a.date.getTime() - b.date.getTime());
}
