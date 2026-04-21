import {
  createContext,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { captureScreenshot } from './screenshot';
import { FeedbackOverlay } from './FeedbackOverlay';
import type { OnFeedback } from './types';

export interface ShowOptions {
  /**
   * Provide an existing screenshot to annotate instead of capturing the DOM.
   * Accepts a data URL (string starting with "data:"), an http(s) URL, or a Blob.
   */
  screenshot?: string | Blob;
  /** Optional DOM root to capture when no screenshot is supplied. */
  target?: HTMLElement;
}

interface ContextValue {
  show: (options?: ShowOptions) => Promise<void>;
  isOpen: boolean;
  capturing: boolean;
}

export const FeedbackContext = createContext<ContextValue | null>(null);

interface Props {
  onFeedback: OnFeedback;
  children: ReactNode;
  /** Default DOM root used when show() is called without a target. */
  target?: () => HTMLElement;
}

export function FeedbackProvider({ onFeedback, children, target }: Props) {
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(
    null
  );
  const [capturing, setCapturing] = useState(false);

  const show = useCallback(
    async (options?: ShowOptions) => {
      if (capturing || screenshotDataUrl) return;
      setCapturing(true);
      try {
        let dataUrl: string;
        if (options?.screenshot instanceof Blob) {
          dataUrl = await blobToDataUrl(options.screenshot);
        } else if (typeof options?.screenshot === 'string') {
          dataUrl = options.screenshot.startsWith('data:')
            ? options.screenshot
            : await urlToDataUrl(options.screenshot);
        } else {
          const el = options?.target ?? (target ? target() : document.body);
          dataUrl = await captureScreenshot(el);
        }
        setScreenshotDataUrl(dataUrl);
      } finally {
        setCapturing(false);
      }
    },
    [capturing, screenshotDataUrl, target]
  );

  const close = useCallback(() => setScreenshotDataUrl(null), []);

  return (
    <FeedbackContext.Provider
      value={{ show, isOpen: !!screenshotDataUrl, capturing }}
    >
      {children}
      {screenshotDataUrl && (
        <FeedbackOverlay
          screenshotDataUrl={screenshotDataUrl}
          onFeedback={onFeedback}
          onClose={close}
        />
      )}
    </FeedbackContext.Provider>
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch screenshot: ${res.status}`);
  return blobToDataUrl(await res.blob());
}
