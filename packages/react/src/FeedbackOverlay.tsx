import { useRef, useState, type CSSProperties } from 'react';
import {
  AnnotationCanvas,
  type AnnotationCanvasHandle,
  type Stroke,
} from './AnnotationCanvas';
import { AudioRecorder } from './AudioRecorder';
import type { FeedbackPayload, OnFeedback } from './types';

interface Props {
  screenshotDataUrl: string;
  onFeedback: OnFeedback;
  onClose: () => void;
}

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#111111'];

export function FeedbackOverlay({
  screenshotDataUrl,
  onFeedback,
  onClose,
}: Props) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [audio, setAudio] = useState<Blob | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<AnnotationCanvasHandle>(null);

  const submit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const screenshot = await canvasRef.current!.export();
      const payload: FeedbackPayload = {
        title: title.trim(),
        text,
        screenshot,
        audio: audio ?? undefined,
        metadata: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          timestamp: new Date().toISOString(),
        },
      };
      await onFeedback(payload);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div style={canvasPaneStyle}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
            padding: 16,
          }}
        >
          <AnnotationCanvas
            ref={canvasRef}
            screenshotDataUrl={screenshotDataUrl}
            color={color}
            strokeWidth={4}
            strokes={strokes}
            onStrokesChange={setStrokes}
          />
        </div>
        <div style={toolbarStyle}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: c,
                border:
                  c === color ? '2px solid #fff' : '2px solid transparent',
                boxShadow:
                  c === color ? '0 0 0 2px #3b82f6' : '0 0 0 1px #d1d5db',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
          <div style={{ width: 1, height: 20, background: '#374151' }} />
          <button
            type="button"
            onClick={() => setStrokes((s) => s.slice(0, -1))}
            disabled={!strokes.length}
            style={toolBtnStyle(!strokes.length)}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setStrokes([])}
            disabled={!strokes.length}
            style={toolBtnStyle(!strokes.length)}
          >
            Clear
          </button>
        </div>
      </div>
      <aside style={formPaneStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>Send feedback</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={closeBtnStyle}
          >
            ×
          </button>
        </div>
        <label style={labelStyle}>
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short summary"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          <span>Description</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="What happened?"
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </label>
        <label style={labelStyle}>
          <span>Audio note (optional)</span>
          <AudioRecorder audio={audio} onAudioChange={setAudio} />
        </label>
        {error && <div style={errorStyle}>{error}</div>}
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          style={submitBtnStyle(submitting)}
        >
          {submitting ? 'Sending…' : 'Send'}
        </button>
      </aside>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 2147483000,
  display: 'flex',
  background: 'rgba(17,24,39,0.85)',
  backdropFilter: 'blur(4px)',
  fontFamily:
    'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  color: '#111',
};

const canvasPaneStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  padding: 12,
  background: '#111827',
  color: '#fff',
  justifyContent: 'center',
};

const formPaneStyle: CSSProperties = {
  width: 360,
  maxWidth: '90vw',
  background: '#fff',
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  overflowY: 'auto',
};

const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  fontWeight: 500,
  color: '#374151',
};

const inputStyle: CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  outline: 'none',
  color: '#111',
  background: '#fff',
};

const closeBtnStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: 24,
  cursor: 'pointer',
  color: '#6b7280',
  lineHeight: 1,
  padding: 0,
  width: 24,
  height: 24,
};

const errorStyle: CSSProperties = {
  background: '#fef2f2',
  color: '#b91c1c',
  padding: '8px 10px',
  borderRadius: 6,
  fontSize: 13,
};

function toolBtnStyle(disabled: boolean): CSSProperties {
  return {
    background: disabled ? '#374151' : '#1f2937',
    color: disabled ? '#6b7280' : '#fff',
    border: '1px solid #4b5563',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function submitBtnStyle(submitting: boolean): CSSProperties {
  return {
    marginTop: 'auto',
    background: submitting ? '#93c5fd' : '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: 14,
    fontWeight: 600,
    cursor: submitting ? 'wait' : 'pointer',
  };
}
