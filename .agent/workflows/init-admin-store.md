---
description: Initialize and Verify Admin Market
---

This workflow initializes the Admin Market (Official Store) and verifies its existence in the database.

1. Run the initialization script to ensure the Official Store exists.
// turbo
2. npx ts-node -r tsconfig-paths/register scripts/init-admin-store.ts

3. (Optional) Run diagnostics if you still see 404 errors.
// turbo
4. npx ts-node -r tsconfig-paths/register scripts/diagnose-admin-store.ts
