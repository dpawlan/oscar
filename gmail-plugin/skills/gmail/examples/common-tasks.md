# Common Gmail Tasks - Examples

Step-by-step examples for common Gmail operations.

## Example 1: Check Unread Emails

**User request:** "Show me my unread emails"

**Steps:**

1. Call list_emails with unread filter:
```
Tool: mcp__gmail__list_emails
Parameters: { "query": "is:unread", "maxResults": 10 }
```

2. Format response as summary:
```
You have 5 unread emails:

1. From: john@example.com
   Subject: Q4 Report Review
   Date: Jan 8, 2026 10:30 AM
   Preview: Please review the attached quarterly...

2. From: support@service.com
   Subject: Your ticket has been updated
   Date: Jan 8, 2026 9:15 AM
   Preview: Your support ticket #12345...

[etc.]
```

3. Offer to read specific email if requested.

---

## Example 2: Search for Emails from Specific Sender

**User request:** "Find emails from john@example.com from last week"

**Steps:**

1. Build search query:
```
Tool: mcp__gmail__search_emails
Parameters: { "query": "from:john@example.com newer_than:7d", "maxResults": 20 }
```

2. Present results:
```
Found 3 emails from john@example.com in the last 7 days:

1. Subject: Q4 Report Review
   Date: Jan 8, 2026

2. Subject: Meeting reschedule
   Date: Jan 6, 2026

3. Subject: Project update
   Date: Jan 3, 2026
```

---

## Example 3: Read a Specific Email

**User request:** "Read the email about Q4 Report"

**Steps:**

1. If email ID known, read directly:
```
Tool: mcp__gmail__read_email
Parameters: { "emailId": "18d3f2a1b2c3d4e5" }
```

2. If ID unknown, search first:
```
Tool: mcp__gmail__search_emails
Parameters: { "query": "subject:Q4 Report", "maxResults": 5 }
```

3. Present full email content:
```
From: john@example.com
To: you@example.com
Date: January 8, 2026 10:30 AM
Subject: Q4 Report Review

Hi,

Please review the attached quarterly report and let me know
if you have any questions. The deadline for feedback is Friday.

Key highlights:
- Revenue up 15% YoY
- Customer acquisition cost down 8%
- New product launch exceeded targets

Best,
John
```

---

## Example 4: Send a Reply

**User request:** "Reply to John's email saying I'll review it by Thursday"

**Steps:**

1. Get original email ID from previous read operation.

2. Draft reply and confirm with user:
```
Draft reply:

To: john@example.com
Subject: Re: Q4 Report Review

Hi John,

Thanks for sending this over. I'll review the report and
provide my feedback by Thursday.

Best regards

---
Should I send this reply?
```

3. After user confirmation, send:
```
Tool: mcp__gmail__send_email
Parameters: {
  "to": "john@example.com",
  "subject": "Re: Q4 Report Review",
  "body": "Hi John,\n\nThanks for sending this over. I'll review the report and provide my feedback by Thursday.\n\nBest regards",
  "replyToMessageId": "18d3f2a1b2c3d4e5"
}
```

4. Confirm success:
```
Reply sent successfully to john@example.com.
```

---

## Example 5: Send a New Email

**User request:** "Send an email to team@company.com about tomorrow's meeting"

**Steps:**

1. Draft email and confirm:
```
Draft email:

To: team@company.com
Subject: Tomorrow's Meeting

Hi team,

Just a reminder about our meeting tomorrow at 10 AM.
Please come prepared with your weekly updates.

Agenda:
- Project status updates
- Q1 planning discussion
- Open items

See you there!

---
Should I send this email?
```

2. After confirmation:
```
Tool: mcp__gmail__send_email
Parameters: {
  "to": "team@company.com",
  "subject": "Tomorrow's Meeting",
  "body": "Hi team,\n\nJust a reminder about our meeting tomorrow at 10 AM. Please come prepared with your weekly updates.\n\nAgenda:\n- Project status updates\n- Q1 planning discussion\n- Open items\n\nSee you there!"
}
```

---

## Example 6: Create and Apply Labels

**User request:** "Create a 'Projects' label and apply it to all emails from project-updates@company.com"

**Steps:**

1. Create the label:
```
Tool: mcp__gmail__create_label
Parameters: { "name": "Projects", "backgroundColor": "#4986e7" }
```

2. Search for emails to label:
```
Tool: mcp__gmail__search_emails
Parameters: { "query": "from:project-updates@company.com", "maxResults": 50 }
```

3. Get list of labels to find new label ID:
```
Tool: mcp__gmail__list_labels
```

4. Apply label to found emails:
```
Tool: mcp__gmail__add_label
Parameters: {
  "emailIds": ["id1", "id2", "id3", ...],
  "labelId": "Label_123456"
}
```

5. Confirm:
```
Created 'Projects' label and applied it to 12 emails from project-updates@company.com.
```

---

## Example 7: Clean Up Inbox

**User request:** "Archive all read promotional emails older than 30 days"

**Steps:**

1. Search for matching emails:
```
Tool: mcp__gmail__search_emails
Parameters: {
  "query": "category:promotions is:read older_than:30d in:inbox",
  "maxResults": 50
}
```

2. Remove INBOX label (archives the email):
```
Tool: mcp__gmail__remove_label
Parameters: {
  "emailIds": ["id1", "id2", ...],
  "labelId": "INBOX"
}
```

3. Confirm:
```
Archived 23 promotional emails older than 30 days.
```

---

## Example 8: Find Important Unread Emails

**User request:** "What important emails do I need to respond to?"

**Steps:**

1. Search for important unread:
```
Tool: mcp__gmail__search_emails
Parameters: {
  "query": "is:unread is:important -category:promotions -category:social",
  "maxResults": 10
}
```

2. Present prioritized list:
```
You have 3 important unread emails that may need attention:

1. HIGH PRIORITY
   From: boss@company.com
   Subject: Urgent: Client meeting moved to tomorrow
   Date: Today, 2:30 PM

2. From: hr@company.com
   Subject: Action required: Benefits enrollment deadline
   Date: Today, 11:00 AM

3. From: finance@company.com
   Subject: Expense report approval needed
   Date: Yesterday, 4:45 PM

Would you like me to read any of these?
```
