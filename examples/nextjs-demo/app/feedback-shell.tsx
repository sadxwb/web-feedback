'use client';

import {
  FeedbackProvider,
  type FeedbackPayload,
} from '@web-feedback/react';

export function FeedbackShell({ children }: { children: React.ReactNode }) {
  const handleFeedback = async (payload: FeedbackPayload) => {
    const form = new FormData();
    form.append('title', payload.title);
    form.append('text', payload.text);
    form.append('metadata', JSON.stringify(payload.metadata));
    form.append('screenshot', payload.screenshot, 'screenshot.png');
    if (payload.audio) form.append('audio', payload.audio, 'audio.webm');

    const res = await fetch('/api/feedback', { method: 'POST', body: form });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Submission failed (${res.status}): ${body}`);
    }
  };

  return (
    <FeedbackProvider onFeedback={handleFeedback}>{children}</FeedbackProvider>
  );
}
