'use client';

// Global "unsaved changes" guard.
// Pages with explicit save (e.g. members table) register their save fn via registerSave().
// The sidebar intercepts navigation while dirty and offers 取消 / 保存并离开.

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface UnsavedState {
  dirty: boolean;
  saveFn: (() => Promise<void>) | null;
  setDirty: (dirty: boolean) => void;
  registerSave: (fn: () => Promise<void>) => void;
  unregisterSave: () => void;
}

const UnsavedContext = createContext<UnsavedState>({
  dirty: false,
  saveFn: null,
  setDirty: () => {},
  registerSave: () => {},
  unregisterSave: () => {},
});

export function UnsavedProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false);
  const saveFnRef = useRef<(() => Promise<void>) | null>(null);

  const registerSave = useCallback((fn: () => Promise<void>) => {
    saveFnRef.current = fn;
  }, []);

  const unregisterSave = useCallback(() => {
    saveFnRef.current = null;
    setDirty(false);
  }, []);

  return (
    <UnsavedContext.Provider
      value={{ dirty, saveFn: saveFnRef.current, setDirty, registerSave, unregisterSave }}
    >
      {children}
    </UnsavedContext.Provider>
  );
}

export function useUnsaved() {
  return useContext(UnsavedContext);
}
