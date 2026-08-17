/**
 * Template-Driven Student ID Card PDF Generator  v3
 *
 * Pure jsPDF vector rendering — no html2canvas, no DOM dependency.
 * Reads StudioElement[] from a DocumentTemplate and draws each element
 * directly onto the PDF canvas using jsPDF primitives.
 *
 * This guarantees:
 *  - Crisp fonts (jsPDF built-in Helvetica — no system-font variance)
 *  - Perfect colour fidelity  (hex → RGB conversion in-process)
 *  - Zero CORS issues         (images fetched as data-URLs before PDF build)
 *  - Vibrant background patterns drawn via jsPDF paths
 *
 * Layout on A4 (portrait):
 *   ┌───────────────────────────────────────┐
 *   │          FRONT SIDE  (CR80)           │  centred in upper half
 *   ├──── – – CUT HERE – – ─────────────────┤
 *   │          BACK SIDE   (CR80)           │  centred in lower half
 *   └───────────────────────────────────────┘
 */

import { jsPDF } from 'jspdf';
import type { Student, BrandingSettings, DocumentTemplate } from '@/types';
import { legacyToElements, StudioElement } from '@/components/template-studio/types';
import { buildPlaceholderMap, resolvePlaceholder } from './placeholderResolver';

// ─── Pixel canvas dimensions used by Template Studio ─────────────────────────
const CANVAS_W_PX = 337;   // ID Card canvas width  in px (= PAGE_PRESETS['ID Card'].w)
const CANVAS_H_PX = 213;   // ID Card canvas height in px

// ─── Physical card size (CR80) in mm ─────────────────────────────────────────
const CARD_W_MM = 85.6;
const CARD_H_MM = 54.0;

// ─── Conversion: px (Studio canvas) → mm (PDF) ───────────────────────────────
const PX_TO_MM = CARD_W_MM / CANVAS_W_PX;   // ≈ 0.2540

function px(v: number): number { return v * PX_TO_MM; }

// ─── Colour helpers ───────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  // strip alpha if 8-digit
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b];
}

function setFill(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setFillColor(r, g, b);
}

function setStroke(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setDrawColor(r, g, b);
}

function setTextCol(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

// ─── Image fetcher ────────────────────────────────────────────────────────────
async function toDataURL(url: string): Promise<string | null> {
  if (!url || !url.trim()) return null;
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Detect image format from a data-URL for use with jsPDF addImage.
 * Falls back to 'JPEG' which jsPDF also accepts for most images.
 */
function detectFormat(dataUrl: string): string {
  if (dataUrl.includes('data:image/png'))  return 'PNG';
  if (dataUrl.includes('data:image/gif'))  return 'GIF';
  if (dataUrl.includes('data:image/webp')) return 'WEBP';
  return 'JPEG';
}

/**
 * Safely add an image to jsPDF — tries detected format first, then JPEG.
 */
function safeAddImage(
  doc: jsPDF,
  dataUrl: string,
  x: number, y: number, w: number, h: number,
) {
  const fmt = detectFormat(dataUrl);
  try {
    doc.addImage(dataUrl, fmt, x, y, w, h);
  } catch {
    try {
      doc.addImage(dataUrl, 'JPEG', x, y, w, h);
    } catch {
      // Image corrupt or unsupported — draw placeholder silently
    }
  }
}

// ─── Pattern drawing — applied as decorative layer on top of the background ──

/**
 * Draw a diagonal-stripe background pattern starting at (ox,oy) with card
 * dimensions (cw×ch) in mm.  Pattern colour should be semi-transparent white.
 */
function drawDiagonalStripes(doc: jsPDF, ox: number, oy: number, cw: number, ch: number, color: string) {
  const [r, g, b] = hexToRgb(color);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.35);
  const step = 3.2;
  for (let i = -ch; i < cw + ch; i += step) {
    const x1 = ox + i;
    const y1 = oy;
    const x2 = ox + i + ch;
    const y2 = oy + ch;
    // clip to card rect
    const ax = Math.max(ox, Math.min(x1, ox + cw));
    const bx = Math.max(ox, Math.min(x2, ox + cw));
    doc.line(ax, y1 + Math.max(0, ax - x1), bx, y2 - Math.max(0, x2 - bx));
  }
}

/** Draw repeating small circles (polka-dot) as a decorative pattern */
function drawPolkaDots(doc: jsPDF, ox: number, oy: number, cw: number, ch: number, color: string) {
  const [r, g, b] = hexToRgb(color);
  doc.setFillColor(r, g, b);
  const gap = 5;
  const radius = 0.6;
  for (let x = ox + gap / 2; x < ox + cw; x += gap) {
    for (let y = oy + gap / 2; y < oy + ch; y += gap) {
      doc.circle(x, y, radius, 'F');
    }
  }
}

/** Draw a grid of small diamonds */
function drawDiamondGrid(doc: jsPDF, ox: number, oy: number, cw: number, ch: number, color: string) {
  const [r, g, b] = hexToRgb(color);
  doc.setFillColor(r, g, b);
  const gap = 6;
  const half = 1.2;
  for (let x = ox + gap / 2; x < ox + cw; x += gap) {
    for (let y = oy + gap / 2; y < oy + ch; y += gap) {
      doc.lines(
        [[half, -half], [half, half], [-half, half], [-half, -half]],
        x, y - half, [1, 1], 'F', true,
      );
    }
  }
}

/** Draw corner accent arcs */
function drawCornerArcs(doc: jsPDF, ox: number, oy: number, cw: number, ch: number, color: string) {
  const [r, g, b] = hexToRgb(color);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(1.2);
  const arcs: [number, number][] = [
    [ox,      oy     ],
    [ox + cw, oy     ],
    [ox,      oy + ch],
    [ox + cw, oy + ch],
  ];
  arcs.forEach(([cx, cy]) => {
    doc.circle(cx, cy, 8, 'S');
  });
}

/** Draw chevron / wave lines */
function drawWaveLines(doc: jsPDF, ox: number, oy: number, cw: number, ch: number, color: string) {
  const [r, g, b] = hexToRgb(color);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.3);
  const step = 4;
  const amp  = 1.8;
  for (let baseY = oy + step; baseY < oy + ch; baseY += step) {
    let prevX = ox;
    let prevY = baseY;
    for (let x = ox + 2; x <= ox + cw; x += 2) {
      const y = baseY + Math.sin(((x - ox) / cw) * Math.PI * 4) * amp;
      doc.line(prevX, prevY, x, y);
      prevX = x;
      prevY = y;
    }
  }
}

