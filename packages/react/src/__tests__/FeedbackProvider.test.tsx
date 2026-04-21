import { describe, expect, it, vi } from 'vitest';

// Must be set before @testing-library/react is imported, so React's act()
// helper sees it during module init.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef, useImperativeHandle } from 'react';

// Replace the canvas so tests don't depend on real 2D-context behavior in
// happy-dom. The stub still satisfies the imperative `export()` contract.
vi.mock('../AnnotationCanvas', () => {
  const AnnotationCanvas = forwardRef<unknown, unknown>(function Stub(_, ref) {
    useImperativeHandle(ref, () => ({
      export: async () => new Blob(['fake-png'], { type: 'image/png' }),
    }));
    return <div data-testid="annotation-canvas" />;
  });
  return { AnnotationCanvas };
});

import { FeedbackProvider } from '../FeedbackProvider';
import { useFeedback } from '../useFeedback';
import type { FeedbackPayload } from '../types';

function Trigger({ screenshot }: { screenshot?: string }) {
  const { show, capturing, isOpen } = useFeedback();
  return (
    <div>
      <span data-testid="state">
        {capturing ? 'capturing' : isOpen ? 'open' : 'idle'}
      </span>
      <button onClick={() => show({ screenshot })}>Open</button>
    </div>
  );
}

const SAMPLE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9ZQnYQYAAAAASUVORK5CYII=';

describe('FeedbackProvider', () => {
  it('useFeedback throws outside a provider', () => {
    function Outside() {
      useFeedback();
      return null;
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Outside />)).toThrow(
      /must be used within <FeedbackProvider>/
    );
    spy.mockRestore();
  });

  it('opens the overlay when show() is called with a data URL', async () => {
    const onFeedback = vi.fn();
    render(
      <FeedbackProvider onFeedback={onFeedback}>
        <Trigger screenshot={SAMPLE_DATA_URL} />
      </FeedbackProvider>
    );

    expect(screen.getByTestId('state')).toHaveTextContent('idle');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('annotation-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('state')).toHaveTextContent('open');
  });

  it('closes the overlay via the close button', async () => {
    render(
      <FeedbackProvider onFeedback={vi.fn()}>
        <Trigger screenshot={SAMPLE_DATA_URL} />
      </FeedbackProvider>
    );
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    });

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('submits a well-formed payload', async () => {
    const calls: FeedbackPayload[] = [];
    const onFeedback = vi.fn(async (p: FeedbackPayload) => {
      calls.push(p);
    });

    render(
      <FeedbackProvider onFeedback={onFeedback}>
        <Trigger screenshot={SAMPLE_DATA_URL} />
      </FeedbackProvider>
    );
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    });

    await act(async () => {
      await userEvent.type(screen.getByLabelText('Title'), 'Submit is broken');
      await userEvent.type(
        screen.getByLabelText('Description'),
        'Clicking does nothing'
      );
    });

    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(onFeedback).toHaveBeenCalledTimes(1));
    const payload = calls[0];
    expect(payload.title).toBe('Submit is broken');
    expect(payload.text).toBe('Clicking does nothing');
    expect(payload.screenshot).toBeInstanceOf(Blob);
    expect(payload.audio).toBeUndefined();
    expect(payload.metadata.url).toBe(window.location.href);
    expect(payload.metadata.viewport.width).toBe(window.innerWidth);
    expect(typeof payload.metadata.timestamp).toBe('string');

    // Overlay closes on successful submit.
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });

  it('requires a title before submitting', async () => {
    const onFeedback = vi.fn();
    render(
      <FeedbackProvider onFeedback={onFeedback}>
        <Trigger screenshot={SAMPLE_DATA_URL} />
      </FeedbackProvider>
    );
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    });

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    });

    expect(onFeedback).not.toHaveBeenCalled();
    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });
});
