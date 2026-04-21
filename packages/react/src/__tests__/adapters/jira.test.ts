import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createJiraIssue, type JiraConfig } from '../../adapters/jira';
import type { FeedbackPayload } from '../../types';

const config: JiraConfig = {
  baseUrl: 'https://example.atlassian.net',
  email: 'user@example.com',
  apiToken: 'token-123',
  projectKey: 'FDBK',
};

function makePayload(overrides: Partial<FeedbackPayload> = {}): FeedbackPayload {
  return {
    title: 'Button broken',
    text: 'Clicking save does nothing',
    screenshot: new Blob(['img'], { type: 'image/png' }),
    metadata: {
      url: 'https://app.example.com/orders/42',
      userAgent: 'TestAgent/1.0',
      viewport: { width: 1280, height: 800 },
      timestamp: '2026-04-22T00:00:00.000Z',
    },
    ...overrides,
  };
}

describe('createJiraIssue', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates an issue and attaches the screenshot', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: '10000', key: 'FDBK-1', self: 'https://x' }),
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(new Response('[]', { status: 200 }));

    const result = await createJiraIssue(makePayload(), config);

    expect(result.key).toBe('FDBK-1');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [createUrl, createInit] = fetchMock.mock.calls[0];
    expect(createUrl).toBe('https://example.atlassian.net/rest/api/3/issue');
    expect(createInit.method).toBe('POST');

    const authHeader = (createInit.headers as Record<string, string>)
      .Authorization;
    expect(authHeader).toBe(
      `Basic ${Buffer.from('user@example.com:token-123').toString('base64')}`
    );

    const body = JSON.parse(createInit.body as string);
    expect(body.fields.project.key).toBe('FDBK');
    expect(body.fields.summary).toBe('Button broken');
    expect(body.fields.issuetype.name).toBe('Task');
    expect(body.fields.description.type).toBe('doc');

    const [attachUrl, attachInit] = fetchMock.mock.calls[1];
    expect(attachUrl).toBe(
      'https://example.atlassian.net/rest/api/3/issue/FDBK-1/attachments'
    );
    expect(
      (attachInit.headers as Record<string, string>)['X-Atlassian-Token']
    ).toBe('no-check');
    expect(attachInit.body).toBeInstanceOf(FormData);
  });

  it('attaches audio when present', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: '1', key: 'FDBK-2', self: '' }),
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(new Response('[]', { status: 200 }));

    await createJiraIssue(
      makePayload({
        audio: new Blob(['audio'], { type: 'audio/webm' }),
      }),
      config
    );

    const form = fetchMock.mock.calls[1][1].body as FormData;
    const files = form.getAll('file');
    expect(files).toHaveLength(2);
  });

  it('uses the configured issue type', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: '1', key: 'FDBK-3', self: '' }),
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(new Response('[]', { status: 200 }));

    await createJiraIssue(makePayload(), { ...config, issueType: 'Bug' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.fields.issuetype.name).toBe('Bug');
  });

  it('throws when Jira rejects the create call', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('project does not exist', { status: 400 })
    );

    await expect(createJiraIssue(makePayload(), config)).rejects.toThrow(
      /Jira create failed: 400/
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws when the attachment call fails', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: '1', key: 'FDBK-4', self: '' }),
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(new Response('too big', { status: 413 }));

    await expect(createJiraIssue(makePayload(), config)).rejects.toThrow(
      /Jira attach failed: 413/
    );
  });
});