/**
 * drawEducationalWallpaper — Ultra Premium Student ID
 *
 * Renders 13 educational motifs at 2–4% opacity as jsPDF vector paths.
 * Stroke colour: deep navy #0B1D3A at 3% opacity equivalent (RGB 11,29,58).
 * All coordinates are relative to the card origin (ox, oy) in mm.
 * Nothing clips outside the card boundaries.
 * No fill, no text — pure outline paths for premium texture only.
 */
function drawEducationalWallpaper(
  doc: jsPDF,
  ox: number, oy: number, cw: number, ch: number,
) {
  // Navy at ~3% apparent opacity via very low-contrast colour on ivory
  doc.setDrawColor(180, 192, 206);  // #B4C0CE — muted blue-grey, barely visible
  doc.setFillColor(180, 192, 206);
  doc.setLineWidth(0.22);
  doc.setLineDashPattern([], 0);

  // ── 1. Open Book  (lower-left quadrant) ─────────────────────────────────
  {
    const bx = ox + cw * 0.06;
    const by = oy + ch * 0.60;
    // Left page arc
    doc.lines([[4, -1.5], [4, 7], [-4, 1.5]], bx, by, [1, 1], 'S');
    // Right page arc
    doc.lines([[4, 1.5], [4, -7], [-4, -1.5]], bx + 8, by + 5.5, [1, 1], 'S');
    // Spine
    doc.line(bx + 8, by + 5.5, bx + 8, by - 1.5);
    // Page lines (left)
    doc.line(bx + 1, by + 1, bx + 5.5, by);
    doc.line(bx + 1, by + 3, bx + 5.5, by + 2);
    // Page lines (right)
    doc.line(bx + 9, by + 3, bx + 13, by + 4.5);
    doc.line(bx + 9, by + 1, bx + 13, by + 2.5);
  }

  // ── 2. Graduation Cap  (top-right) ──────────────────────────────────────
  {
    const gx = ox + cw * 0.80;
    const gy = oy + ch * 0.10;
    // Board (diamond shape)
    doc.lines([[5, -2.5], [5, 2.5], [-5, 2.5], [-5, -2.5]], gx, gy, [1, 1], 'S', true);
    // Head (trapezoid)
    doc.lines([[8, 4], [8, 8], [0, 8], [0, 4]], gx - 4, gy + 2, [1, 1], 'S');
    // Tassel line + circle
    doc.line(gx + 5, gy + 2.5, gx + 6, gy + 9);
    doc.circle(gx + 6, gy + 9.8, 0.9, 'S');
  }

  // ── 3. Chemistry Flask  (upper-left) ────────────────────────────────────
  {
    const fx = ox + cw * 0.10;
    const fy = oy + ch * 0.14;
    // Body: narrow neck → wide base
    doc.lines([[2, 0], [2, 4], [6, 10], [-6, 10], [-2, 4], [-2, 0]], fx, fy, [1, 1], 'S', true);
    // Neck crossbar
    doc.line(fx - 2.5, fy, fx + 2.5, fy);
    // Liquid level inside
    doc.line(fx - 4, fy + 8.5, fx + 4, fy + 8.5);
    // Bubbles
    doc.circle(fx - 1, fy + 7, 0.6, 'S');
    doc.circle(fx + 1.5, fy + 6, 0.5, 'S');
  }

  // ── 4. Atom / Physics  (centre-right) ───────────────────────────────────
  {
    const ax = ox + cw * 0.74;
    const ay = oy + ch * 0.60;
    doc.ellipse(ax, ay, 8, 3.5, 'S');
    doc.ellipse(ax, ay, 3.5, 8, 'S');
    // Third orbit at 60°
    doc.lines([[7, -3.5], [-7, 3.5]], ax - 7, ay + 3.5, [1, 1], 'S');
    // Nucleus
    doc.circle(ax, ay, 1.2, 'F');
    // Electrons (tiny circles on orbits)
    doc.circle(ax + 8, ay, 0.7, 'S');
    doc.circle(ax, ay - 8, 0.7, 'S');
  }

  // ── 5. Tree / Nature  (upper-left band) ─────────────────────────────────
  {
    const tx = ox + cw * 0.18;
    const ty = oy + ch * 0.20;
    // Trunk
    doc.lines([[2, 0], [2, 6], [-2, 6], [-2, 0]], tx - 1, ty + 7, [1, 1], 'S');
    // Three canopy layers (triangles — each wider than the one above)
    doc.lines([[5, 7], [-5, 7]], tx, ty + 4, [1, 1], 'S');
    doc.line(tx, ty + 4, tx - 5, ty + 11);
    doc.line(tx, ty + 4, tx + 5, ty + 11);
    doc.lines([[7, 9], [-7, 9]], tx, ty + 1, [1, 1], 'S');
    doc.line(tx, ty + 1, tx - 7, ty + 10);
    doc.line(tx, ty + 1, tx + 7, ty + 10);
    doc.lines([[4, 5], [-4, 5]], tx, ty, [1, 1], 'S');
    doc.line(tx, ty, tx - 4, ty + 5);
    doc.line(tx, ty, tx + 4, ty + 5);
  }

  // ── 6. Airplane  (top-centre) ───────────────────────────────────────────
  {
    const px = ox + cw * 0.48;
    const py = oy + ch * 0.07;
    // Fuselage
    doc.lines([[9, 0], [-4, 2.5], [-4, -2.5]], px, py, [1, 1], 'S', true);
    // Wing
    doc.lines([[3, 0], [-2, 3.5]], px + 2, py, [1, 1], 'S');
    // Tail
    doc.lines([[1.5, 0], [-1.5, 2]], px - 3.5, py, [1, 1], 'S');
  }

  // ── 7. Microscope  (centre-bottom band) ─────────────────────────────────
  {
    const mx = ox + cw * 0.37;
    const my = oy + ch * 0.70;
    // Base
    doc.lines([[8, 0], [0, 2], [-8, 0]], mx, my + 10, [1, 1], 'S');
    // Column
    doc.lines([[1.5, 0], [1.5, -12], [-1.5, -12], [-1.5, 0]], mx - 0.75, my, [1, 1], 'S');
    // Arm
    doc.lines([[6, -5], [6, -7], [0, -7]], mx + 0.75, my - 6, [1, 1], 'S');
    // Eyepiece
    doc.lines([[3, 0], [3, -3], [-3, -3], [-3, 0]], mx + 4, my - 14, [1, 1], 'S');
    // Objective lens
    doc.lines([[2, 0], [1, 3], [-1, 3], [-2, 0]], mx + 4.5, my - 6, [1, 1], 'S');
  }

  // ── 8. Globe / Geography  (right-centre) ────────────────────────────────
  {
    const glx = ox + cw * 0.87;
    const gly = oy + ch * 0.38;
    doc.circle(glx, gly, 6, 'S');
    // Latitude lines
    doc.line(glx - 6, gly, glx + 6, gly);
    doc.line(glx - 5, gly - 3, glx + 5, gly - 3);
    doc.line(glx - 5, gly + 3, glx + 5, gly + 3);
    // Longitude ellipses
    doc.ellipse(glx, gly, 3, 6, 'S');
    // Stand
    doc.line(glx, gly + 6, glx, gly + 9);
    doc.line(glx - 4, gly + 9, glx + 4, gly + 9);
  }

  // ── 9. Compass / Geometry  (bottom-right) ───────────────────────────────
  {
    const cx2 = ox + cw * 0.88;
    const cy2 = oy + ch * 0.84;
    doc.circle(cx2, cy2, 5.5, 'S');
    // Cardinal points
    doc.line(cx2, cy2 - 5.5, cx2, cy2 - 3.5);
    doc.line(cx2, cy2 + 3.5, cx2, cy2 + 5.5);
    doc.line(cx2 - 5.5, cy2, cx2 - 3.5, cy2);
    doc.line(cx2 + 3.5, cy2, cx2 + 5.5, cy2);
    // Needle (N–S diamond)
    doc.lines([[0, -3.5], [1.2, 0], [0, 3.5], [-1.2, 0]], cx2, cy2, [1, 1], 'S', true);
    // Centre dot
    doc.circle(cx2, cy2, 0.8, 'F');
  }

  // ── 10. DNA Helix  (far-left, mid-height) ───────────────────────────────
  {
    const dx = ox + cw * 0.03;
    const dy = oy + ch * 0.32;
    for (let i = 0; i < 5; i++) {
      const yo = i * 5;
      // Two interleaved S-curve segments approximated as straight lines
      doc.line(dx,     dy + yo,       dx + 6, dy + yo + 2.5);
      doc.line(dx,     dy + yo + 5,   dx + 6, dy + yo + 2.5);
      // Cross-bridge rungs
      if (i < 4) doc.line(dx + 1.5, dy + yo + 2, dx + 4.5, dy + yo + 3);
    }
  }

  // ── 11. Pencil  (lower-left area) ───────────────────────────────────────
  {
    const pencX = ox + cw * 0.28;
    const pencY = oy + ch * 0.72;
    // Body (rectangle, slightly rotated via line drawing)
    doc.lines([[12, -4], [3, 3], [-12, 4], [-3, -3]], pencX, pencY, [1, 1], 'S', true);
    // Tip
    doc.lines([[3, 3], [-3, -3]], pencX + 12, pencY - 4, [1, 1], 'S');
    // Eraser band
    doc.lines([[2, -0.8], [-2, 0.8]], pencX, pencY, [1, 1], 'S');
  }

  // ── 12. Geometry Set Square  (centre-left) ──────────────────────────────
  {
    const qx = ox + cw * 0.22;
    const qy = oy + ch * 0.44;
    // Right-angle triangle outline
    doc.lines([[10, 0], [0, 10], [-10, -10]], qx, qy, [1, 1], 'S', true);
    // Inner scale mark lines
    doc.line(qx + 1.5, qy,       qx + 1.5, qy + 0.8);
    doc.line(qx + 3,   qy,       qx + 3,   qy + 0.8);
    doc.line(qx + 5,   qy,       qx + 5,   qy + 0.8);
    // Right angle symbol
    doc.lines([[1.5, 0], [1.5, 1.5], [0, 1.5]], qx, qy, [1, 1], 'S');
  }

  // ── 13. Leaves / Biology  (upper-right band) ────────────────────────────
  {
    const lx = ox + cw * 0.60;
    const ly = oy + ch * 0.16;
    // Leaf 1 (facing right-up)
    doc.lines([[5, -4], [0, -8], [-5, -4]], lx, ly, [1, 1], 'S', true);
    doc.line(lx, ly, lx, ly - 8);           // midrib
    // Leaf 2 (facing left-up, smaller)
    doc.lines([[-4, -3], [0, -6], [4, -3]], lx - 4, ly + 2, [1, 1], 'S', true);
    doc.line(lx - 4, ly + 2, lx - 4, ly - 4);
    // Stem
    doc.line(lx, ly, lx - 2, ly + 5);
  }

  // Reset drawing state
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(0, 0, 0);
  doc.setLineWidth(0.2);
}

