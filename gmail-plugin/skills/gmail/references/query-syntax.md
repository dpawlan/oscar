# Gmail Search Query Syntax Reference

Complete reference for Gmail search operators used with `mcp__gmail__search_emails`.

## Basic Operators

### Sender/Recipient

| Operator | Description | Example |
|----------|-------------|---------|
| `from:` | From specific sender | `from:john@example.com` |
| `to:` | To specific recipient | `to:team@company.com` |
| `cc:` | CC'd to someone | `cc:manager@company.com` |
| `bcc:` | BCC'd to someone | `bcc:archive@company.com` |

### Content

| Operator | Description | Example |
|----------|-------------|---------|
| `subject:` | Subject contains | `subject:meeting` |
| `"exact phrase"` | Exact phrase match | `"quarterly report"` |
| `-word` | Exclude word | `-unsubscribe` |
| `OR` | Either term | `from:john OR from:jane` |

### Status

| Operator | Description | Example |
|----------|-------------|---------|
| `is:unread` | Unread messages | `is:unread` |
| `is:read` | Read messages | `is:read` |
| `is:starred` | Starred messages | `is:starred` |
| `is:important` | Marked important | `is:important` |
| `is:snoozed` | Snoozed messages | `is:snoozed` |

### Location

| Operator | Description | Example |
|----------|-------------|---------|
| `in:inbox` | In inbox | `in:inbox` |
| `in:sent` | In sent folder | `in:sent` |
| `in:drafts` | In drafts | `in:drafts` |
| `in:trash` | In trash | `in:trash` |
| `in:spam` | In spam | `in:spam` |
| `in:anywhere` | All mail including spam/trash | `in:anywhere` |
| `label:` | Has specific label | `label:work` |

### Attachments

| Operator | Description | Example |
|----------|-------------|---------|
| `has:attachment` | Has any attachment | `has:attachment` |
| `filename:` | Attachment filename | `filename:report.pdf` |
| `filename:pdf` | Attachment type | `filename:pdf` |
| `has:drive` | Has Google Drive link | `has:drive` |
| `has:document` | Has Google Doc | `has:document` |
| `has:spreadsheet` | Has Google Sheet | `has:spreadsheet` |

### Size

| Operator | Description | Example |
|----------|-------------|---------|
| `size:` | Larger than bytes | `size:5000000` |
| `larger:` | Larger than | `larger:5M` |
| `smaller:` | Smaller than | `smaller:1M` |

Size units: B, K, M (bytes, kilobytes, megabytes)

## Date Operators

### Relative Dates

| Operator | Description | Example |
|----------|-------------|---------|
| `newer_than:` | Within time period | `newer_than:7d` |
| `older_than:` | Before time period | `older_than:1y` |

Time units:
- `d` - days
- `m` - months
- `y` - years

### Absolute Dates

| Operator | Description | Example |
|----------|-------------|---------|
| `after:` | After date | `after:2024/01/01` |
| `before:` | Before date | `before:2024/12/31` |

Date format: `YYYY/MM/DD`

## Advanced Operators

### Message Properties

| Operator | Description | Example |
|----------|-------------|---------|
| `is:chat` | Chat messages | `is:chat` |
| `category:` | Category | `category:promotions` |
| `has:userlabels` | Has user labels | `has:userlabels` |
| `has:nouserlabels` | No user labels | `has:nouserlabels` |

Categories: `primary`, `social`, `promotions`, `updates`, `forums`

### Delivery

| Operator | Description | Example |
|----------|-------------|---------|
| `deliveredto:` | Delivered to address | `deliveredto:alias@gmail.com` |
| `list:` | Mailing list | `list:updates@company.com` |

### Message ID

| Operator | Description | Example |
|----------|-------------|---------|
| `rfc822msgid:` | Message ID header | `rfc822msgid:<id@example.com>` |

## Combining Operators

### AND (implicit)

Space between terms means AND:
```
from:john subject:meeting is:unread
```
Finds unread emails from John with "meeting" in subject.

### OR

Use `OR` (uppercase) between terms:
```
from:john OR from:jane
```
Finds emails from either John or Jane.

### Grouping

Use parentheses for complex queries:
```
(from:john OR from:jane) subject:report
```
Finds emails from John or Jane with "report" in subject.

### Negation

Use `-` to exclude:
```
from:newsletter -subject:unsubscribe
```
Finds newsletter emails without "unsubscribe" in subject.

## Common Query Patterns

### Unread from specific sender
```
from:boss@company.com is:unread
```

### Recent with attachments
```
has:attachment newer_than:7d
```

### Important unread this week
```
is:important is:unread newer_than:7d
```

### Large attachments from last month
```
has:attachment larger:5M newer_than:30d
```

### Emails to reply to
```
is:unread in:inbox -category:promotions -category:social
```

### Search in sent mail
```
in:sent to:client@example.com after:2024/01/01
```

### Find PDFs from specific sender
```
from:accounting@company.com filename:pdf
```

### Exclude automated emails
```
in:inbox -from:noreply -from:no-reply -category:promotions
```
