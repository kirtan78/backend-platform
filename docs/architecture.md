# System Architecture

## Overview

The Backend Engineering Platform is a monorepo containing three production-style microservices that communicate via a Redis pub/sub event bus. Each service is independently startable, has its own database(s), and can be scaled horizontally without changes to other services.

## Service Map

```mermaid
graph TB
    Client([HTTP Client])

    subgraph "Issue Tracker — Port 3001"
        IT_API[Express Routes]
        IT_MW[Auth + RBAC Middleware]
        IT_SVC[Services Layer]
        IT_REPO[Repository Layer]
        IT_PG[(PostgreSQL\norgs, users, projects,\nissues, comments, activity)]
        IT_REDIS[(Redis\nCache: issue lists,\nmember lists)]
        IT_PUB[Event Publisher]
    end

    subgraph "Notification Service — Port 3002"
        NS_API[Express Routes]
        NS_SUB[Redis Subscriber]
        NS_QUEUE[BullMQ Queue]
        NS_WORKER[BullMQ Worker\nconcurrency=5]
        NS_MONGO[(MongoDB\njobs, notifications,\ndead_letters)]
    end

    subgraph "Analytics Platform — Port 3003"
        AP_API[Express Routes]
        AP_SUB[Redis Subscriber]
        AP_AGG[Aggregation Worker\nevery 60s]
        AP_MONGO[(MongoDB\nraw_events,\nmetric_snapshots)]
        AP_PG[(PostgreSQL\nplans, subscriptions,\ninvoices)]
        AP_CACHE[(Redis\nMetrics cache 5min TTL)]
    end

    Client --> IT_API
    Client --> NS_API
    Client --> AP_API

    IT_API --> IT_MW --> IT_SVC --> IT_REPO --> IT_PG
    IT_SVC --> IT_REDIS
    IT_SVC --> IT_PUB

    IT_PUB -->|publish: CHANNELS.ISSUE_EVENTS| Redis_Bus[(Redis Pub/Sub)]

    Redis_Bus -->|subscribe| NS_SUB
    Redis_Bus -->|subscribe| AP_SUB

    NS_SUB --> NS_QUEUE --> NS_WORKER --> NS_MONGO

    AP_SUB --> AP_MONGO
    AP_AGG --> AP_MONGO
    AP_AGG --> AP_CACHE
    AP_API --> AP_CACHE
    AP_API --> AP_MONGO
    AP_API --> AP_PG
```

## Layered Architecture (per service)

Each service follows a strict 3-layer architecture:

```
HTTP Request
    ↓
Controller (translate HTTP → function call, return HTTP response)
    ↓
Service (business logic — validation, orchestration, caching, events)
    ↓
Repository (database queries — no logic, just data access)
    ↓
Database
```

**Why this separation matters:**
- Controllers never access the database directly — if they did, business logic would leak into HTTP handlers
- Services never import Express objects — they're testable in isolation
- Repositories are the only place SQL lives — swap to an ORM by replacing only this layer

## Shared Package Dependency Graph

```mermaid
graph LR
    config[config]
    logger[logger]
    db[db]
    auth[auth]
    types[types]
    utils[utils]

    db --> config
    db --> logger
    auth --> config
    logger -.->|no deps| logger
    types -.->|no deps| types
    utils -.->|no deps| utils

    IT[issue-tracker] --> db
    IT --> auth
    IT --> logger
    IT --> config
    IT --> types
    IT --> utils

    NS[notification-service] --> db
    NS --> logger
    NS --> config
    NS --> types
    NS --> utils

    AP[analytics-platform] --> db
    AP --> auth
    AP --> logger
    AP --> config
    AP --> types
    AP --> utils
```

No circular dependencies. `config` and `logger` are foundational — everything else builds on them.

## Event Flow

```mermaid
sequenceDiagram
    participant Client
    participant IssueTracker
    participant Redis
    participant NotificationService
    participant AnalyticsPlatform
    participant BullMQ
    participant MongoDB

    Client->>IssueTracker: POST /api/v1/issues
    IssueTracker->>IssueTracker: Validate + persist to Postgres
    IssueTracker->>Redis: PUBLISH issue-events {type: IssueCreated, ...}
    IssueTracker->>Client: 201 { success: true, data: issue }

    Redis-->>NotificationService: Message received
    NotificationService->>BullMQ: enqueue send_email job
    NotificationService->>BullMQ: enqueue send_in_app job
    BullMQ-->>NotificationService: Worker picks up job
    NotificationService->>MongoDB: INSERT into notifications

    Redis-->>AnalyticsPlatform: Message received
    AnalyticsPlatform->>MongoDB: INSERT into raw_events
    Note over AnalyticsPlatform: Aggregation worker runs every 60s
    AnalyticsPlatform->>MongoDB: UPSERT metric_snapshots
    AnalyticsPlatform->>Redis: SET metrics cache (5min TTL)
```

## Multi-Tenancy Model

Every request is scoped to an organization. The `loadOrgMembership` middleware verifies the requesting user is a member of the target org before any service logic runs. Every database query includes `org_id` in the WHERE clause — no cross-tenant data leakage is possible at the query level.

The middleware resolves `orgId` from four sources in priority order: route params → request body → query string → `req.user.orgId`. This covers all HTTP verb patterns: POST/PATCH send `orgId` in the body; GET requests send it as `?orgId=` in the query string.

```
Request → authenticate (JWT) → loadOrgMembership (resolve orgId from params/body/query, verify membership) → service → repository (all queries WHERE org_id = ?)
```