type PatternType = 'stripes' | 'dots' | 'diamonds' | 'waves' | 'corners';

function drawPattern(
  doc: jsPDF,
  pattern: PatternType,
  ox: number, oy: number, cw: number, ch: number,
  color: string,
) {
  switch (pattern) {
    case 'stripes':  drawDiagonalStripes(doc, ox, oy, cw, ch, color); break;
    case 'dots':     drawPolkaDots(doc, ox, oy, cw, ch, color); break;
    case 'diamonds': drawDiamondGrid(doc, ox, oy, cw, ch, color); break;
    case 'waves':    drawWaveLines(doc, ox, oy, cw, ch, color); break;
    case 'corners':  drawCornerArcs(doc, ox, oy, cw, ch, color); break;
  }
}

// ─── Background styles keyed by template name ────────────────────────────────

interface BgStyle {
  /** Primary fill colour for the background block */
  base: string;
  /** Secondary colour for the header band */
  header: string;
  /** Pattern variant */
  pattern: PatternType;
  /** Colour of the pattern lines/shapes (use low-alpha hex like #ffffff30) */
  patternColor: string;
  /** Accent / text highlight colour */
  accent: string;
  /** Footer band colour */
  footer: string;
}

const BG_STYLES: Record<string, BgStyle> = {
  'Ultra Premium Student ID — Front': {
    base: '#F7F8FA', header: '#0B1D3A', pattern: 'dots',
    patternColor: '#C9A84C06', accent: '#C9A84C', footer: '#0B1D3A',
  },
  'Ultra Premium Student ID — Back': {
    base: '#F7F8FA', header: '#0B1D3A', pattern: 'dots',
    patternColor: '#C9A84C06', accent: '#C9A84C', footer: '#0B1D3A',
  },
  'Student ID Card': {
    base: '#0d1b4b', header: '#7c3aed', pattern: 'stripes',
    patternColor: '#ffffff20', accent: '#fbbf24', footer: '#1e1b4b',
  },
  'Teacher ID Card': {
    base: '#1a0533', header: '#dc2626', pattern: 'diamonds',
    patternColor: '#ffffff25', accent: '#f97316', footer: '#2d1155',
  },
  'Staff ID Card': {
    base: '#0f2942', header: '#0369a1', pattern: 'dots',
    patternColor: '#ffffff22', accent: '#38bdf8', footer: '#0c1f33',
  },
  'Employee ID': {
    base: '#0c2340', header: '#047857', pattern: 'waves',
    patternColor: '#ffffff18', accent: '#34d399', footer: '#061628',
  },
  'Visitor Pass': {
    base: '#083344', header: '#0e7490', pattern: 'corners',
    patternColor: '#ffffff20', accent: '#22d3ee', footer: '#042030',
  },
};

