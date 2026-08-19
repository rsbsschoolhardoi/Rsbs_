/**
 * TemplateStudio V3 – production-ready orchestrator
 * Professional zoom, draft persistence, session restoration, route guards,
 * collapsible sidebars, and a centered, responsive document workspace.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/db/api';
import type { DocumentTemplate } from '@/types';
import {
  StudioElement, StudioState, PageConfig, PageSize, ElementType,
  PAGE_PRESETS, elementsToLegacy, legacyToElements, makeElement,
} from './types';
import { useStudioHistory, type Snapshot } from './useStudioHistory';
import { ComponentLibrary } from './ComponentLibrary';
import { StudioCanvas, RULER_SIZE, type ContextMenuState } from './StudioCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { LayersPanel } from './LayersPanel';
import { StudioToolbar, SaveStatus } from './StudioToolbar';
import { StudioPreview } from './StudioPreview';
import { ImageCropDialog } from './ImageCropDialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PanelLeft, PanelRight, AlertCircle, X } from 'lucide-react';
import { getPlaceholderByKey } from '@/constants/placeholders';

/* ─── helpers ──────────────────────────────────────────────────────────────── */
function deepClone<T>(obj: T): T { return JSON.parse(JSON.stringify(obj)); }

function buildPageFromTemplate(template: DocumentTemplate): PageConfig {
  const savedSize = (template.layout_config.page_size as PageSize | undefined) ?? 'A4';
  const savedOrientation = template.layout_config.orientation ?? 'portrait';
  const preset = PAGE_PRESETS[savedSize] ?? PAGE_PRESETS.A4;
  let width = template.layout_config.page_width ?? preset.w;
  let height = template.layout_config.page_height ?? preset.h;
  if (savedOrientation === 'landscape') {
    width = template.layout_config.page_width ?? preset.h;
    height = template.layout_config.page_height ?? preset.w;
  }
  return { size: savedSize, orientation: savedOrientation, width, height };
}

function buildInitialState(template: DocumentTemplate | null): StudioState {
  const page: PageConfig = {
    size: 'A4', orientation: 'portrait',
    width: PAGE_PRESETS['A4'].w, height: PAGE_PRESETS['A4'].h,
  };
  if (!template) {
    return {
      name: 'Untitled Template', type: 'Certificate', page,
      elements: [],
      headerEnabled: true, bodyEnabled: true, footerEnabled: true,
      showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    };
  }
  const tplPage = buildPageFromTemplate(template);
  const elements = [
    ...legacyToElements(template.content_config.header, 'header'),
    ...legacyToElements(template.content_config.body,   'body'),
    ...legacyToElements(template.content_config.footer, 'footer'),
  ];
  if (!elements.some(e => e.type === 'background')) {
    elements.push(makeElement('background', 'body', {
      x: 0, y: 0, width: tplPage.width, height: tplPage.height,
      backgroundColor: '#ffffff', locked: true, zIndex: -1,
    }, 0));
  }
  return {
    name: template.name, type: template.type, page: tplPage,
    elements,
    headerEnabled: template.layout_config.header_enabled,
    bodyEnabled:   template.layout_config.body_enabled,
    footerEnabled: template.layout_config.footer_enabled,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
  };
}

function stateToTemplateData(state: StudioState) {
  return {
    name: state.name, type: state.type,
    layout_config: {
      header_enabled: state.headerEnabled,
      body_enabled:   state.bodyEnabled,
      footer_enabled: state.footerEnabled,
      page_size:      state.page.size,
      orientation:    state.page.orientation,
      page_width:     state.page.width,
      page_height:    state.page.height,
    },
    content_config: {
      header: elementsToLegacy(state.elements, 'header'),
      body:   elementsToLegacy(state.elements, 'body'),
      footer: elementsToLegacy(state.elements, 'footer'),
    },
  };
}

const STORAGE_KEY = 'rsbs-template-studio-session';

interface PersistedSession {
  templateId: string | null;
  state: StudioState;
  past: Snapshot[];
  future: Snapshot[];
  selectedIds: string[];
  editingId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  showLayers: boolean;
  showLeftPanel: boolean;
  showRightPanel: boolean;
  activeTool: 'select' | 'pan';
  timestamp: number;
}

