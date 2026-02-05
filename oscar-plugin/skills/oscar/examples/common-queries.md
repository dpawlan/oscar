# Common Query Examples

## Finding Information About Someone

### "What's Mandy's apartment number?"

```
Step 1: oscar_resolve_contact
  name: "Mandy"
Result: "Mandy" = Matt Mandelbaum (high confidence, you use "Mandy" in 47 texts to +1234567890)

Step 2: oscar_search
  query: "apartment"
  contact: "Mandy"
  contextMessages: 5
Result: Found message from Dec 5:
  - You: "hey mandy what's your apt again"
  - Matt: "4B - buzz 402"
```

### "When is John's birthday?"

```
oscar_search:
  query: "birthday"
  contact: "John"
  sources: ["imessage", "gmail"]
  contextMessages: 3
```

Or check Clay directly if you store birthdays there.

### "What's Sarah's email address?"

```
oscar_resolve_contact:
  name: "Sarah"
Result: Returns all known handles including emails
```

## Finding Specific Information

### "Find that restaurant John recommended"

```
oscar_search:
  query: "restaurant"
  contact: "John"
  daysBack: 60
  contextMessages: 5
```

### "What time is the meeting tomorrow?"

```
oscar_search:
  query: "meeting"
  daysBack: 7
  contextMessages: 3
```

### "Flight confirmation for next week"

```
oscar_search:
  query: "flight confirmation"
  sources: ["gmail"]
  daysBack: 14
```

## Conversation History

### "Show me my recent conversation with Mom"

```
oscar_get_context:
  contact: "Mom"
  source: "imessage"
  maxMessages: 50
```

### "What have I been emailing my boss about?"

```
oscar_get_context:
  contact: "boss@company.com"
  source: "gmail"
  daysBack: 30
```

### "Find where we discussed pricing with the client"

```
oscar_get_context:
  contact: "client@company.com"
  source: "gmail"
  around: "pricing"
```

## Identifying People

### "Who is Big J?"

```
oscar_resolve_contact:
  name: "Big J"
Result:
  - James Wilson (high confidence): You use "Big J" in 23 messages
  - Examples: "hey big j, you coming?", "big j says he's in"
```

### "Who was I texting about the party?"

```
oscar_search:
  query: "party"
  sources: ["imessage"]
  daysBack: 14
```

## Multi-Source Searches

### "Everything about the San Francisco trip"

```
oscar_search:
  query: "san francisco trip"
  sources: ["all"]
  daysBack: 60
  contextMessages: 5
```

### "Communication with investors last month"

```
oscar_search:
  query: "investment OR funding OR round"
  contact: "investor" # If you have them tagged
  daysBack: 30
```

## Tips

1. **Use nicknames naturally** - Say "Mom" not "Mother's phone number"
2. **Add context requests** - Always use `contextMessages` to see surrounding conversation
3. **Let results guide you** - If first search is too broad, add contact or time filters
4. **Check both sources** - Information might be split across email and text
