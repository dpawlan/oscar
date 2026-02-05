---
name: oscar
description: This skill should be used when the user asks questions that require searching personal data across multiple sources - emails, text messages, and contacts. Use when the user asks "what apartment does X live in", "when did I last talk to Y", "find that email about Z", "what did Mom say about", or any question requiring contextual search across Gmail, iMessage, or Clay CRM. This is the PRIMARY skill for personal information retrieval.
---

# Oscar - Unified Contextual Search

Oscar provides intelligent search across your personal data sources (Gmail, iMessage, Clay CRM) with:

- **Cross-platform contact resolution** - Automatically figures out who "Mandy" is even if that's not their real name
- **Contextual search** - Returns surrounding messages, not just the match
- **Multi-source search** - Searches email AND texts simultaneously
- **Nickname inference** - Learns relationships from how you actually communicate

## When to Use Oscar

Use Oscar for ANY question about personal communications:

- "What apartment does Mandy live in?"
- "When is John's birthday?"
- "Find that email about the project deadline"
- "What did Mom say about Thanksgiving?"
- "Show me my conversation with the investor about terms"

## Available Tools

### `oscar_search` - Search Everything

Search across Gmail and iMessage simultaneously with automatic contact resolution.

```
oscar_search:
  query: "apartment"          # What to search for
  contact: "Mandy"            # Filter by person (nicknames work!)
  sources: ["all"]            # or ["gmail"], ["imessage"]
  daysBack: 90                # Time filter
  contextMessages: 5          # Messages before/after each result
```

**Key features:**
- Resolves nicknames automatically
- Returns conversation context (not just isolated matches)
- Searches both email and texts at once

### `oscar_resolve_contact` - Who Is This Person?

Figure out who a nickname or alias refers to.

```
oscar_resolve_contact:
  name: "Mandy"
```

**How it works:**
1. Checks macOS Contacts for direct matches
2. Searches Clay CRM notes for nicknames
3. Analyzes iMessage patterns (who do you call "Mandy"?)
4. Scans Gmail for email patterns

Returns confidence levels and evidence for each match.

### `oscar_get_context` - Full Conversation

Get complete conversation history with someone, optionally centered around a topic.

```
oscar_get_context:
  contact: "Mandy"
  source: "imessage"         # or "gmail"
  around: "apartment"         # Optional: center on this keyword
  maxMessages: 30
```

**Use this when:**
- You need to read through a conversation
- The answer might be in the reply, not the question
- You want chronological context

## Workflow Examples

### "What apartment does Mandy live in?"

1. **Resolve contact first** (if uncertain):
   ```
   oscar_resolve_contact: { name: "Mandy" }
   → "Mandy" = Matt Mandelbaum (+1234567890)
   ```

2. **Search with context**:
   ```
   oscar_search: { query: "apartment", contact: "Mandy", contextMessages: 5 }
   ```

3. **If needed, get full conversation**:
   ```
   oscar_get_context: { contact: "Mandy", source: "imessage", around: "apartment" }
   ```

The context will show:
- You: "hey what's your apartment again?"
- Mandy: "4B at 123 Main St"  ← The answer!

### "When did I last talk to John about the project?"

```
oscar_search: { query: "project", contact: "John", daysBack: 30 }
```

Returns recent emails AND texts about "project" with John, with surrounding context.

### Finding someone by nickname

If you don't know who "Big J" is:

```
oscar_resolve_contact: { name: "Big J" }
```

Oscar will:
1. Check Contacts for anyone with "Big J" as a nickname
2. Search Clay notes for "Big J"
3. Find messages where you wrote "hey Big J" - who did you send them to?
4. Return: "Big J most likely refers to James Wilson (+1555123456)"

## Best Practices

### Always Use Context

Never just search for a keyword. The answer is often in the REPLY:

❌ Search: "apartment" → Finds "what's your apartment?"
✅ Search with context: "apartment" + contextMessages: 5 → Finds the question AND the answer

### Let Oscar Resolve Nicknames

Don't try to guess the real name. Oscar will figure it out:

❌ Manually searching: "Matt" when you mean "Mandy"
✅ Let Oscar resolve: `contact: "Mandy"` → automatically becomes Matt Mandelbaum

### Start Broad, Then Narrow

1. First search across all sources
2. If too many results, filter by source or time
3. If still unclear, get full conversation context

### Trust the Inference

Oscar learns from your actual communication patterns. If you call someone "Mom" in 500 texts, Oscar knows who Mom is.

## Error Handling

| Issue | Solution |
|-------|----------|
| "Contact not found" | Try different spelling, use resolve_contact first |
| Gmail auth error | Re-authenticate (tokens stored in ~/.oscar-mcp/) |
| iMessage permission denied | Grant Full Disk Access to terminal |
| No results | Broaden search, remove filters, check spelling |

## Data Sources

Oscar searches:

- **Gmail** - Full email content and threads
- **iMessage** - Text messages (read-only, cannot send)
- **Clay CRM** - Contact info and notes
- **macOS Contacts** - Phone/email lookups

## Privacy Notes

- All searches run locally
- Gmail OAuth tokens stored in ~/.oscar-mcp/
- iMessage accessed via local database (requires Full Disk Access)
- Clay accessed via API key
