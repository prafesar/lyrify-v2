# Security Specification for CantoLex

## 1. Data Invariants
- A flashcard must belong to the authenticated user who created it (`userId` match).
- A flashcard must have all required FSRS fields.
- `createdAt` is immutable.
- `originalPhrase` is immutable (once created, the user shouldn't change the source phrase of a card, they should delete and recreate if needed).
- All strings must have bounded sizes to prevent resource exhaustion.
- Timestamps must be validated against `request.time`.

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)

### T1: ID Spoofing (Create)
**Payload:** `{ ..., userId: "other_user_id" }`
**Result:** `PERMISSION_DENIED` (Rule enforces `data.userId == request.auth.uid`)

### T2: Resource Poisoning (Massive String)
**Payload:** `{ ..., originalPhrase: "A".repeat(1000000) }`
**Result:** `PERMISSION_DENIED` (Rule enforces `.size() <= 1000`)

### T3: Shadow Fields (Injection)
**Payload:** `{ ..., isAdmin: true }`
**Result:** `PERMISSION_DENIED` (Rule enforces strict key size)

### T4: Identity Escalation (Update Owner)
**Payload:** `update({ userId: "attacker_id" })`
**Result:** `PERMISSION_DENIED` (Rule enforces `incoming().userId == existing().userId`)

### T5: Immutability Violation (Update createdAt)
**Payload:** `update({ createdAt: timestamp.now() })`
**Result:** `PERMISSION_DENIED` (Rule enforces `incoming().createdAt == existing().createdAt`)

### T6: Unauthorized Access (Get someone else's card)
**Request:** `get(/cards/someone_elses_id)`
**Result:** `PERMISSION_DENIED` (Rule enforces `isOwner(resource.data.userId)`)

### T7: Data Scraping (List another user's cards)
**Request:** `query("cards").where("userId", "==", "victim_id")`
**Result:** `PERMISSION_DENIED` (Rule enforces `resource.data.userId == request.auth.uid`)

### T8: Temporal Fraud (Future createdAt)
**Payload:** `{ ..., createdAt: request.time + 10000 }`
**Result:** `PERMISSION_DENIED` (Rule enforces `== request.time`)

### T9: Type Poisoning (String as number)
**Payload:** `{ ..., state: "new" }`
**Result:** `PERMISSION_DENIED` (Rule enforces `is number`)

### T10: Outcome Manipulation (Invalid status)
**Payload:** `{ ..., status: "mastered" }`
**Result:** `PERMISSION_DENIED` (Rule enforces `in ['new', 'known', 'studying']`)

### T11: Logic Skip (Update stability without review action)
**Payload:** `update({ stability: 100 })` with no other allowed fields.
**Result:** `PERMISSION_DENIED` (Rule enforces action-based `affectedKeys()`)

### T12: Orphaned ID (Invalid cardId format)
**Request:** `set(/cards/!!!invalid!!!, { ... })`
**Result:** `PERMISSION_DENIED` (Rule enforces `isValidId(cardId)`)

## 3. Test Runner (Mock)
A full test suite would use `@firebase/rules-unit-testing`. Given the environment, I'll ensure the rules are logically sound against these payloads.
