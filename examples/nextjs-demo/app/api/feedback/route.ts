import { NextResponse } from 'next/server';
import { createJiraIssue } from '@web-feedback/react/adapters/jira';
import type { FeedbackMetadata } from '@web-feedback/react';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const form = await req.formData();
  const title = form.get('title');
  const text = form.get('text');
  const metadataRaw = form.get('metadata');
  const screenshot = form.get('screenshot');
  const audio = form.get('audio');

  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }
  if (!(screenshot instanceof Blob)) {
    return NextResponse.json({ error: 'screenshot required' }, { status: 400 });
  }

  const {
    JIRA_BASE_URL,
    JIRA_EMAIL,
    JIRA_API_TOKEN,
    JIRA_PROJECT_KEY,
    JIRA_ISSUE_TYPE,
  } = process.env;
  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_PROJECT_KEY) {
    return NextResponse.json(
      { error: 'Jira env not configured' },
      { status: 500 }
    );
  }

  let metadata: FeedbackMetadata;
  try {
    metadata =
      typeof metadataRaw === 'string'
        ? (JSON.parse(metadataRaw) as FeedbackMetadata)
        : {
            url: '',
            userAgent: '',
            viewport: { width: 0, height: 0 },
            timestamp: new Date().toISOString(),
          };
  } catch {
    return NextResponse.json({ error: 'invalid metadata' }, { status: 400 });
  }

  try {
    const issue = await createJiraIssue(
      {
        title,
        text: typeof text === 'string' ? text : '',
        screenshot,
        audio: audio instanceof Blob ? audio : undefined,
        metadata,
      },
      {
        baseUrl: JIRA_BASE_URL,
        email: JIRA_EMAIL,
        apiToken: JIRA_API_TOKEN,
        projectKey: JIRA_PROJECT_KEY,
        issueType: JIRA_ISSUE_TYPE,
      }
    );
    return NextResponse.json({ key: issue.key });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
