Standard response envelope:

```json
{ "data": "<payload>" }                                    // success
{ "error": { "code": "...", "message": "..." } }          // error
```

HTTP status codes:
- 200 OK — successful GET, PATCH
- 201 Created — successful POST creating a resource
- 204 No Content — successful DELETE
- 400 Bad Request — validation error (include field errors in response)
- 401 Unauthorized — missing/invalid auth
- 403 Forbidden — authenticated but not allowed
- 404 Not Found — resource doesn't exist
- 409 Conflict — e.g. duplicate unique constraint
- 500 Internal Server Error — unexpected error (log it, don't expose internals)

Error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": { "field": "reason" }
  }
}
```
