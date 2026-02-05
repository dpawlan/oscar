import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import { readdirSync, existsSync } from 'fs';

// Cache for contact lookups (phone/email -> name)
let contactCache: Map<string, string> | null = null;
// Cache for name lookups (name search -> phone numbers/emails)
let nameToHandlesCache: Map<string, string[]> | null = null;

// Find all AddressBook database paths (main + sources)
function findContactsDatabases(): string[] {
  const baseDir = join(homedir(), 'Library', 'Application Support', 'AddressBook');
  const databases: string[] = [];

  // Check main database
  const mainDb = join(baseDir, 'AddressBook-v22.abcddb');
  if (existsSync(mainDb)) {
    databases.push(mainDb);
  }

  // Check Sources subdirectory
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
      // Ignore errors reading sources directory
    }
  }

  return databases;
}

// Normalize phone number for comparison (strip all non-digits, keep last 10)
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Use last 10 digits to handle country codes
  return digits.slice(-10);
}

// Normalize email for comparison
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Normalize a handle (phone or email) for cache lookup
function normalizeHandle(handle: string): string {
  if (handle.includes('@')) {
    return normalizeEmail(handle);
  }
  return normalizePhone(handle);
}

interface ContactRow {
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  organization: string | null;
}

interface PhoneRow {
  fullNumber: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  organization: string | null;
}

interface EmailRow {
  address: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  organization: string | null;
}

function formatContactName(contact: ContactRow): string | null {
  if (contact.firstName && contact.lastName) {
    return `${contact.firstName} ${contact.lastName}`;
  }
  if (contact.firstName) return contact.firstName;
  if (contact.lastName) return contact.lastName;
  if (contact.nickname) return contact.nickname;
  if (contact.organization) return contact.organization;
  return null;
}

// Build contact cache mapping normalized phone/email -> display name
function buildContactCache(): Map<string, string> {
  if (contactCache) return contactCache;

  contactCache = new Map();
  const databases = findContactsDatabases();

  for (const dbPath of databases) {
    let db: Database.Database | null = null;
    try {
      db = new Database(dbPath, { readonly: true });

      // Get all phone numbers with contact info
      const phoneQuery = `
        SELECT
          p.ZFULLNUMBER as fullNumber,
          r.ZFIRSTNAME as firstName,
          r.ZLASTNAME as lastName,
          r.ZNICKNAME as nickname,
          r.ZORGANIZATION as organization
        FROM ZABCDPHONENUMBER p
        JOIN ZABCDRECORD r ON p.ZOWNER = r.Z_PK
        WHERE p.ZFULLNUMBER IS NOT NULL
      `;

      const phoneRows = db.prepare(phoneQuery).all() as PhoneRow[];
      for (const row of phoneRows) {
        const normalized = normalizePhone(row.fullNumber);
        if (normalized.length >= 7) {
          const name = formatContactName(row);
          if (name && !contactCache.has(normalized)) {
            contactCache.set(normalized, name);
          }
        }
      }

      // Get all emails with contact info
      const emailQuery = `
        SELECT
          e.ZADDRESS as address,
          r.ZFIRSTNAME as firstName,
          r.ZLASTNAME as lastName,
          r.ZNICKNAME as nickname,
          r.ZORGANIZATION as organization
        FROM ZABCDEMAILADDRESS e
        JOIN ZABCDRECORD r ON e.ZOWNER = r.Z_PK
        WHERE e.ZADDRESS IS NOT NULL
      `;

      const emailRows = db.prepare(emailQuery).all() as EmailRow[];
      for (const row of emailRows) {
        const normalized = normalizeEmail(row.address);
        const name = formatContactName(row);
        if (name && !contactCache.has(normalized)) {
          contactCache.set(normalized, name);
        }
      }
    } catch {
      // Skip databases that can't be opened
    } finally {
      if (db) db.close();
    }
  }

  return contactCache;
}

function addToNameCache(contact: ContactRow, handle: string): void {
  if (!nameToHandlesCache) return;

  const searchTerms: string[] = [];

  // Add individual name parts as search terms
  if (contact.firstName) {
    searchTerms.push(contact.firstName.toLowerCase());
  }
  if (contact.lastName) {
    searchTerms.push(contact.lastName.toLowerCase());
  }
  if (contact.nickname) {
    searchTerms.push(contact.nickname.toLowerCase());
  }
  if (contact.organization) {
    searchTerms.push(contact.organization.toLowerCase());
  }

  // Add full name combinations
  if (contact.firstName && contact.lastName) {
    searchTerms.push(`${contact.firstName} ${contact.lastName}`.toLowerCase());
    searchTerms.push(`${contact.lastName} ${contact.firstName}`.toLowerCase());
  }

  // Add each search term to the cache
  for (const term of searchTerms) {
    const existing = nameToHandlesCache.get(term) || [];
    if (!existing.includes(handle)) {
      existing.push(handle);
      nameToHandlesCache.set(term, existing);
    }
  }
}

