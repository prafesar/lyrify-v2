# Lyrify-v2 API Cutover Instructions

Этот документ предназначен для добавления в `lyrify-v2/docs/` через UI, чтобы агент Google AI Studio мог выполнить интеграцию клиента с уже развернутым API.

## Текущее состояние API

Прод-адрес:

- `https://api.cantolex.com`

Актуальные публичные endpoints:

- `POST /api/v1/translation/fetch`
- `POST /api/v1/lecture/fetch`
- `GET /health`

### Контракт `translation/fetch`

Request body:

```ts
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

### Контракт `lecture/fetch`

Request body:

- тот же `PreparedLyricsInput`

Success response:

```ts
{
  status: "success"
  data: Array<{
    id: string
    kind: "overview" | "lexical_groups" | "important_lines" | "notes" | "context" | "themes"
    order: number
    title?: string
    text: string
    source: "ai"
    lineKeys?: string[]
    phrases?: Array<{
      id: string
      text: string
      translation: string
      explanation: string
      type: "word" | "expression" | "idiom" | "collocation" | "grammar" | "cultural_reference" | "theme"
      source: "ai"
      lineKeys?: string[]
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

## Важные ограничения интеграции

- Сейчас на API **нет** отдельного cached lecture endpoint.
- Поэтому `getCachedStructuredLecture()` в клиенте пока должен:
  - либо возвращать `null`,
  - либо быть soft-disabled,
  - но не ломать основной flow.
- Основной production path:
  - перевод строк идет через `translation/fetch`
  - lecture / explanation идет через `lecture/fetch`

## Цель интеграции в `lyrify-v2`

Сделать так, чтобы приложение можно было переключить на внешний API с минимальными изменениями:

- обновить `WorkerAIAdapter`
- при необходимости подправить только boundary / transport mapping
- composition switch оставить в одном месте

## Рекомендуемая последовательность для агента

1. Обновить `WorkerAIAdapter` под реальные routes `/api/v1/...`.
2. Реализовать envelope parsing `status/data`.
3. Привести `getLineTranslations()` к текущему API response.
4. Привести `fetchStructuredLecture()` к текущему API response.
5. Временно сделать `getCachedStructuredLecture()` безопасным no-op, возвращающим `null`.
6. Не менять UX и не переписывать Gemini adapter.
7. Оставить точку переключения в `src/application/index.ts`.

## Готовый промпт для агента

```text
Нужно интегрировать lyrify-v2 с уже существующим внешним API, не ломая текущую Gemini-реализацию. Работаем только внутри репозитория lyrify-v2.

Важно:
- Не реализуй backend.
- Не меняй UX без необходимости.
- Не трогай unrelated части проекта.
- Главная цель: сделать WorkerAIAdapter реальным transport adapter для уже существующего API.

Контекст:
- Прод API доступен по адресу `https://api.cantolex.com`
- Реальные endpoints:
  - `POST /api/v1/translation/fetch`
  - `POST /api/v1/lecture/fetch`
- Оба endpoint принимают `PreparedLyricsInput`
- Оба endpoint возвращают envelope:
  - success: `{ status: "success", data: ... }`
  - error: `{ status: "error", error: { code, message } }`

Контракт translation response:
- `data` = массив строк:
  - `lineKey`
  - `lineIndex`
  - `original`
  - `translation`
  - `language`
  - `blockType?`

Контракт lecture response:
- `data` = массив lecture blocks:
  - `id`
  - `kind`
  - `order`
  - `title?`
  - `text`
  - `source`
  - `lineKeys?`
  - `phrases?`

Что нужно сделать:

1. Обновить `src/application/adapters/workerAIAdapter.ts`
- Поменять base URL / endpoint mapping с placeholder `/api/v2/worker/...` на реальный production-compatible transport:
  - `/api/v1/translation/fetch`
  - `/api/v1/lecture/fetch`
- Реализовать корректный envelope parsing:
  - если `status === "success"` → вернуть `data`
  - если `status === "error"` → бросить Error с `error.message`

2. Реализовать translation transport
- `getLineTranslations()` должен отправлять `PreparedLyricsInput`
- если вход пришел строкой, сохранить текущую безопасную fallback-совместимость, но основной путь должен быть через structured input
- адаптер должен возвращать shape, который уже ожидает текущий application/runtime слой

3. Реализовать lecture transport
- `fetchStructuredLecture()` должен отправлять `PreparedLyricsInput`
- должен возвращать массив блоков в том виде, который уже подходит текущему UI

4. Временно безопасно обработать cached lecture
- Сейчас сервер не поддерживает отдельный cached lecture endpoint
- Поэтому `getCachedStructuredLecture()` временно сделай безопасным no-op:
  - возвращай `null`
  - или другой безопасный эквивалент, который не ломает runtime
- Не пытайся эмулировать кеш через отдельный fetch без явной необходимости

5. Не активировать Worker adapter автоматически
- Не переключай composition root на WorkerAIAdapter по умолчанию
- Оставь точку ручного cutover в `src/application/index.ts`

6. При необходимости обновить docs
- Коротко зафиксируй в docs, что текущий внешний API использует `/api/v1/...`
- И что cached lecture endpoint пока отсутствует

После выполнения:
1. Перечисли измененные файлы
2. Укажи, какие методы WorkerAIAdapter стали реально рабочими
3. Отдельно укажи, как временно решен `getCachedStructuredLecture()`
4. Если запускал tests / lint / typecheck — укажи результат
```

