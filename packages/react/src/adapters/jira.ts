import 'server-only';

import type { FeedbackPayload } from '../types';

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  issueType?: string;
}

export interface JiraIssueResult {
  id: string;
  key: string;
  self: string;
}

export async function createJiraIssue(
  payload: FeedbackPayload,
  config: JiraConfig
): Promise<JiraIssueResult> {
  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString(
    'base64'
  );
  const baseHeaders = {
    Authorization: `Basic ${auth}`,
    Accept: 'application/json',
  };

  const createRes = await fetch(`${config.baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: { ...baseHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        project: { key: config.projectKey },
        summary: payload.title,
        issuetype: { name: config.issueType ?? 'Task' },
        description: buildAdfDescription(payload),
      },
    }),
  });

  if (!createRes.ok) {
    throw new Error(
      `Jira create failed: ${createRes.status} ${await createRes.text()}`
    );
  }
  const issue = (await createRes.json()) as JiraIssueResult;

  const form = new FormData();
  form.append('file', payload.screenshot, 'screenshot.png');
  if (payload.audio) form.append('file', payload.audio, 'audio.webm');

  const attachRes = await fetch(
    `${config.baseUrl}/rest/api/3/issue/${issue.key}/attachments`,
    {
      method: 'POST',
      // X-Atlassian-Token is required by Jira for file uploads.
      headers: { ...baseHeaders, 'X-Atlassian-Token': 'no-check' },
      body: form,
    }
  );
  if (!attachRes.ok) {
    throw new Error(
      `Jira attach failed: ${attachRes.status} ${await attachRes.text()}`
    );
  }

  return issue;
}

function buildAdfDescription(p: FeedbackPayload) {
  const lines = [
    p.text.trim() || '_No description provided._',
    '',
    '---',
    `URL: ${p.metadata.url}`,
    `Viewport: ${p.metadata.viewport.width}×${p.metadata.viewport.height}`,
    `User agent: ${p.metadata.userAgent}`,
    `Timestamp: ${p.metadata.timestamp}`,
  ];
  return {
    type: 'doc',
    version: 1,
    content: lines.map((line) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : [],
    })),
  };
}
