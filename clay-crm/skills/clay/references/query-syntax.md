# Clay Search Query Reference

## Basic Search

Simply enter text to search across all contact fields:

```
john smith
```

This searches names, companies, notes, and other text fields.

## Search Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `term` | Search query text | `nyc`, `john`, `google` |
| `limit` | Max results (1-1000) | `500` |
| `page` | Page number | `1`, `2`, `3` |
| `sort_by` | Sort field | `score`, `firstName`, `lastName` |
| `sort_direction` | Sort order | `asc`, `desc` |

## Sort Options

- `score` - Relevance/relationship strength (default)
- `firstName` - Alphabetical by first name
- `lastName` - Alphabetical by last name
- `notes` - By note count
- `reminders` - By reminder date

## Search Fields

The search indexes these contact fields:

- **Name fields**: firstName, lastName, displayName, fullName
- **Organization**: company name, title, headline
- **Location**: city, region, country
- **Notes**: Note content and hashtags
- **Contact info**: Email addresses, phone numbers
- **Social**: Twitter handle, LinkedIn URL

## Tips

### Finding People by Company

Search the company name:
```
kleiner perkins
```

### Finding by Location

Search city or region:
```
san francisco
```
```
nyc
```

### Finding by Notes/Tags

Search hashtag or note text:
```
#investor
```
```
coffee meeting
```

### Combining Terms

Multiple terms narrow the search:
```
john google investor
```

This finds contacts matching ALL terms.

## Filtering Results

Use `include_fields` to limit response data:

```
displayName,id,avatarURL
```

This reduces response size and improves performance.

## Pagination

For large result sets:

1. Set `limit` to your page size (e.g., 100)
2. Start with `page: 1`
3. Increment page for more results
4. Continue until results < limit

## Advanced Search

For advanced filtering beyond the API, Clay's web app supports additional operators. See: https://library.clay.earth/hc/en-us/articles/7510777013403-Search
