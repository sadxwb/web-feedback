# web-feedback

In-app feedback widget for React / Next.js. Inspired by the Flutter
[`feedback`](https://pub.dev/packages/feedback) package.

When the user triggers feedback, the widget captures a screenshot of the
current page, lets the user annotate it, add a title, a description, and
optionally an audio note, then hands the payload to a callback so the host
app can forward it to its own backend.

## Packages

| Package | Description |
| ------- | ----------- |
| [`@web-feedback/react`](./packages/react) | Client widget + server-only adapters for Jira and generic webhooks |
| [`nextjs-demo`](./examples/nextjs-demo) | Next.js 15 app router example with a working `/api/feedback` route |

## Repository layout

```
packages/react/            # the shared package
examples/nextjs-demo/      # runnable Next.js example
```

Tooling: [pnpm workspaces](https://pnpm.io/workspaces) + [Turborepo](https://turbo.build).

## Quickstart

```bash
pnpm install
pnpm --filter @web-feedback/react build

cp examples/nextjs-demo/.env.local.example examples/nextjs-demo/.env.local
# fill in JIRA_* values

pnpm --filter nextjs-demo dev
```

Open <http://localhost:3000> and click **Report an issue**.

## Scripts

| Script | What it does |
| ------ | ------------ |
| `pnpm build` | Builds all packages via Turbo |
| `pnpm dev` | Runs dev mode (package watch + example server) |
| `pnpm typecheck` | Type-checks every workspace |
| `pnpm --filter @web-feedback/react test` | Runs the package unit tests |

## Design notes

- The package is split into a **client bundle** (`.`) and **server-only
  adapters** (`./adapters/jira`, `./adapters/webhook`). Jira credentials
  never reach the browser.
- The overlay is rendered inline by the provider — no portal required, no
  CSS file to import. All styles are scoped inline.
- Screenshot capture uses [`html-to-image`](https://github.com/bubkoo/html-to-image).
  Annotations are composited into the final PNG blob before submission.
- Audio is captured via `MediaRecorder` and attached as a WebM blob. No
  transcription is performed; the host decides what to do with the file.
