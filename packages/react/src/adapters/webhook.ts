import 'server-only';

import type { FeedbackPayload } from '../types';

export interface WebhookConfig {
  url: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  /**
   * "multipart" (default): posts FormData with fields title, text, metadata,
   * screenshot, audio — suitable for servers that expect file uploads.
   * "json": posts JSON with base64-encoded screenshot/audio — suitable for
   * webhooks that only accept JSON bodies.
   */
  mode?: 'multipart' | 'json';
  /** Optional name for the screenshot attachment. Defaults to screenshot.png. */
  screenshotFilename?: string;
  /** Optional name for the audio attachment. Defaults to audio.webm. */
  audioFilename?: string;
}

export interface WebhookResult {
  status: number;
  body: string;
}

export async function sendFeedbackToWebhook(
  payload: FeedbackPayload,
  config: WebhookConfig
): Promise<WebhookResult> {
  const mode = config.mode ?? 'multipart';
  const screenshotName = config.screenshotFilename ?? 'screenshot.png';
  const audioName = config.audioFilename ?? 'audio.webm';

  const init: RequestInit = {
    method: config.method ?? 'POST',
    headers: { ...(config.headers ?? {}) },
  };

  if (mode === 'multipart') {
    const form = new FormData();
    form.append('title', payload.title);
    form.append('text', payload.text);
    form.append('metadata', JSON.stringify(payload.metadata));
    form.append('screenshot', payload.screenshot, screenshotName);
    if (payload.audio) form.append('audio', payload.audio, audioName);
    init.body = form;
  } else {
    init.headers = {
      ...init.headers,
      'Content-Type': 'application/json',
    };
    init.body = JSON.stringify({
      title: payload.title,
      text: payload.text,
      metadata: payload.metadata,
      screenshot: {
        filename: screenshotName,
        contentType: payload.screenshot.type || 'image/png',
        base64: await blobToBase64(payload.screenshot),
      },
      audio: payload.audio
        ? {
            filename: audioName,
            contentType: payload.audio.type || 'audio/webm',
            base64: await blobToBase64(payload.audio),
          }
        : undefined,
    });
  }

  const res = await fetch(config.url, init);
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Webhook failed: ${res.status} ${body}`);
  }
  return { status: res.status, body };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = Buffer.from(await blob.arrayBuffer());
  return buf.toString('base64');
}
