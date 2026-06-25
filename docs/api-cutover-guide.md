# API Cutover Guide — lyrify-v2

This guide outlines the successful cutover of the `lyrify-v2` frontend to route through the production serverless backend (`https://api.cantolex.com`).

---

## 🔌 1. The Composition Switch (ACTIVE: Worker API)

The entire application uses a composition root pattern. The application's AI layer has been switched from the direct Gemini SDK transport to the serverless backend inside:

📍 **`src/application/index.ts`**

```typescript
// Active production Rest API transport connecting to api.cantolex.com
export const aiClient = new WorkerAIAdapter();

// Legacy / fallback client preserved for backward compatibility and rollbacks
export const legacyAiClient = geminiAiClient;
```

---

## 🛠️ 2. Active Worker Rest API Transport Details

The `WorkerAIAdapter` is now the active transport adapter, delegating to the production API at `https://api.cantolex.com`.

### Endpoints in Use
1. **Line Translations**:
   - **Route**: `POST /api/v1/translation/fetch`
   - **Payload**: `PreparedLyricsInput`
   - **Response**: `LineTranslationResult[]` mapped into client-side enriched tracks.
2. **Structured Lecture & Deep Analysis**:
   - **Route**: `POST /api/v1/lecture/fetch`
   - **Payload**: `PreparedLyricsInput`
   - **Response**: `StructuredLectureBlock[]` containing sociocultural overview, active lexical items, grammatical notes, and cultural context.

### Compatibility & Cache Behaviors
- **`getCachedStructuredLecture()`**: Kept as a **safe no-op** returning `null`. Since the server does not support a dedicated cached lecture lookup, this ensures that background hydration safely falls back to active generation without breaking client runtime or throwing unhandled errors.
- **Track Meaning (`fetchTrackMeaning()`)**: No standalone track-meaning endpoint exists on the v1 API. Instead, overall song meaning is dynamically extracted on the client from the structured lecture blocks (`kind: "intro"`, `"overview"`, or `"context"`) via the helper `extractTrackMeaning(blocks)`.

---

## ⚠️ 3. Residual Legacy Areas (Preserved for Rollback & Compatibility)

The following areas are fully preserved to allow a seamless rollback to Gemini if needed:

- **`geminiService` & `GeminiAIAdapter`**: Left completely intact.
- **`legacyAiClient`**: Registered in the composition root so it can be swapped back instantly.
- **Client-Side SQLite Cache (`SqliteService`)**: Local caching of tracks, cards, and metadata remains fully active, working transparently underneath the active transport.