const DEFAULT_BG_STYLE: BgStyle = {
  base: '#1e3a5f', header: '#3b82f6', pattern: 'dots',
  patternColor: '#ffffff22', accent: '#60a5fa', footer: '#172d4a',
};

function getBgStyle(templateName: string): BgStyle {
  return BG_STYLES[templateName] ?? DEFAULT_BG_STYLE;
}

// ─── jsPDF card renderer ──────────────────────────────────────────────────────

const IMAGE_KEYS = new Set(['custom_image', 'photo', 'logo', 'signature', 'principal_signature']);

function isImagePlaceholder(key: string): boolean {
  return key.includes('_url') || key.includes('_image') ||
         key.includes('logo') || key.includes('seal') ||
         key.includes('signature') || key.includes('photo');
}

/**
 * Pre-fetch all image data-URLs needed by a set of elements.
 * Also always fetches the school logo + student photo from pmap, since
 * logoEl/photoEl elements carry no imageUrl — they rely solely on pmap.
 * Returns a Map<originalUrl, dataURL>.
 */
async function prefetchImages(
  elements: StudioElement[],
  pmap: Record<string, string>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  const urls: string[] = [];

  // Always include logo + photo + principal_signature from pmap
  const logoUrl  = pmap['school_logo_url']               ?? '';
  const photoUrl = pmap['student_photo_url']              ?? '';
  const sigUrl   = pmap['principal_signature_image_url']  ?? pmap['principal_signature'] ?? '';
  if (logoUrl)  urls.push(logoUrl);
  if (photoUrl) urls.push(photoUrl);
  if (sigUrl)   urls.push(sigUrl);

  for (const el of elements) {
    if (IMAGE_KEYS.has(el.type) && el.imageUrl) urls.push(el.imageUrl);
    if (el.type === 'placeholder' && el.placeholder) {
      const v = pmap[el.placeholder];
      if (v && isImagePlaceholder(el.placeholder)) urls.push(v);
    }
  }

  await Promise.all(urls.map(async url => {
    if (url && !map.has(url)) {
      const d = await toDataURL(url);
      if (d) map.set(url, d);
    }
  }));

  return map;
}

