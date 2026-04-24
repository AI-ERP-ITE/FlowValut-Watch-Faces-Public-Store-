// Global App State Context

import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { AppState, AppStep, WatchFaceConfig, GeneratedCode, ElementImage, WatchFaceElement } from '@/types';

// Initial state
const initialState: AppState = {
  currentStep: 'upload',
  backgroundImage: null,
  backgroundFile: null,
  fullDesignImage: null,
  fullDesignFile: null,
  watchFaceConfig: null,
  elementImages: [],
  generatedCode: null,
  zpkBlob: null,
  githubUrl: null,
  qrCodeDataUrl: null,
  isLoading: false,
  loadingMessage: '',
  error: null,
  githubToken: localStorage.getItem('githubToken') || '',
  githubRepo: localStorage.getItem('githubRepo') || 'AI-ERP-ITE/Watch-Faces',
  undoStack: [],
  redoStack: [],
};

// Action types
type Action =
  | { type: 'SET_STEP'; payload: AppStep }
  | { type: 'SET_BACKGROUND_IMAGE'; payload: string | null }
  | { type: 'SET_BACKGROUND_FILE'; payload: File | null }
  | { type: 'SET_FULL_DESIGN_IMAGE'; payload: string | null }
  | { type: 'SET_FULL_DESIGN_FILE'; payload: File | null }
  | { type: 'SET_WATCH_FACE_CONFIG'; payload: WatchFaceConfig | null }
  | { type: 'SET_ELEMENT_IMAGES'; payload: ElementImage[] }
  | { type: 'SET_GENERATED_CODE'; payload: GeneratedCode | null }
  | { type: 'SET_ZPK_BLOB'; payload: Blob | null }
  | { type: 'SET_GITHUB_URL'; payload: string | null }
  | { type: 'SET_QR_CODE'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOADING_MESSAGE'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_GITHUB_TOKEN'; payload: string }
  | { type: 'SET_GITHUB_REPO'; payload: string }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; changes: Partial<WatchFaceElement> } }
  | { type: 'UPDATE_ELEMENTS_BATCH'; payload: Array<{ id: string; changes: Partial<WatchFaceElement> }> }
  | { type: 'ADD_ELEMENT'; payload: WatchFaceElement }
  | { type: 'DELETE_ELEMENT'; payload: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' };

function ensureElementsVersioned(elements: WatchFaceElement[]): WatchFaceElement[] {
  return elements.map((el) => ({ ...el, version: el.version ?? 1 }));
}

function bumpElementVersion(element: WatchFaceElement): WatchFaceElement {
  return { ...element, version: (element.version ?? 1) + 1 };
}

// Reducer
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_BACKGROUND_IMAGE':
      return { ...state, backgroundImage: action.payload };
    case 'SET_BACKGROUND_FILE':
      return { ...state, backgroundFile: action.payload };
    case 'SET_FULL_DESIGN_IMAGE':
      return { ...state, fullDesignImage: action.payload };
    case 'SET_FULL_DESIGN_FILE':
      return { ...state, fullDesignFile: action.payload };
    case 'SET_WATCH_FACE_CONFIG':
      return {
        ...state,
        watchFaceConfig: action.payload
          ? { ...action.payload, elements: ensureElementsVersioned(action.payload.elements) }
          : null,
      };
    case 'SET_ELEMENT_IMAGES':
      return { ...state, elementImages: action.payload };
    case 'SET_GENERATED_CODE':
      return { ...state, generatedCode: action.payload };
    case 'SET_ZPK_BLOB':
      return { ...state, zpkBlob: action.payload };
    case 'SET_GITHUB_URL':
      return { ...state, githubUrl: action.payload };
    case 'SET_QR_CODE':
      return { ...state, qrCodeDataUrl: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_LOADING_MESSAGE':
      return { ...state, loadingMessage: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_GITHUB_TOKEN':
      localStorage.setItem('githubToken', action.payload);
      return { ...state, githubToken: action.payload };
    case 'SET_GITHUB_REPO':
      localStorage.setItem('githubRepo', action.payload);
      return { ...state, githubRepo: action.payload };
    case 'ADD_ELEMENT': {
      if (!state.watchFaceConfig) return state;
      const newUndoForAdd = [...state.undoStack, structuredClone(state.watchFaceConfig.elements)].slice(-30);
      const withVersion = { ...action.payload, version: action.payload.version ?? 1 };
      return {
        ...state,
        watchFaceConfig: { ...state.watchFaceConfig, elements: [...state.watchFaceConfig.elements, withVersion] },
        undoStack: newUndoForAdd,
        redoStack: [],
      };
    }
    case 'DELETE_ELEMENT': {
      if (!state.watchFaceConfig) return state;
      const newUndoForDel = [...state.undoStack, structuredClone(state.watchFaceConfig.elements)].slice(-30);
      const deletedEl = state.watchFaceConfig.elements.find(e => e.id === action.payload);
      // Build set of IDs to remove: the target + its linked frame (if any)
      const toDelete = new Set([action.payload]);
      if (deletedEl?.frameElementId) toDelete.add(deletedEl.frameElementId);
      // If deleting a frame element, find the parent and clear its frameElementId reference
      const parentOfFrame = state.watchFaceConfig.elements.find(e => e.frameElementId === action.payload);
      const afterDelete = state.watchFaceConfig.elements
        .filter(e => !toDelete.has(e.id))
        .map(e => e.id === parentOfFrame?.id ? { ...e, frameElementId: undefined } : e);
      return {
        ...state,
        watchFaceConfig: { ...state.watchFaceConfig, elements: afterDelete },
        undoStack: newUndoForDel,
        redoStack: [],
      };
    }
    case 'UPDATE_ELEMENT': {
      if (!state.watchFaceConfig) return state;
      const newUndoStack = [...state.undoStack, structuredClone(state.watchFaceConfig.elements)].slice(-30);
      // First pass: apply the requested change
      let updatedElements = state.watchFaceConfig.elements.map(el =>
        el.id === action.payload.id ? bumpElementVersion({ ...el, ...action.payload.changes }) : el
      );
      // Second pass: if bounds changed on a parent that has a linked frame, sync the frame bounds
      if (action.payload.changes.bounds) {
        const updatedParent = updatedElements.find(el => el.id === action.payload.id);
        if (updatedParent?.frameElementId) {
          const frameEl = updatedElements.find(el => el.id === updatedParent.frameElementId);
          if (frameEl?.engraveFrame && frameEl.engraveFrame.linked !== false) {
            const pad = frameEl.engraveFrame.padding;
            const nb = action.payload.changes.bounds;
            updatedElements = updatedElements.map(el =>
              el.id === updatedParent.frameElementId
                ? { ...el, bounds: { x: nb.x - pad, y: nb.y - pad, width: nb.width + pad * 2, height: nb.height + pad * 2 } }
                : el
            );
          }
        }
      }
      return {
        ...state,
        watchFaceConfig: { ...state.watchFaceConfig, elements: updatedElements },
        undoStack: newUndoStack,
        redoStack: [],
      };
    }
    case 'UPDATE_ELEMENTS_BATCH': {
      if (!state.watchFaceConfig) return state;
      const newUndoStack2 = [...state.undoStack, structuredClone(state.watchFaceConfig.elements)].slice(-30);
      const changeMap = new Map(action.payload.map(p => [p.id, p.changes]));
      const batchUpdated = state.watchFaceConfig.elements.map(el => {
        const changes = changeMap.get(el.id);
        return changes ? bumpElementVersion({ ...el, ...changes }) : el;
      });
      return {
        ...state,
        watchFaceConfig: { ...state.watchFaceConfig, elements: batchUpdated },
        undoStack: newUndoStack2,
        redoStack: [],
      };
    }
    case 'UNDO': {
      if (state.undoStack.length === 0 || !state.watchFaceConfig) return state;
      const previousElements = state.undoStack[state.undoStack.length - 1];
      const currentForRedo = structuredClone(state.watchFaceConfig.elements);
      return {
        ...state,
        watchFaceConfig: { ...state.watchFaceConfig, elements: ensureElementsVersioned(previousElements) },
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, currentForRedo].slice(-30),
      };
    }
    case 'REDO': {
      if (state.redoStack.length === 0 || !state.watchFaceConfig) return state;
      const nextElements = state.redoStack[state.redoStack.length - 1];
      const currentForUndo = structuredClone(state.watchFaceConfig.elements);
      return {
        ...state,
        watchFaceConfig: { ...state.watchFaceConfig, elements: ensureElementsVersioned(nextElements) },
        undoStack: [...state.undoStack, currentForUndo].slice(-30),
        redoStack: state.redoStack.slice(0, -1),
      };
    }
    case 'RESET':
      return {
        ...initialState,
        githubToken: state.githubToken,
        githubRepo: state.githubRepo,
      };
    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Action helpers
export const actions = {
  setStep: (step: AppStep) => ({ type: 'SET_STEP' as const, payload: step }),
  setBackgroundImage: (image: string | null) => ({ type: 'SET_BACKGROUND_IMAGE' as const, payload: image }),
  setBackgroundFile: (file: File | null) => ({ type: 'SET_BACKGROUND_FILE' as const, payload: file }),
  setFullDesignImage: (image: string | null) => ({ type: 'SET_FULL_DESIGN_IMAGE' as const, payload: image }),
  setFullDesignFile: (file: File | null) => ({ type: 'SET_FULL_DESIGN_FILE' as const, payload: file }),
  setWatchFaceConfig: (config: WatchFaceConfig | null) => ({ type: 'SET_WATCH_FACE_CONFIG' as const, payload: config }),
  setElementImages: (images: ElementImage[]) => ({ type: 'SET_ELEMENT_IMAGES' as const, payload: images }),
  setGeneratedCode: (code: GeneratedCode | null) => ({ type: 'SET_GENERATED_CODE' as const, payload: code }),
  setZpkBlob: (blob: Blob | null) => ({ type: 'SET_ZPK_BLOB' as const, payload: blob }),
  setGithubUrl: (url: string | null) => ({ type: 'SET_GITHUB_URL' as const, payload: url }),
  setQrCode: (dataUrl: string | null) => ({ type: 'SET_QR_CODE' as const, payload: dataUrl }),
  setLoading: (loading: boolean) => ({ type: 'SET_LOADING' as const, payload: loading }),
  setLoadingMessage: (message: string) => ({ type: 'SET_LOADING_MESSAGE' as const, payload: message }),
  setError: (error: string | null) => ({ type: 'SET_ERROR' as const, payload: error }),
  setGithubToken: (token: string) => ({ type: 'SET_GITHUB_TOKEN' as const, payload: token }),
  setGithubRepo: (repo: string) => ({ type: 'SET_GITHUB_REPO' as const, payload: repo }),
  updateElement: (id: string, changes: Partial<WatchFaceElement>) => ({ type: 'UPDATE_ELEMENT' as const, payload: { id, changes } }),
  updateElementsBatch: (updates: Array<{ id: string; changes: Partial<WatchFaceElement> }>) => ({ type: 'UPDATE_ELEMENTS_BATCH' as const, payload: updates }),
  addElement: (element: WatchFaceElement) => ({ type: 'ADD_ELEMENT' as const, payload: element }),
  deleteElement: (id: string) => ({ type: 'DELETE_ELEMENT' as const, payload: id }),
  undo: () => ({ type: 'UNDO' as const }),
  redo: () => ({ type: 'REDO' as const }),
  reset: () => ({ type: 'RESET' as const }),
};
