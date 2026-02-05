import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = join(homedir(), 'Library', 'Messages', 'chat.db');
    db = new Database(dbPath, { readonly: true });
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Convert Apple's date format (nanoseconds since 2001-01-01) to JS Date
export function appleToDate(appleDate: number | null): Date | null {
  if (!appleDate) return null;
  const ms = (appleDate / 1000000) + 978307200000;
  return new Date(ms);
}

// Convert JS Date to Apple's date format
export function dateToApple(date: Date): number {
  return (date.getTime() - 978307200000) * 1000000;
}

// Format date for display
export function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleString();
}

// Format date as ISO string
export function formatDateISO(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString();
}

// Parse search query into terms, respecting quoted phrases
export function parseSearchQuery(query: string): string[] {
  const terms: string[] = [];
  const regex = /"([^"]+)"|(\S+)/g;
  let match;

  while ((match = regex.exec(query)) !== null) {
    const term = match[1] || match[2];
    if (term) {
      terms.push(term);
    }
  }

  return terms;
}

// Escape special regex characters
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Extract text from NSAttributedString blob (attributedBody column)
// The format is a binary plist containing the text and formatting attributes
export function extractTextFromAttributedBody(blob: Buffer | null): string | null {
  if (!blob || blob.length === 0) return null;

  try {
    // The attributedBody is a "streamtyped" NSAttributedString
    // The text content is stored after the NSString class marker
    // We look for the pattern that precedes the actual text

    // Convert to string and look for readable text
    // The format has: ...NSString...<length byte><text>...
    const data = blob;

    // Find "NSString" marker and extract text after it
    const nsStringMarker = Buffer.from('NSString');
    let idx = data.indexOf(nsStringMarker);

    if (idx === -1) return null;

    // Move past NSString and look for the text
    idx += nsStringMarker.length;

    // Skip some control bytes until we find the length marker
    // The format varies but typically has: 01 94 84 01 2B <length> <text>
    // or similar patterns

    // Look for the text by scanning for printable ASCII sequences
    // after the NSString marker
    let textStart = -1;
    let textLength = 0;

    for (let i = idx; i < data.length - 1; i++) {
      const byte = data[i];

      // Length prefix patterns: 0x01-0x7F for short strings, or 0x84/0x94 markers
      // After finding a sequence marker, the next byte(s) indicate length
      if (byte === 0x2B || byte === 0x2A) {
        // 0x2B (+) or 0x2A (*) often precedes length in this format
        const nextByte = data[i + 1];
        if (nextByte > 0 && nextByte < 0x80) {
          // This looks like a length byte for short strings
          textLength = nextByte;
          textStart = i + 2;

          // Validate this is actually text
          if (textStart + textLength <= data.length) {
            const possibleText = data.slice(textStart, textStart + textLength);
            // Check if it's printable
            let isPrintable = true;
            for (let j = 0; j < possibleText.length; j++) {
              const c = possibleText[j];
              // Allow printable ASCII and common UTF-8 continuation bytes
              if (c < 0x20 && c !== 0x0A && c !== 0x0D && c !== 0x09) {
                if (c < 0x80) {
                  isPrintable = false;
                  break;
                }
              }
            }
            if (isPrintable && textLength > 0) {
              return possibleText.toString('utf8');
            }
          }
        }
      }
    }

    // Fallback: try to find any readable text sequence
    // Look for long runs of printable characters
    let currentRun = '';
    let bestRun = '';

    for (let i = idx; i < data.length; i++) {
      const byte = data[i];
      // Printable ASCII or common UTF-8
      if ((byte >= 0x20 && byte < 0x7F) || byte >= 0x80) {
        currentRun += String.fromCharCode(byte);
      } else if (byte === 0x0A || byte === 0x0D) {
        currentRun += '\n';
      } else {
        if (currentRun.length > bestRun.length && currentRun.length > 3) {
          bestRun = currentRun;
        }
        currentRun = '';
      }
    }

    if (currentRun.length > bestRun.length) {
      bestRun = currentRun;
    }

    // Try to decode as UTF-8
    if (bestRun.length > 0) {
      try {
        // Find the buffer slice for this text
        const startIdx = data.indexOf(Buffer.from(bestRun.slice(0, Math.min(10, bestRun.length))));
        if (startIdx !== -1) {
          // Get a bit more context to handle multi-byte chars properly
          const endSearch = Math.min(startIdx + bestRun.length + 10, data.length);
          const textBuf = data.slice(startIdx, endSearch);
          const decoded = textBuf.toString('utf8');
          // Trim any trailing garbage
          const cleanEnd = decoded.search(/[\x00-\x08\x0B\x0C\x0E-\x1F]/);
          return cleanEnd > 0 ? decoded.slice(0, cleanEnd).trim() : decoded.trim();
        }
      } catch {
        // Fall back to the ASCII version
      }
      return bestRun.trim();
    }

    return null;
  } catch {
    return null;
  }
}
