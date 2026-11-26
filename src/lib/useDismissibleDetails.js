import { useEffect, useRef } from 'react';

export default function useDismissibleDetails() {
  const detailsRef = useRef(null);

  useEffect(() => {
    const details = detailsRef.current;

    function closeOnOutsideClick(event) {
      if (details.open && !event.composedPath().includes(details)) {
        details.open = false;
      }
    }

    function closeOnEscape(event) {
      if (event.key !== 'Escape' || event.defaultPrevented || !details.open) return;
      if (event.target instanceof Element && event.target.closest('dialog[open]')) return;

      const focusIsInside = details.contains(document.activeElement);
      details.open = false;
      if (focusIsInside) {
        event.preventDefault();
        details.querySelector('summary')?.focus();
      }
    }

    document.addEventListener('click', closeOnOutsideClick, true);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('click', closeOnOutsideClick, true);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return detailsRef;
}
