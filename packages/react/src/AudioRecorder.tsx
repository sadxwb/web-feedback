import { useEffect, useRef, useState } from 'react';

interface Props {
  audio: Blob | null;
  onAudioChange: (audio: Blob | null) => void;
}

export function AudioRecorder({ audio, onAudioChange }: Props) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!audio) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(audio);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audio]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    []
  );

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || 'audio/webm',
        });
        onAudioChange(blob);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {!recording && !audio && (
          <button type="button" onClick={start} style={btn()}>
            ● Record
          </button>
        )}
        {recording && (
          <button type="button" onClick={stop} style={btn('#ef4444', '#fff')}>
            ■ Stop
          </button>
        )}
        {audio && !recording && (
          <button
            type="button"
            onClick={() => onAudioChange(null)}
            style={btn()}
          >
            Remove
          </button>
        )}
      </div>
      {previewUrl && !recording && (
        <audio src={previewUrl} controls style={{ width: '100%' }} />
      )}
      {error && <div style={{ color: '#ef4444', fontSize: 12 }}>{error}</div>}
    </div>
  );
}

function btn(bg = '#f3f4f6', color = '#111'): React.CSSProperties {
  return {
    background: bg,
    color,
    border: '1px solid #d1d5db',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 13,
    cursor: 'pointer',
  };
}
