export interface FeedbackMetadata {
  url: string;
  userAgent: string;
  viewport: { width: number; height: number };
  timestamp: string;
  custom?: Record<string, unknown>;
}

export interface FeedbackPayload {
  title: string;
  text: string;
  screenshot: Blob;
  audio?: Blob;
  metadata: FeedbackMetadata;
}

export type OnFeedback = (payload: FeedbackPayload) => Promise<void> | void;
