# iMessage Common Tasks Examples

Step-by-step examples for common iMessage operations.

## Check Recent Messages

**User request:** "What texts did I get today?"

**Steps:**
1. Call `imessage_list_messages` with `hoursAgo: 24`
2. Present summary of each message

**Tool call:**
```json
{
  "tool": "imessage_list_messages",
  "arguments": {
    "hoursAgo": 24,
    "maxResults": 20
  }
}
```

**Response format:**
```
Here are your messages from the last 24 hours:

1. **Mom** (2 hours ago): "Don't forget dinner tomorrow!"
2. **John Smith** (4 hours ago): "Sounds good, see you at 3"
3. **+1 (202) 555-1234** (6 hours ago): "Your order has shipped..."
```

---

## Find Messages from a Specific Person

**User request:** "What did Sarah text me?"

**Steps:**
1. Call `imessage_read_conversation` with contact "sarah"
2. Present recent messages from that conversation

**Tool call:**
```json
{
  "tool": "imessage_read_conversation",
  "arguments": {
    "contact": "sarah",
    "maxMessages": 20
  }
}
```

**Response format:**
```
Here's your recent conversation with Sarah:

**Yesterday**
- Sarah: "Hey are you free this weekend?"
- You: "Yeah Saturday works!"
- Sarah: "Perfect, let's grab lunch"

**Today**
- Sarah: "How about that new sushi place?"
- You: "Sounds great, noon?"
- Sarah: "See you then!"
```

---

## Search for Something Specific

**User request:** "Find that restaurant Mom recommended"

**Steps:**
1. Search for "restaurant" filtered by contact "mom"
2. If no results, broaden search

**Tool call:**
```json
{
  "tool": "imessage_search",
  "arguments": {
    "query": "restaurant",
    "contact": "mom",
    "maxResults": 10
  }
}
```

**Response format:**
```
Found 2 messages from Mom about restaurants:

1. **Dec 15, 2024**: "You should try Bella Italia on Main St, their pasta is amazing"
2. **Nov 28, 2024**: "That new Thai restaurant opened near your place"
```

---

## Find Recent Conversations

**User request:** "Who have I been texting lately?"

**Steps:**
1. Call `imessage_list_conversations` for overview
2. Present conversation list with last message preview

**Tool call:**
```json
{
  "tool": "imessage_list_conversations",
  "arguments": {
    "maxResults": 10
  }
}
```

**Response format:**
```
Your most recent conversations:

1. **Mom** - "Don't forget dinner tomorrow!" (2 hours ago)
2. **Work Group Chat** - "See everyone Monday" (5 hours ago)
3. **John Smith** - "Sounds good!" (yesterday)
4. **Amazon** - "Your package was delivered" (2 days ago)
5. **Sarah** - "See you then!" (3 days ago)
```

---

## Find a Confirmation or Code

**User request:** "Find my Uber code from today"

**Steps:**
1. Search for "uber" with time filter
2. Or search for "code" from today

**Tool call:**
```json
{
  "tool": "imessage_search",
  "arguments": {
    "query": "uber code",
    "daysBack": 1,
    "fromMe": false
  }
}
```

**Response format:**
```
Found 1 message with Uber code:

**Today at 2:15 PM** from +1 (415) 555-0000:
"Your Uber verification code is 847291. Don't share this code."
```

---

## Find an Address

**User request:** "What was that address John sent me?"

**Steps:**
1. Search for address patterns from John
2. Try multiple terms if needed

**Tool call:**
```json
{
  "tool": "imessage_search",
  "arguments": {
    "query": "street OR avenue OR address",
    "contact": "john",
    "daysBack": 30
  }
}
```

Note: OR not supported, so try separate searches:
```json
{
  "tool": "imessage_search",
  "arguments": {
    "query": "address",
    "contact": "john",
    "daysBack": 30
  }
}
```

---

## Check Group Chat

**User request:** "What's happening in my family group chat?"

**Steps:**
1. List conversations to find group chat identifier
2. Read conversation with that identifier

**First tool call:**
```json
{
  "tool": "imessage_list_conversations",
  "arguments": {
    "maxResults": 20
  }
}
```

**Second tool call** (after finding group identifier):
```json
{
  "tool": "imessage_read_conversation",
  "arguments": {
    "contact": "chat123456789",
    "maxMessages": 30
  }
}
```

---

## Find Messages You Sent

**User request:** "What did I tell Dave about the project?"

**Steps:**
1. Search your sent messages to Dave about "project"

**Tool call:**
```json
{
  "tool": "imessage_search",
  "arguments": {
    "query": "project",
    "contact": "dave",
    "fromMe": true
  }
}
```

**Response format:**
```
Found 3 messages you sent Dave about the project:

1. **Jan 5**: "The project deadline is next Friday"
2. **Jan 3**: "Can you review the project proposal?"
3. **Dec 28**: "Starting on the new project next week"
```

---

## Find Plans or Appointments

**User request:** "Do I have any plans this weekend?"

**Steps:**
1. Search for time-related terms
2. Filter to recent messages

**Tool call:**
```json
{
  "tool": "imessage_search",
  "arguments": {
    "query": "saturday",
    "daysBack": 7
  }
}
```

**Additional searches if needed:**
- "sunday"
- "weekend"
- "plans"

---

## Tips for Better Results

### When contact isn't found
Try different formats:
- Full name: "John Smith"
- First name only: "John"
- Phone number: "2025551234"
- Email: "john@email.com"

### When search returns too many results
Add more filters:
- Narrow time: `daysBack: 7` → `daysBack: 1`
- Add contact filter
- Add more search terms
- Use `fromMe` filter

### When search returns nothing
Broaden the search:
- Remove time filter
- Use fewer search terms
- Try synonyms
- Remove contact filter and search all messages
