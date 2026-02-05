---
name: clay
description: This skill should be used when the user asks to "search contacts", "find people", "look up contact", "check my network", "add a note", "create contact", "get activity feed", "see contact timeline", "enrich email", or mentions Clay, CRM, contacts, or personal network management. Provides guidance for Clay CRM operations using MCP tools.
---

# Clay CRM Integration

This skill enables Clay CRM management through MCP tools. Search contacts, view activity feeds, manage notes, and enrich profiles directly from Claude Code.

## Authentication

The Clay MCP server uses API key authentication:

1. Set `CLAY_API_KEY` environment variable with your Clay API key
2. The API key is passed via `Authorization: ApiKey YOUR_KEY` header
3. Get your API key from Clay settings

## Available MCP Tools

### Searching Contacts

**`mcp__clay-crm__clay_search_contacts`** - Search for contacts

Parameters:
- `term` (string, optional): Search query text
- `limit` (number, optional): Max results (default: 50, max: 1000)
- `page` (number, optional): Page number for pagination
- `sort_by` (string, optional): Sort field (score, firstName, lastName, notes, reminders)
- `sort_direction` (string, optional): asc or desc
- `include_fields` (string, optional): Comma-separated fields to include

### Getting Contact Details

**`mcp__clay-crm__clay_get_contact`** - Get full contact details

Parameters:
- `contact_id` (string, required): The contact ID

Returns comprehensive contact information including:
- Basic info (name, title, organization, bio)
- Contact methods (email, phone, social profiles)
- Work history and education
- Notes and lists
- Interaction statistics

**`mcp__clay-crm__clay_get_contacts_bulk`** - Get multiple contacts at once

Parameters:
- `contact_ids` (number[], required): Array of contact IDs
- `fields` (string[], optional): Fields to include

### Activity Feed

**`mcp__clay-crm__clay_get_activity`** - Get activity feed

Parameters:
- `limit` (number, optional): Max items (default: 100, max: 1000)
- `after` (number, optional): Unix timestamp for pagination
- `type` (string, optional): Comma-separated types (event, birthday, post, news, reminder, etc.)
- `contacts` (string, optional): Comma-separated contact IDs to filter
- `groups` (string, optional): Comma-separated group IDs to filter
- `status` (string, optional): all, dismissed, or active (default: active)

Activity types include:
- `event` - Calendar events
- `birthday` - Upcoming birthdays
- `post` - Social media posts
- `news` - News mentions
- `reminder` - Scheduled reminders
- `reconnect` - Reconnection suggestions

### Contact Timeline

**`mcp__clay-crm__clay_get_timeline`** - Get interaction history for a contact

Parameters:
- `contact_id` (string, required): The contact ID

Returns chronological list of:
- Emails sent/received
- Meetings
- Notes added
- Import history

### Managing Notes

**`mcp__clay-crm__clay_add_note`** - Add a note to a contact

Parameters:
- `contact_id` (string, required): The contact ID
- `content` (string, required): Note content

Use hashtags in notes for tagging: `#meeting #followup`

### Creating Contacts

**`mcp__clay-crm__clay_create_contact`** - Create a new contact

Parameters:
- `person_lookup` (string, required): Email, LinkedIn URL, Twitter handle, phone, or name
- `lookup_type` (string, optional): email, twitter, linkedin, facebook, url, phone, or manual
- `first_name` (string, optional): First name
- `last_name` (string, optional): Last name

### Email Enrichment

**`mcp__clay-crm__clay_enrich_email`** - Look up profile data for an email

Parameters:
- `email` (string, required): Email address to look up

Returns:
- Name and bio
- Location
- Avatar
- Social links (LinkedIn, Twitter, etc.)

## Common Workflows

### Find a Contact

1. Call `clay_search_contacts` with name or company as search term
2. Review results showing name, score, and basic info
3. Get full details with `clay_get_contact` using the contact ID

### Review Recent Activity

1. Call `clay_get_activity` with no filters for recent updates
2. Filter by type if needed (e.g., `type: "post"` for social posts only)
3. Review contact activities and engagement opportunities

### Add Notes After a Meeting

1. Find the contact with `clay_search_contacts`
2. Add note with `clay_add_note` including meeting details
3. Use hashtags for organization: `#meeting #q1-planning`

### Prepare for a Meeting

1. Search for the contact: `clay_search_contacts`
2. Get full profile: `clay_get_contact`
3. Review timeline: `clay_get_timeline`
4. Check recent activity: `clay_get_activity` filtered by contact

### Research a New Contact

1. If you have their email, use `clay_enrich_email` first
2. Create contact with `clay_create_contact`
3. Review the auto-enriched profile data

## Search Tips

The search supports various terms and operators:

- Name search: `John Smith`
- Company search: `google`
- Location: `nyc` or `new york`
- Notes/tags: Search text in notes
- Combined: Multiple terms narrow results

Full search syntax: https://library.clay.earth/hc/en-us/articles/7510777013403-Search

## Best Practices

### Contact Summaries

When displaying contacts:
- Name and current title/company
- Relationship strength (score)
- Last interaction date
- Key notes or tags

### Before Modifying

Always confirm before:
- Adding notes to contacts
- Creating new contacts

### Activity Review

When reviewing activity:
- Group by contact for context
- Highlight engagement opportunities
- Note posts with high engagement

## Error Handling

Common errors and solutions:

| Error | Solution |
|-------|----------|
| "CLAY_API_KEY not set" | Set the environment variable |
| "401 Unauthorized" | Check API key is valid |
| "404 Not Found" | Contact ID doesn't exist |
| "Rate limit exceeded" | Reduce request frequency |

## Additional Resources

### Reference Files

- **`references/query-syntax.md`** - Search query reference

### Example Files

- **`examples/common-tasks.md`** - Step-by-step examples
