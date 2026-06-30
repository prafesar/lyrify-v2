# Внешний API Для `lyrify-v2`

Этот документ нужен внешнему агенту, который работает только внутри `lyrify-v2`.

Здесь зафиксированы:

- текущий live contract внешнего API, на который нельзя слепо закрывать глаза при правках клиента;
- target contract, вокруг которого нужно проектировать ближайшие клиентские изменения.

Важно:

- агент в `lyrify-v2` не проверяет серверный код напрямую;
- target contract ниже уже соответствует текущему внешнему API, задеплоенному на `https://api.cantolex.com`;
- не придумывай backend implementation внутри этого репозитория.

## Базовые правила

- Production base URL: `https://api.cantolex.com`
- Основной клиентский runtime-path должен идти через `WorkerAIAdapter`
- В клиенте нет отдельного активного `track meaning` endpoint
- Смысл трека должен извлекаться из lecture-блока `kind === "intro"` или fallback-блоков `overview` / `context`

## Live Legacy Contract

Этот раздел описывает маршруты, которые исторически уже использовались клиентом.

### `POST /api/v1/translation/fetch`

Назначение:

- перевод подготовленной лирики построчно

Request body:

```ts
type PreparedLyricsInput = {
  track: {
    title: string
    artists: string[]
    itunesId?: number
  }
  targetLanguage: string
  source: {
    provider: string
    url?: string | null
    authors?: string[] | null
  } | null
  lines: Array<{
    lineIndex: number
    lineKey: string
    text: string
    blockType?: "intro" | "verse" | "pre_chorus" | "chorus" | "bridge" | "outro" | "unknown"
  }>
}
```

Success response:

```ts
{
  status: "success"
  data: Array<{
    lineKey: string
    lineIndex: number
    original: string
    translation: string
    language: string
    blockType?: string
  }>
}
```

### `POST /api/v1/lecture/fetch`

Назначение:

- structured lecture / explanation разбор песни

Legacy request body:

```ts
type LegacyLectureRequestInput = PreparedLyricsInput & {
  analysisMode?: "overview" | "vocabulary" | "phrases" | "style" | "compact" | "rich"
}
```

Legacy compatibility header:

```http
x-lyrify-lecture-variant: compact | rich
```

Success response:

```ts
{
  status: "success"
  data: Array<{
    id: string
    kind:
      | "intro"
      | "overview"
      | "emotions"
      | "sections"
      | "lexical_groups"
      | "takeaways"
      | "notes"
      | "summary"
      | "themes"
      | "motifs"
      | "context"
      | "important_lines"
    order?: number
    title?: string
    text: string
    source: "ai" | "manual"
    lineIds?: string[]
    lineKeys?: string[]
    phrases?: Array<{
      id: string
      text: string
      translation: string
      explanation?: string
      type?: string
      source: "ai" | "manual"
      lineIds?: string[]
      lineKeys?: string[]
      priority?: "core" | "colloquial" | "cultural" | "advanced"
    }>
  }>
  meta: {
    cache: "bypass"
    analysisMode: "overview" | "vocabulary" | "phrases" | "style"
    legacyVariantUsed: "rich" | null
  }
}
```

## Target Contract For Upcoming Client Work

Этот раздел описывает контракт, вокруг которого нужно проектировать новую клиентскую orchestration-модель.

### Canonical route set

- `POST /api/v1/track-preparation/cached`
- `POST /api/v1/track-preparation/fetch`
- `POST /api/v1/translation/cached`
- `POST /api/v1/translation/fetch`
- `POST /api/v1/lecture/fetch`

Важно:

- `lecture/cached` на текущем этапе не использовать;
- lecture flow сейчас считается intentionally non-cached, потому что prompts и mode behavior еще меняются.

### Основная идея

