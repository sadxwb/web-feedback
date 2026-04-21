import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendFeedbackToWebhook } from '../../adapters/webhook';
import type { FeedbackPayload } from '../../types';

function makePayload(overrides: Partial<FeedbackPayload> = {}): FeedbackPayload {
  return {
    title: 'Crash on export',
    text: 'Steps: click export, spinner hangs',
    screenshot: new Blob(['screenshot-bytes'], { type: 'image/png' }),
    metadata: {
      url: 'https://app.example.com',
      userAgent: 'TestAgent/1.0',
      viewport: { width: 1024, height: 768 },
      timestamp: '2026-04-22T00:00:00.000Z',
    },
    ...overrides,
  };
}

describe('sendFeedbackToWebhook', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts multipart form data by default', async () => {
    fetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }));

    await sendFeedbackToWebhook(
      makePayload({ audio: new Blob(['a'], { type: 'audio/webm' }) }),
      { url: 'https://hook.example.com/f' }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://hook.example.com/f');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);

    const form = init.body as FormData;
    expect(form.get('title')).toBe('Crash on export');
    expect(form.get('text')).toBe('Steps: click export, spinner hangs');
    expect(JSON.parse(form.get('metadata') as string).url).toBe(
      'https://app.example.com'
    );
    expect(form.get('screenshot')).toBeInstanceOf(Blob);
    expect(form.get('audio')).toBeInstanceOf(Blob);
  });

  it('posts JSON with base64 blobs when mode=json', async () => {
    fetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }));

    await sendFeedbackToWebhook(makePayload(), {
      url: 'https://hook.example.com/f',
      mode: 'json',
      headers: { 'X-Auth': 'secret' },
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(
      (init.headers as Record<string, string>)['Content-Type']
    ).toBe('application/json');
    expect((init.headers as Record<string, string>)['X-Auth']).toBe('secret');

    const body = JSON.parse(init.body as string);
    expect(body.title).toBe('Crash on export');
    expect(body.screenshot.contentType).toBe('image/png');
    expect(body.screenshot.base64).toBe(
      Buffer.from('screenshot-bytes').toString('base64')
    );
    expect(body.audio).toBeUndefined();
  });

  it('honors custom filenames', async () => {
    fetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }));

    await sendFeedbackToWebhook(
      makePayload({ audio: new Blob(['a'], { type: 'audio/webm' }) }),
      {
        url: 'https://hook.example.com/f',
        mode: 'json',
        screenshotFilename: 'shot.jpg',
        audioFilename: 'note.ogg',
      }
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.screenshot.filename).toBe('shot.jpg');
    expect(body.audio.filename).toBe('note.ogg');
  });

  it('throws on non-2xx responses', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('nope', { status: 500 })
    );

    await expect(
      sendFeedbackToWebhook(makePayload(), { url: 'https://x' })
    ).rejects.toThrow(/Webhook failed: 500/);
  });
});
