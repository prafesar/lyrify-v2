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

### 🗄️ B. Firebase Integration & Persistence (`firebase-integration`)
- **Services Used**: Firestore Database and Firebase Authentication.
- **Local Cache First**: Check and save synced data down to client-side caching mechanism (IndexedDB via IDB or LocalStorage) to enable offline lyrics practice and fast startup times.
- **Authentication Guidelines**:
  - Always enforce Firebase Auth flows cleanly.
  - Do not render complex login views if unrequested; a minimalist social sign-in or guest toggle is preferred.

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
