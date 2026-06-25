# Cloudflare Worker API Contract — lyrify-v2

This document defines the high-level, capability-oriented API contract for the future Cloudflare Worker serverless backend transition of CantoLex (`lyrify-v2`).

To prevent leaky abstractions, **all client interactions with AI logic and server-side analysis must route through this contract**. Endpoints are grouped by capability/domain rather than low-level model primitives.

---

## 🌐 Base URL & Protocol
- **Production Base URL**: `https://api.cantolex.com`
- **Current Integration Endpoints**:
  - `POST /api/v1/translation/fetch`: Used to translate lists of lines via `PreparedLyricsInput`
  - `POST /api/v1/lecture/fetch`: Used to generate/retrieve structured lectures & study materials via `PreparedLyricsInput`
- **Cached Lecture Support**: Currently, there is no separate endpoint for fetching cached lectures on the external API. Calling `getCachedStructuredLecture()` returns a safe `null` value in the client.
- **Protocol**: HTTPS / JSON-over-HTTP
- **Global Headers**:
  ```http
  Content-Type: application/json
  Accept: application/json
  ```

## 🏛️ Shared Types & Data Rules

To improve cache consistency and decouple the server-side AI orchestration from client-side lyrics retrieval mechanisms, we use the following structured models.

```typescript
export interface PreparedLyricsLine {
  lineIndex: number; // Preserves order from source lyrics
  lineKey: string;   // Stable 8-character FNV-1a hex hash of the normalized line text
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

export interface LineTranslationResult {
  lineKey: string;
  lineIndex: number;
  originalText: string;
  translation: string;
  language: string;
}

export interface PhraseAnalysisResult {
  text: string;
  language: string;
  translation: string;
  explanation: string;
  lineIndex: number;
  lineKey?: string;
}
```

- **`lineKey` (Canonical Key)**: The client and server match lines by `lineKey` (FNV-1a hash of normalized lowercase text), ensuring translations and breakdowns remain perfectly aligned even if line indexes shift slightly.
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

---

## 📝 Endpoints Contract

### 1. Retrieve Line Translations (Canonical Integration)
Generates or retrieves precise line-by-line translations for the track lines.

- **Endpoint**: `/translations/fetch`
- **Method**: `POST`
- **Request Payload**: `PreparedLyricsInput` (canonical format)
- **Response Payload**: `LineTranslationResult[]`
- **Example Response (`data`)**:
  ```json
  [
    {
      "lineKey": "982bcb7c",
      "lineIndex": 0,
      "originalText": "Hello from the other side",
      "translation": "Привет с другой стороны",
      "language": "es"
    }
  ]
  ```

---

### 2. Retrieve Phrase / Study Analysis (Stage 3 Deep Analysis)
Identifies high-value phrase segments (2-6 words each) for study, providing grammatical/cultural annotations.

- **Endpoint**: `/phrases/fetch`
- **Method**: `POST`
- **Request Payload**: `PreparedLyricsInput` (canonical format)
- **Response Payload**: `PhraseAnalysisResult[]`
- **Example Response (`data`)**:
  ```json
  [
    {
      "text": "the other side",
      "language": "en",
      "translation": "другая сторона",
      "explanation": "Разговорная идиома, означающая буквально другую сторону чего-либо, либо метафорически другой мир.",
      "lineIndex": 0,
      "lineKey": "982bcb7c"
    }
  ]
  ```

---

### 3. Generate or Fetch Structured Lecture
Generates or retrieves a comprehensive, structured lecture/learning breakdown of a song (cultural notes, active vocabulary themes).

- **Endpoint**: `/lecture/fetch`
- **Method**: `POST`
- **Request Payload**: `PreparedLyricsInput` (canonical format)
- **Response Payload**: `StructuredLectureBlock[]`
- **Example Response (`data`)**:
  ```json
  [
    {
      "id": "block-1",
      "kind": "intro",
      "title": "Sociocultural Context & Message",
      "text": "Intro text explaining the deeper background of this track...",
      "source": "ai"
    }
  ]
  ```

---

### 3.1. Retrieve Cached Structured Lecture (Fast Lookup)
Quickly queries the backend cache to check if a structured lecture block set has already been generated and saved. Unlike the active generation flow, this endpoint never initiates LLM processing, making it extremely fast and lightweight for background hydration.

- **Endpoint**: `/lecture/cached/fetch`
- **Method**: `POST`
- **Request Payload**: `PreparedLyricsInput` (canonical format)
- **Response Payload**: `StructuredLectureBlock[] | null`
- **Example Response (`data` when cached)**:
  ```json
  [
    {
      "id": "block-1",
      "kind": "intro",
      "title": "Sociocultural Context & Message",
      "text": "Intro text explaining the deeper background of this track...",
      "source": "ai"
    }
  ]
  ```
- **Example Response (`data` when cache miss)**:
  ```json
  null
  ```

---

### 4. Fetch or Generate Track Meaning (LEGACY / DEPRECATED)
> ⚠️ **Status: LEGACY / DEPRECATED**. This standalone endpoint exists for backward compatibility but is excluded from the primary target design flow. Meaning summaries are now embedded inside the unified `/lecture/fetch` response under blocks of kind `intro`.

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
    };
  }
  ```

---

## ⚙️ Client Transition Roadmap (Recommended Next Steps)
1. **Durable API Contract**: Maintain this specification document to keep client and server aligned.
2. **Transport Layer implementation**: Implement the standard, safe HTTP `fetch` utility in `WorkerAIAdapter`.
3. **Local Testing Proxy**: Set up local Mock Worker routes inside the Express development server (or mock responses in Vitest).
4. **Gradual Adapter Swap**: Wire specific domains incrementally by updating the composition root in `/src/application/index.ts`.
