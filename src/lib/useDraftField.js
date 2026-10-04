import { useState } from 'react';

// Drafts live in the encrypted payload; no workout data is stored in clear text.
export default function useDraftField(drafts, onDraftChange, key, initialValue) {
  const [fallback] = useState(initialValue);
  const value = Object.hasOwn(drafts, key) ? drafts[key] : fallback;
  const setValue = (next) => onDraftChange(key, typeof next === 'function' ? next(value) : next);
  return [value, setValue];
}
