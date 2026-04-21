import { toPng } from 'html-to-image';

export async function captureScreenshot(
  target: HTMLElement = document.body
): Promise<string> {
  return toPng(target, {
    cacheBust: true,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
  });
}
