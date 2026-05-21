# CantoLex: Project Context & Rules for Coding Agents

This document contains persistent design choices, branding rules, architectural requirements, and instructions for any AI assistant working on the CantoLex application.

---

## 🚀 1. Core Identity & Branding
- **App Name**: The app is named **CantoLex** (formerly Lyrify). Do NOT use "Lyrify" in UI texts, headers, titles, or metadata.
- **Mission**: Master languages through songs, featuring AI-driven lyric analysis, pronunciation practice, and immersive musical learning.

---

## 🎨 2. Visual Themes & UI Layout
- **Theme**: Light theme is default, customized on off-whites and charcoal grays. Keep layouts high-contrast and minimal.
- **No Telemetry / Margin Clutter**: Avoid adding unrequested terminal consoles, system metadata (like ports, status dots like "● ONLINE"), or credit badges. Keep card outer interfaces entirely clean and expansive.
- **Header Profile**:
  - The profile settings trigger button must be a minimalist 36x36px (`w-9 h-9` with `rounded-xl` corners) container.
  - Show ONLY the user's avatar image or a fallback `UserIcon` icon styled with clean hover scales and subtle shadows.
  - Do NOT render username labels, "Guest/Profile" helper texts, or nested double-borders inside the header block. Keep it completely un-cluttered.

---

## 🎵 3. Player Tab & iTunes Integration Rules
The custom music playing mechanics are integrated directly within a floating bottom control panel:
- **Floating Panel Layout**:
  - Encased in a responsive glass-morphism capsule (`rounded-[2.5rem] bg-app-card/80 backdrop-blur-3xl`).
  - Contains a top audio progress bar. In the "Preview" tab, clicking this bar seeks preview audio (`seekPreview`).
- **Dynamic Left Segment**:
  - **In Lyrics View**: Render custom round toggle buttons for *Listening Mode* (`Headphones`) and *Shadowing Mode* (`Mic2`).
  - **In Preview Tab**:
    - By default, show standard song album/cover artwork and title meta.
    - **Crucial Attribution Rule (Adhering to iTunes Terms)**: When the user explicitly clicks/taps "Play" (`hasStartedPreview` evaluates to `true`), the leftmost section must dynamically animate and transition to a fully functional iTunes attribution anchor:
      - Must contain an official Apple monochrome logo asset inside a clean white shadow card.
      - Must display the exact, fully localized tagline:
        - Sub-header: `"Превью предоставлено"` (small, uppercase tracking)
        - Header: `"iTunes Store"`
      - Must link directly to `currentTrack.appleMusicUrl` or an iTunes Search callback (`target="_blank" rel="noopener noreferrer"`).
      - This attribution card **must remain visible** even when paused, and only resets / hides when the user switches tabs or changes the selected song.

---

## 🏗️ 4. Codebase Structure
- All shared interfaces and enums should be maintained inside logical service modules or early types definitions.
- Keep components modular. If modifying `src/App.tsx`, preserve the custom layout structures and state hooks (`previewAudioRef`, `isPreviewPlaying`, `hasStartedPreview`, `previewProgress`, `previewDuration`).
- Prefer extracting new logic into hooks, services, or repository-style modules instead of growing `src/App.tsx` further.
- UI components must not directly own persistence, external API orchestration, or LLM request logic when that logic can live in a service/hook boundary.

---

## 🧭 4.1 Product & Architecture Invariants
- **Guest-first product**: Core functionality must work without registration or login. Do not make auth a prerequisite for searching tracks, opening lyrics, generating analysis, saving local cards, or studying.
- **Auth is optional**: If auth-related code is changed, verify that guest flows still work.
- **Local cards first**: Treat user flashcards as device-local data. Do not introduce new mandatory cloud persistence for cards unless explicitly requested.
- **Future storage migration**: Keep card persistence behind abstractions that can later move to SQLite in OPFS and LiveStore-style sync without forcing UI rewrites.
- **Future backend migration**: Keep LLM calls and analysis caching behind boundaries that can later move from the current Firestore/client setup to Cloudflare Worker + D1.
- **No direct backend coupling in UI**: React components should not call Firestore, future D1 APIs, or browser storage primitives directly when a service/repository can own that responsibility.
- **Do not expand auth scope**: Avoid adding profile/account complexity unless explicitly requested.

