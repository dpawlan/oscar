# iMessage Search Query Syntax Reference

Complete reference for iMessage search using `imessage_search`.

## Basic Search

### Single Word
```
dinner
```
Finds all messages containing "dinner" (case-insensitive).

### Multiple Words (AND logic)
```
dinner vegas
```
Finds messages containing BOTH "dinner" AND "vegas".

### Exact Phrase
```
"see you tomorrow"
```
Finds messages with the exact phrase "see you tomorrow".

### Mixed Search
```
"flight confirmation" delta
```
Finds messages with exact phrase "flight confirmation" AND the word "delta".

## Search Parameters

### query (required)
The search text. Supports:
- Single words: `meeting`
- Multiple words (AND): `meeting tomorrow`
- Exact phrases: `"meeting at 3pm"`
- Combined: `"meeting at" office tomorrow`

### contact (optional)
Filter by contact identifier:
- Phone number: `+12025551234` or `2025551234`
- Email: `john@example.com`
- Partial match: `john` (matches "John Smith", "john@email.com")
- Display name: `Mom` (if saved in contacts)

### daysBack (optional)
Limit search to recent messages:
- `1` - Last 24 hours
- `7` - Last week
- `30` - Last month
- `365` - Last year

### fromMe (optional)
Filter by message direction:
- `true` - Only messages YOU sent
- `false` - Only messages you RECEIVED
- omit - Both sent and received

### maxResults (optional)
Limit number of results:
- Default: 20
- Maximum: 50

## Search Examples

### Find restaurant recommendations from anyone
```json
{
  "query": "restaurant"
}
```

### Find flight info from last week
```json
{
  "query": "flight",
  "daysBack": 7
}
```

### Find what you told Mom about dinner
```json
{
  "query": "dinner",
  "contact": "mom",
  "fromMe": true
}
```

### Find exact address someone sent
```json
{
  "query": "\"123 Main Street\"",
  "daysBack": 30
}
```

### Find unread appointment confirmations
```json
{
  "query": "appointment confirmed",
  "daysBack": 7,
  "fromMe": false
}
```

### Find messages about a specific topic from a person
```json
{
  "query": "project deadline",
  "contact": "boss@company.com"
}
```

## Tips for Effective Searches

### Start Broad, Then Narrow
1. First search: `meeting` (50 results)
2. Add time: `meeting` + `daysBack: 7` (12 results)
3. Add contact: `meeting` + `daysBack: 7` + `contact: "john"` (3 results)

### Use Exact Phrases for Specifics
- Vague: `confirmation number` (matches any message with both words)
- Specific: `"confirmation number"` (matches exact phrase)

### Contact Matching is Flexible
All of these can find the same person:
- `+1 (202) 555-1234`
- `2025551234`
- `john@example.com`
- `John`
- `john smith`

### Combine Multiple Terms
```json
{
  "query": "dinner reservation saturday",
  "daysBack": 14
}
```
Finds messages containing ALL THREE words from the last 2 weeks.

## Common Search Patterns

### Recent messages from family
```json
{
  "query": "",
  "contact": "mom",
  "daysBack": 3
}
```
Note: Use `imessage_list_messages` instead for this.

### Find an address or location
```json
{
  "query": "address",
  "daysBack": 30
}
```
Or search for street names, city names, "meet at", etc.

### Find confirmation codes
```json
{
  "query": "code",
  "daysBack": 7,
  "fromMe": false
}
```

### Find links someone shared
```json
{
  "query": "http",
  "contact": "friend@email.com",
  "daysBack": 30
}
```

### Find messages about plans
```json
{
  "query": "tonight OR tomorrow OR weekend",
  "daysBack": 7
}
```
Note: OR is not supported - search separately for each term.

## Limitations

### No OR Logic
Each search term must be present (AND only). For OR logic, run multiple searches.

### No Negation
Cannot exclude terms. If needed, filter results manually.

### No Regex
Only literal string matching and exact phrases.

### Case Insensitive
All searches ignore case: "DINNER" matches "dinner".

### Substring Matching
Searches find partial matches: "meet" matches "meeting", "meets", "meet".
