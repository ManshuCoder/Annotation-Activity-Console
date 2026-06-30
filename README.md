# Annotation Activity Console

A highly performant, accessible, and real-time B2B operations dashboard built with Next.js (App Router), Redux Toolkit, Framer Motion, IndexedDB (localforage), WebSockets, and Server-Sent Events (SSE).

---

## 🏗️ Project Architecture & Data Flow

Below is a visual layout of the components, state slices, and background event listeners:

```text
                                  +-----------------------+
                                  |    Mock Express Server |
                                  |  (REST + SSE + WS)    |
                                  +-----------+-----------+
                                              |
      +---------------------------------------+---------------------------------------+
      | (REST api/tasks)                      | (SSE api/tasks/:id/summary)           | (WS /ws)
      v                                       v                                       v
+-----+----------------+              +-------+---------------+              +--------+---------------+
|  IndexedDB Cache     |              |  IndexedDB Cache      |              |  useTaskFeed hook      |
|  (localforage)       |              |  (localforage)        |              |  (Background Sync)     |
+-----+----------------+              +-------+---------------+              +--------+---------------+
      |                                       |                                       |
      | (Read on load / Write on sync)        | (Read on load / Write on done)        | (Dispatch updates)
      v                                       v                                       v
+-----+---------------------------------------+---------------------------------------+---------------+
|                                      Redux Toolkit (RTK) Store                                      |
|                                                                                                     |
|  +-----------------------+       +-------------------------+       +-----------------------------+  |
|  | tasksSlice            |       | uiSlice (redux-persist) |       | apiSlice (RTK Query)        |  |
|  | (Entity Adapter)      |       | (Filters, Search, Sort) |       | (Fetch, Assign Mutation)    |  |
|  +-----------------------+       +-------------------------+       +-----------------------------+  |
+---------------------------------------------+-------------------------------------------------------+
                                              |
                                              v (Memoized Selectors)
                                  +-----------+-----------+
                                  |    React UI Component |
                                  |  (Virtualized List)   |
                                  +-----------+-----------+
                                              |
                                 +------------+------------+
                                 |                         |
                                 v                         v
                       +---------+---------+     +---------+---------+
                       |   DetailPanel     |     |   TasksChart      |
                       | (Framer Motion)   |     |   (Recharts)      |
                       +-------------------+     +-------------------+
```

---

## 🛠️ Tech Stack Details

- **Framework:** Next.js 16 (App Router) + React 19
- **State Management:** Redux Toolkit (RTK) with `createEntityAdapter` for tasks and `redux-persist` for UI configuration.
- **Caching:** `localforage` (IndexedDB) for asynchronous, non-blocking page caching and AI summary storage.
- **Styling & Animations:** Tailwind CSS (modern color styling) + Framer Motion (animated drawers).
- **Virtualization:** `@tanstack/react-virtual` for fluid rendering of thousands of rows.
- **Visualization:** `recharts` for status distribution bar charts.
- **Security:** `dompurify` + `react-markdown` to sanitize untrusted HTML/scripts.
- **Testing:** Jest + React Testing Library (RTL).

---

## 🚀 Running the Project

Follow these steps to run the mock server and dashboard app locally:

### 1. Start the Mock Server
1. Navigate to the `mock-server` directory:
   ```bash
   cd mock-server
   ```
2. Install the mock server dependencies:
   ```bash
   npm install
   ```
3. Start the mock server:
   ```bash
   npm run mock
   ```
   The mock server will listen on `http://localhost:4000` (REST) and `ws://localhost:4000/ws` (WebSocket).

### 2. Start the Frontend Application
1. In the root workspace directory, install the client dependencies:
   ```bash
   npm install
   ```
2. Start the Next.js development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🧪 Running the Tests

To run the automated Jest and React Testing Library tests, run the following command in the root folder:
```bash
npm run test
```
The test suite validates:
- Messy data parsing & standardization (`tests/normalize.test.ts`).
- Memoized query selectors & Derived statistics (`tests/selector.test.ts`).
- Component filter updates and virtualization rendering (`tests/TaskList.test.tsx`).
