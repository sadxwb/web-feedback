import type { Metadata, Viewport } from 'next';
import { FeedbackShell } from './feedback-shell';

export const metadata: Metadata = {
  title: 'web-feedback demo',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <FeedbackShell>{children}</FeedbackShell>
      </body>
    </html>
  );
}
