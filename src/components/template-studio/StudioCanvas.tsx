/**
 * StudioCanvas V3 – Pointer Events drag engine
 *
 * BUG FIXES vs V2:
 *  BUG1 – origPositions built from stale selectedIds closure → fixed: build from
 *          locally-computed newIds before calling onSelect.
 *  BUG2 – global mousemove/mouseup re-registered every render because state/panX/panY
 *          were in deps → fixed: panX/panY/scale/state stored in refs; effect runs once.
 *  BUG3 – element onMouseDown guard `if (!e.defaultPrevented)` never fired → fixed:
 *          element handler calls e.stopPropagation() at the very top.
 *  BUG4 – rotation center used CSS-scaled canvasRef.getBoundingClientRect() → fixed:
 *          compute center from viewportRef origin + panX/panY + scale (all via refs).
 *  BUG5 – child divs inside image/qr placeholders absorbed pointer events → fixed:
 *          all ElementContent children have pointerEvents:'none'.
 *  BUG6 – replaced separate mouse/touch handlers with Pointer Events +
 *          setPointerCapture so pointermove/pointerup are always captured.
 */
import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import type { StudioElement, StudioState } from './types';
import { GRID_PX } from './types';
import { getPlaceholderByKey } from '@/constants/placeholders';

/* ─── constants ─────────────────────────────────────────────────────────────── */
const SNAP_PX        = 6;
export const RULER_SIZE = 20;
const HANDLE_SIZE    = 8;
const ROT_OFFSET     = 28;
const AUTO_SCROLL_PX = 40;
const AUTO_SCROLL_SP = 8;

/* ─── local types ───────────────────────────────────────────────────────────── */
interface SnapLine { axis: 'x' | 'y'; value: number }
type HandleDir = 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'rot';
export interface ContextMenuState { x: number; y: number; elementId: string | null }

/* ─── snap helpers ──────────────────────────────────────────────────────────── */
function snapToGrid(v: number, g: number) { return Math.round(v / g) * g; }

function computeSnap(
  moving: { x: number; y: number; width: number; height: number },
  others: StudioElement[],
  pageW: number, pageH: number,
): { dx: number; dy: number; lines: SnapLine[] } {
  const lines: SnapLine[] = [];
  let dx = 0, dy = 0;
  const { x: mL, y: mT, width: mW, height: mH } = moving;
  const mR = mL + mW, mB = mT + mH, mCX = mL + mW / 2, mCY = mT + mH / 2;
  const pageCX = pageW / 2, pageCY = pageH / 2;

  const tryX = (mv: number, pv: number) => {
    if (dx === 0 && Math.abs(mv - pv) < SNAP_PX) { dx = pv - mv; lines.push({ axis: 'x', value: pv }); }
  };
  const tryY = (mv: number, pv: number) => {
    if (dy === 0 && Math.abs(mv - pv) < SNAP_PX) { dy = pv - mv; lines.push({ axis: 'y', value: pv }); }
  };

  // Page edges + center
  [mL, mR, mCX].forEach(mv => [0, pageW, pageCX].forEach(pv => tryX(mv, pv)));
  [mT, mB, mCY].forEach(mv => [0, pageH, pageCY].forEach(pv => tryY(mv, pv)));

  // Element edges
  for (const el of others) {
    if (el.hidden) continue;
    const eR = el.x + el.width, eB = el.y + el.height;
    const eCX = el.x + el.width / 2, eCY = el.y + el.height / 2;
    [mL, mR, mCX].forEach(mv => [el.x, eR, eCX].forEach(pv => tryX(mv, pv)));
    [mT, mB, mCY].forEach(mv => [el.y, eB, eCY].forEach(pv => tryY(mv, pv)));
  }
  return { dx, dy, lines };
}

/* ─── ElementContent ────────────────────────────────────────────────────────── */
// ALL children must have pointerEvents:'none' so pointer events reach the
// parent element div (BUG5 fix).
const CHILD_NO_PE: React.CSSProperties = { pointerEvents: 'none' };

