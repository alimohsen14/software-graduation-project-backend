---
description: Workflow to enhance AiService with marketplace intent detection and routing.
---

# Workflow: Enhance AI Service Routing

This workflow outlines the steps to integrate intelligent routing into `AiService`, directing marketplace queries to internal APIs and general queries to OpenAI.

1.  **Read Current State**
    -   Check `src/ai/ai.service.ts` to identify missing `ask()` method.
    -   Check `package.json` to confirm `openai` dependency.

2.  **Modify `src/ai/ai.service.ts`**
    -   // turbo
    -   Apply `multi_replace_file_content` to add:
        -   StartLine import for `ConfigService` and `OpenAI`.
        -   `isMarketplaceQuery` helper method.
        -   `extractCategory` helper method.
        -   The `ask` method with the routing logic.

3.  **Verify & Test**
    -   Check for compilation errors.
    -   Manually verify with `curl` or Postman against `POST /ai/ask`.

## Code Template for `ask`

```typescript
async ask(dto: AskDto) {
    const { message, lang } = dto;
    if (this.isMarketplaceQuery(message)) {
      // ... routing logic
    }
    // ... OpenAI logic
}
```
