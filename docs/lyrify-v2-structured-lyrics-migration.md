# lyrify-v2 Structured Lyrics Migration

## Status

Draft migration guide for moving `lyrify-v2` from raw-lyrics AI requests to structured client-prepared lyrics input.

## Goal

Introduce a structured lyrics payload for translation and lecture/explanation flows without breaking the current product behavior.

The client should:

- find lyrics
- normalize lyrics locally
- split lyrics into structured lines
- attach source metadata if available
- send structured lyrics data to the server-side AI boundary

The server should:

- accept structured lyrics input
- call the LLM
- cache processing results
- stay independent from lyrics lookup concerns

## Why We Are Doing This

- It reduces coupling between lyrics lookup and AI processing.
- It makes the server responsible for LLM orchestration and caching only.
- It reduces legal and licensing risk by avoiding a backend design centered around server-side lyrics acquisition.
- It prepares the app for a Worker-based backend without forcing a full rewrite.

## Scope

This migration currently applies to:

- lyrics translation
- structured lecture / explanation

This migration does **not** currently introduce a separate `track meaning` capability. Meaning should live as a block inside lecture/explanation.

## Core Principles

### 1. Structured lyrics input replaces raw `lyrics: string`

Raw text is no longer the canonical transport contract for translation and lecture requests.

### 2. `lineKey` is the stable line identifier

Lines should be matched across client, cache, translation, and lecture results by `lineKey`, not by raw text and not primarily by `lineIndex`.

- `lineKey` = hash of a normalized line string
- `lineIndex` = preserved original order only

### 3. Client and server share normalization rules

The client needs the same normalization rules as the server for:

- cache lookup
- stable `lineKey`
- stable track normalization

The server remains the source of truth for final cache keys.

### 4. Server-generated cache keys remain canonical

The client may compute a preliminary normalized track identity for cache lookup, but the server owns final cache key generation.

### 5. Responses should remain mappable even if original lyrics are not cached

If legal or licensing constraints later require storing only translations and lecture results, responses must still be matchable to client lyrics input through stable keys.

## Canonical Structured Input

```ts
type PreparedLyricsLine = {
  lineIndex: number
  lineKey: string
  text: string
  blockType?: "intro" | "verse" | "pre_chorus" | "chorus" | "bridge" | "outro" | "unknown"
}

type PreparedLyricsInput = {
  track: {
    title: string
    artists: string[]
  }
  targetLanguage: string
  source: {
    provider: string
    url?: string | null
    authors?: string[] | null
  } | null
  lines: PreparedLyricsLine[]
}
```

## Data Rules

### Track

- `title` is the client-visible track title.
- `artists` is always an array.
- Client and server must normalize artists consistently.
- Server must sort and normalize artists before generating final track-level cache keys.

### Source

- `provider` should be passed when known.
- `url` should be passed when the client has it.
- `authors` is optional and should only be provided when the source actually knows them.
- Do not require LLM inference of authors as part of canonical preprocessing.

### Lines

- `lineIndex` preserves order from the source lyrics.
- `lineKey` is the stable key for matching.
- `text` is the original client-prepared line text after client-side cleanup rules.
- `blockType` is optional but useful when the client can infer structure.

## Normalization Requirements

### Lyrics normalization

Client-side preprocessing should:

- remove timestamps
- remove section markers when appropriate
- normalize whitespace
- preserve useful textual content
- generate `lineKey` from normalized line content

### Track normalization

Track key preparation must normalize:

- title
- artists

Track title normalization must also remove trailing additions inside:

- round brackets `(...)`
- square brackets `[...]`

Examples:

- `Song Title (Live)` -> `Song Title`
- `Song Title [Remastered 2011]` -> `Song Title`

This is needed to improve cache hits across multiple releases or title variants.

## Migration Strategy

The migration must happen in small safe steps.

### Step 1. Document the new contract

Goal:

- update docs
- clearly mark raw `lyrics: string` as legacy for affected AI flows
- do not change runtime behavior yet

Definition of done:

- canonical structured input is documented
- migration steps are documented
- no runtime files are changed unless needed for docs references only

### Step 2. Introduce shared client preprocessing helper

Goal:

- add a local helper file for structured lyrics preparation
- add tests for normalization and `lineKey`
- do not switch production flow yet

Definition of done:

- helper exists
- tests pass
- no existing AI request flow is broken

### Step 3. Adopt helper on the client without changing active server contract

Goal:

- client starts preparing structured lyrics data locally
- old request path may still be used in parallel if needed

Definition of done:

- structured payload can be built from current lyrics lookup results
- existing user-facing behavior remains unchanged

### Step 4. Extend AI boundary to accept structured input

Goal:

- update `AiPort`
- update adapters
- keep migration backward-compatible during rollout if needed

Definition of done:

- translation and lecture-related methods can accept structured input
- no provider-specific logic leaks into UI

### Step 5. Migrate translation flow

Goal:

- translation path uses structured input
- responses can be matched by `lineKey`

Definition of done:

- translation works with structured lyrics input
- existing translation UI still works

### Step 6. Migrate lecture / explanation flow

Goal:

- lecture path uses structured input
- meaning is represented as a lecture block, not a separate feature path

Definition of done:

- lecture/explanation works with structured lyrics input
- existing lecture UI still works

### Step 7. Remove legacy raw-lyrics path for affected flows

Goal:

- remove no-longer-needed raw transport paths
- keep only structured path where safe

Definition of done:

- translation and lecture use the structured path as canonical flow
- remaining legacy paths are explicitly documented if still required

### Step 8. Extract shared code into monorepo package later

Goal:

- move normalization helpers and shared types into a common package after the flow is stable

Definition of done:

- code is no longer duplicated across `lyrify-v2` and monorepo Worker code

## Compatibility Constraints

- Do not break guest-first usage.
- Do not rewrite unrelated UI.
- Do not switch the whole app to Worker during this migration.
- Do not introduce provider-specific transport details into React components or hooks.
- Keep the composition-root pattern intact.

## Review Checklist

Before completing any migration step, verify:

- Is the change limited to the current step only?
- Does it preserve runtime behavior unless the step explicitly changes it?
- Does it keep `lineKey` stable?
- Does it avoid introducing new direct provider-specific leaks?
- Does it preserve compatibility with future Worker migration?
