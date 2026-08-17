/**
 * useStudioHistory – undo/redo stack with deep-clone snapshots
 * Supports restoring a previously persisted session (past/future/state).
 */
import { useRef, useState, useCallback } from 'react';
import type { StudioElement, PageConfig, StudioState } from './types';

export type Snapshot = {
  elements: StudioElement[];
  page: PageConfig;
};

export type StudioHistoryInit = {
  state: StudioState;
  past?: Snapshot[];
  future?: Snapshot[];
};

function snap(state: StudioState): Snapshot {
  return {
    elements: JSON.parse(JSON.stringify(state.elements)),
    page: { ...state.page },
  };
}

export function useStudioHistory(init: StudioState | StudioHistoryInit) {
  const initialState = ('state' in init) ? init.state! : init;
  const initialPast = ('past' in init) ? init.past ?? [] : [];
  const initialFuture = ('future' in init) ? init.future ?? [] : [];

  const [state, _setState] = useState<StudioState>(initialState);
  const past = useRef<Snapshot[]>(initialPast);
  const future = useRef<Snapshot[]>(initialFuture);

  const commit = useCallback((updater: (prev: StudioState) => StudioState) => {
    _setState(prev => {
      past.current.push(snap(prev));
      if (past.current.length > 100) past.current.shift();
      future.current = [];
      return updater(prev);
    });
  }, []);

  // Mutate state WITHOUT adding to history (e.g. live drag position updates)
  const silentSet = useCallback((updater: (prev: StudioState) => StudioState) => {
    _setState(prev => updater(prev));
  }, []);

  const undo = useCallback(() => {
    if (!past.current.length) return;
    const prev = past.current.pop()!;
    _setState(current => {
      future.current.push(snap(current));
      return { ...current, elements: prev.elements, page: prev.page };
    });
  }, []);

  const redo = useCallback(() => {
    if (!future.current.length) return;
    const next = future.current.pop()!;
    _setState(current => {
      past.current.push(snap(current));
      return { ...current, elements: next.elements, page: next.page };
    });
  }, []);

  const clearHistory = useCallback(() => {
    past.current = [];
    future.current = [];
  }, []);

  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;

  return { state, commit, silentSet, undo, redo, canUndo, canRedo, past, future, clearHistory };
}