const ElementContent: React.FC<{ el: StudioElement }> = ({ el }) => {
  const isText  = el.type === 'text' || el.type === 'placeholder';
  const isImage = ['photo','logo','custom_image','signature','principal_signature'].includes(el.type);
  const isQrBar = el.type === 'qrcode' || el.type === 'barcode';
  const isLine  = el.type === 'line' || el.type === 'divider';

  const baseText: React.CSSProperties = {
    ...CHILD_NO_PE,
    fontSize: el.fontSize, fontWeight: el.fontWeight as React.CSSProperties['fontWeight'],
    fontStyle: el.fontStyle as React.CSSProperties['fontStyle'],
    textDecoration: el.textDecoration,
    textAlign: el.textAlign as React.CSSProperties['textAlign'],
    color: el.color,
    letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
    lineHeight: el.lineHeight,
    textTransform: el.textTransform as React.CSSProperties['textTransform'],
    wordBreak: 'break-word', whiteSpace: 'pre-wrap',
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', overflow: 'hidden',
    userSelect: 'none',
  };

  if (isText) {
    const label = el.type === 'placeholder'
      ? (getPlaceholderByKey(el.placeholder || '')?.label || el.placeholder || '{placeholder}')
      : (el.text || 'Text');
    return (
      <span style={baseText}>
        {el.type === 'placeholder'
          ? <span style={{ fontFamily: 'monospace', color: '#1a56db', opacity: 0.85, pointerEvents: 'none' }}>{label}</span>
          : label}
      </span>
    );
  }

  if (isImage) return el.imageUrl
    ? <img src={el.imageUrl} alt="" draggable={false}
        style={{ width: '100%', height: '100%', objectFit: (el.objectFit || 'cover') as React.CSSProperties['objectFit'], ...CHILD_NO_PE }} />
    : <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.04)', border: '2px dashed rgba(0,0,0,0.15)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', ...CHILD_NO_PE }}>
        <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', fontWeight: 600, textTransform: 'capitalize', pointerEvents: 'none' }}>
          {el.type.replace(/_/g, ' ')}
        </span>
      </div>;

  if (isQrBar) return (
    <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.03)', border: '1px dashed rgba(0,0,0,0.12)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', ...CHILD_NO_PE }}>
      <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', fontWeight: 700, pointerEvents: 'none' }}>
        {el.type === 'qrcode' ? 'QR Code' : 'Barcode'}
      </span>
    </div>
  );

  if (isLine) return <div style={{ width: '100%', height: '100%', background: el.backgroundColor || '#e2e8f0', ...CHILD_NO_PE }} />;

  if (el.type === 'table') return (
    <div style={{ width: '100%', height: '100%', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 4, overflow: 'hidden', ...CHILD_NO_PE }}>
      <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', pointerEvents: 'none' }}>
        <tbody>
          {[0,1,2].map(r => (
            <tr key={r}>
              {[0,1,2].map(c => (
                <td key={c} style={{ border: '1px solid rgba(0,0,0,0.1)', fontSize: 9, color: 'rgba(0,0,0,0.4)', textAlign: 'center', padding: 2, pointerEvents: 'none' }}>
                  {r === 0 ? `Col ${c + 1}` : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return null;
};

/* ─── resize + rotation handles overlay ────────────────────────────────────── */
// The overlay is rendered INSIDE the element div (same coordinate space, no
// z-index competition) so it never covers sibling elements' pointer areas.
const HANDLE_DIRS: { dir: HandleDir; cx: number; cy: number; cursor: string }[] = [
  { dir: 'nw', cx: 0,   cy: 0,   cursor: 'nw-resize' },
  { dir: 'n',  cx: 0.5, cy: 0,   cursor: 'n-resize'  },
  { dir: 'ne', cx: 1,   cy: 0,   cursor: 'ne-resize' },
  { dir: 'e',  cx: 1,   cy: 0.5, cursor: 'e-resize'  },
  { dir: 'se', cx: 1,   cy: 1,   cursor: 'se-resize' },
  { dir: 's',  cx: 0.5, cy: 1,   cursor: 's-resize'  },
  { dir: 'sw', cx: 0,   cy: 1,   cursor: 'sw-resize' },
  { dir: 'w',  cx: 0,   cy: 0.5, cursor: 'w-resize'  },
];
const hs = HANDLE_SIZE;

interface HandlesProps {
  el: StudioElement;
  multi: boolean;
  onPointerDownHandle: (e: React.PointerEvent, dir: HandleDir) => void;
}
const Handles: React.FC<HandlesProps> = ({ el, multi, onPointerDownHandle }) => {
  if (el.locked) return null;
  return (
    <>
      {/* selection border */}
      <div style={{
        position: 'absolute', inset: -1,
        border: '2px solid #2563eb',
        borderRadius: el.borderRadius || 0,
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* rotation handle + connector */}
      {!multi && (
        <>
          <div style={{
            position: 'absolute', left: '50%', top: -(ROT_OFFSET),
            transform: 'translateX(-50%)',
            width: hs, height: hs, borderRadius: '50%',
            background: '#2563eb', border: '2px solid #fff',
            cursor: 'crosshair', pointerEvents: 'all',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)', zIndex: 2,
          }} onPointerDown={e => onPointerDownHandle(e, 'rot')} />
          <div style={{
            position: 'absolute', left: '50%', top: -(ROT_OFFSET - hs),
            transform: 'translateX(-50%)', width: 1, height: ROT_OFFSET - hs,
            background: '#2563eb', pointerEvents: 'none', zIndex: 1,
          }} />
        </>
      )}

      {/* 8 resize handles */}
      {HANDLE_DIRS.map(h => (
        <div
          key={h.dir}
          style={{
            position: 'absolute',
            left: `calc(${h.cx * 100}% - ${hs / 2}px)`,
            top:  `calc(${h.cy * 100}% - ${hs / 2}px)`,
            width: hs, height: hs, borderRadius: 2,
            background: '#fff', border: '2px solid #2563eb',
            cursor: h.cursor, pointerEvents: 'all',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)', zIndex: 2,
          }}
          onPointerDown={e => onPointerDownHandle(e, h.dir)}
        />
      ))}
    </>
  );
};

/* ─── props ─────────────────────────────────────────────────────────────────── */
export interface StudioCanvasProps {
  state: StudioState;
  zoom: number;
  panX: number;
  panY: number;
  selectedIds: string[];
  editingId: string | null;
  onSelect: (ids: string[]) => void;
  onMoveElements: (moves: { id: string; x: number; y: number }[]) => void;
  onResizeElement: (id: string, w: number, h: number, x: number, y: number) => void;
  onRotateElement: (id: string, rotation: number) => void;
  onDropElement: (type: string, placeholder: string | null, x: number, y: number) => void;
  onDoubleClickText: (id: string) => void;
  onPan: (dx: number, dy: number) => void;
  onCommit: () => void;
  onContextMenu: (ctx: ContextMenuState) => void;
  /** next zoom level (0.1 - 5.0) + focal point in client coords */
  onZoom: (nextZoomPercent: number, cx: number, cy: number) => void;
}

/* ─── main component ────────────────────────────────────────────────────────── */
export const StudioCanvas = React.forwardRef<HTMLDivElement, StudioCanvasProps>(function StudioCanvas({
  state, zoom, panX, panY,
  selectedIds, editingId,
  onSelect, onMoveElements, onResizeElement, onRotateElement,
  onDropElement, onDoubleClickText, onPan, onCommit,
  onContextMenu, onZoom,
}, forwardedRef) {
  const viewportRef = useRef<HTMLDivElement>(null);
  React.useImperativeHandle(forwardedRef, () => viewportRef.current!, []);
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const [lasso, setLasso] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // ── BUG2 FIX: store live values in refs so event handlers read fresh data
  //    without needing to re-register ──
  const panXRef   = useRef(panX);
  const panYRef   = useRef(panY);
  const scaleRef  = useRef(zoom / 100);
  const stateRef  = useRef(state);
  const selectedIdsRef = useRef(selectedIds);
  useEffect(() => { panXRef.current = panX; }, [panX]);
  useEffect(() => { panYRef.current = panY; }, [panY]);
  useEffect(() => { scaleRef.current = zoom / 100; }, [zoom]);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  const scale = zoom / 100;
  const spaceDown = useRef(false);

  // ── drag state (ref: no re-render during drag) ──
  const drag = useRef<{
    mode: 'move' | 'resize' | 'rotate' | 'pan' | 'lasso' | null;
    pointerId: number;
    startClientX: number; startClientY: number;
    // move
    origPositions: { id: string; x: number; y: number }[];
    // resize
    resizeId: string; resizeDir: HandleDir;
    origX: number; origY: number; origW: number; origH: number;
    // rotate
    rotateId: string; rotateCX: number; rotateCY: number;
    startAngle: number; origRot: number;
    // lasso
    lassoStartX: number; lassoStartY: number;
    // pan
    panStartX: number; panStartY: number; panOrigX: number; panOrigY: number;
    // pinch
    pinchStartDist: number; pinchStartZoom: number;
  }>({
    mode: null, pointerId: -1,
    startClientX: 0, startClientY: 0,
    origPositions: [],
    resizeId: '', resizeDir: 'se',
    origX: 0, origY: 0, origW: 0, origH: 0,
    rotateId: '', rotateCX: 0, rotateCY: 0, startAngle: 0, origRot: 0,
    lassoStartX: 0, lassoStartY: 0,
    panStartX: 0, panStartY: 0, panOrigX: 0, panOrigY: 0,
    pinchStartDist: 0, pinchStartZoom: 0,
  });

  /* ── client → canvas pixel coords ── */
  const clientToCanvas = useCallback((cx: number, cy: number) => {
    const vp = viewportRef.current;
    const r  = vp ? vp.getBoundingClientRect() : { left: 0, top: 0 };
    const s  = scaleRef.current;
    return {
      x: (cx - r.left - RULER_SIZE - panXRef.current) / s,
      y: (cy - r.top  - RULER_SIZE - panYRef.current) / s,
    };
  }, []); // no deps – reads from refs

  /* ── auto-scroll ── */
  const doAutoScroll = useCallback((clientX: number, clientY: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    let sx = 0, sy = 0;
    if (clientX - r.left  < AUTO_SCROLL_PX) sx = -AUTO_SCROLL_SP;
    if (r.right  - clientX < AUTO_SCROLL_PX) sx =  AUTO_SCROLL_SP;
    if (clientY - r.top   < AUTO_SCROLL_PX) sy = -AUTO_SCROLL_SP;
    if (r.bottom - clientY < AUTO_SCROLL_PX) sy =  AUTO_SCROLL_SP;
    if (sx || sy) onPan(sx, sy);
  }, [onPan]);

  /* ═══════════════════════════════════════════════════════════════════════════
     POINTER EVENT HANDLERS ON ELEMENT DIVS (BUG6 fix: Pointer Events API)
     Each element div registers onPointerDown; we call setPointerCapture() so
     pointermove / pointerup are delivered even when the pointer leaves the div.
     ═══════════════════════════════════════════════════════════════════════════ */

  /** Called from element div onPointerDown – handles move initiation */
  const handleElementPointerDown = useCallback((
    e: React.PointerEvent,
    el: StudioElement,
  ) => {
    if (el.locked) return;
    if (e.button === 2) return; // let context menu handle right-click
    e.stopPropagation(); // BUG3 fix: prevent viewport pointerdown (lasso) from also firing
    e.preventDefault();

    // Capture so pointermove/up reliably route to this target
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const d = drag.current;
    // BUG1 fix: compute newIds here (before calling onSelect) so origPositions is correct
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    const curSel   = selectedIdsRef.current;
    let newIds: string[];
    if (additive) {
      newIds = curSel.includes(el.id)
        ? curSel.filter(id => id !== el.id)
        : [...curSel, el.id];
    } else {
      // If already selected keep full selection (to allow multi-drag), else select only this
      newIds = curSel.includes(el.id) ? curSel : [el.id];
    }

    onSelect(newIds);

    d.mode          = 'move';
    d.pointerId     = e.pointerId;
    d.startClientX  = e.clientX;
    d.startClientY  = e.clientY;
    // Snapshot positions of all elements that will move
    d.origPositions = stateRef.current.elements
      .filter(elem => newIds.includes(elem.id))
      .map(elem => ({ id: elem.id, x: elem.x, y: elem.y }));
  }, [onSelect]);

  /** Called from handle div onPointerDown – handles resize / rotation */
  const handleHandlePointerDown = useCallback((
    e: React.PointerEvent,
    el: StudioElement,
    dir: HandleDir,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const d = drag.current;
    d.pointerId = e.pointerId;

    if (dir === 'rot') {
      // BUG4 fix: compute element center using viewportRef + live panX/panY + scale
      const vp = viewportRef.current;
      const r  = vp ? vp.getBoundingClientRect() : { left: 0, top: 0 };
      const s  = scaleRef.current;
      const cx = r.left + RULER_SIZE + panXRef.current + (el.x + el.width  / 2) * s;
      const cy = r.top  + RULER_SIZE + panYRef.current + (el.y + el.height / 2) * s;
      d.mode       = 'rotate';
      d.rotateId   = el.id;
      d.rotateCX   = cx;
      d.rotateCY   = cy;
      d.startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
      d.origRot    = el.rotation || 0;
      return;
    }

    d.mode      = 'resize';
    d.resizeId  = el.id;
    d.resizeDir = dir;
    d.origX     = el.x;
    d.origY     = el.y;
    d.origW     = el.width;
    d.origH     = el.height;
    d.startClientX = e.clientX;
    d.startClientY = e.clientY;
  }, []);

  /** Shared pointermove on element/handle divs */
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.mode || e.pointerId !== d.pointerId) return;
    e.preventDefault();

    setCursorPos(clientToCanvas(e.clientX, e.clientY));

    const s  = scaleRef.current;
    const st = stateRef.current;
    const dx = (e.clientX - d.startClientX) / s;
    const dy = (e.clientY - d.startClientY) / s;

    if (d.mode === 'move') {
      let moved = d.origPositions.map(op => ({ id: op.id, x: op.x + dx, y: op.y + dy }));

      // snap (single element only)
      if (moved.length === 1) {
        const el = st.elements.find(el => el.id === moved[0].id);
        if (el && st.snapToElements) {
          const others = st.elements.filter(e => e.id !== moved[0].id);
          const snap = computeSnap(
            { x: moved[0].x, y: moved[0].y, width: el.width, height: el.height },
            others, st.page.width, st.page.height,
          );
          moved[0].x += snap.dx;
          moved[0].y += snap.dy;
          setSnapLines(snap.lines);
        } else {
          setSnapLines([]);
        }
      }

      if (st.snapToGrid) {
        const gp = GRID_PX[st.gridSize];
        moved = moved.map(m => ({ ...m, x: snapToGrid(m.x, gp), y: snapToGrid(m.y, gp) }));
      }

      onMoveElements(moved);
      doAutoScroll(e.clientX, e.clientY);
      return;
    }

    if (d.mode === 'rotate') {
      const angle = Math.atan2(e.clientY - d.rotateCY, e.clientX - d.rotateCX) * 180 / Math.PI;
      let rot = d.origRot + (angle - d.startAngle);
      if (e.shiftKey) rot = Math.round(rot / 15) * 15;
      onRotateElement(d.rotateId, rot);
      return;
    }

    if (d.mode === 'resize') {
      let nx = d.origX, ny = d.origY, nw = d.origW, nh = d.origH;
      const dir = d.resizeDir;
      if (dir.includes('e')) nw = Math.max(10, d.origW + dx);
      if (dir.includes('s')) nh = Math.max(10, d.origH + dy);
      if (dir.includes('w')) { nw = Math.max(10, d.origW - dx); nx = d.origX + (d.origW - nw); }
      if (dir.includes('n')) { nh = Math.max(10, d.origH - dy); ny = d.origY + (d.origH - nh); }
      if (e.shiftKey) {
        const ratio = d.origW / Math.max(1, d.origH);
        if (dir === 'se' || dir === 'nw') nw = nh * ratio; else nh = nw / ratio;
      }
      if (st.snapToGrid) {
        const gp = GRID_PX[st.gridSize];
        nw = snapToGrid(nw, gp); nh = snapToGrid(nh, gp);
        nx = snapToGrid(nx, gp); ny = snapToGrid(ny, gp);
      }
      onResizeElement(d.resizeId, nw, nh, nx, ny);
    }
  }, [clientToCanvas, onMoveElements, onResizeElement, onRotateElement, doAutoScroll]);

  /** Shared pointerup on element/handle divs */
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.mode || e.pointerId !== d.pointerId) return;
    if (d.mode === 'move' || d.mode === 'resize' || d.mode === 'rotate') onCommit();
    d.mode = null;
    setSnapLines([]);
  }, [onCommit]);

  /* ═══════════════════════════════════════════════════════
     VIEWPORT (BACKGROUND) POINTER EVENTS – lasso + pan
     ═══════════════════════════════════════════════════════ */
  const handleViewportPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2) return;

    if (e.button === 1 || spaceDown.current) {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const d = drag.current;
      d.mode       = 'pan';
      d.pointerId  = e.pointerId;
      d.panStartX  = e.clientX;
      d.panStartY  = e.clientY;
      d.panOrigX   = panXRef.current;
      d.panOrigY   = panYRef.current;
      return;
    }

    // lasso
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = clientToCanvas(e.clientX, e.clientY);
    const d = drag.current;
    d.mode        = 'lasso';
    d.pointerId   = e.pointerId;
    d.lassoStartX = x;
    d.lassoStartY = y;
    d.startClientX = e.clientX;
    d.startClientY = e.clientY;
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) onSelect([]);
  }, [clientToCanvas, onSelect]);

  const handleViewportPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.mode || e.pointerId !== d.pointerId) {
      setCursorPos(clientToCanvas(e.clientX, e.clientY));
      return;
    }
    e.preventDefault();

    if (d.mode === 'pan') {
      const npx = d.panOrigX + (e.clientX - d.panStartX);
      const npy = d.panOrigY + (e.clientY - d.panStartY);
      onPan(npx - panXRef.current, npy - panYRef.current);
      return;
    }

    if (d.mode === 'lasso') {
      const { x, y } = clientToCanvas(e.clientX, e.clientY);
      const lx = Math.min(x, d.lassoStartX), ly = Math.min(y, d.lassoStartY);
      const lw = Math.abs(x - d.lassoStartX), lh = Math.abs(y - d.lassoStartY);
      setLasso({ x: lx, y: ly, w: lw, h: lh });
      if (lw > 4 || lh > 4) {
        const hit = stateRef.current.elements
          .filter(el => !el.hidden && !el.locked)
          .filter(el => el.x < lx+lw && el.x+el.width > lx && el.y < ly+lh && el.y+el.height > ly)
          .map(el => el.id);
        onSelect(hit);
      }
    }
  }, [clientToCanvas, onPan, onSelect]);

  const handleViewportPointerUp = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (d.pointerId !== e.pointerId) return;
    d.mode = null;
    setLasso(null);
  }, []);

  /* ── Space key ── */
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { spaceDown.current = true; e.preventDefault(); }
    };
    const ku = (e: KeyboardEvent) => { if (e.code === 'Space') spaceDown.current = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup',   ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  /* ── Ctrl+Wheel zoom (cursor-centered) ── */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const z = zoom / 100;
      const nextZ = Math.max(0.1, Math.min(5.0, z - e.deltaY * 0.001));
      onZoom(nextZ * 100, e.clientX, e.clientY);
    } else if (e.shiftKey) {
      onPan(-e.deltaY, 0);
    } else {
      onPan(-e.deltaX, -e.deltaY);
    }
  }, [onZoom, onPan, zoom]);

  /* ── pinch zoom (touch) ── */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    let lastDist = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t = e.touches;
        lastDist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
        drag.current.pinchStartZoom = zoom;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const t = e.touches;
      const dist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
      const midX = (t[0].clientX + t[1].clientX) / 2;
      const midY = (t[0].clientY + t[1].clientY) / 2;
      const z = zoom / 100;
      const nextZ = Math.max(0.1, Math.min(5.0, z + (dist - lastDist) * 0.002));
      onZoom(nextZ * 100, midX, midY);
      lastDist = dist;
    };
    vp.addEventListener('touchstart', onTouchStart, { passive: true });
    vp.addEventListener('touchmove',  onTouchMove,  { passive: false });
    return () => {
      vp.removeEventListener('touchstart', onTouchStart);
      vp.removeEventListener('touchmove',  onTouchMove);
    };
  }, [zoom, onZoom]);

  /* ── HTML drag-and-drop from ComponentLibrary ── */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const { x, y } = clientToCanvas(e.clientX, e.clientY);
    const compType    = e.dataTransfer.getData('studio/component');
    const placeholder = e.dataTransfer.getData('studio/placeholder');
    if (compType)    onDropElement(compType, null, x, y);
    if (placeholder) onDropElement('placeholder', placeholder, x, y);
  }, [clientToCanvas, onDropElement]);

  /* ── ruler ticks ── */
  const gridPx  = GRID_PX[state.gridSize];
  const pageW   = state.page.width;
  const pageH   = state.page.height;
  const scaledW = pageW * scale;
  const scaledH = pageH * scale;

  const hTicks = useMemo(() => {
    const step = scale >= 1.5 ? 50 : scale >= 0.75 ? 100 : 200;
    const ticks: { pos: number; label: string }[] = [];
    for (let px = 0; px <= pageW; px += step)
      ticks.push({ pos: px * scale + panX + RULER_SIZE, label: String(px) });
    return ticks;
  }, [pageW, scale, panX]);

  const vTicks = useMemo(() => {
    const step = scale >= 1.5 ? 50 : scale >= 0.75 ? 100 : 200;
    const ticks: { pos: number; label: string }[] = [];
    for (let px = 0; px <= pageH; px += step)
      ticks.push({ pos: px * scale + panY + RULER_SIZE, label: String(px) });
    return ticks;
  }, [pageH, scale, panY]);

  const sorted = useMemo(
    () => [...state.elements].sort((a, b) => a.zIndex - b.zIndex),
    [state.elements],
  );

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div
      ref={viewportRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{ background: '#e8eaed' }}
      onPointerDown={handleViewportPointerDown}
      onPointerMove={handleViewportPointerMove}
      onPointerUp={handleViewportPointerUp}
      onWheel={handleWheel}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      onContextMenu={e => { e.preventDefault(); onContextMenu({ x: e.clientX, y: e.clientY, elementId: null }); }}
    >
      {/* ── Horizontal ruler ── */}
      <div style={{ position: 'absolute', top: 0, left: RULER_SIZE, right: 0, height: RULER_SIZE, background: '#f1f3f4', borderBottom: '1px solid #d1d5db', zIndex: 200, overflow: 'hidden', pointerEvents: 'none' }}>
        {hTicks.map(t => (
          <div key={t.label} style={{ position: 'absolute', left: t.pos - RULER_SIZE, top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 1, height: 6, background: '#9ca3af', marginTop: 'auto' }} />
            <span style={{ fontSize: 8, color: '#9ca3af', fontFamily: 'monospace', marginTop: 1 }}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* ── Vertical ruler ── */}
      <div style={{ position: 'absolute', top: RULER_SIZE, left: 0, bottom: 0, width: RULER_SIZE, background: '#f1f3f4', borderRight: '1px solid #d1d5db', zIndex: 200, overflow: 'hidden', pointerEvents: 'none' }}>
        {vTicks.map(t => (
          <div key={t.label} style={{ position: 'absolute', top: t.pos - RULER_SIZE, left: 0, display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 6, height: 1, background: '#9ca3af', marginLeft: 'auto' }} />
            <span style={{ fontSize: 8, color: '#9ca3af', fontFamily: 'monospace', marginLeft: 1, transform: 'rotate(-90deg)', transformOrigin: 'left center', whiteSpace: 'nowrap' }}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* ── Corner ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: RULER_SIZE, height: RULER_SIZE, background: '#e5e7eb', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', zIndex: 201, pointerEvents: 'none' }} />

      {/* ── Canvas (pan offset) ── */}
      <div style={{
        position: 'absolute',
        top:  RULER_SIZE + panY,
        left: RULER_SIZE + panX,
        width: scaledW, height: scaledH,
        boxShadow: '0 4px 32px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.08)',
      }}>
        {/* White page */}
        <div
          style={{
            width: pageW, height: pageH,
            transform: `scale(${scale})`, transformOrigin: 'top left',
            background: '#ffffff', position: 'relative', overflow: 'visible',
          }}
          onContextMenu={e => { e.preventDefault(); onContextMenu({ x: e.clientX, y: e.clientY, elementId: null }); }}
        >
          {/* Grid overlay */}
          {state.showGrid && (
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
              <defs>
                <pattern id="sg" width={gridPx} height={gridPx} patternUnits="userSpaceOnUse">
                  <path d={`M ${gridPx} 0 L 0 0 0 ${gridPx}`} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#sg)" />
            </svg>
          )}

          {/* Page clip rect (visual only, not a pointer blocker) */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }} />

          {/* Snap guide lines */}
          {snapLines.map((l, i) => (
            l.axis === 'x'
              ? <div key={i} style={{ position: 'absolute', left: l.value, top: 0, width: 1, height: '100%', background: 'rgba(124,58,237,0.8)', pointerEvents: 'none', zIndex: 9998 }} />
              : <div key={i} style={{ position: 'absolute', top: l.value, left: 0, height: 1, width: '100%', background: 'rgba(124,58,237,0.8)', pointerEvents: 'none', zIndex: 9998 }} />
          ))}

          {/* Lasso */}
          {lasso && (
            <div style={{ position: 'absolute', left: lasso.x, top: lasso.y, width: lasso.w, height: lasso.h, border: '1.5px solid #2563eb', background: 'rgba(37,99,235,0.06)', pointerEvents: 'none', zIndex: 9999 }} />
          )}

          {/* ── Elements ── */}
          {sorted.map(el => {
            if (el.hidden) return null;
            const isSelected = selectedIds.includes(el.id);
            const shadow = el.shadowBlur
              ? `${el.shadowX ?? 0}px ${el.shadowY ?? 0}px ${el.shadowBlur}px ${el.shadowColor ?? 'rgba(0,0,0,0.2)'}`
              : undefined;

            return (
              <div
                key={el.id}
                data-el-id={el.id}
                style={{
                  position: 'absolute',
                  left: el.x, top: el.y,
                  width: el.width, height: el.height,
                  opacity: (el.opacity ?? 100) / 100,
                  transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                  transformOrigin: 'center center',
                  boxShadow: shadow,
                  cursor: el.locked ? 'not-allowed' : 'grab',
                  userSelect: 'none',
                  touchAction: 'none', // required for pointer capture on touch
                  zIndex: el.zIndex + 1,
                  borderRadius: el.borderRadius || undefined,
                  backgroundColor: el.backgroundColor && el.backgroundColor !== 'transparent'
                    ? el.backgroundColor : undefined,
                  border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor}` : undefined,
                  padding: el.padding || undefined,
                  boxSizing: 'border-box',
                  // pointer-events always 'auto' on element itself
                  pointerEvents: 'auto',
                  // Overflow visible so handles render outside bounds
                  overflow: 'visible',
                }}
                onPointerDown={e => handleElementPointerDown(e, el)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onDoubleClick={e => {
                  e.stopPropagation();
                  if (el.type === 'text' || el.type === 'placeholder') onDoubleClickText(el.id);
                }}
                onContextMenu={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenu({ x: e.clientX, y: e.clientY, elementId: el.id });
                }}
              >
                {/* Content – all children have pointerEvents:none (BUG5 fix) */}
                <ElementContent el={el} />

                {/* Selection outline + handles (rendered INSIDE the element div,
                    so they are in the same stacking context and don't block
                    pointer events on other elements' bodies) */}
                {isSelected && (
                  <Handles
                    el={el}
                    multi={selectedIds.length > 1}
                    onPointerDownHandle={(e, dir) => {
                      e.stopPropagation();
                      handleHandlePointerDown(e, el, dir);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cursor coords */}
      <div style={{ position: 'absolute', bottom: 4, right: 8, fontSize: 10, color: '#9ca3af', fontFamily: 'monospace', pointerEvents: 'none', zIndex: 300 }}>
        {Math.round(cursorPos.x)}, {Math.round(cursorPos.y)} px
      </div>
    </div>
  );
});