/**
 * Draw a single template onto the PDF at card origin (ox, oy) in mm.
 * All Studio px coordinates are scaled via PX_TO_MM.
 */
async function drawCard(
  doc: jsPDF,
  template: DocumentTemplate,
  pmap: Record<string, string>,
  ox: number,    // mm — left edge of card on PDF page
  oy: number,    // mm — top edge of card on PDF page
): Promise<void> {
  const cw = CARD_W_MM;
  const ch = CARD_H_MM;
  const templateName = template.name ?? '';

  // Collect all elements sorted by zIndex
  const allElements = [
    ...legacyToElements(template.content_config.header, 'header'),
    ...legacyToElements(template.content_config.body,   'body'),
    ...legacyToElements(template.content_config.footer, 'footer'),
  ].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  // Pre-fetch images
  const imgMap = await prefetchImages(allElements, pmap);

  // Resolve BG style (used throughout the render)
  const style = getBgStyle(templateName);

  // ── 1. Background fill ──────────────────────────────────────────────────
  const isUltraPremium = templateName.startsWith('Ultra Premium');

  setFill(doc, style.base);
  doc.roundedRect(ox, oy, cw, ch, 2, 2, 'F');

  // ── 2. Decorative pattern overlay ───────────────────────────────────────
  //   Ultra Premium cards keep their elegant base background (ivory) and do
  //   not draw the educational motif wallpaper; other cards still use the
  //   subtle pattern overlay for texture.
  if (isUltraPremium) {
    // Previously drawn educational illustrations (book, microscope, atom, DNA,
    // etc.) have been removed per request. The clean ivory/textured background
    // remains, with only the subtle dot pattern if desired.
    drawPattern(doc, 'dots', ox, oy, cw, ch, style.patternColor);
  } else {
    drawPattern(doc, style.pattern, ox, oy, cw, ch, style.patternColor);
  }

  // ── 4. Header / footer bands — NON-ULTRA only ────────────────────────────
  //   Ultra Premium cards author their own bands as StudioElements (rectangles
  //   with explicit zIndex), so we must NOT draw a global band here — doing so
  //   would paint over the left-column navy strip and right-column ivory area.
  if (!isUltraPremium) {
    const headerH = px(50);
    setFill(doc, style.header);
    doc.rect(ox, oy, cw, headerH, 'F');
    drawDiagonalStripes(doc, ox, oy, cw, headerH, '#ffffff18');

    const footerH = px(26);
    setFill(doc, style.footer);
    doc.rect(ox, oy + ch - footerH, cw, footerH, 'F');
  }

  // ── 5. Border / accent ────────────────────────────────────────────────────
  if (isUltraPremium) {
    // Outer navy border
    setStroke(doc, '#0B1D3A');
    doc.setLineWidth(0.4);
    doc.roundedRect(ox, oy, cw, ch, 2, 2, 'S');
    // Inner gold inset border
    setStroke(doc, style.accent);
    doc.setLineWidth(0.3);
    doc.roundedRect(ox + 0.8, oy + 0.8, cw - 1.6, ch - 1.6, 1.8, 1.8, 'S');
  } else {
    setStroke(doc, style.accent);
    doc.setLineWidth(0.6);
    doc.roundedRect(ox, oy, cw, ch, 2, 2, 'S');
    doc.setLineWidth(0.2);
    doc.roundedRect(ox + 1, oy + 1, cw - 2, ch - 2, 1.5, 1.5, 'S');
  }

  // ── 5. Render Studio elements ─────────────────────────────────────────────
  for (const el of allElements) {
    if (el.hidden) continue;

    // Convert element coordinates from px to mm (relative to card origin)
    const ex = ox + px(el.x);
    const ey = oy + px(el.y);
    const ew = px(el.width);
    const eh = px(el.height);

    // Clip invisible elements (outside card bounds)
    if (ex > ox + cw || ey > oy + ch || ex + ew < ox || ey + eh < oy) continue;

    switch (el.type) {
      case 'background':
        // Already drawn above — skip
        break;

      case 'rectangle':
      case 'circle': {
        const hasBg = el.backgroundColor && el.backgroundColor !== 'transparent';
        const hasBd = el.borderWidth && el.borderWidth > 0 && el.borderColor && el.borderColor !== 'transparent';
        if (!hasBg && !hasBd) break;
        if (hasBg) {
          setFill(doc, el.backgroundColor!);
          doc.roundedRect(ex, ey, ew, eh,
            el.borderRadius ? Math.min(px(el.borderRadius), ew / 2, eh / 2) : 0,
            el.borderRadius ? Math.min(px(el.borderRadius), ew / 2, eh / 2) : 0,
            'F');
        }
        if (hasBd) {
          setStroke(doc, el.borderColor!);
          doc.setLineWidth(px(el.borderWidth!));
          doc.roundedRect(ex, ey, ew, eh,
            el.borderRadius ? Math.min(px(el.borderRadius), ew / 2, eh / 2) : 0,
            el.borderRadius ? Math.min(px(el.borderRadius), ew / 2, eh / 2) : 0,
            'S');
        }
        break;
      }

      case 'divider': {
        const dc = el.backgroundColor && el.backgroundColor !== 'transparent'
          ? el.backgroundColor : '#ffffff40';
        setStroke(doc, dc);
        doc.setLineWidth(0.2);
        doc.line(ex, ey, ex + ew, ey);
        break;
      }

      case 'logo':
      case 'photo':
      case 'custom_image':
      case 'signature':
      case 'principal_signature': {
        // Resolve image URL: element's own imageUrl first, then well-known pmap keys.
        // For preset elements (logo/photo/principal_signature) imageUrl is never set —
        // they always depend on pmap supplied at generation time.
        let rawUrl = el.imageUrl ?? '';
        if (!rawUrl) {
          if (el.type === 'logo')               rawUrl = pmap['school_logo_url']            ?? '';
          if (el.type === 'photo')              rawUrl = pmap['student_photo_url']           ?? '';
          if (el.type === 'principal_signature') rawUrl = pmap['principal_signature_image_url'] ?? pmap['principal_signature'] ?? '';
          if (el.type === 'signature')           rawUrl = pmap['principal_signature_image_url'] ?? pmap['principal_signature'] ?? '';
        }
        const dataUrl = rawUrl ? (imgMap.get(rawUrl) ?? null) : null;

        if (dataUrl) {
          if (el.type === 'photo') {
            // Gold ring frame behind photo
            const r = el.borderRadius ? Math.min(px(el.borderRadius), ew / 2, eh / 2) : 1.5;
            setFill(doc, style.accent);
            doc.roundedRect(ex - 0.6, ey - 0.6, ew + 1.2, eh + 1.2, r + 0.3, r + 0.3, 'F');
            // Dark backing
            doc.setFillColor(20, 30, 50);
            doc.roundedRect(ex, ey, ew, eh, r, r, 'F');
          }
          // Render image
          const fit = el.objectFit ?? 'cover';
          if (fit === 'contain') {
            const padX = ew * 0.06;
            const padY = eh * 0.06;
            safeAddImage(doc, dataUrl, ex + padX, ey + padY, ew - padX * 2, eh - padY * 2);
          } else {
            safeAddImage(doc, dataUrl, ex, ey, ew, eh);
          }
          // Accent border ring for photo
          if (el.type === 'photo') {
            setStroke(doc, style.accent);
            doc.setLineWidth(0.5);
            const r = el.borderRadius ? Math.min(px(el.borderRadius), ew / 2, eh / 2) : 1.5;
            doc.roundedRect(ex, ey, ew, eh, r, r, 'S');
          }
        } else {
          // Placeholder empty frame — navy fill + gold dashed border
          const r = el.borderRadius ? Math.min(px(el.borderRadius), ew / 2, eh / 2) : 1.5;
          doc.setFillColor(15, 25, 45);
          doc.roundedRect(ex, ey, ew, eh, r, r, 'F');
          doc.setLineDashPattern([0.8, 0.8], 0);
          setStroke(doc, style.accent);
          doc.setLineWidth(0.3);
          doc.roundedRect(ex, ey, ew, eh, r, r, 'S');
          doc.setLineDashPattern([], 0);
          // Centred label
          setTextCol(doc, style.accent);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(4);
          const lbl = el.type === 'photo' ? 'PHOTO'
                    : el.type === 'logo'  ? 'LOGO'
                    : el.type === 'principal_signature' ? 'SIGN'
                    : '';
          if (lbl) doc.text(lbl, ex + ew / 2, ey + eh / 2 + 0.5, { align: 'center' });
        }
        break;
      }

      case 'qrcode': {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(ex, ey, ew, eh, 1, 1, 'F');
        doc.setFillColor(30, 30, 40);
        const cellSize = (Math.min(ew, eh) - 2) / 7;
        const qrPattern = [
          [1,1,1,1,1,1,1],
          [1,0,0,0,0,0,1],
          [1,0,1,1,1,0,1],
          [1,0,1,0,1,0,1],
          [1,0,1,1,1,0,1],
          [1,0,0,0,0,0,1],
          [1,1,1,1,1,1,1],
        ];
        qrPattern.forEach((row, ri) => {
          row.forEach((cell, ci) => {
            if (cell) {
              doc.rect(ex + 1 + ci * cellSize, ey + 1 + ri * cellSize, cellSize, cellSize, 'F');
            }
          });
        });
        break;
      }

      case 'text': {
        const raw = el.text ?? '';
        const resolved = resolvePlaceholder(raw, pmap);
        if (!resolved.trim()) break;
        renderText(doc, resolved, el, ex, ey, ew, eh, style);
        break;
      }

      case 'placeholder': {
        const key = el.placeholder ?? '';
        const resolved = pmap[key] ?? '';

        if (!resolved) break;

        if (isImagePlaceholder(key)) {
          const dataUrl = imgMap.get(resolved);
          if (dataUrl) {
            safeAddImage(doc, dataUrl, ex, ey, ew, eh);
          }
        } else {
          renderText(doc, resolved, el, ex, ey, ew, eh, style);
        }
        break;
      }

      default:
        break;
    }
  }
}

