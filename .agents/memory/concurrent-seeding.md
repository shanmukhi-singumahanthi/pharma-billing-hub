---
name: Concurrent seed initialization
description: Why first-load database seed operations need concurrency protection in this workspace.
---

Initial data setup must be both idempotent and guarded against concurrent requests. Multiple client queries commonly mount together, so separate first reads can otherwise both observe an empty table and insert duplicate seed rows.

**Why:** The pharmacy dashboard requests products and sales at the same time during its first render, which exposed a race between the two seed paths.

**How to apply:** Keep seed setup behind a shared in-process promise or an equivalent database-level uniqueness/locking strategy, and make retries safe after a failed attempt.