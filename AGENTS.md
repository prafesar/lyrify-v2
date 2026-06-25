# Agent Guide — lyrify-v2

## Current Working Reality

- This project is iterated primarily through Google AI Studio prompts, so changes should be easy to request as focused edits to a small number of files.
- Direct code edits are possible but inconvenient. Favor plans, prompt templates, and architectural seams that minimize manual file touching.

## Architecture Constraints

- Keep the LLM integration behind `src/application/ports/aiPort.ts` and concrete adapters in `src/application/adapters/`.
- `src/application/index.ts` is the composition root for selecting the active AI adapter. Prefer switching implementations there instead of changing UI code.
- UI components, hooks, and view services should not directly own provider-specific Gemini or Worker request logic.
- When adding new AI-powered features, extend the `AiPort` contract first, then implement the adapter, then wire UI to the port.

## Migration Direction

- The preferred migration path is `GeminiAIAdapter` now, `WorkerAIAdapter` later, with the rest of the app unchanged or minimally changed.
- Future Cloudflare work should preserve one replaceable boundary for analysis, translation, phrase explanation, and caching.
- If a proposed change would require editing many UI files to swap AI providers, stop and redesign around the adapter boundary first.

## Product Invariants

- Guest-first behavior must remain intact. Do not make auth mandatory for core track, lyrics, analysis, or study flows unless explicitly requested.
- Treat `cantolex-monorepo` as the architectural reference, not as a source of copy-paste coupling. Reuse ideas and boundaries, not accidental complexity.

## Cloudflare Notes

- Target Cloudflare-compatible patterns for future backend work: HTTP `fetch`, Worker-safe APIs, secrets outside client code, and deployment via Wrangler.
- Prefer documenting future Worker endpoints and contracts in repo docs before asking AI Studio to implement large refactors.
