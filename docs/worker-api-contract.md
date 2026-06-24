# Cloudflare Worker API Contract — lyrify-v2

This document defines the high-level, capability-oriented API contract for the future Cloudflare Worker serverless backend transition of CantoLex (`lyrify-v2`).

To prevent leaky abstractions, **all client interactions with AI logic and server-side analysis must route through this contract**. Endpoints are grouped by capability/domain rather than low-level model primitives.

---

## 🌐 Base URL & Protocol
- **Production Base URL**: `https://api.cantolex.com/api/v2/worker` (or similar routing)
- **Preview / Dev Proxy**: `/api/v2/worker`
- **Protocol**: HTTPS / JSON-over-HTTP
- **Global Headers**:
  ```http
  Content-Type: application/json
  Accept: application/json
  Authorization: Bearer <JWT or ApiKey> (When authentication/authorization is active)
  ```

## 🏛️ Shared Types & Data Rules

To improve cache consistency and decouple the server-side AI orchestration from client-side lyrics retrieval mechanisms, we use the following structured models.

```typescript
export interface PreparedLyricsLine {
  lineIndex: number; // Preserves order from source lyrics
  lineKey: string;   // Main stable hash of the normalized line text
  text: string;      // Standardized text after client cleanup
  blockType?: "intro" | "verse" | "pre_chorus" | "chorus" | "bridge" | "outro" | "unknown";
}

export interface PreparedLyricsInput {
  track: {
    title: string;
    artists: string[];
  };
  targetLanguage: string;
  source: {
    provider: string;
    url?: string | null;
    authors?: string[] | null;
  } | null;
  lines: PreparedLyricsLine[];
}
```

- **`lineKey` (Canonical Key)**: The client and server match lines by `lineKey` (SHA/Murmur hash of normalized lowercase text), ensuring translations and breakdowns remain perfectly aligned even if line indexes shift slightly.
- **`lineIndex`**: Serves purely to preserve original order.
- **Track Normalization**: Track titles are stripped of bracketed additions (e.g., `(Live)` or `[Remastered]`) by the client during preparation to improve cache hit rates.

---

## 🏛️ Standard Envelopes

### Success Envelope
Every successful API request returns a `200 OK` or `201 Created` with a standard success wrapper:
```json
{
  "status": "success",
  "data": <PayloadType>
}
```

### Error Envelope
Any operational or execution error returns an appropriate HTTP status code (`400`, `401`, `404`, `500`, etc.) and a standardized error body:
```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "A descriptive, human-readable message about what went wrong.",
    "details": {}
  }
}
```

Common Error Codes:
- `BAD_REQUEST`: Invalid parameters or missing payload properties.
- `UNAUTHORIZED`: Invalid or expired bearer token.
- `AI_GENERATION_FAILED`: The LLM failed to produce structured or parsable results.
- `CACHE_MISS`: No cached data was available (only returned when explicit cash checks are made).
- `INTERNAL_SERVER_ERROR`: Unhandled worker exceptions.

---

## 📝 Endpoints Contract

### 1. Retrieve Cached Structured Lecture
Checks if a structured learning guide/lecture exists in the worker's shared/distributed cache for a specific track.

- **Endpoint**: `/lecture/get-cached`
- **Method**: `POST`
- **Request Payload**: `PreparedLyricsInput` (canonical format, see Shared Types & Data Rules)
  - *Legacy format (deprecated)*: `GetCachedLectureRequest { lyrics: string, title: string, artist: string, targetLanguage: string }`
- **Example (Canonical Payload)**:
  ```json
  {
    "track": {
      "title": "There Is a Light That Never Goes Out",
      "artists": ["The Smiths"]
    },
    "targetLanguage": "Russian",
    "source": {
      "provider": "genius",
      "url": "https://genius.com/The-smiths-there-is-a-light-that-never-goes-out-lyrics"
    },
    "lines": [
      { "lineIndex": 0, "lineKey": "f68a2bc", "text": "Take me out tonight" },
      { "lineIndex": 1, "lineKey": "01b239c", "text": "Where there's music and there's people" }
    ]
  }
  ```
- **Responses**:
  - **`200 OK` (Cache Hit)**:
    ```json
    {
      "status": "success",
      "data": [
        {
          "id": "intro_meaning",
          "kind": "intro",
          "text": "This Smiths classic uses a dark romantic humor...",
          "source": "ai"
        },
        {
          "id": "vocabulary_focus",
          "kind": "lexical_groups",
          "text": "- **Take me out**: пригласи меня на свидание/прогулку...",
          "source": "ai"
        }
      ]
    }
    ```
  - **`200 OK` (Cache Miss)**:
    ```json
    {
      "status": "success",
      "data": null
    }
    ```

---

### 2. Generate or Fetch Structured Lecture
Generates or retrieves a comprehensive, structured lecture/learning breakdown of a song. If not cached, triggers the LLM (Gemini) orchestration serverless pipeline.

- **Endpoint**: `/lecture/fetch`
- **Method**: `POST`
- **Request Payload**: 
  ```typescript
  interface FetchLectureRequest {
    lyricsInput: PreparedLyricsInput; // Canonical structured input
    forceRegenerate?: boolean;
    
    // Legacy fields (deprecated):
    lyrics?: string;
    title?: string;
    artist?: string;
    targetLanguage?: string;
  }
  ```
- **Responses**:
  - **`200 OK` (Successful Generation / Retrieval)**:
    ```json
    {
      "status": "success",
      "data": [
        {
          "id": "block-1",
          "kind": "intro",
          "text": "Intro text explaining background...",
          "source": "ai"
        }
      ]
    }
    ```
  - **`502 Bad Gateway` / `500 Internal Server Error` (AI Failure)**:
    ```json
    {
      "status": "error",
      "error": {
        "code": "AI_GENERATION_FAILED",
        "message": "Underlying LLM response was unparsable or timeout occurred."
      }
    }
    ```

---

### 3. Fetch or Generate Track Meaning (LEGACY / DEPRECATED)
> ⚠️ **Status: LEGACY / DEPRECATED**. As per the migration strategy, the standalone track meaning capability will not be developed or maintained as a separate path. All high-level song meaning, cultural context, and overall analysis should live as a semantic block of kind `intro` inside the unified `/lecture/fetch` response. This prevents multiple fragmented LLM calls and consolidates track comprehension.

- **Endpoint**: `/track-meaning/fetch`
- **Method**: `POST`
- **Request Payload (Legacy)**:
  ```typescript
  interface FetchTrackMeaningRequest {
    lyrics: string;
    metadata: {
      title: string;
      artists: string[];
      targetLanguage?: string;
      originalLanguage?: string;
    };
    promptVersion?: number;
    forceRegenerate?: boolean;
  }
  ```
- **Responses**:
  - **`200 OK`**:
    ```json
    {
      "status": "success",
      "data": {
        "songKey": "track_taylor_swift_our_song",
        "meaning": "An acoustic country-pop track describing a young couple's shared moments...",
        "originalLanguage": "English",
        "lastUpdated": "2026-06-24T14:31:00Z",
        "promptVersion": 3
      }
    }
    ```

---

## ⚙️ Client Transition Roadmap (Recommended Next Steps)
1. **Durable API Contract**: Maintain this specification document to keep client and server aligned.
2. **Transport Layer implementation**: Implement the standard, safe HTTP `fetch` utility in `WorkerAIAdapter` (already initiated in code edits).
3. **Local Testing Proxy**: Set up local Mock Worker routes inside the Express development server (or mock responses in Vitest).
4. **Gradual Adapter Swap**: Wire specific domains incrementally by updating the composition root in `/src/application/index.ts`.
