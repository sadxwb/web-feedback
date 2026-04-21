import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent,
} from 'react';

export interface Stroke {
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

export interface AnnotationCanvasHandle {
  export: () => Promise<Blob>;
}

interface Props {
  screenshotDataUrl: string;
  color: string;
  strokeWidth: number;
  strokes: Stroke[];
  onStrokesChange: (next: Stroke[]) => void;
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, Props>(
  function AnnotationCanvas(
    { screenshotDataUrl, color, strokeWidth, strokes, onStrokesChange },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [size, setSize] = useState({ w: 0, h: 0 });
    const [active, setActive] = useState<Stroke | null>(null);

    useEffect(() => {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        setSize({ w: img.width, h: img.height });
      };
      img.src = screenshotDataUrl;
    }, [screenshotDataUrl]);

    useEffect(() => {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas || !img || !size.w) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const all = active ? [...strokes, active] : strokes;
      for (const s of all) {
        if (s.points.length === 0) continue;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        s.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }
    }, [strokes, active, size]);

    useImperativeHandle(ref, () => ({
      export: () =>
        new Promise<Blob>((resolve, reject) => {
          const canvas = canvasRef.current;
          if (!canvas) return reject(new Error('Canvas not ready'));
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
            'image/png'
          );
        }),
    }));

    const toCanvasCoords = (e: PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * canvas.width,
        y: ((e.clientY - rect.top) / rect.height) * canvas.height,
      };
    };

    const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
      (e.target as Element).setPointerCapture(e.pointerId);
      setActive({ color, width: strokeWidth, points: [toCanvasCoords(e)] });
    };
    const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
      if (!active) return;
      const p = toCanvasCoords(e);
      setActive((s) => (s ? { ...s, points: [...s.points, p] } : s));
    };
    const onPointerUp = () => {
      if (!active) return;
      onStrokesChange([...strokes, active]);
      setActive(null);
    };

    return (
      <canvas
        ref={canvasRef}
        width={size.w || 1}
        height={size.h || 1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          touchAction: 'none',
          background: '#fff',
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
          cursor: 'crosshair',
        }}
      />
    );
  }
);