// Build reverse cache: name search terms -> handles
function buildNameToHandlesCache(): Map<string, string[]> {
  if (nameToHandlesCache) return nameToHandlesCache;

  nameToHandlesCache = new Map();
  const databases = findContactsDatabases();

  for (const dbPath of databases) {
    let db: Database.Database | null = null;
    try {
      db = new Database(dbPath, { readonly: true });

      // Get all contacts with their phone numbers
      const phoneQuery = `
        SELECT
          p.ZFULLNUMBER as fullNumber,
          r.ZFIRSTNAME as firstName,
          r.ZLASTNAME as lastName,
          r.ZNICKNAME as nickname,
          r.ZORGANIZATION as organization
        FROM ZABCDPHONENUMBER p
        JOIN ZABCDRECORD r ON p.ZOWNER = r.Z_PK
        WHERE p.ZFULLNUMBER IS NOT NULL
      `;

      const phoneRows = db.prepare(phoneQuery).all() as PhoneRow[];
      for (const row of phoneRows) {
        addToNameCache(row, row.fullNumber);
      }

      // Get all contacts with their emails
      const emailQuery = `
        SELECT
          e.ZADDRESS as address,
          r.ZFIRSTNAME as firstName,
          r.ZLASTNAME as lastName,
          r.ZNICKNAME as nickname,
          r.ZORGANIZATION as organization
        FROM ZABCDEMAILADDRESS e
        JOIN ZABCDRECORD r ON e.ZOWNER = r.Z_PK
        WHERE e.ZADDRESS IS NOT NULL
      `;

      const emailRows = db.prepare(emailQuery).all() as EmailRow[];
      for (const row of emailRows) {
        addToNameCache(row, row.address);
      }
    } catch {
      // Skip databases that can't be opened
    } finally {
      if (db) db.close();
    }
  }

  return nameToHandlesCache;
}

// Look up contact name by phone number or email
export function getContactName(handle: string): string | null {
  const cache = buildContactCache();
  const normalized = normalizeHandle(handle);
  return cache.get(normalized) || null;
}

// Find all handles (phone/email) for a contact by name search
export function findHandlesByName(nameQuery: string): string[] {
  const cache = buildNameToHandlesCache();
  const searchLower = nameQuery.toLowerCase().trim();

  // Direct match first
  const directMatch = cache.get(searchLower);
  if (directMatch && directMatch.length > 0) {
    return directMatch;
  }

  // Partial match - search all keys that contain the query
  const matches: Set<string> = new Set();
  for (const [key, handles] of cache.entries()) {
    if (key.includes(searchLower) || searchLower.includes(key)) {
      for (const handle of handles) {
        matches.add(handle);
      }
    }
  }

  return Array.from(matches);
}

// Search contacts by name and return matching contact info
export function searchContacts(query: string): Array<{ name: string; handles: string[] }> {
  const databases = findContactsDatabases();
  const searchLower = `%${query.toLowerCase()}%`;
  const resultsMap = new Map<string, { name: string; handles: Set<string> }>();

  for (const dbPath of databases) {
    let db: Database.Database | null = null;
    try {
      db = new Database(dbPath, { readonly: true });

      const contactQuery = `
        SELECT DISTINCT
          r.Z_PK as pk,
          r.ZFIRSTNAME as firstName,
          r.ZLASTNAME as lastName,
          r.ZNICKNAME as nickname,
          r.ZORGANIZATION as organization
        FROM ZABCDRECORD r
        WHERE r.ZFIRSTNAME LIKE ? COLLATE NOCASE
           OR r.ZLASTNAME LIKE ? COLLATE NOCASE
           OR r.ZNICKNAME LIKE ? COLLATE NOCASE
           OR r.ZORGANIZATION LIKE ? COLLATE NOCASE
           OR (r.ZFIRSTNAME || ' ' || r.ZLASTNAME) LIKE ? COLLATE NOCASE
      `;

      interface ContactWithPk extends ContactRow {
        pk: number;
      }

      const contacts = db.prepare(contactQuery).all(
        searchLower, searchLower, searchLower, searchLower, searchLower
      ) as ContactWithPk[];

      for (const contact of contacts) {
        const name = formatContactName(contact);
        if (!name) continue;

        // Use name as key to dedupe across databases
        if (!resultsMap.has(name)) {
          resultsMap.set(name, { name, handles: new Set() });
        }
        const result = resultsMap.get(name)!;

        // Get phone numbers
        const phones = db.prepare(`
          SELECT ZFULLNUMBER as number FROM ZABCDPHONENUMBER WHERE ZOWNER = ?
        `).all(contact.pk) as { number: string }[];
        for (const p of phones) {
          if (p.number) result.handles.add(p.number);
        }

        // Get emails
        const emails = db.prepare(`
          SELECT ZADDRESS as email FROM ZABCDEMAILADDRESS WHERE ZOWNER = ?
        `).all(contact.pk) as { email: string }[];
        for (const e of emails) {
          if (e.email) result.handles.add(e.email);
        }
      }
    } catch {
      // Skip databases that can't be opened
    } finally {
      if (db) db.close();
    }
  }

  // Convert to array format
  return Array.from(resultsMap.values())
    .filter(r => r.handles.size > 0)
    .map(r => ({ name: r.name, handles: Array.from(r.handles) }));
}

// Clear caches (useful if contacts change)
export function clearContactCaches(): void {
  contactCache = null;
  nameToHandlesCache = null;
}
