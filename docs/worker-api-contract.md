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

- тот же `PreparedLyricsInput`, плюс опциональное поле режима:

```ts
type LectureRequestInput = PreparedLyricsInput & {
  analysisMode?: "overview" | "vocabulary" | "phrases" | "style" | "compact" | "rich"
}
```

Дополнительный заголовок совместимости:

```http
x-lyrify-lecture-variant: compact | rich
```

Правила:

- основной способ выбора режима теперь `analysisMode` в body
- `x-lyrify-lecture-variant` нужен только как legacy compatibility layer
- клиент может продолжать отправлять и `analysisMode`, и legacy header одновременно на переходном этапе
- canonical mode-модель для новых клиентских решений:
  - `overview`
  - `vocabulary`
  - `phrases`
  - `style`

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

Примечания:

- `cache: "bypass"` сейчас ожидаем для lecture flow
- если сервер временно принял legacy `rich`, в `meta.analysisMode` клиент должен ориентироваться на canonical `phrases`
- `legacyVariantUsed` нужен только как transition metadata и не должен становиться продуктовой осью UI

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

Важное уточнение:

- на текущем этапе server-side cache считается устойчивым только для translation flow
- lecture mode variants пока не считаются надежно server-cached contract surface
- поэтому cached track lookup нельзя считать источником истины для mode-aware lecture variants

## Важные ограничения клиента

- Сейчас нет отдельного cached lecture endpoint.
- Поэтому `getCachedStructuredLecture()` в клиенте должен оставаться безопасным `null` / no-op path, который не ломает runtime.
- `POST /api/v1/lecture/fetch` сейчас нужно считать uncached server path.
- Если lecture payload нужен повторно, основной источник истины на текущем этапе — локальные `analysis_variants` в клиентском SQLite.
- Если в UI или hooks добавляется новая AI-функция, transport mapping должен оставаться в adapter-layer, а не в компонентах.

## Что нельзя считать актуальным

- Нельзя считать отдельный `track meaning` endpoint частью текущего клиента.
- Нельзя добавлять в пользовательский UI Gemini-specific терминологию.
- Нельзя придумывать новые backend routes внутри `lyrify-v2`, если их нет в этом документе.
