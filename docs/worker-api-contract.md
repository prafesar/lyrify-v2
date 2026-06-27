# Внешний API Для `lyrify-v2`

Этот документ нужен внешнему агенту, который работает только внутри `lyrify-v2`.

Здесь зафиксирован текущий клиентский контракт внешнего API. Если код клиента нужно менять в части перевода, lecture flow или transport mapping, агент должен опираться на этот документ и не придумывать backend внутри этого репозитория.

## Базовые правила

- Production base URL: `https://api.cantolex.com`
- Основной клиентский runtime-path должен идти через `WorkerAIAdapter`
- В клиенте нет отдельного активного `track meaning` endpoint
- Смысл трека должен извлекаться из lecture-блока `kind === "intro"` или fallback-блоков `overview` / `context`

## Актуальные маршруты

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

Error response:

```ts
{
  status: "error"
  error: {
    code: string
    message: string
  }
}
```

### `POST /api/v1/lecture/fetch`

Назначение:

- полный structured lecture / explanation разбор песни

Request body:

- тот же `PreparedLyricsInput`

Дополнительный заголовок:

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
}
```

Error response:

```ts
{
  status: "error"
  error: {
    code: string
    message: string
  }
}
```

### `GET /api/v1/tracks/cached`

Назначение:

- получить уже закешированный payload трека по `lyricsKey`
- либо получить список последних закешированных треков

Поддерживаемые сценарии:

- `GET /api/v1/tracks/cached?lyricsKey=...`
- `GET /api/v1/tracks/cached?limit=20`

## Важные ограничения клиента

- Сейчас нет отдельного cached lecture endpoint.
- Поэтому `getCachedStructuredLecture()` в клиенте должен оставаться безопасным `null` / no-op path, который не ломает runtime.
- Если в UI или hooks добавляется новая AI-функция, transport mapping должен оставаться в adapter-layer, а не в компонентах.

## Что нельзя считать актуальным

- Нельзя считать отдельный `track meaning` endpoint частью текущего клиента.
- Нельзя добавлять в пользовательский UI Gemini-specific терминологию.
- Нельзя придумывать новые backend routes внутри `lyrify-v2`, если их нет в этом документе.
