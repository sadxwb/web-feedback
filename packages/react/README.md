# @web-feedback/react

In-app feedback widget for React and Next.js: screenshot + annotation +
title/description + optional audio note.

## Install

```bash
pnpm add @web-feedback/react
# or
npm install @web-feedback/react
```

Peer dependencies: `react >= 18`, `react-dom >= 18`.

## Basic usage (Next.js 15, App Router)

Wrap the app in the provider in a Client Component:

```tsx
// app/feedback-shell.tsx
'use client';

import { FeedbackProvider, type FeedbackPayload } from '@web-feedback/react';

export function FeedbackShell({ children }: { children: React.ReactNode }) {
  const handleFeedback = async (payload: FeedbackPayload) => {
    const form = new FormData();
    form.append('title', payload.title);
    form.append('text', payload.text);
    form.append('metadata', JSON.stringify(payload.metadata));
    form.append('screenshot', payload.screenshot, 'screenshot.png');
    if (payload.audio) form.append('audio', payload.audio, 'audio.webm');

    const res = await fetch('/api/feedback', { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Submission failed: ${res.status}`);
  };

  return <FeedbackProvider onFeedback={handleFeedback}>{children}</FeedbackProvider>;
}
```

Use it in `app/layout.tsx`:

```tsx
import { FeedbackShell } from './feedback-shell';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html><body><FeedbackShell>{children}</FeedbackShell></body></html>;
}
```

Trigger the overlay from any Client Component:

```tsx
'use client';
import { useFeedback } from '@web-feedback/react';

export function ReportButton() {
  const { show, capturing } = useFeedback();
  return (
    <button onClick={() => show()} disabled={capturing}>
      {capturing ? 'Capturing…' : 'Report an issue'}
    </button>
  );
}
```

## API

### `<FeedbackProvider>`

| Prop | Type | Description |
| ---- | ---- | ----------- |
| `onFeedback` | `(payload: FeedbackPayload) => Promise<void> \| void` | Called when the user submits. The host is responsible for transport (fetch to a route handler, etc.). |
| `children` | `ReactNode` | The app tree. |
| `target` | `() => HTMLElement` | Optional. Default DOM root to screenshot. Defaults to `document.body`. |

### `useFeedback()`

Returns:

```ts
{
  show: (options?: ShowOptions) => Promise<void>;
  isOpen: boolean;
  capturing: boolean;
}
```

### `ShowOptions`

| Field | Type | Description |
| ----- | ---- | ----------- |
| `screenshot` | `string \| Blob` | Provide an existing screenshot (data URL, http(s) URL, or Blob) to skip DOM capture. |
| `target` | `HTMLElement` | Override the DOM root for this invocation. |

### `FeedbackPayload`

```ts
interface FeedbackPayload {
  title: string;
  text: string;
  screenshot: Blob;           // image/png, strokes already composited
  audio?: Blob;               // audio/webm, only set if recorded
  metadata: {
    url: string;
    userAgent: string;
    viewport: { width: number; height: number };
    timestamp: string;        // ISO 8601
    custom?: Record<string, unknown>;
  };
}
```

## Server adapters

These live in separate entry points and are **server-only** — they import
`server-only` and must not be bundled into the client.

### Jira

```ts
// app/api/feedback/route.ts
import { createJiraIssue } from '@web-feedback/react/adapters/jira';

export async function POST(req: Request) {
  const form = await req.formData();
  const issue = await createJiraIssue(
    {
      title: form.get('title') as string,
      text: form.get('text') as string,
      screenshot: form.get('screenshot') as Blob,
      audio: form.get('audio') as Blob | undefined,
      metadata: JSON.parse(form.get('metadata') as string),
    },
    {
      baseUrl: process.env.JIRA_BASE_URL!,
      email: process.env.JIRA_EMAIL!,
      apiToken: process.env.JIRA_API_TOKEN!,
      projectKey: process.env.JIRA_PROJECT_KEY!,
    }
  );
  return Response.json({ key: issue.key });
}
```

### Generic webhook

```ts
import { sendFeedbackToWebhook } from '@web-feedback/react/adapters/webhook';

await sendFeedbackToWebhook(payload, {
  url: 'https://hooks.example.com/feedback',
  mode: 'multipart', // or 'json' to base64-encode blobs
  headers: { 'X-Auth': '...' },
});
```

## Using an existing screenshot

Bypass DOM capture by supplying your own image — useful for capturing
something outside the React tree (native `getDisplayMedia`, a Canvas, etc.):

```ts
show({ screenshot: myBlob });
show({ screenshot: 'data:image/png;base64,...' });
show({ screenshot: '/path/to/image.png' });
```

## Tests

```bash
pnpm --filter @web-feedback/react test
```

## Development

```bash
pnpm --filter @web-feedback/react build      # one-off
pnpm --filter @web-feedback/react dev        # watch mode
pnpm --filter @web-feedback/react typecheck
```

Build output goes to `dist/`. The client entry is pre-fixed with
`"use client"` via a tsup banner so downstream Next.js apps don't need
extra wrapping.