/** Render text onto the PDF, respecting element style properties.
 *  Supports multi-line wrapping: all lines are drawn stacked vertically. */
function renderText(
  doc: jsPDF,
  text: string,
  el: StudioElement,
  ex: number, ey: number, ew: number, eh: number,
  _style: BgStyle,
) {
  // Use the element's colour as-is. Only fall back to white when the element
  // has no colour at all (undefined / empty). Black (#000000) is a valid
  // intentional colour on ivory cards and must NOT be overridden.
  const color = (el.color && el.color !== 'transparent') ? el.color : '#ffffff';
  setTextCol(doc, color);

  // Font size: Studio px → PDF pt.
  // CR80: 337 px wide = 85.6 mm → 1 px = 0.254 mm = 0.72 pt.
  // Minimum readable size on a physical card: 5 pt.
  const fsPt = Math.max(5, (el.fontSize ?? 7) * 0.718);
  doc.setFontSize(fsPt);

  const isBold = el.fontWeight === 'bold' || el.fontWeight === '600' || el.fontWeight === '800';
  doc.setFont('helvetica', isBold ? 'bold' : 'normal');

  const align = (el.textAlign ?? 'left') as 'left' | 'center' | 'right';
  const maxW  = Math.max(ew - 1.2, 1);

  // Split into wrapped lines
  const lines = doc.splitTextToSize(text, maxW) as string[];

  // Line height in mm (1.3× font size in mm)
  const lineH = fsPt * 0.353 * 1.3;  // pt → mm via 0.353, then × 1.3 leading

  // Start Y: vertically centre the whole block inside eh
  const blockH = lines.length * lineH;
  let ty = ey + (eh - blockH) / 2 + fsPt * 0.353 * 0.85;  // baseline of first line

  for (const line of lines) {
    let tx: number;
    if (align === 'center')     tx = ex + ew / 2;
    else if (align === 'right') tx = ex + ew - 0.6;
    else                        tx = ex + 0.8;

    doc.text(line, tx, ty, { align, maxWidth: maxW });
    ty += lineH;

    // Stop drawing if we overflow the element box
    if (ty > ey + eh + lineH) break;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface IDCardGeneratorOptions {
  student: Student;
  branding: BrandingSettings;
  frontTemplate: DocumentTemplate;
  backTemplate: DocumentTemplate;
}

/**
 * Generate a print-ready A4 PDF with the front ID card (CR80) on the upper
 * half and the back on the lower half.  Returns a Blob — the caller uploads
 * it to Supabase Storage and records it in the certificates table.
 */
export async function generateTemplateIDCard(opts: IDCardGeneratorOptions): Promise<Blob> {
  const { student, branding, frontTemplate, backTemplate } = opts;

  const pmap = buildPlaceholderMap(student, branding);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = 210;
  const pageH = 297;
  const margin = 12;

  // Card positions — centred horizontally, in upper / lower quadrants
  const cardX  = (pageW - CARD_W_MM) / 2;
  const frontY = pageH / 4 - CARD_H_MM / 2;
  const backY  = (pageH * 3) / 4 - CARD_H_MM / 2;

  // ── A4 page background ─────────────────────────────────────────────────────
  // Light paper tone with subtle gradient feel
  pdf.setFillColor(230, 234, 245);
  pdf.rect(0, 0, pageW, pageH, 'F');
  // Subtle inner paper area
  pdf.setFillColor(240, 243, 252);
  pdf.rect(margin, margin, pageW - margin * 2, pageH - margin * 2, 'F');

  // ── Draw card drop-shadows ─────────────────────────────────────────────────
  const shadowOffset = 1.2;
  pdf.setFillColor(180, 185, 205);
  pdf.roundedRect(cardX + shadowOffset, frontY + shadowOffset, CARD_W_MM, CARD_H_MM, 2.5, 2.5, 'F');
  pdf.roundedRect(cardX + shadowOffset, backY  + shadowOffset, CARD_W_MM, CARD_H_MM, 2.5, 2.5, 'F');

  // ── Draw front card ────────────────────────────────────────────────────────
  await drawCard(pdf, frontTemplate, pmap, cardX, frontY);

  // ── Draw back card ─────────────────────────────────────────────────────────
  await drawCard(pdf, backTemplate, pmap, cardX, backY);

  // ── Dashed cut guides ──────────────────────────────────────────────────────
  pdf.setDrawColor(140, 145, 170);
  pdf.setLineDashPattern([1.5, 1.5], 0);
  pdf.setLineWidth(0.2);
  [[cardX - 4, frontY - 4, CARD_W_MM + 8, CARD_H_MM + 8],
   [cardX - 4, backY  - 4, CARD_W_MM + 8, CARD_H_MM + 8]].forEach(([x, y, w, h]) => {
    pdf.rect(x, y, w, h);
  });

  // ── Page divider label ─────────────────────────────────────────────────────
  pdf.setLineDashPattern([], 0);
  pdf.setDrawColor(190, 193, 210);
  pdf.setLineWidth(0.15);
  const midY = pageH / 2;
  pdf.line(margin + 4, midY, pageW - margin - 4, midY);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor(150, 153, 175);
  pdf.text('\u2702  CUT ALONG DASHED LINE', pageW / 2, midY - 1.5, { align: 'center' });

  // ── Section labels ─────────────────────────────────────────────────────────
  pdf.setFontSize(7);
  pdf.setTextColor(130, 133, 160);
  pdf.text('FRONT', cardX - 4, frontY + CARD_H_MM / 2, { align: 'right', angle: 90 });
  pdf.text('BACK',  cardX - 4, backY  + CARD_H_MM / 2, { align: 'right', angle: 90 });

  // ── Footer label ───────────────────────────────────────────────────────────
  pdf.setFontSize(6.5);
  pdf.setTextColor(140, 143, 165);
  pdf.text(
    `Student ID Card  \u2022  ${student.name}  \u2022  Generated ${new Date().toLocaleDateString('en-IN')}`,
    pageW / 2, pageH - 5,
    { align: 'center' },
  );

  return pdf.output('blob');
}