function loadPersistedSession(expectedId: string | null): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (parsed.templateId !== expectedId) return null;
    if (Date.now() - (parsed.timestamp || 0) > 7 * 24 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

/* ─── props ─────────────────────────────────────────────────────────────────── */
interface TemplateStudioProps {
  template: DocumentTemplate | null;
  onBack: () => void;
  onSaved: () => void;
  /** Optional preset state injected when creating from a gallery template */
  presetState?: import('./types').StudioState;
}

/* ─── component ─────────────────────────────────────────────────────────────── */
export const TemplateStudio: React.FC<TemplateStudioProps> = ({ template, onBack, onSaved, presetState }) => {
  const templateId = template?.id ?? null;
  const location = useLocation();
  const navigate = useNavigate();
  const restored = useRef(loadPersistedSession(templateId));

  const [initialSession] = useState(() => ({
    state: restored.current?.state ?? presetState ?? buildInitialState(template),
    past: restored.current?.past ?? [],
    future: restored.current?.future ?? [],
  }));

  const { state, commit, silentSet, undo, redo, canUndo, canRedo, past, future } =
    useStudioHistory(initialSession);

  /* UI state */
  const [selectedIds,     setSelectedIds]     = useState<string[]>(() => restored.current?.selectedIds ?? []);
  const [editingId,       setEditingId]       = useState<string | null>(() => restored.current?.editingId ?? null);
  const [zoom,            setZoom]            = useState<number>(() => restored.current?.zoom ?? 100);
  const [panX,            setPanX]            = useState<number>(() => restored.current?.panX ?? 40);
  const [panY,            setPanY]            = useState<number>(() => restored.current?.panY ?? 40);
  const [saveStatus,      setSaveStatus]      = useState<SaveStatus>('idle');
  const [showLayers,      setShowLayers]      = useState<boolean>(() => restored.current?.showLayers ?? false);
  const [showLeftPanel,   setShowLeftPanel]   = useState<boolean>(() => restored.current?.showLeftPanel ?? true);
  const [showRightPanel,  setShowRightPanel]  = useState<boolean>(() => restored.current?.showRightPanel ?? true);
  const [previewOpen,     setPreviewOpen]     = useState(false);
  const [contextMenu,     setContextMenu]     = useState<ContextMenuState | null>(null);
  const [activeTool,      setActiveTool]      = useState<'select' | 'pan'>(() => restored.current?.activeTool ?? 'select');
  const [workspaceSize,   setWorkspaceSize]   = useState({ width: 0, height: 0 });
  const [leaveDialog,     setLeaveDialog]     = useState<{ open: boolean }>({ open: false });
  const [isDirty,         setIsDirty]         = useState(false);
  const [conflictDialog,  setConflictDialog]  = useState<{
    open: boolean;
    existingId: string;
    name: string;
    renameValue: string;
  }>({ open: false, existingId: '', name: '', renameValue: '' });
  const [cropDialog, setCropDialog] = useState<{ open: boolean; imageUrl: string }>({
    open: false,
    imageUrl: '',
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const workspaceSizeRef = useRef({ width: 0, height: 0 });
  const zoomRef = useRef(zoom);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  const pageRef = useRef(state.page);
  const prevPageRef = useRef({ width: state.page.width, height: state.page.height });
  const isDirtyRef = useRef(isDirty);
  const lastSavedState = useRef<StudioState>(deepClone(initialSession.state));
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBackRef = useRef<(() => void) | null>(null);
  const hasFittedRef = useRef(false);
  const pageChangeEffectFirst = useRef(true);

  const ZOOM_MIN = 10;
  const ZOOM_MAX = 500;
  const FIT_PAD = 24;

  const sessionRef = useRef<PersistedSession>({
    templateId,
    state: initialSession.state,
    past: initialSession.past,
    future: initialSession.future,
    selectedIds: restored.current?.selectedIds ?? [],
    editingId: restored.current?.editingId ?? null,
    zoom: restored.current?.zoom ?? 100,
    panX: restored.current?.panX ?? 40,
    panY: restored.current?.panY ?? 40,
    showLayers: restored.current?.showLayers ?? false,
    showLeftPanel: restored.current?.showLeftPanel ?? true,
    showRightPanel: restored.current?.showRightPanel ?? true,
    activeTool: restored.current?.activeTool ?? 'select',
    timestamp: Date.now(),
  });

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panXRef.current = panX; }, [panX]);
  useEffect(() => { panYRef.current = panY; }, [panY]);
  useEffect(() => { pageRef.current = state.page; }, [state.page]);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);
  useEffect(() => { workspaceSizeRef.current = workspaceSize; }, [workspaceSize]);

  /* Dirty detection: compare current state to last officially saved/loaded state */
  useEffect(() => {
    const changed = JSON.stringify(state) !== JSON.stringify(lastSavedState.current);
    setIsDirty(changed);
  }, [state]);

  /* derived */
  const selectedElement = useMemo(
    () => selectedIds.length === 1 ? (state.elements.find(e => e.id === selectedIds[0]) ?? null) : null,
    [state.elements, selectedIds],
  );
  const hasMultiSelect = selectedIds.length > 1;

  /* ═══════════════════════════════════════════════════════════════════════════════
     Zoom & Pan helpers
     ═══════════════════════════════════════════════════════════════════════════════ */
  const clampZoom = useCallback((z: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(z))), []);

  const clampPanX = useCallback((value: number) => {
    const s = zoomRef.current / 100;
    const availW = Math.max(0, workspaceSizeRef.current.width - RULER_SIZE);
    const docW = pageRef.current.width * s;
    const pad = 20;
    if (docW <= availW) return (availW - docW) / 2;
    return Math.min(pad, Math.max(availW - docW - pad, value));
  }, []);

  const clampPanY = useCallback((value: number) => {
    const s = zoomRef.current / 100;
    const availH = Math.max(0, workspaceSizeRef.current.height - RULER_SIZE);
    const docH = pageRef.current.height * s;
    const pad = 20;
    if (docH <= availH) return (availH - docH) / 2;
    return Math.min(pad, Math.max(availH - docH - pad, value));
  }, []);

  const centerCanvas = useCallback((z: number) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    workspaceSizeRef.current = { width: r.width, height: r.height };
    const availW = Math.max(0, r.width - RULER_SIZE);
    const availH = Math.max(0, r.height - RULER_SIZE);
    const s = z / 100;
    setPanX(clampPanX((availW - pageRef.current.width * s) / 2));
    setPanY(clampPanY((availH - pageRef.current.height * s) / 2));
  }, [clampPanX, clampPanY]);

  const fitPage = useCallback(() => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    workspaceSizeRef.current = { width: r.width, height: r.height };
    const availW = Math.max(1, r.width - RULER_SIZE - FIT_PAD * 2);
    const availH = Math.max(1, r.height - RULER_SIZE - FIT_PAD * 2);
    const z = Math.min(100, clampZoom(Math.min(
      (100 * availW) / pageRef.current.width,
      (100 * availH) / pageRef.current.height,
    )));
    zoomRef.current = z;
    setZoom(z);
    setPanX(clampPanX((r.width - RULER_SIZE - pageRef.current.width * (z / 100)) / 2));
    setPanY(clampPanY((r.height - RULER_SIZE - pageRef.current.height * (z / 100)) / 2));
  }, [clampPanX, clampPanY, clampZoom]);

  const fitWidth = useCallback(() => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    workspaceSizeRef.current = { width: r.width, height: r.height };
    const availW = Math.max(1, r.width - RULER_SIZE - FIT_PAD * 2);
    const z = Math.min(100, clampZoom((100 * availW) / pageRef.current.width));
    zoomRef.current = z;
    setZoom(z);
    setPanX(clampPanX(FIT_PAD));
    setPanY(clampPanY((Math.max(0, r.height - RULER_SIZE) - pageRef.current.height * (z / 100)) / 2));
  }, [clampPanX, clampPanY, clampZoom]);

  const zoomTo = useCallback((nextZoom: number, focalX?: number, focalY?: number) => {
    const z = clampZoom(nextZoom);
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) {
      zoomRef.current = z;
      setZoom(z);
      centerCanvas(z);
      return;
    }
    workspaceSizeRef.current = { width: r.width, height: r.height };
    const fx = focalX ?? (r.left + r.width / 2);
    const fy = focalY ?? (r.top + r.height / 2);
    const s = zoomRef.current / 100;
    const canvasX = (fx - r.left - RULER_SIZE - panXRef.current) / s;
    const canvasY = (fy - r.top - RULER_SIZE - panYRef.current) / s;
    const newS = z / 100;
    const newPanX = fx - r.left - RULER_SIZE - canvasX * newS;
    const newPanY = fy - r.top - RULER_SIZE - canvasY * newS;
    zoomRef.current = z;
    setZoom(z);
    setPanX(clampPanX(newPanX));
    setPanY(clampPanY(newPanY));
  }, [clampPanX, clampPanY, clampZoom, centerCanvas]);

  const handleZoom = useCallback((val: number | 'fit' | 'width' | 'actual') => {
    if (val === 'fit') { fitPage(); return; }
    if (val === 'width') { fitWidth(); return; }
    if (val === 'actual') { zoomTo(100); return; }
    zoomTo(val);
  }, [fitPage, fitWidth, zoomTo]);

  const handleZoomWheel = useCallback((nextZoom: number, cx: number, cy: number) => {
    zoomTo(nextZoom, cx, cy);
  }, [zoomTo]);

  const handlePan = useCallback((dx: number, dy: number) => {
    setPanX(p => clampPanX(p + dx));
    setPanY(p => clampPanY(p + dy));
  }, [clampPanX, clampPanY]);

  /* ─── element helpers ────────────────────────────────────────────────────── */
  const nudge = (dx: number, dy: number) => {
    commit(s => ({
      ...s,
      elements: s.elements.map(el =>
        selectedIds.includes(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el,
      ),
    }));
  };

  const handleAddElement = useCallback((type: ElementType) => {
    const el = makeElement(type, 'body', { x: 40 + Math.random()*60, y: 60 + Math.random()*60 }, state.elements.length);
    commit(s => ({ ...s, elements: [...s.elements, el] }));
    setSelectedIds([el.id]);
  }, [state.elements.length, commit]);

  const handleAddPlaceholder = useCallback((key: string) => {
    const meta = getPlaceholderByKey(key);
    const el = makeElement('placeholder', 'body', {
      placeholder: key, label: meta?.label || key,
      x: 40 + Math.random()*60, y: 60 + Math.random()*60, color: '#1a56db',
    }, state.elements.length);
    commit(s => ({ ...s, elements: [...s.elements, el] }));
    setSelectedIds([el.id]);
  }, [state.elements.length, commit]);

  const handleDropElement = useCallback((type: string, placeholder: string | null, x: number, y: number) => {
    const el = makeElement(type as ElementType, 'body', {
      x, y,
      ...(placeholder ? { placeholder, label: getPlaceholderByKey(placeholder)?.label || placeholder, color: '#1a56db' } : {}),
    }, state.elements.length);
    commit(s => ({ ...s, elements: [...s.elements, el] }));
    setSelectedIds([el.id]);
  }, [state.elements.length, commit]);

  const handleUpdateElement = useCallback((id: string, patch: Partial<StudioElement>) => {
    commit(s => ({ ...s, elements: s.elements.map(el => el.id === id ? { ...el, ...patch } : el) }));
  }, [commit]);

  const handleBackgroundImageChange = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setCropDialog({ open: true, imageUrl: url });
  }, []);

  const handleCropConfirm = useCallback((croppedImageUrl: string) => {
    if (cropDialog.imageUrl) URL.revokeObjectURL(cropDialog.imageUrl);
    const bg = state.elements.find(el => el.type === 'background');
    if (bg) {
      handleUpdateElement(bg.id, { imageUrl: croppedImageUrl });
    } else {
      // If no background element exists, add one sized to the page
      commit(s => ({
        ...s,
        elements: [...s.elements, {
          ...makeElement('background', 'body', {
            x: 0,
            y: 0,
            width: s.page.width,
            height: s.page.height,
            backgroundColor: 'transparent',
            imageUrl: croppedImageUrl,
            locked: true,
            zIndex: 0,
          }, s.elements.length),
        }],
      }));
    }
    setCropDialog({ open: false, imageUrl: '' });
  }, [cropDialog.imageUrl, state.elements, handleUpdateElement, commit]);

  const handleCropCancel = useCallback(() => {
    if (cropDialog.imageUrl) URL.revokeObjectURL(cropDialog.imageUrl);
    setCropDialog({ open: false, imageUrl: '' });
  }, [cropDialog.imageUrl]);

  /* canvas silentSet (no history during drag, commit on mouseup) */
  const handleMoveElements = useCallback((moves: { id: string; x: number; y: number }[]) => {
    silentSet(s => ({
      ...s,
      elements: s.elements.map(el => {
        const m = moves.find(mv => mv.id === el.id);
        return m ? { ...el, x: m.x, y: m.y } : el;
      }),
    }));
  }, [silentSet]);

  const handleResizeElement = useCallback((id: string, w: number, h: number, x: number, y: number) => {
    silentSet(s => ({ ...s, elements: s.elements.map(el => el.id === id ? { ...el, width: w, height: h, x, y } : el) }));
  }, [silentSet]);

  const handleRotateElement = useCallback((id: string, rotation: number) => {
    silentSet(s => ({ ...s, elements: s.elements.map(el => el.id === id ? { ...el, rotation } : el) }));
  }, [silentSet]);

  const handleCommit = useCallback(() => { commit(s => s); }, [commit]);

  const clipboard = useRef<StudioElement | null>(null);

  /* copy / paste / duplicate / delete */
  const doCopy = useCallback(() => {
    if (!selectedElement) return;
    clipboard.current = { ...selectedElement };
  }, [selectedElement]);

  const doPaste = useCallback(() => {
    if (!clipboard.current) return;
    const el: StudioElement = { ...clipboard.current, id: Math.random().toString(36).slice(2), x: clipboard.current.x + 20, y: clipboard.current.y + 20, zIndex: state.elements.length };
    commit(s => ({ ...s, elements: [...s.elements, el] }));
    setSelectedIds([el.id]);
  }, [state.elements.length, commit]);

  const doDuplicate = useCallback(() => {
    if (selectedIds.length === 0) return;
    const toDup = state.elements.filter(el => selectedIds.includes(el.id));
    const copies = toDup.map((el, i) => ({ ...el, id: Math.random().toString(36).slice(2), x: el.x + 20, y: el.y + 20, zIndex: state.elements.length + i }));
    commit(s => ({ ...s, elements: [...s.elements, ...copies] }));
    setSelectedIds(copies.map(c => c.id));
  }, [selectedIds, state.elements, commit]);

  const doDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    commit(s => ({ ...s, elements: s.elements.filter(el => !selectedIds.includes(el.id)) }));
    setSelectedIds([]);
  }, [selectedIds, commit]);

  /* z-order */
  const handleBringForward = useCallback(() => {
    commit(s => ({ ...s, elements: s.elements.map(el => selectedIds.includes(el.id) ? { ...el, zIndex: el.zIndex + 1 } : el) }));
  }, [selectedIds, commit]);

  const handleSendBackward = useCallback(() => {
    commit(s => ({ ...s, elements: s.elements.map(el => selectedIds.includes(el.id) ? { ...el, zIndex: Math.max(0, el.zIndex - 1) } : el) }));
  }, [selectedIds, commit]);

  /* group */
  const doGroup = useCallback(() => {
    if (selectedIds.length < 2) return;
    const groupId = Math.random().toString(36).slice(2);
    commit(s => ({ ...s, elements: s.elements.map(el => selectedIds.includes(el.id) ? { ...el, groupId } : el) }));
  }, [selectedIds, commit]);

  const doUngroup = useCallback(() => {
    if (selectedIds.length === 0) return;
    commit(s => ({ ...s, elements: s.elements.map(el => selectedIds.includes(el.id) ? { ...el, groupId: undefined } : el) }));
  }, [selectedIds, commit]);

  /* alignment & distribute */
  const handleAlign = useCallback((alignment: string) => {
    if (selectedIds.length === 0) return;
    const { width: cw, height: ch } = state.page;

    if (alignment === 'distH' && selectedIds.length > 1) {
      const sorted = [...state.elements].filter(el => selectedIds.includes(el.id)).sort((a, b) => a.x - b.x);
      const minX = sorted[0].x;
      const maxX = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width;
      const totalW = sorted.reduce((s, el) => s + el.width, 0);
      const gap = (maxX - minX - totalW) / Math.max(1, sorted.length - 1);
      let cx = minX;
      const posMap: Record<string, number> = {};
      sorted.forEach(el => { posMap[el.id] = cx; cx += el.width + gap; });
      commit(s => ({ ...s, elements: s.elements.map(el => selectedIds.includes(el.id) ? { ...el, x: posMap[el.id] ?? el.x } : el) }));
      return;
    }
    if (alignment === 'distV' && selectedIds.length > 1) {
      const sorted = [...state.elements].filter(el => selectedIds.includes(el.id)).sort((a, b) => a.y - b.y);
      const minY = sorted[0].y;
      const maxY = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height;
      const totalH = sorted.reduce((s, el) => s + el.height, 0);
      const gap = (maxY - minY - totalH) / Math.max(1, sorted.length - 1);
      let cy = minY;
      const posMap: Record<string, number> = {};
      sorted.forEach(el => { posMap[el.id] = cy; cy += el.height + gap; });
      commit(s => ({ ...s, elements: s.elements.map(el => selectedIds.includes(el.id) ? { ...el, y: posMap[el.id] ?? el.y } : el) }));
      return;
    }

    commit(s => ({
      ...s,
      elements: s.elements.map(el => {
        if (!selectedIds.includes(el.id)) return el;
        switch (alignment) {
          case 'left':    return { ...el, x: 0 };
          case 'centerH': return { ...el, x: (cw - el.width)  / 2 };
          case 'right':   return { ...el, x: cw - el.width };
          case 'top':     return { ...el, y: 0 };
          case 'centerV': return { ...el, y: (ch - el.height) / 2 };
          case 'bottom':  return { ...el, y: ch - el.height };
          default:        return el;
        }
      }),
    }));
  }, [selectedIds, state, commit]);

  /* layers reorder */
  const handleReorder = useCallback((fromIdx: number, toIdx: number) => {
    commit(s => {
      const els = [...s.elements];
      const [moved] = els.splice(fromIdx, 1);
      els.splice(toIdx, 0, moved);
      return { ...s, elements: els.map((el, i) => ({ ...el, zIndex: i })) };
    });
  }, [commit]);

  const handleUpdateState = useCallback((patch: Partial<StudioState>) => {
    commit(s => ({ ...s, ...patch }));
  }, [commit]);

  /* save — handles update, create, and duplicate-name conflict gracefully */
  const doSave = useCallback(async () => {
    setSaveStatus('saving');
    const data = stateToTemplateData(state);

    // ── Editing an existing template → always update by id, no name conflict ──
    if (template) {
      const { error } = await api.updateDocumentTemplate(template.id, data);
      if (error) {
        setSaveStatus('idle');
        toast.error('Failed to save: ' + (error as Error).message);
      } else {
        lastSavedState.current = deepClone(state);
        setIsDirty(false);
        clearDraft();
        setSaveStatus('saved');
        toast.success('Template saved');
        onSaved();
      }
      return;
    }

    // ── Creating a new template → check for name collision first ──
    const { exists, data: existing } = await api.checkDocumentTemplateName(data.name);
    if (exists && existing?.[0]) {
      setSaveStatus('idle');
      // Show conflict resolution dialog instead of crashing
      setConflictDialog({
        open: true,
        existingId: existing[0].id,
        name: data.name,
        renameValue: `${data.name} (Copy)`,
      });
      return;
    }

    const { error } = await api.createDocumentTemplate(data);
    if (error) {
      setSaveStatus('idle');
      toast.error('Failed to save: ' + (error as Error).message);
    } else {
      lastSavedState.current = deepClone(state);
      setIsDirty(false);
      clearDraft();
      setSaveStatus('saved');
      toast.success('Template saved');
      onSaved();
    }
  }, [state, template, onSaved]);

  /** Conflict dialog: overwrite the existing template */
  const handleConflictOverwrite = useCallback(async () => {
    const data = stateToTemplateData(state);
    const { error } = await api.updateDocumentTemplate(conflictDialog.existingId, data);
    setConflictDialog(d => ({ ...d, open: false }));
    if (error) {
      toast.error('Failed to overwrite: ' + (error as Error).message);
    } else {
      lastSavedState.current = deepClone(state);
      setIsDirty(false);
      clearDraft();
      setSaveStatus('saved');
      toast.success('Existing template updated');
      onSaved();
    }
  }, [state, conflictDialog.existingId, onSaved]);

  /** Conflict dialog: save as a new copy with the rename value */
  const handleConflictSaveAsCopy = useCallback(async () => {
    const data = stateToTemplateData(state);
    const newName = conflictDialog.renameValue.trim() || `${conflictDialog.name} (Copy)`;
    setConflictDialog(d => ({ ...d, open: false }));
    // Verify the new name is also free
    const { exists } = await api.checkDocumentTemplateName(newName);
    if (exists) {
      toast.error(`A template named "${newName}" also exists. Please choose a different name.`);
      setConflictDialog(d => ({ ...d, open: true }));
      return;
    }
    const { error } = await api.createDocumentTemplate({ ...data, name: newName });
    if (error) {
      toast.error('Failed to save copy: ' + (error as Error).message);
    } else {
      lastSavedState.current = deepClone(state);
      setIsDirty(false);
      clearDraft();
      setSaveStatus('saved');
      toast.success(`Saved as "${newName}"`);
      onSaved();
    }
  }, [state, conflictDialog, onSaved]);

  /* context menu actions */
  const execContextAction = (action: string, elId: string | null) => {
    setContextMenu(null);
    if (action === 'paste') { doPaste(); return; }
    if (!elId) return;
    setSelectedIds([elId]);
    switch (action) {
      case 'duplicate': {
        const el = state.elements.find(e => e.id === elId);
        if (!el) return;
        const copy = { ...el, id: Math.random().toString(36).slice(2), x: el.x + 20, y: el.y + 20, zIndex: state.elements.length };
        commit(s => ({ ...s, elements: [...s.elements, copy] }));
        setSelectedIds([copy.id]);
        break;
      }
      case 'delete':
        commit(s => ({ ...s, elements: s.elements.filter(e => e.id !== elId) }));
        setSelectedIds([]);
        break;
      case 'bringForward':
        commit(s => ({ ...s, elements: s.elements.map(el => el.id === elId ? { ...el, zIndex: el.zIndex + 1 } : el) }));
        break;
      case 'sendBackward':
        commit(s => ({ ...s, elements: s.elements.map(el => el.id === elId ? { ...el, zIndex: Math.max(0, el.zIndex - 1) } : el) }));
        break;
      case 'copy': {
        const el = state.elements.find(e => e.id === elId);
        if (el) clipboard.current = { ...el };
        break;
      }
      case 'lock':
        commit(s => ({ ...s, elements: s.elements.map(el => el.id === elId ? { ...el, locked: !el.locked } : el) }));
        break;
      case 'hide':
        commit(s => ({ ...s, elements: s.elements.map(el => el.id === elId ? { ...el, hidden: !el.hidden } : el) }));
        break;
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════════════
     Draft persistence, route guards, and auto-save
     ═══════════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    sessionRef.current = {
      templateId,
      state,
      past: past.current,
      future: future.current,
      selectedIds,
      editingId,
      zoom,
      panX,
      panY,
      showLayers,
      showLeftPanel,
      showRightPanel,
      activeTool,
      timestamp: Date.now(),
    };
  });

  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionRef.current));
    } catch {
      // storage may be full; ignore silently
    }
  }, []);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  /* Auto-save draft after a short pause in edits */
  useEffect(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      if (isDirtyRef.current) saveDraft();
    }, 2000);
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current); };
  }, [state, selectedIds, editingId, zoom, panX, panY, showLayers, showLeftPanel, showRightPanel, activeTool, saveDraft]);

  /* Save draft immediately when the tab is hidden so it can be restored */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && isDirtyRef.current) saveDraft();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [saveDraft]);

  /* Browser back/forward guard (non-data router) */
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      // Restore the current URL so the user stays on the editor
      window.history.pushState(null, '', location.pathname + location.search + location.hash);
      pendingBackRef.current = () => navigate(-1);
      setLeaveDialog({ open: true });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [location, navigate]);

  /* Intercept internal <a> link navigations while editing */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!isDirtyRef.current) return;
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      // Skip external links, anchors, mailto/tel, downloads
      if (anchor.getAttribute('target') === '_blank') return;
      if (anchor.getAttribute('download')) return;
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
      if (href.startsWith('http') && !href.startsWith(window.location.origin)) return;
      e.preventDefault();
      pendingBackRef.current = () => navigate(href);
      setLeaveDialog({ open: true });
    };
    window.addEventListener('click', onClick, true);
    return () => window.removeEventListener('click', onClick, true);
  }, [navigate]);

  const handleBack = useCallback(() => {
    if (isDirtyRef.current) {
      pendingBackRef.current = onBack;
      setLeaveDialog({ open: true });
    } else {
      clearDraft();
      onBack();
    }
  }, [onBack, clearDraft]);

  const handleLeave = useCallback(() => {
    setLeaveDialog({ open: false });
    pendingBackRef.current?.();
    pendingBackRef.current = null;
    clearDraft();
  }, [clearDraft]);

  const handleStay = useCallback(() => {
    setLeaveDialog({ open: false });
    pendingBackRef.current = null;
  }, []);

  /* ═══════════════════════════════════════════════════════════════════════════════
     Workspace resize / centering
     ═══════════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const cr = entries[0].contentRect;
      const size = { width: cr.width, height: cr.height };
      workspaceSizeRef.current = size;
      setWorkspaceSize(size);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Initial fit-to-page for brand-new sessions */
  useEffect(() => {
    if (workspaceSize.width > 0 && !hasFittedRef.current) {
      hasFittedRef.current = true;
      fitPage();
    }
  }, [workspaceSize, fitPage]);

  /* When the page size changes, scale existing content to the new page and re-fit.
     This keeps the selected page as the single source of truth and avoids creating
     a second canvas/background behind the document. */
  useEffect(() => {
    if (pageChangeEffectFirst.current) {
      pageChangeEffectFirst.current = false;
      prevPageRef.current = { width: state.page.width, height: state.page.height };
      return;
    }
    const old = prevPageRef.current;
    const next = state.page;
    if (old.width === next.width && old.height === next.height) {
      prevPageRef.current = { width: next.width, height: next.height };
      return;
    }

    const scaleX = old.width ? next.width / old.width : 1;
    const scaleY = old.height ? next.height / old.height : 1;
    const scale  = Math.min(scaleX, scaleY);

    commit(s => {
      const updated = s.elements.map(el => {
        if (el.type === 'background') {
          return { ...el, x: 0, y: 0, width: next.width, height: next.height };
        }
        const copy = { ...el };
        copy.x = Math.round(el.x * scaleX);
        copy.y = Math.round(el.y * scaleY);
        copy.width = Math.round(el.width * scaleX);
        copy.height = Math.round(el.height * scaleY);
        if (el.type === 'text' || el.type === 'placeholder') {
          copy.fontSize = Math.max(6, Math.round((el.fontSize ?? 14) * scale));
          copy.letterSpacing = typeof el.letterSpacing === 'number' ? el.letterSpacing * scale : el.letterSpacing;
        }
        copy.padding = typeof el.padding === 'number' ? Math.round(el.padding * scale) : el.padding;
        copy.borderWidth = (el.borderWidth ?? 0) * scale;
        copy.borderRadius = (el.borderRadius ?? 0) * scale;
        copy.shadowBlur = (el.shadowBlur ?? 0) * scale;
        copy.shadowX = (el.shadowX ?? 0) * scale;
        copy.shadowY = (el.shadowY ?? 0) * scale;
        return copy;
      });
      return { ...s, elements: updated };
    });

    prevPageRef.current = { width: next.width, height: next.height };
    if (workspaceSizeRef.current.width > 0) {
      hasFittedRef.current = true;
      fitPage();
    }
  }, [state.page.width, state.page.height, commit, fitPage]);

  /* Keep pan within the available workspace whenever its size changes */
  useEffect(() => {
    if (workspaceSize.width > 0) {
      setPanX(p => clampPanX(p));
      setPanY(p => clampPanY(p));
    }
  }, [workspaceSize, clampPanX, clampPanY]);

  /* ── close context menu on outside click ── */
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [contextMenu]);

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z')                     { e.preventDefault(); undo(); return; }
      if (ctrl && (e.key === 'y' || e.key === 'Z'))  { e.preventDefault(); redo(); return; }
      if (ctrl && e.key === 'c')                     { e.preventDefault(); doCopy(); return; }
      if (ctrl && e.key === 'v')                     { e.preventDefault(); doPaste(); return; }
      if (ctrl && e.key === 'd')                     { e.preventDefault(); e.stopPropagation(); doDuplicate(); return; }
      if (ctrl && e.key === 'a')                     { e.preventDefault(); setSelectedIds(state.elements.filter(el => !el.hidden && !el.locked).map(el => el.id)); return; }
      if (ctrl && e.key === 'g')                     { e.preventDefault(); doGroup(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); doDelete(); return; }
      if (e.key === 'Escape')                        { setSelectedIds([]); setEditingId(null); return; }

      if (selectedIds.length === 0) return;
      const STEP = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); nudge(-STEP, 0); }
      if (e.key === 'ArrowRight') { e.preventDefault(); nudge(STEP,  0); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); nudge(0, -STEP); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); nudge(0,  STEP); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, state.elements]);

  /* ─── render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">

      {/* Toolbar */}
      <StudioToolbar
        canUndo={canUndo}           canRedo={canRedo}
        onUndo={undo}               onRedo={redo}
        zoom={zoom}                 onZoom={handleZoom}
        selectedElement={selectedElement}
        hasMultiSelect={hasMultiSelect}
        onCopy={doCopy}             onPaste={doPaste}
        onDuplicate={doDuplicate}   onDelete={doDelete}
        onBringForward={handleBringForward}
        onSendBackward={handleSendBackward}
        onAlign={handleAlign}
        onGroup={doGroup}           onUngroup={doUngroup}
        onPreview={() => setPreviewOpen(true)}
        onSave={doSave}
        onBack={handleBack}
        onToggleLayers={() => setShowLayers(p => !p)}
        onToggleRightPanel={() => setShowRightPanel(p => !p)}
        showRightPanel={showRightPanel}
        saveStatus={saveStatus}
        templateName={state.name}
        hasUnsavedChanges={isDirty}
      />

      {/* Mobile panel toggles */}
      <div className="flex md:hidden items-center gap-2 px-3 py-1.5 border-b border-border/60 bg-card shrink-0">
        <Button variant={showLeftPanel ? 'default' : 'ghost'} size="sm" className="h-7 gap-1 text-xs"
          onClick={() => setShowLeftPanel(p => !p)}>
          <PanelLeft className="w-3.5 h-3.5" />Components
        </Button>
        <Button variant={showRightPanel ? 'default' : 'ghost'} size="sm" className="h-7 gap-1 text-xs"
          onClick={() => setShowRightPanel(p => !p)}>
          <PanelRight className="w-3.5 h-3.5" />Properties
        </Button>
      </div>

      {/* Three-panel body */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">

          {/* LEFT: Components or Layers */}
          {showLeftPanel && (<>
            <ResizablePanel defaultSize={17} minSize={13} maxSize={28}
              className="hidden md:flex flex-col border-r border-border/60 bg-card/50 min-h-0">
              <div className="px-3 py-1.5 border-b border-border/60 shrink-0 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  {showLayers ? 'Layers' : 'Components'}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setShowLayers(p => !p)}
                    className="text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted rounded px-1.5 py-0.5 transition-colors"
                  >
                    {showLayers ? 'Components' : 'Layers'}
                  </button>
                  <button
                    onClick={() => setShowLeftPanel(false)}
                    title="Collapse panel"
                    className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {showLayers ? (
                <LayersPanel
                  elements={state.elements}
                  selectedId={selectedIds[0] ?? null}
                  onSelect={id => setSelectedIds(id ? [id] : [])}
                  onUpdate={handleUpdateElement}
                  onDuplicate={id => {
                    const el = state.elements.find(e => e.id === id);
                    if (!el) return;
                    const copy = { ...el, id: Math.random().toString(36).slice(2), x: el.x + 16, y: el.y + 16, zIndex: state.elements.length };
                    commit(s => ({ ...s, elements: [...s.elements, copy] }));
                    setSelectedIds([copy.id]);
                  }}
                  onDelete={id => {
                    commit(s => ({ ...s, elements: s.elements.filter(e => e.id !== id) }));
                    if (selectedIds.includes(id)) setSelectedIds([]);
                  }}
                  onReorder={handleReorder}
                />
              ) : (
                <ComponentLibrary
                  onAddElement={handleAddElement}
                  onAddPlaceholder={handleAddPlaceholder}
                />
              )}
            </ResizablePanel>
            <ResizableHandle className="hidden md:flex w-px bg-border/40 hover:bg-primary/30 transition-colors" />
          </>)}

          {/* CENTER: Canvas + Status bar */}
          <ResizablePanel defaultSize={66} minSize={40} className="flex flex-col min-h-0">
            <div className="flex-1 min-h-0">
              <StudioCanvas
                ref={canvasRef}
                state={state}
                zoom={zoom}
                panX={panX}
                panY={panY}
                selectedIds={selectedIds}
                editingId={editingId}
                onSelect={setSelectedIds}
                onMoveElements={handleMoveElements}
                onResizeElement={handleResizeElement}
                onRotateElement={handleRotateElement}
                onDropElement={handleDropElement}
                onDoubleClickText={id => { setEditingId(id); setSelectedIds([id]); setShowRightPanel(true); }}
                onPan={handlePan}
                onCommit={handleCommit}
                onContextMenu={ctx => setContextMenu(ctx)}
                onZoom={handleZoomWheel}
              />
            </div>
            {/* Status bar */}
            <div className="shrink-0 h-6 flex items-center px-3 gap-4 border-t border-border/40 bg-card/60 text-[10px] text-muted-foreground font-mono select-none">
              <span>Zoom: {Math.round(zoom)}%</span>
              <span>{state.page.width}×{state.page.height}px</span>
              {selectedElement && (
                <span>X:{Math.round(selectedElement.x)} Y:{Math.round(selectedElement.y)} W:{Math.round(selectedElement.width)} H:{Math.round(selectedElement.height)}</span>
              )}
              {hasMultiSelect && <span>{selectedIds.length} selected</span>}
              {state.elements.length > 0 && <span className="ml-auto">{state.elements.length} objects</span>}
            </div>
          </ResizablePanel>

          {/* RIGHT: Properties */}
          {showRightPanel && (<>
            <ResizableHandle className="hidden md:flex w-px bg-border/40 hover:bg-primary/30 transition-colors" />
            <ResizablePanel defaultSize={17} minSize={13} maxSize={30}
              className="hidden md:flex flex-col border-l border-border/60 bg-card/50 min-h-0">
              <div className="px-3 py-1.5 border-b border-border/60 shrink-0 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  {selectedElement ? 'Properties' : 'Document'}
                </span>
                <button
                  onClick={() => setShowRightPanel(false)}
                  title="Collapse panel"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <PropertiesPanel
                  state={state}
                  selectedElement={selectedElement}
                  onUpdateElement={handleUpdateElement}
                  onUpdateState={handleUpdateState}
                  onBackgroundImageChange={handleBackgroundImageChange}
                />
              </div>
            </ResizablePanel>
          </>)}

        </ResizablePanelGroup>
      </div>

      {/* Mobile backdrops */}
      {showLeftPanel && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setShowLeftPanel(false)}
        />
      )}
      {showRightPanel && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setShowRightPanel(false)}
        />
      )}

      {/* Mobile slide-over: left */}
      {showLeftPanel && (
        <div className="md:hidden fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border shadow-2xl flex flex-col">
          <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold uppercase tracking-widest">Components</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowLeftPanel(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ComponentLibrary
            onAddElement={el => { handleAddElement(el); setShowLeftPanel(false); }}
            onAddPlaceholder={k => { handleAddPlaceholder(k); setShowLeftPanel(false); }}
          />
        </div>
      )}

      {/* Mobile slide-over: right */}
      {showRightPanel && (
        <div className="md:hidden fixed inset-y-0 right-0 z-40 w-64 bg-card border-l border-border shadow-2xl flex flex-col">
          <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold uppercase tracking-widest">Properties</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowRightPanel(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <PropertiesPanel
              state={state}
              selectedElement={selectedElement}
              onUpdateElement={handleUpdateElement}
              onUpdateState={handleUpdateState}
              onBackgroundImageChange={handleBackgroundImageChange}
            />
          </div>
        </div>
      )}

      {/* Background image crop dialog */}
      <ImageCropDialog
        open={cropDialog.open}
        imageUrl={cropDialog.imageUrl}
        aspectRatio={state.page.width / state.page.height}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-card border border-border rounded-xl shadow-2xl py-1 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseDown={e => e.stopPropagation()}
        >
          {([
            { label: 'Duplicate',     action: 'duplicate',    disabled: !contextMenu.elementId },
            { label: 'Copy',          action: 'copy',         disabled: !contextMenu.elementId },
            { label: 'Paste',         action: 'paste',        disabled: false },
            null,
            { label: 'Bring Forward', action: 'bringForward', disabled: !contextMenu.elementId },
            { label: 'Send Backward', action: 'sendBackward', disabled: !contextMenu.elementId },
            null,
            { label: 'Lock / Unlock', action: 'lock',         disabled: !contextMenu.elementId },
            { label: 'Hide / Show',   action: 'hide',         disabled: !contextMenu.elementId },
            null,
            { label: 'Delete',        action: 'delete',       disabled: !contextMenu.elementId, danger: true },
          ] as (null | { label: string; action: string; disabled: boolean; danger?: boolean })[]).map((item, i) =>
            item === null
              ? <div key={i} className="h-px bg-border/60 my-1 mx-2" />
              : (
                <button key={item.action} disabled={item.disabled}
                  onClick={() => execContextAction(item.action, contextMenu.elementId)}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-muted/60 transition-colors disabled:opacity-40 disabled:pointer-events-none${item.danger ? ' text-destructive' : ''}`}
                >
                  {item.label}
                </button>
              ),
          )}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl h-[90dvh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Preview — {state.name}</DialogTitle>
          </DialogHeader>
          <StudioPreview state={state} />
          <div className="flex justify-end mt-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Unsaved-changes leave guard ─────────────────────────────────── */}
      <AlertDialog open={leaveDialog.open} onOpenChange={open => { if (!open) handleStay(); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Leaving this page will discard your edits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStay}>Stay on Page</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Duplicate-name conflict resolution dialog ──────────────────────── */}
      <Dialog
        open={conflictDialog.open}
        onOpenChange={open => setConflictDialog(d => ({ ...d, open }))}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Template Name Already Exists
            </DialogTitle>
            <DialogDescription>
              A template named <strong>"{conflictDialog.name}"</strong> already exists in your library.
              Choose how you want to proceed:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {/* Option 1 – Overwrite */}
            <div className="p-4 rounded-xl border bg-muted/30 space-y-1">
              <p className="font-bold text-sm">Update Existing Template</p>
              <p className="text-xs text-muted-foreground">
                Overwrite the existing template with the current design. This cannot be undone.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-2 rounded-lg w-full font-bold"
                onClick={handleConflictOverwrite}
              >
                Update Existing
              </Button>
            </div>

            {/* Option 2 – Save As Copy with rename */}
            <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
              <p className="font-bold text-sm">Save as New Copy</p>
              <Input
                value={conflictDialog.renameValue}
                onChange={e => setConflictDialog(d => ({ ...d, renameValue: e.target.value }))}
                placeholder="New template name"
                className="h-9 rounded-lg text-sm"
              />
              <Button
                size="sm"
                className="rounded-lg w-full font-bold"
                onClick={handleConflictSaveAsCopy}
                disabled={!conflictDialog.renameValue.trim()}
              >
                Save as Copy
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full rounded-lg text-muted-foreground"
              onClick={() => setConflictDialog(d => ({ ...d, open: false }))}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};
