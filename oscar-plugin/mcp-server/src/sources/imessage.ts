import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { UnifiedMessage, UnifiedContact, SearchResult } from './types.js';

let db: Database.Database | null = null;
let contactCache: Map<string, string> | null = null;
let nameToHandlesCache: Map<string, string[]> | null = null;

// ============ Database Connection ============

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = join(homedir(), 'Library', 'Messages', 'chat.db');
    db = new Database(dbPath, { readonly: true });
  }
  return db;
}

// ============ Date Conversion ============

function appleToDate(appleDate: number | null): Date | null {
  if (!appleDate) return null;
  const ms = (appleDate / 1000000) + 978307200000;
  return new Date(ms);
}

function dateToApple(date: Date): number {
  return (date.getTime() - 978307200000) * 1000000;
}

// ============ Contacts Integration ============

function findContactsDatabases(): string[] {
  const baseDir = join(homedir(), 'Library', 'Application Support', 'AddressBook');
  const databases: string[] = [];

  const mainDb = join(baseDir, 'AddressBook-v22.abcddb');
  if (existsSync(mainDb)) {
    databases.push(mainDb);
  }

  const sourcesDir = join(baseDir, 'Sources');
  if (existsSync(sourcesDir)) {
    try {
      const sources = readdirSync(sourcesDir, { withFileTypes: true });
      for (const source of sources) {
        if (source.isDirectory()) {
          const sourceDb = join(sourcesDir, source.name, 'AddressBook-v22.abcddb');
          if (existsSync(sourceDb)) {
            databases.push(sourceDb);
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  return databases;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-10);
}

function normalizeHandle(handle: string): string {
  if (handle.includes('@')) {
    return handle.toLowerCase().trim();
  }
  return normalizePhone(handle);
}

function buildContactCache(): Map<string, string> {
  if (contactCache) return contactCache;

  contactCache = new Map();
  const databases = findContactsDatabases();

  for (const dbPath of databases) {
    let contactDb: Database.Database | null = null;
    try {
      contactDb = new Database(dbPath, { readonly: true });

      const phoneQuery = `
        SELECT p.ZFULLNUMBER as fullNumber, r.ZFIRSTNAME as firstName, r.ZLASTNAME as lastName,
               r.ZNICKNAME as nickname, r.ZORGANIZATION as organization
        FROM ZABCDPHONENUMBER p
        JOIN ZABCDRECORD r ON p.ZOWNER = r.Z_PK
        WHERE p.ZFULLNUMBER IS NOT NULL
      `;

      interface PhoneRow {
        fullNumber: string;
        firstName: string | null;
        lastName: string | null;
        nickname: string | null;
        organization: string | null;
      }

      const phoneRows = contactDb.prepare(phoneQuery).all() as PhoneRow[];
      for (const row of phoneRows) {
        const normalized = normalizePhone(row.fullNumber);
        if (normalized.length >= 7) {
          const name = formatName(row);
          if (name && !contactCache.has(normalized)) {
            contactCache.set(normalized, name);
          }
        }
      }

      const emailQuery = `
        SELECT e.ZADDRESS as address, r.ZFIRSTNAME as firstName, r.ZLASTNAME as lastName,
               r.ZNICKNAME as nickname, r.ZORGANIZATION as organization
        FROM ZABCDEMAILADDRESS e
        JOIN ZABCDRECORD r ON e.ZOWNER = r.Z_PK
        WHERE e.ZADDRESS IS NOT NULL
      `;

      interface EmailRow {
        address: string;
        firstName: string | null;
        lastName: string | null;
        nickname: string | null;
        organization: string | null;
      }

      const emailRows = contactDb.prepare(emailQuery).all() as EmailRow[];
      for (const row of emailRows) {
        const normalized = row.address.toLowerCase().trim();
        const name = formatName(row);
        if (name && !contactCache.has(normalized)) {
          contactCache.set(normalized, name);
        }
      }
    } catch {
      // Skip
    } finally {
      if (contactDb) contactDb.close();
    }
  }

  return contactCache;
}

interface NameRow {
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  organization: string | null;
}

function formatName(row: NameRow): string | null {
  if (row.firstName && row.lastName) return `${row.firstName} ${row.lastName}`;
  if (row.firstName) return row.firstName;
  if (row.lastName) return row.lastName;
  if (row.nickname) return row.nickname;
  if (row.organization) return row.organization;
  return null;
}

export function getContactName(handle: string): string | null {
  const cache = buildContactCache();
  return cache.get(normalizeHandle(handle)) || null;
}

export function findHandlesByName(nameQuery: string): string[] {
  if (!nameToHandlesCache) {
    nameToHandlesCache = new Map();
    const databases = findContactsDatabases();

    for (const dbPath of databases) {
      let contactDb: Database.Database | null = null;
      try {
        contactDb = new Database(dbPath, { readonly: true });

        const phoneQuery = `
          SELECT p.ZFULLNUMBER as handle, r.ZFIRSTNAME as firstName, r.ZLASTNAME as lastName,
                 r.ZNICKNAME as nickname, r.ZORGANIZATION as organization
          FROM ZABCDPHONENUMBER p
          JOIN ZABCDRECORD r ON p.ZOWNER = r.Z_PK
          WHERE p.ZFULLNUMBER IS NOT NULL
        `;

        interface HandleRow extends NameRow {
          handle: string;
        }

        const phoneRows = contactDb.prepare(phoneQuery).all() as HandleRow[];
        for (const row of phoneRows) {
          addToNameCache(row, row.handle);
        }

        const emailQuery = `
          SELECT e.ZADDRESS as handle, r.ZFIRSTNAME as firstName, r.ZLASTNAME as lastName,
                 r.ZNICKNAME as nickname, r.ZORGANIZATION as organization
          FROM ZABCDEMAILADDRESS e
          JOIN ZABCDRECORD r ON e.ZOWNER = r.Z_PK
          WHERE e.ZADDRESS IS NOT NULL
        `;

        const emailRows = contactDb.prepare(emailQuery).all() as HandleRow[];
        for (const row of emailRows) {
          addToNameCache(row, row.handle);
        }
      } catch {
        // Skip
      } finally {
        if (contactDb) contactDb.close();
      }
    }
  }

  const searchLower = nameQuery.toLowerCase().trim();
  const directMatch = nameToHandlesCache.get(searchLower);
  if (directMatch && directMatch.length > 0) return directMatch;

  const matches: Set<string> = new Set();
  for (const [key, handles] of nameToHandlesCache.entries()) {
    if (key.includes(searchLower) || searchLower.includes(key)) {
      for (const handle of handles) {
        matches.add(handle);
      }
    }
  }

  return Array.from(matches);
}

function addToNameCache(row: NameRow, handle: string): void {
  if (!nameToHandlesCache) return;

  const terms: string[] = [];
  if (row.firstName) terms.push(row.firstName.toLowerCase());
  if (row.lastName) terms.push(row.lastName.toLowerCase());
  if (row.nickname) terms.push(row.nickname.toLowerCase());
  if (row.organization) terms.push(row.organization.toLowerCase());
  if (row.firstName && row.lastName) {
    terms.push(`${row.firstName} ${row.lastName}`.toLowerCase());
  }

  for (const term of terms) {
    const existing = nameToHandlesCache.get(term) || [];
    if (!existing.includes(handle)) {
      existing.push(handle);
      nameToHandlesCache.set(term, existing);
    }
  }
}

// ============ Text Extraction ============

function extractTextFromAttributedBody(blob: Buffer | null): string | null {
  if (!blob || blob.length === 0) return null;

  try {
    const nsStringMarker = Buffer.from('NSString');
    let idx = blob.indexOf(nsStringMarker);
    if (idx === -1) return null;

    idx += nsStringMarker.length;

    for (let i = idx; i < blob.length - 1; i++) {
      const byte = blob[i];
      if (byte === 0x2B || byte === 0x2A) {
        const nextByte = blob[i + 1];
        if (nextByte > 0 && nextByte < 0x80) {
          const textLength = nextByte;
          const textStart = i + 2;
          if (textStart + textLength <= blob.length) {
            const possibleText = blob.slice(textStart, textStart + textLength);
            let isPrintable = true;
            for (let j = 0; j < possibleText.length; j++) {
              const c = possibleText[j];
              if (c < 0x20 && c !== 0x0A && c !== 0x0D && c !== 0x09 && c < 0x80) {
                isPrintable = false;
                break;
              }
            }
            if (isPrintable && textLength > 0) {
              return possibleText.toString('utf8');
            }
          }
        }
      }
    }

    let currentRun = '';
    let bestRun = '';
    for (let i = idx; i < blob.length; i++) {
      const byte = blob[i];
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
    if (currentRun.length > bestRun.length) bestRun = currentRun;
    return bestRun.trim() || null;
  } catch {
    return null;
  }
}

// ============ Search Functions ============

interface MessageRow {
  message_id: number;
  text: string | null;
  attributedBody: Buffer | null;
  date: number;
  is_from_me: number;
  handle_id: string | null;
  chat_identifier: string | null;
  display_name: string | null;
}

export interface IMessageSearchOptions {
  query?: string;
  contact?: string;
  handles?: string[];
  daysBack?: number;
  fromMe?: boolean;
  maxResults?: number;
  contextMessages?: number;
}

export async function searchIMessages(options: IMessageSearchOptions): Promise<SearchResult[]> {
  const db = getDatabase();
  const maxResults = Math.min(options.maxResults || 20, 100);
  const contextSize = Math.min(options.contextMessages || 0, 10);

  let query = `
    SELECT m.ROWID as message_id, m.text, m.attributedBody, m.date, m.is_from_me,
           h.id as handle_id, c.chat_identifier, c.display_name
    FROM message m
    LEFT JOIN handle h ON m.handle_id = h.ROWID
    LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    LEFT JOIN chat c ON cmj.chat_id = c.ROWID
    WHERE (m.text IS NOT NULL OR m.attributedBody IS NOT NULL)
  `;

  const params: (string | number)[] = [];

  // Handle contact/handles filter
  if (options.handles && options.handles.length > 0) {
    const conditions: string[] = [];
    for (const handle of options.handles) {
      conditions.push('h.id = ?');
      params.push(handle);
      if (!handle.includes('@')) {
        const normalized = handle.replace(/\D/g, '').slice(-10);
        if (normalized.length === 10) {
          conditions.push('h.id LIKE ?');
          params.push(`%${normalized}`);
        }
      }
    }
    query += ` AND (${conditions.join(' OR ')})`;
  } else if (options.contact) {
    const resolvedHandles = findHandlesByName(options.contact);
    if (resolvedHandles.length > 0) {
      const conditions: string[] = [];
      for (const handle of resolvedHandles) {
        conditions.push('h.id = ?');
        params.push(handle);
      }
      query += ` AND (${conditions.join(' OR ')})`;
    } else {
      query += ` AND (LOWER(h.id) LIKE LOWER(?) OR LOWER(c.display_name) LIKE LOWER(?))`;
      params.push(`%${options.contact}%`, `%${options.contact}%`);
    }
  }

  if (options.daysBack) {
    const cutoff = new Date(Date.now() - options.daysBack * 24 * 60 * 60 * 1000);
    query += ` AND m.date >= ?`;
    params.push(dateToApple(cutoff));
  }

  if (options.fromMe !== undefined) {
    query += ` AND m.is_from_me = ?`;
    params.push(options.fromMe ? 1 : 0);
  }

  query += ` ORDER BY m.date DESC LIMIT ?`;
  params.push(maxResults * 3); // Fetch extra for filtering

  const rows = db.prepare(query).all(...params) as MessageRow[];

  // Filter by query text if provided
  const searchTerms = options.query
    ? options.query.match(/"([^"]+)"|(\S+)/g)?.map(t => t.replace(/"/g, '')) || []
    : [];

  const results: SearchResult[] = [];

  for (const row of rows) {
    if (results.length >= maxResults) break;

    let text = row.text;
    if (!text && row.attributedBody) {
      text = extractTextFromAttributedBody(row.attributedBody);
    }
    if (!text) continue;

    // Check search terms
    if (searchTerms.length > 0) {
      const textLower = text.toLowerCase();
      const allMatch = searchTerms.every(term => textLower.includes(term.toLowerCase()));
      if (!allMatch) continue;
    }

    const contactName = row.handle_id ? getContactName(row.handle_id) : null;
    const date = appleToDate(row.date);

    const message: UnifiedMessage = {
      id: String(row.message_id),
      source: 'imessage',
      text,
      date: date?.toISOString() || '',
      isFromMe: row.is_from_me === 1,
      sender: row.is_from_me === 1 ? 'Me' : (contactName || row.handle_id || 'Unknown'),
      contact: contactName ? {
        id: row.handle_id || '',
        source: 'imessage',
        name: contactName,
        handles: [row.handle_id || ''],
      } : null,
      metadata: {
        chatIdentifier: row.chat_identifier,
        chatName: row.display_name || contactName || row.chat_identifier,
      },
    };

    const result: SearchResult = { message };

    // Fetch context if requested
    if (contextSize > 0) {
      result.context = await getMessageContext(row.message_id, row.chat_identifier || '', contextSize);
    }

    results.push(result);
  }

  return results;
}

async function getMessageContext(messageId: number, chatIdentifier: string, contextSize: number): Promise<{ before: UnifiedMessage[]; after: UnifiedMessage[] }> {
  const db = getDatabase();

  const beforeQuery = `
    SELECT m.ROWID as message_id, m.text, m.attributedBody, m.date, m.is_from_me, h.id as handle_id
    FROM message m
    LEFT JOIN handle h ON m.handle_id = h.ROWID
    LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    LEFT JOIN chat c ON cmj.chat_id = c.ROWID
    WHERE c.chat_identifier = ? AND m.ROWID < ? AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL)
    ORDER BY m.date DESC LIMIT ?
  `;

  const afterQuery = `
    SELECT m.ROWID as message_id, m.text, m.attributedBody, m.date, m.is_from_me, h.id as handle_id
    FROM message m
    LEFT JOIN handle h ON m.handle_id = h.ROWID
    LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    LEFT JOIN chat c ON cmj.chat_id = c.ROWID
    WHERE c.chat_identifier = ? AND m.ROWID > ? AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL)
    ORDER BY m.date ASC LIMIT ?
  `;

  interface ContextRow {
    message_id: number;
    text: string | null;
    attributedBody: Buffer | null;
    date: number;
    is_from_me: number;
    handle_id: string | null;
  }

  const beforeRows = db.prepare(beforeQuery).all(chatIdentifier, messageId, contextSize) as ContextRow[];
  const afterRows = db.prepare(afterQuery).all(chatIdentifier, messageId, contextSize) as ContextRow[];

  const mapRow = (row: ContextRow): UnifiedMessage | null => {
    let text = row.text;
    if (!text && row.attributedBody) {
      text = extractTextFromAttributedBody(row.attributedBody);
    }
    if (!text) return null;

    const contactName = row.handle_id ? getContactName(row.handle_id) : null;
    const date = appleToDate(row.date);

    return {
      id: String(row.message_id),
      source: 'imessage',
      text,
      date: date?.toISOString() || '',
      isFromMe: row.is_from_me === 1,
      sender: row.is_from_me === 1 ? 'Me' : (contactName || row.handle_id || 'Unknown'),
      contact: null,
    };
  };

  return {
    before: beforeRows.reverse().map(mapRow).filter((m): m is UnifiedMessage => m !== null),
    after: afterRows.map(mapRow).filter((m): m is UnifiedMessage => m !== null),
  };
}

// ============ Nickname Inference ============

export interface NicknameMatch {
  handle: string;
  contactName: string | null;
  count: number;
  examples: Array<{ text: string; date: string }>;
}

export async function inferNicknameFromIMessage(nickname: string): Promise<NicknameMatch[]> {
  const db = getDatabase();
  const nicknameLower = nickname.toLowerCase();

  // Search sent messages for the nickname
  const query = `
    SELECT m.text, m.attributedBody, m.date, h.id as handle_id, c.chat_identifier
    FROM message m
    LEFT JOIN handle h ON m.handle_id = h.ROWID
    LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    LEFT JOIN chat c ON cmj.chat_id = c.ROWID
    WHERE m.is_from_me = 1 AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL)
    ORDER BY m.date DESC LIMIT 5000
  `;

  interface Row {
    text: string | null;
    attributedBody: Buffer | null;
    date: number;
    handle_id: string | null;
    chat_identifier: string | null;
  }

  const rows = db.prepare(query).all() as Row[];
  const handleCounts = new Map<string, NicknameMatch>();

  const nicknamePattern = new RegExp(`\\b${nickname}\\b`, 'i');

  for (const row of rows) {
    let text = row.text;
    if (!text && row.attributedBody) {
      text = extractTextFromAttributedBody(row.attributedBody);
    }
    if (!text || !nicknamePattern.test(text)) continue;

    const handle = row.handle_id || row.chat_identifier;
    if (!handle) continue;

    if (!handleCounts.has(handle)) {
      handleCounts.set(handle, {
        handle,
        contactName: getContactName(handle),
        count: 0,
        examples: [],
      });
    }

    const entry = handleCounts.get(handle)!;
    entry.count++;
    if (entry.examples.length < 3) {
      const date = appleToDate(row.date);
      entry.examples.push({
        text: text.substring(0, 150),
        date: date?.toISOString() || '',
      });
    }
  }

  return Array.from(handleCounts.values()).sort((a, b) => b.count - a.count);
}
