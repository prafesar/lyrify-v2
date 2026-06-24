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
Checks if a structured learning guide/lecture exists in the worker's shared/distributed cache (e.g., Cloudflare KV/D1 or cache-proxy) for a specific track.

- **Endpoint**: `/lecture/get-cached`
- **Method**: `POST`
- **Request Payload**:
  ```typescript
  interface GetCachedLectureRequest {
    lyrics: string;
    title: string;
    artist: string;
    targetLanguage: string;
  }
  ```
  *Example*:
  ```json
  {
    "lyrics": "Take me out tonight...",
    "title": "There Is a Light That Never Goes Out",
    "artist": "The Smiths",
    "targetLanguage": "Russian"
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
    lyrics: string;
    title: string;
    artist: string;
    targetLanguage: string;
    forceRegenerate?: boolean;
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

### 3. Fetch or Generate Track Meaning
Retrieves the overarching analysis, translation, and metadata for a specific song track.

- **Endpoint**: `/track-meaning/fetch`
- **Method**: `POST`
- **Request Payload**:
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
  *Example*:
  ```json
  {
    "lyrics": "I was riding shotgun with my hair undone...",
    "metadata": {
      "title": "Our Song",
      "artists": ["Taylor Swift"],
      "targetLanguage": "Russian"
    }
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
