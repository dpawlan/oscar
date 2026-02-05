---
name: imessage
description: This skill should be used when the user asks to "read my messages", "check my texts", "search iMessages", "find texts from", "what did [person] text me", "show my conversations", "read messages from [person]", or mentions iMessage, texts, SMS, or message history. Provides guidance for iMessage operations using MCP tools. Note that iMessage is READ-ONLY - you cannot send messages.
---

# iMessage Integration

This skill enables read-only iMessage access through MCP tools. Read, search, and browse iMessage conversations directly from Claude Code.

## Important Limitations

**iMessage is READ-ONLY.** Apple does not provide an API for sending messages. You can:
- List conversations
- Read message history
- Search message content
- Filter by contact or time

You CANNOT:
- Send new messages
- Reply to messages
- Delete messages
- Mark messages as read

## Authentication

iMessage access requires Full Disk Access permission on macOS:

1. Open **System Settings** > **Privacy & Security** > **Full Disk Access**
2. Add your terminal application (Terminal.app, iTerm, Warp, etc.)
3. Restart the terminal after granting access

The iMessage database is located at `~/Library/Messages/chat.db`.

## Available MCP Tools

### Listing Conversations

**`imessage_list_conversations`** - List recent conversations

Parameters:
- `maxResults` (number, optional): Maximum conversations to return (default: 20, max: 50)

Returns: List of conversations with contact info, last message preview, and timestamp.

### Listing Messages

**`imessage_list_messages`** - List recent messages

Parameters:
- `maxResults` (number, optional): Maximum messages to return (default: 20, max: 100)
- `contact` (string, optional): Filter by phone number or email
- `hoursAgo` (number, optional): Only messages from last N hours

Returns: Recent messages with sender, content, and timestamp.

### Searching Messages

**`imessage_search`** - Search messages by content

Parameters:
- `query` (string, required): Search text (see query syntax below)
- `maxResults` (number, optional): Maximum results (default: 20, max: 50)
- `contact` (string, optional): Filter by contact
- `daysBack` (number, optional): Only search last N days
- `fromMe` (boolean, optional): Filter by sender (true = sent by user, false = received)

For detailed search syntax, consult `references/search-syntax.md`.

### Reading Conversations

**`imessage_read_conversation`** - Read full conversation with a contact

Parameters:
- `contact` (string, required): Phone number, email, or display name
- `maxMessages` (number, optional): Maximum messages (default: 30, max: 100)
- `beforeDate` (string, optional): ISO date string for pagination

Returns: Messages in chronological order with full conversation context.

## Search Query Syntax

The search tool supports:

### Basic Search
- Single word: `dinner` - finds messages containing "dinner"
- Multiple words: `dinner vegas` - finds messages with BOTH words (AND logic)
- Exact phrase: `"dinner at 7"` - finds exact phrase

### Filtering
- By contact: Use `contact` parameter with phone/email/name
- By time: Use `daysBack` parameter for recency
- By sender: Use `fromMe: true` for sent, `fromMe: false` for received

For complete syntax reference, see `references/search-syntax.md`.

## Common Workflows

### Check Recent Messages

To see recent activity:

1. Call `imessage_list_messages` with no parameters for latest 20 messages
2. Present summary: sender, content preview, time
3. Offer to read full conversation if user requests

### Find Messages from Someone

To find messages from a specific person:

1. Use `imessage_list_messages` with `contact` parameter
2. Or use `imessage_read_conversation` for full history
3. Contact can be phone number, email, or name

### Search for Specific Content

To find messages about something:

1. Build search query based on user request
2. Call `imessage_search` with query
3. Add filters: `contact`, `daysBack`, `fromMe` as needed
4. Present results with context

### View Conversation History

To read a full conversation:

1. Call `imessage_read_conversation` with contact identifier
2. Messages returned in chronological order (oldest first)
3. Use `beforeDate` for pagination if needed

## Best Practices

### Contact Identification

When user asks about "Mom" or "John":
1. First try `imessage_list_conversations` to find matching contacts
2. Look for display names, phone numbers, or emails
3. Use the identifier in subsequent searches

### Message Summaries

When listing messages, provide:
- Sender name/number
- Message content (truncated if long)
- Relative time (e.g., "2 hours ago", "yesterday")
- Whether it was sent or received

### Search Strategies

For vague requests like "find that restaurant":
1. Start with broad search: `restaurant`
2. Filter by time if user mentions "last week": `daysBack: 7`
3. Filter by contact if user mentions who sent it
4. Narrow down with additional terms if too many results

### Privacy Considerations

- Message content is personal - summarize rather than dump full content
- Ask before showing large amounts of message history
- Be discrete about sensitive content

## Error Handling

Common errors and solutions:

| Error | Solution |
|-------|----------|
| "Database not found" | Check macOS version, ensure Messages.app has been used |
| "Permission denied" | Grant Full Disk Access to terminal |
| "No conversation found" | Try different contact format (phone with country code, email) |
| "No results" | Broaden search, check spelling, try fewer terms |

## Contact Format Tips

iMessage identifies contacts in various formats:

- **Phone**: `+12025551234` (with country code)
- **Phone**: `2025551234` (without code)
- **Email**: `john@example.com`
- **iCloud**: `user@icloud.com`

When searching, try partial matches - the search is case-insensitive and matches substrings.

## Additional Resources

### Reference Files

For detailed information, consult:
- **`references/search-syntax.md`** - Complete search query reference

### Example Files

Working examples in `examples/`:
- **`examples/common-tasks.md`** - Step-by-step examples for common operations
