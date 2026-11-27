import React, { useEffect, useRef } from 'react';

// Shared focus lifecycle for the existing workflows. Closing remains owned by
// each workflow so upload/confirmation guards continue to apply.
export function DialogFrame({ onClose, label, children, ...props }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const element = ref.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      [
        ...element.querySelectorAll(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      ].filter((e) => e.getClientRects().length);
    element.focus();
    const keydown = (e) => {
      if ([...document.querySelectorAll('[role="dialog"]')].at(-1) !== element) return;
      if (e.key === 'Escape' && closeRef.current) {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key !== 'Tab') return;
      const items = focusable(),
        first = items[0],
        last = items.at(-1);
      if (!first) {
        e.preventDefault();
        element.focus();
        return;
      }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === element)) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === element ||
          !element.contains(document.activeElement))
      ) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keydown, true);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} {...props}>
      {children}
    </div>
  );
}
