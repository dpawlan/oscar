---
name: gmail
description: This skill should be used when the user asks to "read my emails", "check my inbox", "send an email", "search emails", "manage labels", "find emails from", "reply to email", "check for unread messages", "organize my inbox", or mentions Gmail, inbox, or email management. Provides guidance for Gmail operations using MCP tools.
---

# Gmail Integration

This skill enables Gmail management through MCP tools. Read, send, search emails and manage labels directly from Claude Code.

## Authentication

On first use, the Gmail MCP server initiates OAuth authentication:

1. A browser window opens automatically for Google sign-in
2. Grant the requested Gmail permissions
3. Credentials are stored in `~/.gmail-mcp/` for future sessions

If authentication fails or expires, delete `~/.gmail-mcp/token.json` and retry.

## Available MCP Tools

### Reading Emails

**`mcp__gmail__list_emails`** - List emails from inbox

Parameters:
- `maxResults` (number, optional): Maximum emails to return (default: 10, max: 100)
- `query` (string, optional): Gmail search query
- `labelIds` (string[], optional): Filter by label IDs

**`mcp__gmail__read_email`** - Read full email content

Parameters:
- `emailId` (string, required): The email ID to read

### Sending Emails

**`mcp__gmail__send_email`** - Send a new email or reply

Parameters:
- `to` (string, required): Recipient email address
- `subject` (string, required): Email subject
- `body` (string, required): Email body (plain text)
- `cc` (string, optional): CC recipients (comma-separated)
- `bcc` (string, optional): BCC recipients (comma-separated)
- `replyToMessageId` (string, optional): Message ID to reply to (for threading)

Always confirm with the user before sending emails.

### Searching Emails

**`mcp__gmail__search_emails`** - Search using Gmail query syntax

Parameters:
- `query` (string, required): Gmail search query
- `maxResults` (number, optional): Maximum results (default: 20, max: 50)

For detailed search syntax, consult `references/query-syntax.md`.

### Label Management

**`mcp__gmail__list_labels`** - List all labels

Returns all system labels (INBOX, SENT, TRASH, etc.) and custom labels with message counts.

**`mcp__gmail__create_label`** - Create a new label

Parameters:
- `name` (string, required): Label name
- `backgroundColor` (string, optional): Hex color (e.g., "#16a765")
- `textColor` (string, optional): Hex color (e.g., "#ffffff")

**`mcp__gmail__add_label`** - Add label to emails

Parameters:
- `emailIds` (string[], required): Email IDs to label
- `labelId` (string, required): Label ID to add

**`mcp__gmail__remove_label`** - Remove label from emails

Parameters:
- `emailIds` (string[], required): Email IDs to unlabel
- `labelId` (string, required): Label ID to remove

## Common Workflows

### Check Inbox

To check recent emails:

1. Call `mcp__gmail__list_emails` with no parameters for latest 10 emails
2. Present summary: sender, subject, date, snippet
3. Offer to read specific emails if user requests

### Find Specific Emails

To search for emails:

1. Determine search criteria from user request
2. Build Gmail query (see `references/query-syntax.md`)
3. Call `mcp__gmail__search_emails` with constructed query
4. Present results with relevant details

### Send a Reply

To reply to an email:

1. First read the email with `mcp__gmail__read_email`
2. Compose reply based on user instructions
3. Present draft to user for confirmation
4. Call `mcp__gmail__send_email` with `replyToMessageId` set to original email ID

### Organize with Labels

To organize emails:

1. List available labels with `mcp__gmail__list_labels`
2. Create new label if needed with `mcp__gmail__create_label`
3. Apply labels with `mcp__gmail__add_label`

## Best Practices

### Email Summaries

When listing emails, provide concise summaries:
- Sender name/email
- Subject line
- Date/time
- Brief snippet (first ~50 chars of body)
- Unread status

### Before Sending

Always confirm before sending:
1. Show the recipient, subject, and body
2. Ask for explicit confirmation
3. Only send after user approves

### Search Queries

Build effective queries by combining operators:
- `from:sender@example.com` - From specific sender
- `subject:meeting` - Subject contains word
- `is:unread` - Unread only
- `newer_than:7d` - Last 7 days
- `has:attachment` - Has attachments

Combine with spaces: `from:boss@company.com is:unread newer_than:1d`

## Error Handling

Common errors and solutions:

| Error | Solution |
|-------|----------|
| "Not authenticated" | Delete `~/.gmail-mcp/token.json` and retry |
| "Invalid grant" | OAuth token expired, re-authenticate |
| "Rate limit exceeded" | Wait and retry, reduce request frequency |
| "Message not found" | Email ID invalid or deleted |

## Additional Resources

### Reference Files

For detailed information, consult:
- **`references/query-syntax.md`** - Complete Gmail search operator reference

### Example Files

Working examples in `examples/`:
- **`examples/common-tasks.md`** - Step-by-step examples for common operations