---

## ✅ 4.2 Testing & Validation Rules
- **Bugfix discipline**: When fixing a reproducible bug, add or update a test that would fail before the fix when it is practical to do so.
- **Feature discipline**: New functionality should add at least one regression test for the changed behavior at the smallest useful level.
- **Testing pyramid for this project**:
  - Prefer unit/contract tests for service logic, cache helpers, parsing helpers, and repositories.
  - Add component/integration tests only for critical guest-first user flows.
  - Keep e2e coverage intentionally small and focused on smoke scenarios.
- **Mock external dependencies**: Tests should mock network APIs, Firestore, browser speech APIs, audio APIs, and other nondeterministic integrations.
- **Do not overuse snapshots**: Prefer behavior assertions over large UI snapshots and avoid testing animation details.
- **Validation after edits**:
  - Run the smallest useful targeted tests first.
  - Then run `npm run typecheck`.
  - Then run `npm run lint`.
  - Run broader test suites when the change affects shared logic or user-critical flows.
- **Staged lint rollout**:
  - `npm run lint` is the enforced day-to-day lint command for the currently maintained config/service/test layers.
  - `npm run lint:full` is reserved for deliberate cleanup work in the legacy UI shell and should not block routine feature delivery unless the task explicitly targets that debt.
- **Touched code rule**: If a file is changed and has nearby tests, update those tests when behavior changes instead of leaving them stale.

---

## 🛠️ 5. Platform Skills & SDK Integrations
To maintain consistency, any coding agent must follow these configurations and practices when utilizing active platform skills:

### 🧠 A. Gemini API Integration (`gemini-api`)
- **SDK**: Always prefer the modern `@google/genai` TypeScript SDK (never legacy libraries).
- **Initialization (Server-Side)**: Always load and initialize the GoogleGenAI client server-side in `server.ts` or backend routes using `process.env.GEMINI_API_KEY`:
  ```ts
  import { GoogleGenAI } from "@google/genai";
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  ```
- **Recommended Models**:
  - Use `gemini-2.5-flash` for high-speed, general text transformations, structured JSON lyric parses, and translations.
  - Use `gemini-2.5-pro` only for highly complex cognitive reasoning tasks, code generation, or custom pronunciation feedback.
- **Client-Side Safety**: Never expose `GEMINI_API_KEY` to the client-side browser context. Keep all AI intelligence behind `/api/` endpoints.
- **Migration direction**: New work should move toward a Cloudflare Worker boundary for LLM calls and caching, not deeper client-side coupling.

### 🗄️ B. Firebase Integration & Persistence (`firebase-integration`)
- **Services Used**: Firestore Database and Firebase Authentication.
- **Local Cache First**: Check and save synced data down to client-side caching mechanism (IndexedDB via IDB or LocalStorage) to enable offline lyrics practice and fast startup times.
- **Authentication Guidelines**:
  - Always enforce Firebase Auth flows cleanly.
  - Do not render complex login views if unrequested; a minimalist social sign-in or guest toggle is preferred.
  - Never let Firebase Auth changes break guest-first usage.

### 🎨 C. Dynamic Image & Asset Generation (`image-generation`)
- **Dynamic Previews**: When generating or displaying placeholders, dynamic covers, or interactive UI mocks:
  - Use the built-in `generate_image` tool sparingly for application assets.
  - Always render using React tags `<img JSX />` with `referrerPolicy="no-referrer"` to bypass security/sandboxing checks.
- **Fallbacks**: Provide clean CSS or Lucide icons (`Music`, `Disc`) if dynamic cover assets fail to load.

### 📜 D. Rich Content / Lyric Analysis (`markdown`)
- **Render engine**: Use `react-markdown` to render explanations, translations, grammar breakdowns, and cultural highlights.
- **Constraint**: The `className` property was deprecated from `react-markdown`. Always wrap the Markdown element in a styled container:
  ```tsx
  <div className="markdown-body">
    <Breakdowns><Markdown>{explanation}</Markdown></Breakdowns>
  </div>
  ```
- **Spaced Repetition Cards**: Map flashcard metrics to progressive interval boxes (`Box 1` to `Box 5`), updating card intervals locally first and then updating the backend service database lazily.
