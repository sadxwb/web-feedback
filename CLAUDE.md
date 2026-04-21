# CLAUDE.md

Guidance for AI agents working in this repo. Read this before editing —
`README.md` covers what the project is; this file covers how it's built.

## Repo shape

pnpm workspace + Turborepo.

```
packages/react/            # @web-feedback/react — the widget package
examples/nextjs-demo/      # runnable Next.js 15 example
```

Only add new shared packages under `packages/`. Only add demos/playgrounds
under `examples/`. Don't create a top-level `src/`.

## Client / server split is load-bearing

The package has **two surfaces**, and they must not be mixed:

| Entry | Kind | Rule |
| ----- | ---- | ---- |
| `@web-feedback/react` | Client bundle | React components + hooks. tsup emits a `"use client";` banner. Must never import Node-only modules (`fs`, `crypto`, `Buffer`, etc.). |
| `@web-feedback/react/adapters/*` | Server bundle | First line is `import 'server-only';`. Free to use `Buffer`, `fetch` with secrets, Node APIs. Must never import from the client entry, even transitively. |

If you add a new adapter:
1. Put it under `packages/react/src/adapters/<name>.ts`.
2. First line: `import 'server-only';`.
3. Add a new entry to the `entry` map in `tsup.config.ts` (server config block — the one with `platform: 'node'` and `external: ['server-only']`).
4. Add an `exports["./adapters/<name>"]` block in `packages/react/package.json`.
5. Write tests under `packages/react/src/__tests__/adapters/<name>.test.ts`.

Never put Jira/webhook/etc. credentials on the client. The browser posts a
`FormData` to a host-defined route handler; the route handler imports the
server adapter and calls it with env vars.

## Widget conventions

- **Styles:** all inline via `CSSProperties`. No CSS files, no CSS-in-JS libraries, no Tailwind imports. Consumers shouldn't need to import stylesheets.
- **Screenshots:** `html-to-image` → data URL → rendered onto a `<canvas>`. Strokes are drawn on top of the image in the same canvas, then `canvas.toBlob` produces the final PNG. Don't split image and strokes into separate layers in the submitted payload — always composite.
- **Audio:** `MediaRecorder` with default mime. Ships as a raw Blob in `FeedbackPayload.audio`. No transcription — the host decides what to do with the file.
- **Show entry points:** `show()` accepts `{ screenshot?: string | Blob; target?: HTMLElement }`. Support all three screenshot forms (data URL, http URL, Blob) — tests depend on this.
- **Payload shape:** `FeedbackPayload` in `src/types.ts` is the contract between widget and adapters. Changes here need matching updates in both adapters + the demo route + all adapter tests.

## Testing

- **Location:** `packages/react/src/__tests__/` mirrors `src/` — provider tests in the root, adapter tests in `__tests__/adapters/`. Don't colocate test files next to source.
- **Runner:** Vitest. Environment is `happy-dom`. `vitest.config.ts` aliases `server-only` → `src/__tests__/server-only-stub.ts` so server-only modules can be imported in Node.
- **Component tests** mock `../AnnotationCanvas` via `vi.mock` — happy-dom's canvas can't composite images. Keep the stub's imperative `export()` returning a real `Blob` so payload assertions still work.
- **Async submit assertions:** don't wrap the final `userEvent.click` on "Send" in `act`. Use `waitFor(() => expect(onFeedback).toHaveBeenCalled())` instead — submission is async and state updates happen after the click handler resolves, which `act` won't wait for.
- **Adapter tests** stub `fetch` via `vi.stubGlobal('fetch', fetchMock)` in `beforeEach`, then assert on `fetchMock.mock.calls`. Verify URL, headers, and body shape — both success and failure paths.

## Commands

From repo root (prefer these over cd'ing into packages):

```bash
pnpm install
pnpm build                                      # all packages via Turbo
pnpm typecheck                                  # all workspaces
pnpm test                                       # runs the package's vitest
pnpm --filter @web-feedback/react dev           # tsup watch
pnpm --filter @web-feedback/react test:watch    # vitest watch
pnpm --filter nextjs-demo dev                   # next dev on :3000
```

The demo can't resolve `@web-feedback/react` until the package has built
(`dist/` is consumed). Run `pnpm --filter @web-feedback/react build`
after changes, or use `dev` watch mode during development.

No ESLint is configured. `tsc --noEmit` is the only static check — keep
it green.

## Things not to do

- Don't add a CSS file or styling library to the widget package.
- Don't make Jira (or any adapter) callable from the client — credentials leak.
- Don't add a `NEXT_PUBLIC_JIRA_*` env var. Server env only.
- Don't reach into `dist/` from tests — always import from `src/`.
- Don't put screenshot capture behind a portal or React.lazy — capture uses `document.body` by default and must run synchronously on `show()`.
- Don't add transcription, OCR, or auto-categorization to the widget. The package's job ends at handing a raw payload to `onFeedback`.
- Don't remove the `server-only` import from adapters, even if tests pass without it — it's what prevents accidental client-bundle inclusion in Next.js.

## Adding a new destination

Two tasks, in order:

1. Write a server adapter: `packages/react/src/adapters/<name>.ts`, following the rules above.
2. Wire it in the demo's `app/api/feedback/route.ts` (or leave the Jira one in place and document the swap in the demo README).

That's the whole pattern.
