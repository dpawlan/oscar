# Clay Common Tasks

## Search for a Contact

Find someone by name:

```
User: Find John in my contacts
```

1. Call `clay_search_contacts` with term "john"
2. Present results: name, company, relationship score
3. Offer to show full details for any contact

## Get Contact Details

View full profile:

```
User: Show me details for contact 15299
```

1. Call `clay_get_contact` with contact_id "15299"
2. Display:
   - Basic info (name, title, company)
   - Contact methods
   - Recent notes
   - Interaction history

## Check Activity Feed

See what contacts are up to:

```
User: What's new in my network?
```

1. Call `clay_get_activity` with default parameters
2. Group activities by type (posts, news, events)
3. Highlight notable updates

## Filter Activity by Type

See only social posts:

```
User: Show me recent posts from my contacts
```

1. Call `clay_get_activity` with type "post"
2. Show post content, engagement metrics, links

## Review Contact Timeline

Prepare for a meeting:

```
User: When did I last interact with Tim King?
```

1. Search for Tim King to get contact ID
2. Call `clay_get_timeline` with the contact ID
3. Show chronological interaction history

## Add a Note

Record meeting notes:

```
User: Add a note to Tim's profile about our lunch meeting
```

1. Find contact ID for Tim
2. Call `clay_add_note` with:
   - contact_id: Tim's ID
   - content: "Had lunch - discussed Q1 planning #meeting #followup"
3. Confirm note was added

## Create a New Contact

Add someone to your network:

```
User: Add john@example.com as a contact
```

1. Optionally enrich first: `clay_enrich_email`
2. Call `clay_create_contact` with:
   - person_lookup: "john@example.com"
3. Show the created contact profile

## Enrich an Email

Look up someone before meeting:

```
User: What do you know about sarah@company.com?
```

1. Call `clay_enrich_email` with the email
2. Display:
   - Name and bio
   - Current location
   - Social profiles

## Bulk Contact Lookup

Get multiple contacts at once:

```
User: Get info for contacts 15299, 15295, and 15208
```

1. Call `clay_get_contacts_bulk` with IDs [15299, 15295, 15208]
2. Display summary for each contact

## Find Contacts at a Company

Research before a meeting:

```
User: Who do I know at Google?
```

1. Call `clay_search_contacts` with term "google"
2. Show contacts with their roles
3. Offer to show details or activity

## Review Birthday Reminders

Don't miss important dates:

```
User: Any upcoming birthdays?
```

1. Call `clay_get_activity` with type "birthday"
2. List contacts with upcoming birthdays
3. Offer to add notes or send messages
