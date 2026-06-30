# Design Decisions & Architectural Choices

This document details the engineering choices, security strategies, caching mechanisms, data normalization, and bug resolutions for the **Annotation Activity Console**.

---

## 1. Redux State Management Strategy
### RTK Query + `createEntityAdapter` vs. Standard Thunks
- **RTK Query Benefits:** RTK Query provides automatic request lifecycle caching, automated deduping of concurrent queries, and background revalidation.
- **Normalization with EntityAdapter:** We utilized `createEntityAdapter` to store tasks in a flat database-like structure (`ids` list + `entities` lookup map). This makes lookups $O(1)$ and guarantees single sources of truth.
- **Real-Time Integration:** Standard RTK Query state is read-only from the client. Since WebSocket events must perform deep updates (e.g. incrementing annotation counts, updating statuses), synchronizing WebSocket payloads directly into an RTK Query cache would require complex cache manipulation (`util.updateQueryData`). By writing results of RTK Query queries directly to our standard Redux slice (`tasksSlice`) with `createEntityAdapter` in the query lifecycle `onQueryStarted`, we combined RTK Query fetch automation with full local dispatch control. WebSocket event payloads can dispatch standard Redux actions to update the entity adapter directly.

---

## 2. Security & Sanitization Pipeline
### Prevention of Cross-Site Scripting (XSS) in AI Summaries
The AI summaries streamed from `/api/tasks/:id/summary` contain raw HTML tags, image tags with error hooks (`<img src=x onerror="...">`), and script blocks (`<script>alert('xss-script')</script>`).
- **Sanitization Strategy:**
  1. **Scrubbing at Client Boundary:** The raw streamed markdown text is sanitized using `dompurify` on the client.
  2. **Sanitization Configurations:** We configured DOMPurify explicitly to forbid `<script>`, `<iframe>`, `<object>`, `<embed>`, and `<style>` tags, and strip out JavaScript attributes like `onerror`, `onload`, `onclick`.
  3. **Rendering Clean Content:** The sanitized string is passed to `react-markdown`. `react-markdown` uses a secure virtual DOM parser (under the hood via `micromark`) and does not evaluate raw HTML strings as DOM elements unless explicitly instructed via plugins like `rehype-raw`. Even if `rehype-raw` were introduced in the future, DOMPurify has already stripped all scripts and malicious handlers, ensuring zero script execution.
  4. **SSR Safety:** `DOMPurify` is a browser-only library because it requires access to the DOM. To prevent Next.js server-side compilation and hydration mismatch errors, we implement a conditional check (`typeof window !== 'undefined' ? DOMPurify.sanitize(...) : markdown`) which is resolved on the client side inside a memoization Hook (`useMemo`).

---

## 3. IndexedDB Caching & Revalidation Model
- **IndexedDB for Tasks & Summaries:** We used `localforage` to store page results and completed summaries inside IndexedDB. This prevents blocking the main thread on large database writes (which is a risk with `localStorage`).
- **Optimistic Rendering & Honest UI:**
  - Upon mounting a page, a `useEffect` reads the cached tasks list for that page from IndexedDB and dispatches them to Redux.
  - The UI instantly displays the cached tasks and flags the state as `isStale: true` (rendering an amber **"Showing Cached Data (Refreshing...)"** banner in the header).
  - Simultaneously, RTK Query triggers the server fetch in the background. Once the fresh server response arrives, Redux updates the entities and sets `isStale: false`, updating the header banner to a green **"Synchronized"** badge.
  - If the fetch fails, the UI retains the cached data but displays the API failure message so the user is fully aware of the status.
- **Summary Caching:** When clicking a task, `useAiSummary` checks IndexedDB. If found, it renders the summary instantly. If not, it streams via SSE and caches it upon completion.

---

## 4. Normalization of Messy Backend Payloads
The backend REST API returns deliberately inconsistent properties:
- **Task Types:** Input `type` is normalized using string narrowing to `image | audio | text | unknown` (unsupported categories like "video" map to `"unknown"`).
- **Statuses:** Input `status` arrives in varying casings/spellings (e.g. `InProgress`, `in_progress`, `blocked`, `BLOCKED`). We standardized this via regex character cleansing and lowercase casing to strict `TaskStatus` Enum values.
- **Assignee:** Cleansed of null variables or incomplete structures, mapping missing users to a safe default `null`.
- **Annotation Count:** Coerced to numeric formats using `parseInt(..., 10)` and clamped using `Math.max(0, ...)` to ignore negative counts.
- **Date Timestamps:** Standardized mixed structures (such as ISO strings and numeric epoch-ms) into a standard UNIX epoch timestamp (number of milliseconds) using `Date.parse()` and checks for seconds-vs-milliseconds ranges.

---

## 5. Bug Hunt Analysis: `buggy/TaskTicker.tsx`
We identified and resolved **5 distinct bugs** in the provided `TaskTicker` component:

1. **Bug A: Stale Closure in `setInterval`**
   - *Root Cause:* The `useEffect` running the timer has an empty dependency array `[]`. It captures the initial state of `tick` (which is `0`). As a result, the interval callback evaluates `setTick(0 + 1)` every second, locking `tick` at `1`.
   - *Fix:* Replaced `setTick(tick + 1)` with a functional state update: `setTick((prev) => prev + 1)`.

2. **Bug B: Direct State Mutation on Array Push**
   - *Root Cause:* In the fetch resolution, the code calls `prev.push(t)` and returns `prev`. This mutates the React state array reference directly. Because the array reference remains unchanged, React's shallow comparison does not trigger a re-render.
   - *Fix:* Replaced it with a safe immutable array spread: `return [...prev, t]`.

3. **Bug C: State Mutation inside Render Method via `Array.prototype.sort()`**
   - *Root Cause:* The code calls `tasks.sort(...)` directly in the render block. In JavaScript, `.sort()` mutates the underlying array in-place. This mutates the component's state during a render cycle, creating unstable behavior and side effects.
   - *Fix:* Created a shallow copy before sorting: `[...tasks].sort(...)`.

4. **Bug D: Lack of Duplicate Task Checking**
   - *Root Cause:* The fetch callback appends the fetched task to the array every time `selectedId` changes without verifying if a task with the same `id` already exists. Clicking a task multiple times results in duplicate entries in the UI.
   - *Fix:* Implemented a check: `const exists = prev.some(x => x.id === t.id)`. If it exists, map and update the old task; else, append.

5. **Bug E: Missing Fetch Cleanup & Race Conditions**
   - *Root Cause:* There is no cancellation guard or API abort controller. If a user changes selection rapidly, slower network requests will finish after faster ones, causing older fetches to overwrite newer ones (race conditions). Additionally, `selectedId` is initially `null`, resulting in a garbage request to `${apiBase}/api/tasks/null`.
   - *Fix:* Added a `selectedId` truthiness guard and a boolean `active` flag within the effect. On unmount or cleanup, `active` is set to `false`, discarding obsolete network responses. We also included `apiBase` in the dependencies to prevent lint warnings and stale closure bugs on endpoint configurations.

---

## 6. AI Tools & Verification
- **AI Tool Usage:** We used Gemini to generate the initial project structure, write the virtualized component layouts, and construct the Jest/RTL unit tests.
- **Verification Strategy:**
  - Jest test suites ran successfully, verifying the normalization functions, selector aggregates, and filter events.
  - Manual verification confirmed that the application compiles without errors and operates seamlessly.
