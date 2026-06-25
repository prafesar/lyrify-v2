# API Cutover Guide — lyrify-v2

This guide outlines how to perform the cutover of the `lyrify-v2` frontend to route through an external API (e.g. Cloudflare Worker serverless backend).

---

## 🔌 1. The Composition Switch

The entire application uses a composition root pattern. Switching from the direct Gemini SDK transport to the serverless backend requires changing exactly **one line of code** inside:

📍 **`src/application/index.ts`**

```typescript
// ============================================================================
// AI TRANSPORT CUTOVER POINT (FUTURE EXTERNAL API / CLOUDFLARE WORKER SWITCH)
// ============================================================================
// To switch the entire application's AI layer to the Cloudflare Worker API:
// 1. Swap the active declaration below to use `new WorkerAIAdapter()` instead of `geminiAiClient`.
// This single point controls all AI translation, lecture, and analysis transport.
export const aiClient = geminiAiClient; // Current active Gemini transport
// export const aiClient = new WorkerAIAdapter(); // Future Cloudflare Worker transport
// ============================================================================
```

Swapping `aiClient` to reference `new WorkerAIAdapter()` immediately routes all translations, phrase analyses, and structured lecture queries through the Worker's fetch adapter.

---

## 🛠️ 2. The 3 Primary Files to Modify for the Transition

When you are ready to implement the Worker endpoints, you will only need to touch these 3 files:

1. **`src/application/adapters/workerAIAdapter.ts`**:
   - Currently contains placeholder state throwing errors or returning empty structures.
   - You will replace the placeholder methods (`getLineTranslations`, `getPhraseAnalysis`, `fetchStructuredLecture`) with standard HTTP `fetch` requests targeting your API endpoint using the payload definitions in `docs/worker-api-contract.md`.

2. **`.env` and `.env.example`**:
   - Add environment variables like `VITE_WORKER_API_BASE_URL` or authentication secrets so the client can resolve the Worker API location.

3. **`src/application/index.ts`**:
   - Flip the composition switch described above to activate the adapter.

---

## ⚠️ 3. Residual Legacy Areas (Not Blockers for First Cutover)

The following areas are kept for backward compatibility and do **not** block the first Worker cutover:

- **`lyrics.track.rawLyrics` String Fallback**: In `geminiAIAdapter` or the underlying `geminiService`, raw text extraction fallback logic is cleanly isolated. If the backend initially expects raw strings, the client-side adapter boundary automatically maps `PreparedLyricsInput` to strings on-the-fly, keeping the orchestration layer pure.
- **Standalone `fetchTrackMeaning` Call**: The standalone track meaning is marked as deprecated since modern versions bundle the cultural context as a unified block inside the structured lecture response. This can remain untouched on the client during the initial cutover.
- **Client-Side SQLite Cache (`SqliteService`)**: The local offline database successfully caches track information, translations, and study cards. This operates independently of the transport layer, ensuring that even after a Worker transition, offline and caching features continue to work flawlessly.
