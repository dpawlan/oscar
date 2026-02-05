import { ResolvedIdentity, ContactMatch } from '../sources/types.js';
import { findContactInClay } from '../sources/clay.js';
import { inferNicknameFromIMessage, findHandlesByName, getContactName } from '../sources/imessage.js';
import { inferNicknameFromGmail } from '../sources/gmail.js';

export const resolveContactSchema = {
  type: 'object' as const,
  properties: {
    name: {
      type: 'string',
      description: 'The name, nickname, or alias to resolve (e.g., "Mandy", "Mom", "Big J")',
    },
    searchAllSources: {
      type: 'boolean',
      description: 'Whether to search all sources or stop at first confident match (default: true)',
    },
  },
  required: ['name'],
};

export interface ResolveContactArgs {
  name: string;
  searchAllSources?: boolean;
}

export async function resolveContact(args: ResolveContactArgs): Promise<string> {
  const { name, searchAllSources = true } = args;
  const matches: ContactMatch[] = [];
  const allHandles: Set<string> = new Set();

  // 1. Check macOS Contacts first (direct lookup)
  const contactsHandles = findHandlesByName(name);
  if (contactsHandles.length > 0) {
    const contactName = getContactName(contactsHandles[0]);
    matches.push({
      contact: {
        id: contactsHandles[0],
        source: 'imessage',
        name: contactName || name,
        handles: contactsHandles,
      },
      source: 'imessage',
      confidence: 'high',
      matchReason: 'Direct match in macOS Contacts',
    });
    contactsHandles.forEach(h => allHandles.add(h));

    if (!searchAllSources) {
      return formatResult(name, matches, allHandles);
    }
  }

  // 2. Search Clay CRM for contact or nickname in notes
  try {
    const clayMatches = await findContactInClay(name);
    for (const match of clayMatches) {
      matches.push(match);
      match.contact.handles.forEach(h => allHandles.add(h));
    }

    // If we found a high-confidence match and not searching all sources, stop
    if (!searchAllSources && clayMatches.some(m => m.confidence === 'high')) {
      return formatResult(name, matches, allHandles);
    }
  } catch (error) {
    // Clay might not be configured, continue
  }

  // 3. Infer from iMessage patterns - who do you call by this name?
  try {
    const iMessageMatches = await inferNicknameFromIMessage(name);
    for (const match of iMessageMatches.slice(0, 5)) {
      const existingMatch = matches.find(m =>
        m.contact.handles.some(h => h === match.handle || normalizeHandle(h) === normalizeHandle(match.handle))
      );

      if (existingMatch) {
        // Boost existing match
        existingMatch.messageCount = (existingMatch.messageCount || 0) + match.count;
        if (match.count > 5) {
          existingMatch.confidence = 'high';
          existingMatch.matchReason += ` + ${match.count} iMessages using "${name}"`;
        }
      } else {
        matches.push({
          contact: {
            id: match.handle,
            source: 'imessage',
            name: match.contactName || match.handle,
            handles: [match.handle],
          },
          source: 'imessage',
          confidence: match.count > 10 ? 'high' : match.count > 3 ? 'medium' : 'low',
          matchReason: `You use "${name}" in ${match.count} messages to this contact`,
          messageCount: match.count,
          examples: match.examples,
        });
        allHandles.add(match.handle);
      }
    }
  } catch (error) {
    // iMessage might not be accessible, continue
  }

  // 4. Infer from Gmail patterns
  try {
    const gmailMatches = await inferNicknameFromGmail(name);
    for (const match of gmailMatches.slice(0, 5)) {
      const existingMatch = matches.find(m =>
        m.contact.handles.some(h => normalizeHandle(h) === normalizeHandle(match.email))
      );

      if (existingMatch) {
        existingMatch.messageCount = (existingMatch.messageCount || 0) + match.count;
        if (match.count > 3) {
          existingMatch.matchReason += ` + ${match.count} emails mentioning "${name}"`;
        }
      } else {
        matches.push({
          contact: {
            id: match.email,
            source: 'gmail',
            name: match.name || match.email,
            handles: [match.email],
          },
          source: 'gmail',
          confidence: match.count > 5 ? 'medium' : 'low',
          matchReason: `"${name}" appears in ${match.count} emails with this contact`,
          messageCount: match.count,
          examples: match.examples.map(e => ({ text: e.subject, date: e.date })),
        });
        allHandles.add(match.email);
      }
    }
  } catch (error) {
    // Gmail might not be configured, continue
  }

  return formatResult(name, matches, allHandles);
}

function normalizeHandle(handle: string): string {
  if (handle.includes('@')) {
    return handle.toLowerCase().trim();
  }
  return handle.replace(/\D/g, '').slice(-10);
}

function formatResult(query: string, matches: ContactMatch[], handles: Set<string>): string {
  // Sort by confidence then by message count
  const sorted = matches.sort((a, b) => {
    const confOrder = { high: 0, medium: 1, low: 2 };
    const confDiff = confOrder[a.confidence] - confOrder[b.confidence];
    if (confDiff !== 0) return confDiff;
    return (b.messageCount || 0) - (a.messageCount || 0);
  });

  // Dedupe by normalized handle
  const seen = new Set<string>();
  const deduped = sorted.filter(m => {
    const key = m.contact.handles.map(normalizeHandle).sort().join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const bestMatch = deduped[0] || null;

  const result: ResolvedIdentity = {
    query,
    matches: deduped,
    bestMatch,
    handles: Array.from(handles),
  };

  // Add summary message
  let summary: string;
  if (bestMatch) {
    summary = `"${query}" most likely refers to ${bestMatch.contact.name}`;
    if (bestMatch.confidence === 'high') {
      summary += ` (high confidence: ${bestMatch.matchReason})`;
    } else {
      summary += ` (${bestMatch.confidence} confidence)`;
    }
    if (deduped.length > 1) {
      summary += `. Found ${deduped.length} possible matches.`;
    }
  } else {
    summary = `Could not find anyone matching "${query}" across Contacts, Clay, iMessage, or Gmail.`;
  }

  return JSON.stringify({
    ...result,
    summary,
  }, null, 2);
}
