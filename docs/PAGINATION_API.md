# Cursor-Based Pagination API Documentation

## Endpoint: `GET /api/problems/paginated`

Returns a paginated list of problems using keyset (cursor-based) pagination.

### Query Parameters

| Parameter   | Type   | Required | Default   | Description                                    |
|-------------|--------|----------|-----------|------------------------------------------------|
| `difficulty`| string | No       | -         | Filter by difficulty: `Easy`, `Medium`, `Hard` |
| `topic`     | string | No       | -         | Filter by topic slug                           |
| `sort_by`   | string | No       | `newest`  | Sort order: `newest`, `oldest`, `frontend_id`, `title` |
| `cursor`    | string | No       | -         | Opaque cursor token from previous response     |
| `limit`     | int    | No       | `20`      | Items per page (1-100)                         |

### Response Schema

```json
{
  "items": [
    {
      "id": 1,
      "problem_id": 1,
      "frontend_id": 1,
      "title": "Two Sum",
      "slug": "two-sum",
      "difficulty": "Easy",
      "created_at": "2026-03-01T10:00:00+00:00",
      "topics": [
        { "id": 1, "name": "Array", "slug": "array" }
      ]
    }
  ],
  "next_cursor": "eyJzb3J0IjoibmV3ZXN0IiwiaWQiOjEsInZhbCI6IjIwMjYtMDMtMDFUMTA6MDA6MDAifQ==",
  "has_next": true,
  "total_count": 1250
}
```

### Response Fields

| Field         | Type   | Description                                                                 |
|---------------|--------|-----------------------------------------------------------------------------|
| `items`       | array  | Current page of problems (minimal fields for list view)                     |
| `next_cursor` | string | Opaque token for fetching next page. `null` if no more pages.               |
| `has_next`    | bool   | `true` if there are more pages available                                    |
| `total_count` | int    | Total matching problems. Only returned on first page (cursor=null) for performance |

### Cursor Encoding

The cursor is a base64-encoded JSON object containing:
- `sort`: The sort order used for this query
- `id`: The database ID of the last item on the current page
- `val`: The sort column value of the last item

Example decoded cursor:
```json
{
  "sort": "newest",
  "id": 42,
  "val": "2026-03-01T10:00:00+00:00"
}
```

### Usage Examples

**First page (newest first):**
```
GET /api/problems/paginated?sort_by=newest&limit=20
```

**Next page:**
```
GET /api/problems/paginated?sort_by=newest&limit=20&cursor=eyJzb3J0IjoibmV3ZXN0Ii...
```

**Filtered by difficulty:**
```
GET /api/problems/paginated?difficulty=Medium&sort_by=frontend_id&limit=20
```

### Performance Characteristics

- **Time complexity**: O(log N + K) where N = total rows, K = limit
- **Space complexity**: O(1) - no offset scanning
- **Consistent performance** regardless of page depth
- **Cache**: First page cached for 60s via Redis

### Error Responses

| Status Code | Description              |
|-------------|--------------------------|
| 400         | Invalid cursor or parameters |
| 500         | Internal server error    |

### Idempotency

The API is fully stateless and idempotent. The cursor encodes all necessary state (sort order, last item identifier). No server-side session storage is required.
