# Entity-Relationship Diagrams

## Issue Tracker (PostgreSQL)

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        timestamptz created_at
    }

    ORGANIZATIONS {
        uuid id PK
        varchar name
        timestamptz created_at
    }

    ORGANIZATION_MEMBERS {
        uuid id PK
        uuid org_id FK
        uuid user_id FK
        varchar role
        timestamptz joined_at
    }

    PROJECTS {
        uuid id PK
        uuid org_id FK
        varchar name
        uuid created_by FK
        timestamptz created_at
    }

    ISSUES {
        uuid id PK
        uuid project_id FK
        uuid org_id FK
        varchar title
        text description
        varchar status
        varchar priority
        uuid created_by FK
        uuid assignee_id FK
        text ai_summary
        timestamptz created_at
        timestamptz updated_at
    }

    ISSUE_COMMENTS {
        uuid id PK
        uuid issue_id FK
        uuid org_id FK
        uuid user_id FK
        text content
        timestamptz created_at
    }

    ISSUE_ACTIVITY {
        uuid id PK
        uuid issue_id FK
        uuid org_id FK
        varchar action
        jsonb metadata
        timestamptz created_at
    }

    USERS ||--o{ ORGANIZATION_MEMBERS : "belongs to"
    ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : "has"
    ORGANIZATIONS ||--o{ PROJECTS : "owns"
    PROJECTS ||--o{ ISSUES : "contains"
    ORGANIZATIONS ||--o{ ISSUES : "scopes"
    USERS ||--o{ ISSUES : "creates / assigned to"
    ISSUES ||--o{ ISSUE_COMMENTS : "has"
    ISSUES ||--o{ ISSUE_ACTIVITY : "logs"
```

## Analytics Platform (PostgreSQL — Billing)

```mermaid
erDiagram
    PLANS {
        uuid id PK
        varchar name UK
        integer price_cents
        integer max_projects
        integer max_members
        boolean ai_summarization
        timestamptz created_at
    }

    SUBSCRIPTIONS {
        uuid id PK
        uuid org_id UK
        varchar plan FK
        varchar status
        timestamptz current_period_start
        timestamptz current_period_end
        timestamptz created_at
        timestamptz updated_at
    }

    INVOICES {
        uuid id PK
        uuid org_id
        integer amount_cents
        varchar currency
        varchar status
        varchar stripe_invoice_id
        timestamptz created_at
    }

    PLANS ||--o{ SUBSCRIPTIONS : "defines"
    SUBSCRIPTIONS ||--o{ INVOICES : "generates"
```

## MongoDB Collections

### Notification Service

**jobs**
```json
{
  "_id": "ObjectId",
  "type": "send_email | send_in_app | send_webhook",
  "status": "pending | processing | completed | failed | dead",
  "payload": {},
  "attempts": 0,
  "maxAttempts": 3,
  "lastError": null,
  "bullmqJobId": "string",
  "processedAt": "Date",
  "completedAt": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**notifications**
```json
{
  "_id": "ObjectId",
  "orgId": "uuid",
  "userId": "uuid",
  "type": "email | in_app | webhook",
  "eventType": "IssueCreated | ...",
  "title": "string",
  "body": "string",
  "metadata": {},
  "read": false,
  "deliveredAt": "Date",
  "createdAt": "Date"
}
```

**dead_letters**
```json
{
  "_id": "ObjectId",
  "originalJobId": "string",
  "jobType": "string",
  "payload": {},
  "errorHistory": [{ "attempt": 1, "error": "...", "failedAt": "Date" }],
  "reason": "Max retry attempts exhausted",
  "createdAt": "Date"
}
```

### Analytics Platform

**raw_events**
```json
{
  "_id": "ObjectId",
  "type": "IssueCreated | IssueUpdated | ...",
  "orgId": "uuid",
  "actorId": "uuid",
  "projectId": "uuid",
  "issueId": "uuid",
  "payload": {},
  "receivedAt": "Date"
}
```

**metric_snapshots**
```json
{
  "_id": "ObjectId",
  "orgId": "uuid",
  "date": "2024-01-15",
  "dau": 12,
  "eventCounts": { "IssueCreated": 5, "IssueUpdated": 8 },
  "totalEvents": 13,
  "computedAt": "Date"
}
```
