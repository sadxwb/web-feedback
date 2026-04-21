# nextjs-demo

Minimal Next.js 15 app showing `@web-feedback/react` wired through an API
route to Jira.

## Run

From the repo root:

```bash
pnpm install
pnpm --filter @web-feedback/react build

cp examples/nextjs-demo/.env.local.example examples/nextjs-demo/.env.local
# edit .env.local and fill in your Jira values

pnpm --filter nextjs-demo dev
```

Open <http://localhost:3000> and click **Report an issue**.

## Environment

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `JIRA_BASE_URL` | yes | `https://<your-domain>.atlassian.net` |
| `JIRA_EMAIL` | yes | Atlassian account email |
| `JIRA_API_TOKEN` | yes | API token from <https://id.atlassian.com/manage-profile/security/api-tokens> |
| `JIRA_PROJECT_KEY` | yes | Project key to file the issue under (e.g. `FDBK`) |
| `JIRA_ISSUE_TYPE` | no | Defaults to `Task`. Use `Bug`, `Story`, etc. |

These are read on the server in `app/api/feedback/route.ts`. They must not
be prefixed with `NEXT_PUBLIC_` — the Jira credentials stay server-side.

## What's wired where

| File | Role |
| ---- | ---- |
| `app/layout.tsx` | Renders `<FeedbackShell>` around the app |
| `app/feedback-shell.tsx` | Client Component: wraps in `<FeedbackProvider>` and POSTs payload to `/api/feedback` |
| `app/page.tsx` | Calls `useFeedback().show()` from a button |
| `app/api/feedback/route.ts` | Reads FormData, calls `createJiraIssue` from the server-only adapter |

## Swapping the destination

Replace the body of `app/api/feedback/route.ts` with another adapter —
e.g. `sendFeedbackToWebhook` from `@web-feedback/react/adapters/webhook`,
or your own `fetch` to Linear / Slack / email.
