import { useCallback, useEffect, useRef } from 'react';

interface AutoResizeProps {
  minHeight: number;
  maxHeight?: number;
}

/** Grows a textarea with its content between two bounds, so a one-line question keeps
 *  the composer compact and a long one doesn't need an inner scrollbar until it has to.
 *
 *  The height has to be reset to minHeight before reading scrollHeight - otherwise
 *  scrollHeight can only ever report the current (already grown) height, and the box
 *  never shrinks back when you delete text. */
export function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity),
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight],
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}
