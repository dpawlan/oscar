// Unified types for cross-platform search

export interface UnifiedContact {
  id: string;
  source: 'gmail' | 'imessage' | 'clay';
  name: string;
  handles: string[]; // phone numbers, emails
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface UnifiedMessage {
  id: string;
  source: 'gmail' | 'imessage';
  text: string;
  date: string;
  isFromMe: boolean;
  sender: string;
  recipient?: string;
  contact: UnifiedContact | null;
  threadId?: string;
  subject?: string; // For emails
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  message: UnifiedMessage;
  context?: {
    before: UnifiedMessage[];
    after: UnifiedMessage[];
  };
  relevanceScore?: number;
}

export interface ContactMatch {
  contact: UnifiedContact;
  source: 'gmail' | 'imessage' | 'clay';
  confidence: 'high' | 'medium' | 'low';
  matchReason: string;
  messageCount?: number;
  examples?: Array<{
    text: string;
    date: string;
  }>;
}

export interface ResolvedIdentity {
  query: string;
  matches: ContactMatch[];
  bestMatch: ContactMatch | null;
  handles: string[]; // All phone/email handles for this person
}
