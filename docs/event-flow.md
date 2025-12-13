# Event Flow Documentation

## Event Bus Design

All inter-service communication uses Redis pub/sub. The Issue Tracker publishes events; the Notification Service and Analytics Platform independently subscribe and process them.

**Channel:** `issue-events`

## Event Types

### IssueCreated
Published when: `POST /api/v1/issues` succeeds

```json
{
  "type": "IssueCreated",
  "orgId": "550e8400-e29b-41d4-a716-446655440000",
  "projectId": "7b3c5d2e-...",
  "issueId": "a1b2c3d4-...",
  "actorId": "f0e1d2c3-...",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Notification Service response:**
- Enqueues `send_email` job (team notification)
- Enqueues `send_in_app` job (in-app notification for actor)

**Analytics Platform response:**
- Inserts raw event into `raw_events` collection

---

### IssueUpdated
Published when: `PATCH /api/v1/issues/:id` succeeds

```json
{
  "type": "IssueUpdated",
  "orgId": "...",
  "projectId": "...",
  "issueId": "...",
  "actorId": "...",
  "changes": { "status": "done" },
  "timestamp": "..."
}
```

**Notification Service response:**
- Enqueues `send_in_app` job with change summary

---

### CommentAdded
Published when: `POST /api/v1/issues/:id/comments` succeeds

```json
{
  "type": "CommentAdded",
  "orgId": "...",
  "projectId": "...",
  "issueId": "...",
  "commentId": "...",
  "actorId": "...",
  "timestamp": "..."
}
```

**Notification Service response:**
- Enqueues `send_in_app` job
- Enqueues `send_webhook` job (for external integrations)

---

### UserInvited
Published when: `POST /api/v1/org/invite` succeeds

```json
{
  "type": "UserInvited",
  "orgId": "...",
  "invitedUserId": "...",
  "actorId": "...",
  "role": "member",
  "timestamp": "..."
}
```

**Notification Service response:**
- Enqueues `send_email` job (invitation email)

---

## BullMQ Job States

```
enqueued (pending)
    ↓
processing (worker picked up)
    ↓
    ├── completed ✓
    └── failed (attempt 1)
            ↓ retry after 1s
        failed (attempt 2)
            ↓ retry after 4s
        failed (attempt 3)
            ↓ retry after 16s
        dead → moved to dead_letters collection
```

Backoff formula: `delay = 1000ms × 4^(attempt-1)`
- Attempt 1: immediate
- Retry 1: 1 second delay
- Retry 2: 4 second delay
- Retry 3: 16 second delay

## Redis Pub/Sub Limitation

Redis pub/sub is fire-and-forget. If a subscriber (Notification Service, Analytics Platform) is offline when an event is published, **the event is lost**. This is acceptable for a portfolio project demonstrating the pattern, but in production you would use:

- **Redis Streams** — messages are persisted, consumers can replay from any offset
- **RabbitMQ** — durable queues with acknowledgement
- **Kafka** — ordered, partitioned, retained event log

The code is structured so that replacing `publishEvent` and `subscribeToChannel` in `packages/db/redis.js` would be the only change needed to migrate to a more durable transport.