- клиент находит лирику;
- клиент получает или вычисляет `lyricsKey`;
- клиент сначала пытается получить prepared track payload через `track-preparation/cached`;
- если payload не найден, клиент отправляет лирику и metadata на `track-preparation/fetch`;
- translation и lecture строятся поверх prepared track payload.

### Compact LLM draft, который стоит ожидать косвенно через preparation flow

Клиент не обязан видеть этот draft напрямую, но его форма важна для проектирования локальной модели:

```ts
type LlmLexicalDraft = {
  src?: string
  lines: Array<{
    i: number
    t: string
    lang?: string
    occ: Array<{
      s: string
      b: string
      k: "w" | "ph" | "pv" | "sv" | "ex"
      p: string[]
    }>
  }>
}
```

Важно:

- у каждой строки может быть свой `lang`, потому что лирика может быть многоязычной;
- `occurrenceId`, offsets и normalized keys клиент не должен ожидать от LLM;
- эти данные должны появляться уже после server-side post-processing.

### `PreparedTrackPayload`

Новая клиентская orchestration-модель должна ориентироваться на payload такого типа:

```ts
type PreparedTrackPayload = {
  trackKey: string
  lyricsKey: string
  sourceLanguage?: string
  metadata: {
    title?: string
    artist?: string
    album?: string
    itunesId?: string | number
    durationMs?: number
    promptVersion: string
  }
  lines: Array<{
    index: number
    text: string
    language?: string
  }>
  lexicalItems: Array<{
    id: string
    baseForm: string
    displayText: string
    kind: "word" | "phrase" | "phrasal_verb" | "separable_verb" | "expression"
    normalizedKey: string
  }>
  occurrences: Array<{
    lexicalItemId: string
    lineIndex: number
    occurrenceIndex: number
    surfaceText: string
    parts: Array<{
      surface: string
      role?: string
      contextBefore?: string
      contextAfter?: string
    }>
    spans: Array<{
      startOffset: number
      endOffset: number
      role?: string
    }>
    resolutionStatus: "resolved" | "ambiguous" | "unresolved"
  }>
}
```

### Translation over prepared payload

Target request:

```ts
type TranslationFetchRequest = {
  preparedTrack: PreparedTrackPayload
  targetLanguage: string
}
```

### Lecture over prepared payload

Target request:

```ts
type LectureFetchRequest = {
  preparedTrack: PreparedTrackPayload
  targetLanguage: string
  analysisMode: "overview" | "vocabulary" | "phrases" | "style"
  existingItems?: Array<{
    text: string
    translation?: string
    explanation?: string
    kind?:
      | "word"
      | "expression"
      | "idiom"
      | "collocation"
      | "grammar"
      | "cultural_reference"
      | "theme"
      | "vocabulary"
      | "slang"
      | "phrasal_verb"
    sourceMode?: "overview" | "vocabulary" | "phrases" | "style"
  }>
}
```

Важно:

- `existingItems` — это soft anti-duplication context, а не жесткий blacklist;
- клиент может передавать туда уже найденные phrases/items из других mode payloads;
- если item повторяется в новом mode, сервер ожидает, что LLM попробует дать новый учебный угол, а не просто продублирует старое объяснение.

## Практические правила для агента `lyrify-v2`

- Для lecture flow не строй клиентскую логику вокруг `lecture/cached`; на текущем этапе lecture должен запрашиваться через `POST /api/v1/lecture/fetch`.
- Если у клиента уже есть payload других lecture modes для этого же трека, перед новым `lecture/fetch` собирай из них `existingItems`.

- Если задача касается уже работающего client flow, учитывай live legacy contract.
- Если задача касается нового `Words`, нового `Practice`, lexical items или backend-first preparation flow, проектируй клиент вокруг target contract.
- Не делай вид, что target contract уже обязательно живет на проде, если пользователь этого явно не подтвердил.
- Не придумывай новые backend routes сверх перечисленных в target contract без явного запроса пользователя.
- Не добавляй Gemini-specific терминологию в пользовательский UI.
