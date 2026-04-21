'use client';

import { useFeedback } from '@web-feedback/react';

export default function Page() {
  const { show, capturing } = useFeedback();

  return (
    <main style={{ padding: 40, maxWidth: 720, margin: '0 auto' }}>
      <h1>web-feedback demo</h1>
      <p>
        Click the button below. The current page will be captured, and you can
        draw on the screenshot, add a title, a description, and an optional
        audio note before submitting to Jira.
      </p>
      <button
        type="button"
        onClick={show}
        disabled={capturing}
        style={{
          padding: '10px 16px',
          fontSize: 14,
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: capturing ? 'wait' : 'pointer',
        }}
      >
        {capturing ? 'Capturing…' : 'Report an issue'}
      </button>
      <section style={{ marginTop: 32 }}>
        <h2>Sample content</h2>
        <p>
          Any content on the page will be included in the screenshot. Drawings
          and annotations are composited into the final PNG before submission.
        </p>
      </section>
    </main>
  );
}
