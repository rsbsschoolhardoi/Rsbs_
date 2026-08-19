/**
 * Template Studio – Built-in Preset Templates  v2
 *
 * RULES (strictly enforced):
 * 1. ONLY placeholders from DOCUMENT_PLACEHOLDERS (@/constants/placeholders.ts) are used.
 *    Invalid keys (blood_group, class_name, roll_number, admission_number, etc.) are NEVER used.
 * 2. Every element fits within safe print margins.
 * 3. Background is always zIndex=0, border overlay=1, all content ≥2.
 * 4. validateAndFixLayout() runs on every build() call:
 *    - Clamps all elements inside canvas.
 *    - Pins background to zIndex=0.
 *    - Renumbers zIndex sequentially.
 *    - Removes any placeholder with an unrecognised key.
 */

import { StudioState, StudioElement, PAGE_PRESETS } from './types';
import { DOCUMENT_PLACEHOLDERS } from '@/constants/placeholders';

// ─── Valid placeholder key set ────────────────────────────────────────────────
const VALID_PH_KEYS = new Set(DOCUMENT_PLACEHOLDERS.map(p => p.key));

// ─── Layout constants ─────────────────────────────────────────────────────────
const A4_M  = 24;  // safe print margin A4/A5
const IDC_M = 5;   // safe print margin ID card
const RH    = 22;  // standard row height
const RG    = 7;   // row gap

// ─── uid ──────────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Layout validator/fixer ───────────────────────────────────────────────────
function validateAndFix(state: StudioState): StudioState {
  const pw = state.page.width;
  const ph = state.page.height;
  const isIDCard = state.page.size === 'ID Card';
  // For ID cards: never apply safe-margin clamping — elements are authored
  // precisely by the preset builder and any margin push cuts text/images.
  // For A4/A5: apply a gentle safe-margin only on large-format pages.
  const margin = isIDCard ? 0 : A4_M;

  let els = state.elements
    // 1. Remove any placeholder whose key is not in DOCUMENT_PLACEHOLDERS
    .filter(el => {
      if (el.type !== 'placeholder') return true;
      if (!el.placeholder) return false;
      return VALID_PH_KEYS.has(el.placeholder);
    })
    // 2. Clamp every element inside canvas bounds
    .map(el => {
      if (el.type === 'background') {
        return { ...el, x: 0, y: 0, width: pw, height: ph, zIndex: 0 };
      }
      // Decorative circles may intentionally bleed off canvas — allow it
      if (el.locked && (el.label ?? '').startsWith('Deco')) return el;

      const x = Math.max(0, Math.min(el.x, pw - 1));
      const y = Math.max(0, Math.min(el.y, ph - 1));
      const w = Math.min(el.width,  pw - x);
      const h = Math.min(el.height, ph - y);

      // For A4/A5: push content elements away from page edge
      if (!isIDCard) {
        const isBorderOrBand = (el.type === 'rectangle' || el.type === 'divider') && el.zIndex <= 2;
        if (!isBorderOrBand) {
          const sx = Math.max(margin, x);
          const sy = Math.max(margin, y);
          const sw = Math.min(w, pw - margin - (sx - x));
          const sh = Math.min(h, ph - margin - (sy - y));
          return { ...el, x: sx, y: sy, width: Math.max(10, sw), height: Math.max(6, sh) };
        }
      }

      return { ...el, x, y, width: Math.max(4, w), height: Math.max(4, h) };
    });

  // 3. Sort: background first, then by original zIndex, renumber sequentially
  const bgEls   = els.filter(e => e.type === 'background');
  const rest     = els.filter(e => e.type !== 'background').sort((a, b) => a.zIndex - b.zIndex);
  const reindexed = [
    ...bgEls.map((e, i) => ({ ...e, zIndex: i })),
    ...rest.map((e, i)  => ({ ...e, zIndex: i + 1 })),
  ];

  return { ...state, elements: reindexed };
}

// ─── Element factories ────────────────────────────────────────────────────────

const BASE: Omit<StudioElement, 'id'|'type'|'section'|'zIndex'|'x'|'y'|'width'|'height'> = {
  locked: false, hidden: false, opacity: 100, rotation: 0, padding: 0,
  fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none',
  textAlign: 'left', color: '#000000', letterSpacing: 0, lineHeight: 1.3,
  textTransform: 'none', backgroundColor: 'transparent',
  borderColor: 'transparent', borderWidth: 0, borderRadius: 0,
  objectFit: 'cover', shadowBlur: 0, shadowX: 0, shadowY: 0,
};

function bg(color: string, w: number, h: number): StudioElement {
  return { ...BASE, id: uid(), type: 'background', section: 'body', zIndex: 0,
    x: 0, y: 0, width: w, height: h, backgroundColor: color,
    locked: true, label: 'Background' };
}

function border(w: number, h: number, color: string, bw: number, r: number): StudioElement {
  return { ...BASE, id: uid(), type: 'rectangle', section: 'body', zIndex: 1,
    x: bw, y: bw, width: w - bw * 2, height: h - bw * 2,
    borderColor: color, borderWidth: bw, borderRadius: r,
    locked: true, label: 'Border' };
}

function band(x: number, y: number, w: number, h: number, color: string,
              section: 'header'|'body'|'footer', label: string): StudioElement {
  return { ...BASE, id: uid(), type: 'rectangle', section, zIndex: 2,
    x, y, width: w, height: h, backgroundColor: color, label };
}

function rect(x: number, y: number, w: number, h: number,
              bgC: string, bdC: string, bw: number, r: number,
              section: 'header'|'body'|'footer', label: string): StudioElement {
  return { ...BASE, id: uid(), type: 'rectangle', section, zIndex: 5,
    x, y, width: w, height: h, backgroundColor: bgC,
    borderColor: bdC, borderWidth: bw, borderRadius: r, label };
}

function txt(x: number, y: number, w: number, h: number,
             text: string, fs: number, fw: 'normal'|'bold'|'600'|'800',
             color: string, align: 'left'|'center'|'right',
             section: 'header'|'body'|'footer', label?: string): StudioElement {
  return { ...BASE, id: uid(), type: 'text', section, zIndex: 5,
    x, y, width: w, height: h, text, fontSize: fs, fontWeight: fw,
    color, textAlign: align, padding: 2,
    label: label ?? text.slice(0, 24) };
}

function ph(x: number, y: number, w: number, h: number,
            placeholder: string, label: string, fs: number,
            color: string, align: 'left'|'center'|'right',
            section: 'header'|'body'|'footer'): StudioElement {
  return { ...BASE, id: uid(), type: 'placeholder', section, zIndex: 5,
    x, y, width: w, height: h, placeholder, label, fontSize: fs,
    color, textAlign: align, padding: 2 };
}

function logoEl(x: number, y: number, w: number, h: number,
                section: 'header'|'body'|'footer'): StudioElement {
  return { ...BASE, id: uid(), type: 'logo', section, zIndex: 5,
    x, y, width: w, height: h, label: 'School Logo', objectFit: 'contain' };
}

function photoEl(x: number, y: number, w: number, h: number, r: number): StudioElement {
  return { ...BASE, id: uid(), type: 'photo', section: 'body', zIndex: 5,
    x, y, width: w, height: h, borderRadius: r,
    backgroundColor: '#dde3ed', borderColor: '#94a3b8', borderWidth: 2,
    label: 'Student Photo', objectFit: 'cover',
    shadowBlur: 4, shadowX: 0, shadowY: 2, shadowColor: '#00000022' };
}

function qrEl(x: number, y: number, size: number,
              section: 'header'|'body'|'footer'): StudioElement {
  return { ...BASE, id: uid(), type: 'qrcode', section, zIndex: 5,
    x, y, width: size, height: size, label: 'QR Code',
    backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1,
    borderRadius: 4, padding: 3, objectFit: 'contain' };
}

function sigEl(x: number, y: number, w: number, h: number,
               isPrincipal: boolean,
               section: 'header'|'body'|'footer'): StudioElement {
  return { ...BASE, id: uid(),
    type: isPrincipal ? 'principal_signature' : 'signature', section, zIndex: 5,
    x, y, width: w, height: h, objectFit: 'contain',
    label: isPrincipal ? 'Principal Signature' : 'Signature',
    textAlign: 'center' };
}

function divEl(x: number, y: number, w: number, color: string,
               section: 'header'|'body'|'footer'): StudioElement {
  return { ...BASE, id: uid(), type: 'divider', section, zIndex: 5,
    x, y, width: w, height: 1, backgroundColor: color, label: 'Divider' };
}

// ─── ID Card row helper ───────────────────────────────────────────────────────
// Renders  "Label:  {{placeholder}}"  as two side-by-side items within W-2*M
function idRow(
  pageW: number, y: number,
  labelText: string, phKey: string, phLabel: string, phColor: string,
  section: 'header'|'body'|'footer' = 'body'
): StudioElement[] {
  const M = IDC_M + 2;
  const lw = 56;
  const lx = M;
  const px = lx + lw + 2;
  const pw = pageW - px - M;
  return [
    txt(lx, y, lw, RH - 2, labelText, 7, 'bold', '#94a3b8', 'left', section),
    ph(px, y, pw, RH - 2, phKey, phLabel, 7, phColor, 'left', section),
  ];
}

// ─── A4 label-value row helper ────────────────────────────────────────────────
function a4Row(
  pageW: number, y: number,
  labelText: string, phKey: string, phLabel: string,
  labelW = 160, margin = A4_M,
): StudioElement[] {
  const lx = margin + 16;
  const px = lx + labelW + 8;
  const pw = pageW - px - margin - 16;
  return [
    txt(lx, y, labelW, RH, labelText, 12, 'bold', '#4b5563', 'left', 'body'),
    ph(px, y, pw, RH, phKey, phLabel, 12, '#1a1a2e', 'left', 'body'),
  ];
}

// ─── PAGE SIZES ───────────────────────────────────────────────────────────────
const A4  = { w: PAGE_PRESETS['A4'].w,      h: PAGE_PRESETS['A4'].h      };  // 794 × 1123
const A5  = { w: PAGE_PRESETS['A5'].w,      h: PAGE_PRESETS['A5'].h      };  // 559 × 794
const IDC = { w: PAGE_PRESETS['ID Card'].w, h: PAGE_PRESETS['ID Card'].h };  // 337 × 213

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 1 – STUDENT ID CARD  (Royal Navy + Gold — diagonal stripe pattern)
// ═══════════════════════════════════════════════════════════════════════════════
function buildStudentIDCard(): StudioState {
  const { w, h } = IDC;
  const M = IDC_M;

  // Layout zones
  const headerH  = 52;
  const footerH  = 28;
  const footerY  = h - footerH;

  // Photo — left side
  const photoW = 52; const photoH = 62;
  const photoX  = M;
  const photoY  = headerH + 8;

  // Info block — right of photo
  const infoX = photoX + photoW + 6;
  const infoW = w - infoX - M;
  const nameY = headerH + 6;

  // QR — bottom right
  const qrSize = 30;
  const qrX    = w - M - qrSize;
  const qrY    = footerY - qrSize - 4;

  const fieldRows: [string, string, string][] = [
    ['Class:',     '{{student_class}}',           'Student Class'],
    ['Section:',   '{{student_section}}',          'Student Section'],
    ['DOB:',       '{{date_of_birth}}',            'Date of Birth'],
    ['Session:',   '{{academic_session}}',         'Academic Session'],
    ['Contact:',   '{{student_contact}}',          'Student Contact'],
  ];

  const rows: StudioElement[] = [];
  const rowStartY = nameY + 24 + 5;
  const rowH2     = 13;
  const rowGap    = 2;
  fieldRows.forEach(([label, key, lbl], i) => {
    const y = rowStartY + i * (rowH2 + rowGap);
    if (y + rowH2 > qrY - 2) return;
    const availW = (y >= qrY - rowH2 * 2) ? qrX - infoX - 2 : infoW;
    rows.push(
      txt(infoX, y, 36, rowH2, label, 5.5, 'bold', '#fde68a', 'left', 'body'),
      ph(infoX + 37, y, availW - 37, rowH2, key, lbl, 6, '#ffffff', 'left', 'body'),
    );
  });

  return validateAndFix({
    name: 'Student ID Card', type: 'ID Card',
    page: { size: 'ID Card', orientation: 'landscape', width: w, height: h },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [
      // Background drawn by generator (pattern: stripes, base: #0d1b4b)
      bg('#0d1b4b', w, h),
      // Header band — purple
      band(0, 0, w, headerH, '#7c3aed', 'header', 'Header Band'),
      // Accent circle decoration
      { ...bg('#ffffff22', w, h), x: w - 28, y: -20, width: 56, height: 56, borderRadius: 28, locked: true, label: 'Deco Circle 1' },
      { ...bg('#ffffff11', w, h), x: -12, y: h - 40, width: 56, height: 56, borderRadius: 28, locked: true, label: 'Deco Circle 2' },
      // Logo + school name in header
      logoEl(M, 8, 34, 34, 'header'),
      ph(M + 38, 9,  w - M - 44, 17, '{{school_official_name}}', 'School Name', 7, '#ffffff', 'left', 'header'),
      txt(M + 38, 28, w - M - 44, 12, 'Student Identity Card', 6, 'normal', '#d8b4fe', 'left', 'header'),
      // Photo — left
      photoEl(photoX, photoY, photoW, photoH, 5),
      // Student name + role chip
      ph(infoX, nameY,     infoW, 15, '{{student_full_name}}', 'Student Full Name', 8, '#fde68a', 'left', 'body'),
      txt(infoX, nameY + 16, 38, 9, 'STUDENT', 5, 'bold', '#a78bfa', 'left', 'body'),
      ph(infoX + 40, nameY + 16, infoW - 40, 9, '{{student_login_id}}', 'Login ID', 5, '#c4b5fd', 'left', 'body'),
      // Field rows
      ...rows,
      // QR Code
      qrEl(qrX, qrY, qrSize, 'body'),
      // Footer band
      band(0, footerY, w, footerH, '#1e1b4b', 'footer', 'Footer Band'),
      ph(M, footerY + 5, w - qrSize - M * 2 - 4, 9, '{{school_official_name}}', 'School Name Footer', 5.5, '#a78bfa', 'left', 'footer'),
      ph(M, footerY + 15, w - M * 2, 9, '{{student_verification_id}}', 'Verification ID', 5, '#64748b', 'left', 'footer'),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 2 – TEACHER ID CARD  (Crimson + Orange — diamond pattern)
// ═══════════════════════════════════════════════════════════════════════════════
function buildTeacherIDCard(): StudioState {
  const { w, h } = IDC;
  const M = IDC_M;
  const headerH = 52;
  const footerH = 28;
  const footerY = h - footerH;
  const photoW = 52; const photoH = 62;
  const photoX = M;
  const photoY = headerH + 8;
  const infoX  = photoX + photoW + 6;
  const infoW  = w - infoX - M;
  const nameY  = headerH + 6;
  const qrSize = 30;
  const qrX    = w - M - qrSize;
  const qrY    = footerY - qrSize - 4;

  const fieldRows: [string, string, string][] = [
    ['Class:',    '{{student_class}}',       'Class'],
    ['Section:',  '{{student_section}}',     'Section'],
    ['Session:',  '{{academic_session}}',    'Session'],
    ['DOB:',      '{{date_of_birth}}',       'Date of Birth'],
    ['Contact:',  '{{student_contact}}',     'Contact'],
  ];
  const rows: StudioElement[] = [];
  const rowStartY = nameY + 24 + 5;
  const rowH2 = 13; const rowGap = 2;
  fieldRows.forEach(([label, key, lbl], i) => {
    const y = rowStartY + i * (rowH2 + rowGap);
    if (y + rowH2 > qrY - 2) return;
    rows.push(
      txt(infoX, y, 36, rowH2, label, 5.5, 'bold', '#fed7aa', 'left', 'body'),
      ph(infoX + 37, y, infoW - 37, rowH2, key, lbl, 6, '#ffffff', 'left', 'body'),
    );
  });

  return validateAndFix({
    name: 'Teacher ID Card', type: 'ID Card',
    page: { size: 'ID Card', orientation: 'landscape', width: w, height: h },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [
      bg('#1a0533', w, h),
      band(0, 0, w, headerH, '#dc2626', 'header', 'Header Band'),
      { ...bg('#ffffff15', w, h), x: w - 32, y: -18, width: 60, height: 60, borderRadius: 30, locked: true, label: 'Deco 1' },
      { ...bg('#f9731620', w, h), x: -10, y: h - 44, width: 60, height: 60, borderRadius: 30, locked: true, label: 'Deco 2' },
      logoEl(M, 8, 34, 34, 'header'),
      ph(M + 38, 9,  w - M - 44, 17, '{{school_official_name}}', 'School Name', 7, '#ffffff', 'left', 'header'),
      txt(M + 38, 28, w - M - 44, 12, 'Faculty Identity Card', 6, 'normal', '#fca5a5', 'left', 'header'),
      photoEl(photoX, photoY, photoW, photoH, 5),
      ph(infoX, nameY,     infoW, 15, '{{student_full_name}}', 'Faculty Name', 8, '#fed7aa', 'left', 'body'),
      txt(infoX, nameY + 16, 36, 9, 'FACULTY', 5, 'bold', '#f97316', 'left', 'body'),
      ph(infoX + 38, nameY + 16, infoW - 38, 9, '{{student_login_id}}', 'Login ID', 5, '#fb923c', 'left', 'body'),
      ...rows,
      qrEl(qrX, qrY, qrSize, 'body'),
      band(0, footerY, w, footerH, '#2d1155', 'footer', 'Footer Band'),
      ph(M, footerY + 5,  w - M * 2, 9, '{{school_official_name}}', 'School Name Footer', 5.5, '#f97316', 'left', 'footer'),
      ph(M, footerY + 15, w - M * 2, 9, '{{student_verification_id}}', 'Verification ID',  5,   '#64748b', 'left', 'footer'),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 3 – STAFF ID CARD  (Ocean Blue + Cyan — polka-dot pattern)
// ═══════════════════════════════════════════════════════════════════════════════
function buildStaffIDCard(): StudioState {
  const { w, h } = IDC;
  const M = IDC_M;
  const headerH = 52;
  const footerH = 28;
  const footerY = h - footerH;
  const photoW = 52; const photoH = 62;
  const photoX = M;
  const photoY = headerH + 8;
  const infoX  = photoX + photoW + 6;
  const infoW  = w - infoX - M;
  const nameY  = headerH + 6;
  const qrSize = 30;
  const qrX    = w - M - qrSize;
  const qrY    = footerY - qrSize - 4;

  const fieldRows: [string, string, string][] = [
    ['Class:',    '{{student_class}}',       'Class'],
    ['Section:',  '{{student_section}}',     'Section'],
    ['Session:',  '{{academic_session}}',    'Session'],
    ['DOB:',      '{{date_of_birth}}',       'Date of Birth'],
    ['Phone:',    '{{student_contact}}',     'Contact'],
  ];
  const rows: StudioElement[] = [];
  const rowStartY = nameY + 24 + 5;
  const rowH2 = 13; const rowGap = 2;
  fieldRows.forEach(([label, key, lbl], i) => {
    const y = rowStartY + i * (rowH2 + rowGap);
    if (y + rowH2 > qrY - 2) return;
    rows.push(
      txt(infoX, y, 36, rowH2, label, 5.5, 'bold', '#7dd3fc', 'left', 'body'),
      ph(infoX + 37, y, infoW - 37, rowH2, key, lbl, 6, '#ffffff', 'left', 'body'),
    );
  });

  return validateAndFix({
    name: 'Staff ID Card', type: 'ID Card',
    page: { size: 'ID Card', orientation: 'landscape', width: w, height: h },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [
      bg('#0f2942', w, h),
      band(0, 0, w, headerH, '#0369a1', 'header', 'Header Band'),
      { ...bg('#38bdf820', w, h), x: w - 30, y: -16, width: 56, height: 56, borderRadius: 28, locked: true, label: 'Deco 1' },
      { ...bg('#0ea5e915', w, h), x: -8, y: h - 42, width: 54, height: 54, borderRadius: 27, locked: true, label: 'Deco 2' },
      logoEl(M, 8, 34, 34, 'header'),
      ph(M + 38, 9,  w - M - 44, 17, '{{school_official_name}}', 'School Name', 7, '#ffffff', 'left', 'header'),
      txt(M + 38, 28, w - M - 44, 12, 'Staff Identity Card', 6, 'normal', '#7dd3fc', 'left', 'header'),
      photoEl(photoX, photoY, photoW, photoH, 5),
      ph(infoX, nameY,     infoW, 15, '{{student_full_name}}', 'Staff Name', 8, '#7dd3fc', 'left', 'body'),
      txt(infoX, nameY + 16, 30, 9, 'STAFF', 5, 'bold', '#38bdf8', 'left', 'body'),
      ph(infoX + 32, nameY + 16, infoW - 32, 9, '{{student_login_id}}', 'Login ID', 5, '#0ea5e9', 'left', 'body'),
      ...rows,
      qrEl(qrX, qrY, qrSize, 'body'),
      band(0, footerY, w, footerH, '#0c1f33', 'footer', 'Footer Band'),
      ph(M, footerY + 5,  w - M * 2, 9, '{{school_official_name}}', 'School Name Footer', 5.5, '#38bdf8', 'left', 'footer'),
      ph(M, footerY + 15, w - M * 2, 9, '{{student_verification_id}}', 'Verification ID',  5,   '#64748b', 'left', 'footer'),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 4 – EMPLOYEE ID  (Forest Green + Emerald — wave pattern)
// ═══════════════════════════════════════════════════════════════════════════════
function buildEmployeeID(): StudioState {
  const { w, h } = IDC;
  const M = IDC_M;
  const headerH = 52;
  const footerH = 28;
  const footerY = h - footerH;
  const photoW = 52; const photoH = 62;
  const photoX = M;
  const photoY = headerH + 8;
  const infoX  = photoX + photoW + 6;
  const infoW  = w - infoX - M;
  const nameY  = headerH + 6;
  const qrSize = 30;
  const qrX    = w - M - qrSize;
  const qrY    = footerY - qrSize - 4;

  const fieldRows: [string, string, string][] = [
    ['Class:',    '{{student_class}}',       'Class'],
    ['Section:',  '{{student_section}}',     'Section'],
    ['Session:',  '{{academic_session}}',    'Session'],
    ['DOB:',      '{{date_of_birth}}',       'Date of Birth'],
    ['Email:',    '{{student_email}}',       'Email'],
  ];
  const rows: StudioElement[] = [];
  const rowStartY = nameY + 24 + 5;
  const rowH2 = 13; const rowGap = 2;
  fieldRows.forEach(([label, key, lbl], i) => {
    const y = rowStartY + i * (rowH2 + rowGap);
    if (y + rowH2 > qrY - 2) return;
    rows.push(
      txt(infoX, y, 36, rowH2, label, 5.5, 'bold', '#6ee7b7', 'left', 'body'),
      ph(infoX + 37, y, infoW - 37, rowH2, key, lbl, 6, '#ffffff', 'left', 'body'),
    );
  });

  return validateAndFix({
    name: 'Employee ID', type: 'ID Card',
    page: { size: 'ID Card', orientation: 'landscape', width: w, height: h },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [
      bg('#0c2340', w, h),
      band(0, 0, w, headerH, '#047857', 'header', 'Header Band'),
      { ...bg('#34d39920', w, h), x: w - 30, y: -16, width: 58, height: 58, borderRadius: 29, locked: true, label: 'Deco 1' },
      { ...bg('#10b98115', w, h), x: -10, y: h - 44, width: 56, height: 56, borderRadius: 28, locked: true, label: 'Deco 2' },
      logoEl(M, 8, 34, 34, 'header'),
      ph(M + 38, 9,  w - M - 44, 17, '{{school_official_name}}', 'School Name', 7, '#ffffff', 'left', 'header'),
      txt(M + 38, 28, w - M - 44, 12, 'Employee ID Card', 6, 'normal', '#6ee7b7', 'left', 'header'),
      photoEl(photoX, photoY, photoW, photoH, 5),
      ph(infoX, nameY,     infoW, 15, '{{student_full_name}}', 'Name', 8, '#6ee7b7', 'left', 'body'),
      txt(infoX, nameY + 16, 44, 9, 'EMPLOYEE', 5, 'bold', '#34d399', 'left', 'body'),
      ph(infoX + 46, nameY + 16, infoW - 46, 9, '{{student_login_id}}', 'Login ID', 5, '#10b981', 'left', 'body'),
      ...rows,
      qrEl(qrX, qrY, qrSize, 'body'),
      band(0, footerY, w, footerH, '#061628', 'footer', 'Footer Band'),
      ph(M, footerY + 5,  w - M * 2, 9, '{{school_official_name}}', 'School Name Footer', 5.5, '#34d399', 'left', 'footer'),
      ph(M, footerY + 15, w - M * 2, 9, '{{student_verification_id}}', 'Verification ID',  5,   '#64748b', 'left', 'footer'),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 5 – VISITOR PASS  (Teal + Cyan — corner arcs pattern)
// ═══════════════════════════════════════════════════════════════════════════════
function buildVisitorPass(): StudioState {
  const { w, h } = IDC;
  const M = IDC_M;
  const headerH = 52;
  const footerH = 28;
  const footerY = h - footerH;
  const photoW = 52; const photoH = 62;
  const photoX = M;
  const photoY = headerH + 8;
  const infoX  = photoX + photoW + 6;
  const infoW  = w - infoX - M;
  const nameY  = headerH + 6;
  const qrSize = 30;
  const qrX    = w - M - qrSize;
  const qrY    = footerY - qrSize - 4;

  const fieldRows: [string, string, string][] = [
    ['Session:',  '{{academic_session}}',    'Session'],
    ['Class:',    '{{student_class}}',       'Class'],
    ['Section:',  '{{student_section}}',     'Section'],
    ['DOB:',      '{{date_of_birth}}',       'Date of Birth'],
    ['Contact:',  '{{student_contact}}',     'Contact'],
  ];
  const rows: StudioElement[] = [];
  const rowStartY = nameY + 24 + 5;
  const rowH2 = 13; const rowGap = 2;
  fieldRows.forEach(([label, key, lbl], i) => {
    const y = rowStartY + i * (rowH2 + rowGap);
    if (y + rowH2 > qrY - 2) return;
    rows.push(
      txt(infoX, y, 36, rowH2, label, 5.5, 'bold', '#a5f3fc', 'left', 'body'),
      ph(infoX + 37, y, infoW - 37, rowH2, key, lbl, 6, '#ffffff', 'left', 'body'),
    );
  });

  return validateAndFix({
    name: 'Visitor Pass', type: 'ID Card',
    page: { size: 'ID Card', orientation: 'landscape', width: w, height: h },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [
      bg('#083344', w, h),
      band(0, 0, w, headerH, '#0e7490', 'header', 'Header Band'),
      { ...bg('#22d3ee20', w, h), x: w - 32, y: -18, width: 60, height: 60, borderRadius: 30, locked: true, label: 'Deco 1' },
      { ...bg('#0891b215', w, h), x: -10, y: h - 44, width: 56, height: 56, borderRadius: 28, locked: true, label: 'Deco 2' },
      logoEl(M, 8, 34, 34, 'header'),
      ph(M + 38, 9,  w - M - 44, 17, '{{school_official_name}}', 'School Name', 7, '#ffffff', 'left', 'header'),
      txt(M + 38, 28, w - M - 44, 12, 'Visitor Pass', 6, 'normal', '#a5f3fc', 'left', 'header'),
      photoEl(photoX, photoY, photoW, photoH, 5),
      ph(infoX, nameY,     infoW, 15, '{{student_full_name}}', 'Visitor Name', 8, '#a5f3fc', 'left', 'body'),
      txt(infoX, nameY + 16, 34, 9, 'VISITOR', 5, 'bold', '#22d3ee', 'left', 'body'),
      ph(infoX + 36, nameY + 16, infoW - 36, 9, '{{student_login_id}}', 'Login ID', 5, '#06b6d4', 'left', 'body'),
      ...rows,
      qrEl(qrX, qrY, qrSize, 'body'),
      band(0, footerY, w, footerH, '#042030', 'footer', 'Footer Band'),
      ph(M, footerY + 5,  w - M * 2, 9, '{{school_official_name}}', 'School Name Footer', 5.5, '#22d3ee', 'left', 'footer'),
      ph(M, footerY + 15, w - M * 2, 9, '{{student_verification_id}}', 'Verification ID',  5,   '#64748b', 'left', 'footer'),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 6 – BONAFIDE CERTIFICATE (A4)
// ═══════════════════════════════════════════════════════════════════════════════
function buildBonafideCertificate(): StudioState {
  const { w, h } = A4;
  const M = A4_M;
  const inner = M + 8;
  // Header zone
  const logoSize = 84;
  const logoCX   = Math.round(w / 2 - logoSize / 2);
  const logoY    = 48;
  const schoolY  = logoY + logoSize + 10;
  const addrY    = schoolY + 32;
  const div1Y    = addrY + 22;
  // Title zone
  const titleY   = div1Y + 14;
  const div2Y    = titleY + 44;
  // Body zone
  const cert1Y   = div2Y + 18;
  const studentY = cert1Y + 26;
  const cert2Y   = studentY + 40;
  // Info rows — 3 rows of label+value
  const info1Y   = cert2Y + 30;
  const info2Y   = info1Y + RH + RG;
  const info3Y   = info2Y + RH + RG;
  const noteY    = info3Y + RH + 24;
  // Footer zone
  const sigY     = h - M - 100;
  const sigLblY  = sigY + 54;
  const divFY    = sigLblY + 20;
  const verifyY  = h - M - 22;

  return validateAndFix({
    name: 'Bonafide Certificate', type: 'Certificate',
    page: { size: 'A4', orientation: 'portrait', width: w, height: h },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [
      bg('#fffef7', w, h),
      border(w, h, '#b8860b', 3, 0),
      rect(inner, inner, w - inner * 2, h - inner * 2, 'transparent', '#daa520', 1, 0, 'body', 'Inner Border'),
      // Header
      logoEl(logoCX, logoY, logoSize, logoSize, 'header'),
      ph(M + 16, schoolY, w - (M + 16) * 2, 30,
         '{{school_official_name}}', 'School Official Name', 20, '#1a1a2e', 'center', 'header'),
      ph(M + 16, addrY,   w - (M + 16) * 2, 18,
         '{{school_complete_address}}', 'School Address', 11, '#666666', 'center', 'header'),
      divEl(M + 48, div1Y, w - (M + 48) * 2, '#daa520', 'header'),
      // Title
      txt(M + 16, titleY, w - (M + 16) * 2, 38,
          'BONAFIDE CERTIFICATE', 26, 'bold', '#b8860b', 'center', 'body', 'Certificate Title'),
      divEl(M + 200, div2Y, w - (M + 200) * 2, '#daa52050', 'body'),
      // Body
      txt(M + 32, cert1Y, w - (M + 32) * 2, 22,
          'This is to certify that', 13, 'normal', '#333333', 'center', 'body'),
      ph(M + 32, studentY, w - (M + 32) * 2, 34,
         '{{student_full_name}}', 'Student Full Name', 22, '#1a1a2e', 'center', 'body'),
      txt(M + 32, cert2Y, w - (M + 32) * 2, 22,
          'is a bonafide student of this institution for the academic year:', 13, 'normal', '#444444', 'center', 'body'),
      ph(M + 32, cert2Y + 24, w - (M + 32) * 2, 22,
         '{{academic_session}}', 'Academic Session', 13, '#1a1a2e', 'center', 'body'),
      // Info rows
      ...a4Row(w, info1Y, 'Admission Ref. No.:', '{{admission_reference_number}}', 'Admission Ref No'),
      ...a4Row(w, info2Y, 'Date of Birth:',      '{{date_of_birth}}',              'Date of Birth'),
      ...a4Row(w, info3Y, 'Admission Date:',     '{{admission_date}}',             'Admission Date'),
      txt(M + 32, noteY, w - (M + 32) * 2, 36,
          'This certificate is issued on request for the purpose stated by the student.',
          12, 'normal', '#555555', 'center', 'body'),
      // Footer
      txt(M + 32, sigY - 16, 180, 14,
          '{{document_generation_date}}', 12, 'normal', '#555555', 'left', 'footer', 'Issue Date'),
      sigEl(M + 32, sigY, 160, 52, false, 'footer'),
      sigEl(w - M - 32 - 160, sigY, 160, 52, true, 'footer'),
      txt(M + 32, sigLblY, 160, 14, 'Class Teacher', 10, 'bold', '#777777', 'center', 'footer'),
      txt(w - M - 32 - 160, sigLblY, 160, 14, 'Principal', 10, 'bold', '#777777', 'center', 'footer'),
      divEl(M + 32, divFY, w - (M + 32) * 2, '#daa52040', 'footer'),
      ph(M + 32, verifyY, 260, 16,
         '{{student_verification_id}}', 'Verification ID', 9, '#888888', 'left', 'footer'),
      ph(w - M - 32 - 200, verifyY, 200, 16,
         '{{school_contact_phone}}', 'School Phone', 9, '#888888', 'right', 'footer'),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 7 – TRANSFER CERTIFICATE (A4)
// ═══════════════════════════════════════════════════════════════════════════════
function buildTransferCertificate(): StudioState {
  const { w, h } = A4;
  const M = A4_M;
  const inner = M + 8;
  const logoSize = 76;
  const logoCX   = Math.round(w / 2 - logoSize / 2);
  const logoY    = M + 8;
  const schoolY  = logoY + logoSize + 8;
  const affiliY  = schoolY + 28;
  const div1Y    = affiliY + 20;
  const titleY   = div1Y + 12;
  const refY     = titleY + 40;

  // Table rows — use ONLY valid placeholders
  const tableRows: [string, string, string][] = [
    ['Student Full Name',   '{{student_full_name}}',          'Student Full Name'],
    ['Date of Birth',       '{{date_of_birth}}',              'Date of Birth'],
    ['Admission Ref. No.',  '{{admission_reference_number}}', 'Admission Ref No'],
    ['Admission Date',      '{{admission_date}}',             'Admission Date'],
    ['Class Studying',      '{{student_class}}',              'Student Class'],
    ['Section',             '{{student_section}}',            'Student Section'],
    ['Academic Session',    '{{academic_session}}',           'Academic Session'],
  ];

  const tableStartY = refY + 28;
  const rowH = 34;
  const tableEls: StudioElement[] = tableRows.flatMap(([label, key, lbl], i) => {
    const y = tableStartY + i * rowH;
    const even = i % 2 === 0;
    return [
      rect(M + 16, y, w - (M + 16) * 2, rowH - 2,
           even ? '#e8eeff' : '#f0f4ff', '#c7d2fe', 1, 4, 'body', `Row ${i + 1}`),
      txt(M + 24, y + 8, 200, 16, label, 11, 'bold', '#374151', 'left', 'body'),
      ph(M + 232, y + 8, w - M - 232 - M - 16, 16, key, lbl, 11, '#1e3a8a', 'left', 'body'),
    ];
  });

  const tableEndY = tableStartY + tableRows.length * rowH;
  const sigY      = Math.min(tableEndY + 32, h - M - 110);
  const sigLblY   = sigY + 54;
  const divFY     = sigLblY + 20;
  const verifyY   = h - M - 22;

  return validateAndFix({
    name: 'Transfer Certificate', type: 'Certificate',
    page: { size: 'A4', orientation: 'portrait', width: w, height: h },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [
      bg('#f0f4ff', w, h),
      border(w, h, '#3b5bdb', 2, 4),
      rect(inner, inner, w - inner * 2, h - inner * 2, 'transparent', '#7b9eff', 1, 4, 'body', 'Inner Border'),
      logoEl(logoCX, logoY, logoSize, logoSize, 'header'),
      ph(M + 16, schoolY, w - (M + 16) * 2, 26,
         '{{school_official_name}}', 'School Official Name', 18, '#1e3a8a', 'center', 'header'),
      ph(M + 16, affiliY, w - (M + 16) * 2, 18,
         '{{school_complete_address}}', 'School Address', 10, '#4a5568', 'center', 'header'),
      divEl(M + 48, div1Y, w - (M + 48) * 2, '#3b5bdb', 'header'),
      txt(M + 16, titleY, w - (M + 16) * 2, 36,
          'TRANSFER CERTIFICATE', 24, 'bold', '#3b5bdb', 'center', 'body'),
      txt(M + 16, refY, 200, RH, 'Issue Date:', 11, 'bold', '#4a5568', 'left', 'body'),
      ph(M + 220, refY, 200, RH, '{{certificate_issue_date}}', 'Issue Date', 11, '#1e3a8a', 'left', 'body'),
      ...tableEls,
      sigEl(M + 32, sigY, 160, 52, false, 'footer'),
      sigEl(w - M - 32 - 160, sigY, 160, 52, true, 'footer'),
      txt(M + 32, sigLblY, 160, 14, 'Class Teacher', 10, 'bold', '#6b7280', 'center', 'footer'),
      txt(w - M - 32 - 160, sigLblY, 160, 14, 'Principal / Headmaster', 10, 'bold', '#6b7280', 'center', 'footer'),
      divEl(M + 32, divFY, w - (M + 32) * 2, '#c7d2fe', 'footer'),
      ph(M + 32, verifyY, 260, 16, '{{student_verification_id}}', 'Verification ID', 9, '#9ca3af', 'left', 'footer'),
      ph(w - M - 32 - 200, verifyY, 200, 16, '{{document_generation_date}}', 'Generation Date', 9, '#9ca3af', 'right', 'footer'),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 8 – CHARACTER CERTIFICATE (A4)
// ═══════════════════════════════════════════════════════════════════════════════
function buildCharacterCertificate(): StudioState {
  const { w, h } = A4;
  const M = A4_M;
  const inner = M + 8;
  const logoSize = 80;
  const logoCX   = Math.round(w / 2 - logoSize / 2);
  const logoY    = 46;
  const schoolY  = logoY + logoSize + 8;
  const addrY    = schoolY + 28;
  const div1Y    = addrY + 20;
  const titleY   = div1Y + 12;
  const div2Y    = titleY + 40;
  const cert1Y   = div2Y + 16;
  const studentY = cert1Y + 26;
  const admY     = studentY + 38;
  const body1Y   = admY + RH + 20;
  const body2Y   = body1Y + 54;
  const dateY    = body2Y + 50;
  const sigY     = dateY + 40;
  const sigLblY  = sigY + 54;

  return validateAndFix({
    name: 'Character Certificate', type: 'Certificate',
    page: { size: 'A4', orientation: 'portrait', width: w, height: h },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [
      bg('#fdfaf4', w, h),
      border(w, h, '#6b46c1', 3, 0),
      rect(inner, inner, w - inner * 2, h - inner * 2, 'transparent', '#9f7aea', 1, 0, 'body', 'Inner Border'),
      logoEl(logoCX, logoY, logoSize, logoSize, 'header'),
      ph(M + 16, schoolY, w - (M + 16) * 2, 26,
         '{{school_official_name}}', 'School Official Name', 20, '#1a1a2e', 'center', 'header'),
      ph(M + 16, addrY,   w - (M + 16) * 2, 18,
         '{{school_complete_address}}', 'School Address', 11, '#666666', 'center', 'header'),
      divEl(M + 64, div1Y, w - (M + 64) * 2, '#9f7aea', 'header'),
      txt(M + 16, titleY, w - (M + 16) * 2, 36,
          'CHARACTER CERTIFICATE', 26, 'bold', '#6b46c1', 'center', 'body'),
      divEl(M + 200, div2Y, w - (M + 200) * 2, '#9f7aea50', 'body'),
      txt(M + 32, cert1Y, w - (M + 32) * 2, 22,
          'This is to certify that', 13, 'normal', '#333333', 'center', 'body'),
      ph(M + 32, studentY, w - (M + 32) * 2, 32,
         '{{student_full_name}}', 'Student Full Name', 22, '#1a1a2e', 'center', 'body'),
      ...a4Row(w, admY, 'Admission Ref. No.:', '{{admission_reference_number}}', 'Admission Ref No'),
      txt(M + 32, body1Y, w - (M + 32) * 2, 48,
          'has been a student of this institution and has borne a good moral character throughout their stay. The student has always been honest, disciplined and respectful.',
          13, 'normal', '#444444', 'left', 'body'),
      txt(M + 32, body2Y, w - (M + 32) * 2, 36,
          'We wish them all the best in their future endeavors.',
          13, 'normal', '#444444', 'left', 'body'),
      txt(M + 32, dateY, 80, RH, 'Date:', 12, 'bold', '#555555', 'left', 'body'),
      ph(M + 120, dateY, 200, RH,
         '{{certificate_issue_date}}', 'Issue Date', 12, '#333333', 'left', 'body'),
      sigEl(M + 32, sigY, 160, 52, false, 'footer'),
      sigEl(w - M - 32 - 160, sigY, 160, 52, true, 'footer'),
      txt(M + 32, sigLblY, 160, 14, 'Class Teacher', 10, 'bold', '#777777', 'center', 'footer'),
      txt(w - M - 32 - 160, sigLblY, 160, 14, 'Principal', 10, 'bold', '#777777', 'center', 'footer'),
      ph(M + 32, h - M - 22, 280, 16,
         '{{student_verification_id}}', 'Verification ID', 9, '#888888', 'left', 'footer'),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 9 – ACHIEVEMENT CERTIFICATE (A5 Landscape)
// ═══════════════════════════════════════════════════════════════════════════════
function buildAchievementCertificate(): StudioState {
  // A5 landscape: swap width/height
  const pw = A5.h;  // 794
  const pageH = A5.w;  // 559
  const M = A4_M;
  const inner = M + 8;
  const logoSize = 68;
  const logoCX   = Math.round(pw / 2 - logoSize / 2);
  const logoY    = 36;
  const schoolY  = logoY + logoSize + 8;
  const div1Y    = schoolY + 26;
  const titleY   = div1Y + 12;
  const certIntroY = titleY + 44;
  const studentY   = certIntroY + 24;
  const recognY    = studentY + 38;
  const certTitleY = recognY + 22;
  const sessionY   = certTitleY + 32;
  const sigY       = pageH - M - 90;
  const sigLblY    = sigY + 52;
  const verifyY    = pageH - M - 20;

  return validateAndFix({
    name: 'Achievement Certificate', type: 'Certificate',
    page: { size: 'A5', orientation: 'landscape', width: pw, height: pageH },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [
      bg('#fffbeb', pw, pageH),
      border(pw, pageH, '#d97706', 4, 0),
      rect(inner, inner, pw - inner * 2, pageH - inner * 2, 'transparent', '#f59e0b', 1, 0, 'body', 'Inner Border'),
      txt(M + 24, M + 12, 28, 28, '★', 20, 'bold', '#f59e0b', 'center', 'header', 'Star L'),
      txt(pw - M - 52, M + 12, 28, 28, '★', 20, 'bold', '#f59e0b', 'center', 'header', 'Star R'),
      logoEl(logoCX, logoY, logoSize, logoSize, 'header'),
      ph(M + 16, schoolY, pw - (M + 16) * 2, 22,
         '{{school_official_name}}', 'School Official Name', 16, '#1a1a2e', 'center', 'header'),
      divEl(M + 64, div1Y, pw - (M + 64) * 2, '#d97706', 'header'),
      txt(M + 16, titleY, pw - (M + 16) * 2, 38,
          'CERTIFICATE OF ACHIEVEMENT', 26, 'bold', '#d97706', 'center', 'body'),
      txt(M + 32, certIntroY, pw - (M + 32) * 2, 20,
          'This certificate is proudly presented to', 13, 'normal', '#555555', 'center', 'body'),
      ph(M + 32, studentY, pw - (M + 32) * 2, 32,
         '{{student_full_name}}', 'Student Full Name', 24, '#1a1a2e', 'center', 'body'),
      txt(M + 32, recognY, pw - (M + 32) * 2, 18,
          'In recognition of outstanding achievement.', 12, 'normal', '#555555', 'center', 'body'),
      ph(M + 32, certTitleY, pw - (M + 32) * 2, 26,
         '{{certificate_title}}', 'Certificate Title', 16, '#d97706', 'center', 'body'),
      txt(M + 32, sessionY, 160, RH, 'Academic Session:', 11, 'bold', '#777777', 'center', 'body'),
      ph(M + 32 + 164, sessionY, 200, RH, '{{academic_session}}', 'Academic Session', 11, '#555555', 'center', 'body'),
      sigEl(M + 48, sigY, 140, 50, false, 'footer'),
      sigEl(pw - M - 48 - 140, sigY, 140, 50, true, 'footer'),
      txt(M + 48, sigLblY, 140, 14, 'Class Teacher', 9, 'bold', '#777777', 'center', 'footer'),
      txt(pw - M - 48 - 140, sigLblY, 140, 14, 'Principal', 9, 'bold', '#777777', 'center', 'footer'),
      ph(Math.round(pw / 2 - 100), verifyY, 200, 14,
         '{{document_generation_date}}', 'Generation Date', 9, '#aaaaaa', 'center', 'footer'),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 10 – REPORT CARD (A4)
// ═══════════════════════════════════════════════════════════════════════════════
function buildReportCard(): StudioState {
  const { w, h } = A4;
  const M = A4_M;
  const headerBandH = 76;
  const infoBoxY    = headerBandH + 14;
  const infoBoxH    = 78;
  const photoSize   = 64;
  // Table
  const tableY      = infoBoxY + infoBoxH + 14;
  const tableHdrH   = 28;
  const rowH        = 28;
  // Only show marks/grade with supported placeholders
  // Report card simplified to use {{marks_obtained}}, {{marks_total}}, {{grade_awarded}}, {{overall_result_status}}
  const colX = [M + 8, M + 8 + 210, M + 8 + 210 + 90, M + 8 + 210 + 90 + 90, M + 8 + 210 + 90 + 90 + 90];
  const colW = [210, 90, 90, 90, w - M - 8 - colX[4]];

  // Static subject rows (text labels, no dynamic per-subject placeholders — they don't exist)
  const subjectNames = ['Mathematics','Science','English','Social Studies','Hindi','Sanskrit','Computer','Physical Ed.'];
  const subjectEls: StudioElement[] = subjectNames.flatMap((name, i) => {
    const y = tableY + tableHdrH + i * rowH;
    const even = i % 2 === 0;
    if (y + rowH > h - M - 110) return []; // guard: stop before footer zone
    return [
      rect(M + 8, y, w - (M + 8) * 2, rowH - 1,
           even ? '#ffffff' : '#f0f9ff', '#e2e8f0', 1, 0, 'body', `Row ${i + 1}`),
      txt(colX[0] + 4, y + 7, colW[0] - 8, 14, name, 10, 'normal', '#374151', 'left', 'body'),
      txt(colX[1], y + 7, colW[1], 14, '—', 10, 'normal', '#94a3b8', 'center', 'body'),
      txt(colX[2], y + 7, colW[2], 14, '—', 10, 'normal', '#94a3b8', 'center', 'body'),
      txt(colX[3], y + 7, colW[3], 14, '—', 10, 'normal', '#94a3b8', 'center', 'body'),
      txt(colX[4], y + 7, colW[4], 14, '—', 10, 'normal', '#94a3b8', 'center', 'body'),
    ];
  });
  const lastSubjY = tableY + tableHdrH + subjectNames.length * rowH;
  const totalRowY = lastSubjY + 2;
  const resultY   = totalRowY + rowH + 14;
  const sigY      = h - M - 90;
  const sigLblY   = sigY + 52;

  return validateAndFix({
    name: 'Report Card', type: 'Result',
    page: { size: 'A4', orientation: 'portrait', width: w, height: h },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [
      bg('#f8fafc', w, h),
      band(0, 0, w, headerBandH, '#1e3a8a', 'header', 'Header Band'),
      logoEl(M, 12, 52, 52, 'header'),
      ph(M + 58, 14, w - M - 64, 22,
         '{{school_official_name}}', 'School Official Name', 15, '#ffffff', 'left', 'header'),
      txt(M + 58, 38, w - M - 64, 15,
          'Progress Report Card', 10, 'normal', '#93c5fd', 'left', 'header'),
      ph(w - M - 180, 18, 172, 16,
         '{{academic_session}}', 'Academic Session', 9, '#93c5fd', 'right', 'header'),
      // Student info box
      rect(M + 8, infoBoxY, w - (M + 8) * 2, infoBoxH,
           '#eff6ff', '#bfdbfe', 1, 8, 'body', 'Student Info Box'),
      { ...photoEl(M + 14, infoBoxY + 7, photoSize, photoSize - 4, 4), section: 'body' as const },
      ph(M + 14 + photoSize + 12, infoBoxY + 8, 280, 20,
         '{{student_full_name}}', 'Student Full Name', 14, '#1e3a8a', 'left', 'body'),
      txt(M + 14 + photoSize + 12, infoBoxY + 30, 80, 15, 'Class:', 10, 'bold', '#4b5563', 'left', 'body'),
      ph(M + 14 + photoSize + 12 + 52, infoBoxY + 30, 140, 15,
         '{{student_class}}', 'Student Class', 10, '#1e3a8a', 'left', 'body'),
      txt(M + 14 + photoSize + 12, infoBoxY + 48, 80, 15, 'Section:', 10, 'bold', '#4b5563', 'left', 'body'),
      ph(M + 14 + photoSize + 12 + 56, infoBoxY + 48, 130, 15,
         '{{student_section}}', 'Student Section', 10, '#1e3a8a', 'left', 'body'),
      txt(M + 14 + photoSize + 12 + 220, infoBoxY + 30, 80, 15, 'Roll No:', 10, 'bold', '#4b5563', 'left', 'body'),
      ph(M + 14 + photoSize + 12 + 286, infoBoxY + 30, 120, 15,
         '{{student_roll_number}}', 'Roll Number', 10, '#1e3a8a', 'left', 'body'),
      txt(M + 14 + photoSize + 12 + 220, infoBoxY + 48, 80, 15, 'Adm Ref:', 10, 'bold', '#4b5563', 'left', 'body'),
      ph(M + 14 + photoSize + 12 + 286, infoBoxY + 48, 120, 15,
         '{{admission_reference_number}}', 'Admission Ref', 10, '#1e3a8a', 'left', 'body'),
      // Table header
      rect(M + 8, tableY, w - (M + 8) * 2, tableHdrH,
           '#1e3a8a', 'transparent', 0, 4, 'body', 'Table Header'),
      txt(colX[0] + 4, tableY + 7, colW[0] - 8, 15, 'Subject', 10, 'bold', '#ffffff', 'left', 'body'),
      txt(colX[1], tableY + 7, colW[1], 15, 'Max', 10, 'bold', '#ffffff', 'center', 'body'),
      txt(colX[2], tableY + 7, colW[2], 15, 'Obtained', 10, 'bold', '#ffffff', 'center', 'body'),
      txt(colX[3], tableY + 7, colW[3], 15, 'Grade', 10, 'bold', '#ffffff', 'center', 'body'),
      txt(colX[4], tableY + 7, colW[4], 15, 'Remarks', 10, 'bold', '#ffffff', 'center', 'body'),
      ...subjectEls,
      // Total / result rows using real placeholders
      rect(M + 8, totalRowY, w - (M + 8) * 2, rowH - 1, '#dbeafe', '#bfdbfe', 1, 0, 'body', 'Total Row'),
      txt(colX[0] + 4, totalRowY + 7, colW[0] - 8, 14, 'TOTAL', 11, 'bold', '#1e3a8a', 'left', 'body'),
      ph(colX[1], totalRowY + 7, colW[1], 14, '{{marks_total}}', 'Total Marks', 11, '#1e3a8a', 'center', 'body'),
      ph(colX[2], totalRowY + 7, colW[2], 14, '{{marks_obtained}}', 'Marks Obtained', 11, '#1e3a8a', 'center', 'body'),
      ph(colX[3], totalRowY + 7, colW[3], 14, '{{grade_awarded}}', 'Grade', 11, '#1e3a8a', 'center', 'body'),
      ph(colX[4], totalRowY + 7, colW[4], 14, '{{overall_result_status}}', 'Result', 11, '#1e3a8a', 'center', 'body'),
      // Result summary
      txt(M + 8, resultY, 120, RH, 'Overall Result:', 11, 'bold', '#4b5563', 'left', 'body'),
      ph(M + 8 + 124, resultY, 160, RH, '{{overall_result_status}}', 'Result Status', 11, '#1e3a8a', 'left', 'body'),
      // Footer
      sigEl(M + 32, sigY, 160, 50, false, 'footer'),
      sigEl(w - M - 32 - 160, sigY, 160, 50, true, 'footer'),
      txt(M + 32, sigLblY, 160, 14, 'Class Teacher', 9, 'bold', '#6b7280', 'center', 'footer'),
      txt(w - M - 32 - 160, sigLblY, 160, 14, 'Principal', 9, 'bold', '#6b7280', 'center', 'footer'),
      ph(Math.round(w / 2 - 100), h - M - 20, 200, 14,
         '{{document_generation_date}}', 'Generation Date', 9, '#9ca3af', 'center', 'footer'),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 11 – ADMIT CARD (A5)
// ═══════════════════════════════════════════════════════════════════════════════
function buildAdmitCard(): StudioState {
  const { w, h } = A5;
  const M = A4_M;
  const headerBandH = 64;
  const infoBoxY    = headerBandH + 10;
  const infoBoxH    = 72;
  const photoW = 58; const photoH = 60;
  const infoX  = infoBoxY + 6;
  const tableY = infoBoxY + infoBoxH + 10;
  const thH    = 24;
  const rh     = 26;
  const nRows  = 5;
  const instrY = tableY + thH + nRows * rh + 8;
  const sigY   = h - M - 70;

  return validateAndFix({
    name: 'Admit Card', type: 'Certificate',
    page: { size: 'A5', orientation: 'portrait', width: w, height: h },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [
      bg('#ffffff', w, h),
      border(w, h, '#dc2626', 2, 4),
      band(0, 0, w, headerBandH, '#dc2626', 'header', 'Header Band'),
      logoEl(M, 10, 44, 44, 'header'),
      ph(M + 50, 12, w - M - 56, 20,
         '{{school_official_name}}', 'School Official Name', 13, '#ffffff', 'left', 'header'),
      txt(M + 50, 34, w - M - 56, 14,
          'Examination Admit Card', 9, 'normal', '#fca5a5', 'left', 'header'),
      // Info box
      rect(M + 8, infoBoxY, w - (M + 8) * 2, infoBoxH,
           '#fef2f2', '#fecaca', 1, 6, 'body', 'Student Info Box'),
      { ...photoEl(w - M - 8 - photoW - 4, infoBoxY + 6, photoW, photoH, 4), section: 'body' as const },
      ph(M + 14, infoBoxY + 8,  w - M - 14 - photoW - 20, 18,
         '{{student_full_name}}', 'Student Name', 12, '#1a1a2e', 'left', 'body'),
      txt(M + 14, infoBoxY + 28, 70, 14, 'Roll No:', 9, 'bold', '#555555', 'left', 'body'),
      ph(M + 86, infoBoxY + 28, 120, 14,
         '{{student_roll_number}}', 'Roll Number', 9, '#dc2626', 'left', 'body'),
      txt(M + 14, infoBoxY + 44, 70, 14, 'Class:', 9, 'bold', '#555555', 'left', 'body'),
      ph(M + 86, infoBoxY + 44, 120, 14,
         '{{student_class}}', 'Student Class', 9, '#374151', 'left', 'body'),
      txt(M + 14, infoBoxY + 58, 70, 14, 'Session:', 9, 'bold', '#555555', 'left', 'body'),
      ph(M + 86, infoBoxY + 58, 180, 14,
         '{{academic_session}}', 'Academic Session', 9, '#374151', 'left', 'body'),
      // Timetable header
      rect(M + 8, tableY, w - (M + 8) * 2, thH,
           '#dc2626', 'transparent', 0, 4, 'body', 'Table Header'),
      txt(M + 14, tableY + 6, 140, 13, 'Subject', 9, 'bold', '#ffffff', 'left', 'body'),
      txt(M + 160, tableY + 6, 80, 13, 'Date', 9, 'bold', '#ffffff', 'center', 'body'),
      txt(M + 248, tableY + 6, 80, 13, 'Time', 9, 'bold', '#ffffff', 'center', 'body'),
      // Static subject rows (no invalid dynamic ph per row)
      ...Array.from({ length: nRows }, (_, i): StudioElement[] => {
        const y = tableY + thH + i * rh;
        const even = i % 2 === 0;
        return [
          rect(M + 8, y, w - (M + 8) * 2, rh - 1,
               even ? '#ffffff' : '#fff5f5', '#fecaca', 1, 0, 'body', `Exam Row ${i + 1}`),
          txt(M + 14, y + 6, 140, 14, `Subject ${i + 1}`, 9, 'normal', '#374151', 'left', 'body'),
          txt(M + 160, y + 6, 80, 14, 'DD/MM/YYYY', 9, 'normal', '#374151', 'center', 'body'),
          txt(M + 248, y + 6, 80, 14, 'HH:MM AM', 9, 'normal', '#374151', 'center', 'body'),
        ];
      }).flat(),
      txt(M + 8, instrY, w - (M + 8) * 2, 14,
          'Instructions: Carry this card and a valid ID. Mobile phones are not allowed.',
          8, 'normal', '#6b7280', 'left', 'body'),
      sigEl(w - M - 8 - 150, sigY, 150, 40, true, 'footer'),
      txt(w - M - 8 - 150, sigY + 44, 150, 12,
          'Controller of Examinations', 8, 'bold', '#555555', 'center', 'footer'),
      ph(M + 8, h - M - 20, 200, 14,
         '{{document_generation_date}}', 'Generation Date', 8, '#9ca3af', 'left', 'footer'),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 12 – FEE RECEIPT (A5)
// ═══════════════════════════════════════════════════════════════════════════════
function buildFeeReceipt(): StudioState {
  // The default Fee Receipt is now the same professional, A4-ready layout as the
  // Premium preset so the live receipt output always looks polished and readable.
  return { ...buildPremiumFeeReceipt(), name: 'Fee Receipt' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 12b – PREMIUM FEE RECEIPT (A4)   v2 — Production-ready, real placeholders
// ═══════════════════════════════════════════════════════════════════════════════
function buildPremiumFeeReceipt(): StudioState {
  const { w, h } = A4;
  const M = A4_M;

  // ── Palette ───────────────────────────────────────────────────────────────
  const NAVY    = '#0B1D3A';
  const WHITE   = '#FFFFFF';
  const GOLD    = '#C9A84C';
  const IVORY   = '#F7F8FA';
  const SLATE   = '#5A6A7A';
  const DIVIDER = '#E2E8F0';
  const TEXT    = '#1F2937';

  // ── Header ──────────────────────────────────────────────────────────────────
  const headerH = 130;
  const logoSz  = 64;
  const logoX   = M + 8;
  const logoY   = 18;
  const titleX  = logoX + logoSz + 18;
  const titleW  = w - titleX - M - 8;

  // ── Receipt meta card ───────────────────────────────────────────────────────
  const metaCardY = headerH + 24;
  const metaCardH = 76;
  const metaColW  = Math.floor((w - 2 * M - 24) / 3);
  const metaCol1X = M + 8;
  const metaCol2X = metaCol1X + metaColW + 4;
  const metaCol3X = metaCol2X + metaColW + 4;
  const metaInnerY = metaCardY + 14;

  // ── Student info ────────────────────────────────────────────────────────────
  const studentY = metaCardY + metaCardH + 28;
  const infoColW = Math.floor((w - 2 * M - 16) / 2);
  const infoCol1X = M + 8;
  const infoCol2X = infoCol1X + infoColW + 8;
  const infoRowH = 48;
  const infoLabelH = 12;
  const infoValueH = 18;
  const infoGap = 4;

  // ── Fee table ───────────────────────────────────────────────────────────────
  const tableX = M + 8;
  const tableW = w - (M + 8) * 2;
  const tableY = studentY + infoRowH * 4 + 28;
  const thH = 36;
  const rowH = 34;
  const feeRows = 6;
  const descColW = Math.floor(tableW * 0.62);
  const amtColW = tableW - descColW;
  const descColX = tableX + 12;
  const amtColX = tableX + descColW + 12;
  const totalY = tableY + thH + feeRows * rowH + 8;
  const totalH = 40;

  // ── Footer / signature ──────────────────────────────────────────────────────
  const sigW = 180;
  const sigH = 52;
  const sigX = w - M - 8 - sigW;
  const sigY = h - M - 100;
  const sigRuleY = sigY + sigH + 6;
  const sigLabelY = sigRuleY + 8;

  const footerTextY = sigY + sigH + 34;

  return validateAndFix({
    name: 'Premium Fee Receipt', type: 'Fee Receipt',
    page: { size: 'A4', orientation: 'portrait', width: w, height: h },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [

      // Background
      bg(WHITE, w, h),

      // Soft page border
      { ...border(w, h, NAVY, 1, 0), zIndex: 1 },
      { ...border(w, h, GOLD, 0.8, 0),
        x: 4, y: 4, width: w - 8, height: h - 8, zIndex: 2 },

      // Header band
      band(0, 0, w, headerH, NAVY, 'header', 'Header Band'),

      // Gold accent line under header
      { ...divEl(0, headerH, w, GOLD, 'header'), height: 3, zIndex: 7 },

      // School logo (contained, square box — no distortion)
      { ...logoEl(logoX, logoY, logoSz, logoSz, 'header'), zIndex: 6 },

      // School official name
      { ...ph(titleX, logoY + 2, titleW, 24,
          '{{school_official_name}}', 'School Official Name',
          24, WHITE, 'left', 'header'),
        fontWeight: 'bold', zIndex: 6 },

      // School address / contact
      { ...ph(titleX, logoY + 30, titleW, 16,
          '{{school_address}}', 'School Address',
          11, 'rgba(255,255,255,0.85)', 'left', 'header'),
        zIndex: 6 },

      // "Fee Collection Receipt" title — top right
      { ...ph(w - M - 8 - 230, 20, 230, 22,
          '{{school_name}}', 'School Name',
          22, GOLD, 'right', 'header'),
        fontWeight: 'bold', zIndex: 6 },
      txt(w - M - 8 - 230, 46, 230, 16,
        'Fee Collection Receipt', 14, 'normal', WHITE, 'right', 'header', 'Receipt Title'),

      // Receipt meta card
      rect(tableX, metaCardY, tableW, metaCardH, WHITE, DIVIDER, 1, 6, 'body', 'Meta Card'),
      txt(metaCol1X, metaInnerY, metaColW - 12, 16,
        'Receipt No.', 11, 'bold', SLATE, 'left', 'body', 'Receipt No Label'),
      { ...ph(metaCol1X, metaInnerY + 16, metaColW - 12, 22,
          '{{receipt_number}}', 'Receipt Number',
          16, NAVY, 'left', 'body'), fontWeight: 'bold' },

      txt(metaCol2X, metaInnerY, metaColW - 12, 16,
        'Date', 11, 'bold', SLATE, 'left', 'body', 'Date Label'),
      { ...ph(metaCol2X, metaInnerY + 16, metaColW - 12, 22,
          '{{document_generation_date}}', 'Generation Date',
          16, NAVY, 'left', 'body'), fontWeight: 'bold' },

      txt(metaCol3X, metaInnerY, metaColW - 12, 16,
        'Session', 11, 'bold', SLATE, 'left', 'body', 'Session Label'),
      { ...ph(metaCol3X, metaInnerY + 16, metaColW - 12, 22,
          '{{academic_session}}', 'Academic Session',
          16, NAVY, 'left', 'body'), fontWeight: 'bold' },

      // Student info section title
      txt(M + 8, studentY, w - (M + 8) * 2, 18,
        'Student Information', 16, 'bold', NAVY, 'left', 'body', 'Student Info Title'),
      { ...divEl(M + 8, studentY + 18, 180, GOLD, 'body'), height: 2 },

      // Student info grid (2 columns × 4 rows)
      // Row 1
      txt(infoCol1X, studentY + 32, infoColW - 8, infoLabelH,
        'Student Name', 11, 'bold', SLATE, 'left', 'body'),
      { ...ph(infoCol1X, studentY + 32 + infoLabelH + infoGap, infoColW - 8, infoValueH,
          '{{student_full_name}}', 'Student Full Name',
          14, TEXT, 'left', 'body'), fontWeight: 'bold' },

      txt(infoCol2X, studentY + 32, infoColW - 8, infoLabelH,
        'Login ID', 11, 'bold', SLATE, 'left', 'body'),
      { ...ph(infoCol2X, studentY + 32 + infoLabelH + infoGap, infoColW - 8, infoValueH,
          '{{student_login_id}}', 'Student Login ID',
          14, TEXT, 'left', 'body'), fontWeight: 'bold' },

      // Row 2
      txt(infoCol1X, studentY + 32 + infoRowH, infoColW - 8, infoLabelH,
        'Class / Section', 11, 'bold', SLATE, 'left', 'body'),
      { ...ph(infoCol1X, studentY + 32 + infoRowH + infoLabelH + infoGap, infoColW - 8, infoValueH,
          '{{student_class}}', 'Student Class',
          14, TEXT, 'left', 'body'), fontWeight: 'bold' },
      { ...ph(infoCol1X + 80, studentY + 32 + infoRowH + infoLabelH + infoGap, infoColW - 88, infoValueH,
          '{{student_section}}', 'Student Section',
          14, TEXT, 'left', 'body') },

      txt(infoCol2X, studentY + 32 + infoRowH, infoColW - 8, infoLabelH,
        'Verification ID', 11, 'bold', SLATE, 'left', 'body'),
      { ...ph(infoCol2X, studentY + 32 + infoRowH + infoLabelH + infoGap, infoColW - 8, infoValueH,
          '{{student_verification_id}}', 'Student Verification ID',
          14, GOLD, 'left', 'body'), fontWeight: 'bold' },

      // Row 3
      txt(infoCol1X, studentY + 32 + infoRowH * 2, infoColW - 8, infoLabelH,
        'Roll Number', 11, 'bold', SLATE, 'left', 'body'),
      { ...ph(infoCol1X, studentY + 32 + infoRowH * 2 + infoLabelH + infoGap, infoColW - 8, infoValueH,
          '{{student_roll_number}}', 'Roll Number',
          14, TEXT, 'left', 'body'), fontWeight: 'bold' },

      txt(infoCol2X, studentY + 32 + infoRowH * 2, infoColW - 8, infoLabelH,
        'Admission Ref.', 11, 'bold', SLATE, 'left', 'body'),
      { ...ph(infoCol2X, studentY + 32 + infoRowH * 2 + infoLabelH + infoGap, infoColW - 8, infoValueH,
          '{{admission_reference_number}}', 'Admission Reference Number',
          14, TEXT, 'left', 'body'), fontWeight: 'bold' },

      // Row 4 - QR verification
      txt(infoCol2X, studentY + 32 + infoRowH * 3, infoColW - 8, infoLabelH,
        'Verify Online', 11, 'bold', SLATE, 'left', 'body'),
      { ...qrEl(infoCol2X, studentY + 32 + infoRowH * 3 + infoLabelH + infoGap, 44, 'body'), zIndex: 6 },

      // Fee table header
      rect(tableX, tableY, tableW, thH, NAVY, 'transparent', 0, 0, 'body', 'Table Header'),
      txt(descColX, tableY + 10, descColW - 8, 18,
        'Fee Description', 13, 'bold', WHITE, 'left', 'body'),
      txt(amtColX, tableY + 10, amtColW - 8, 18,
        'Amount (₹)', 13, 'bold', WHITE, 'right', 'body'),

      // Tuition Fee row
      rect(tableX, tableY + thH, tableW, rowH - 1, '#FFFFFF', DIVIDER, 0.5, 0, 'body', 'Tuition Row'),
      txt(descColX, tableY + thH + 8, descColW - 8, 18, 'Tuition Fee', 13, '600', TEXT, 'left', 'body'),
      { ...ph(amtColX, tableY + thH + 8, amtColW - 8, 18,
          '{{tuition_fee}}', 'Tuition Fee',
          13, NAVY, 'right', 'body'), fontWeight: '600' },

      // Admission Fee row
      rect(tableX, tableY + thH + rowH, tableW, rowH - 1, IVORY, DIVIDER, 0.5, 0, 'body', 'Admission Row'),
      txt(descColX, tableY + thH + rowH + 8, descColW - 8, 18, 'Admission Fee', 13, '600', TEXT, 'left', 'body'),
      { ...ph(amtColX, tableY + thH + rowH + 8, amtColW - 8, 18,
          '{{admission_fee}}', 'Admission Fee',
          13, NAVY, 'right', 'body'), fontWeight: '600' },

      // Examination Fee row
      rect(tableX, tableY + thH + rowH * 2, tableW, rowH - 1, '#FFFFFF', DIVIDER, 0.5, 0, 'body', 'Exam Row'),
      txt(descColX, tableY + thH + rowH * 2 + 8, descColW - 8, 18, 'Examination Fee', 13, '600', TEXT, 'left', 'body'),
      { ...ph(amtColX, tableY + thH + rowH * 2 + 8, amtColW - 8, 18,
          '{{examination_fee}}', 'Examination Fee',
          13, NAVY, 'right', 'body'), fontWeight: '600' },

      // Discount row
      rect(tableX, tableY + thH + rowH * 3, tableW, rowH - 1, IVORY, DIVIDER, 0.5, 0, 'body', 'Discount Row'),
      txt(descColX, tableY + thH + rowH * 3 + 8, descColW - 8, 18, 'Discount', 13, '600', '#16a34a', 'left', 'body'),
      { ...ph(amtColX, tableY + thH + rowH * 3 + 8, amtColW - 8, 18,
          '{{discount}}', 'Discount',
          13, '#16a34a', 'right', 'body'), fontWeight: '600' },

      // Previous Due row
      rect(tableX, tableY + thH + rowH * 4, tableW, rowH - 1, '#FFFFFF', DIVIDER, 0.5, 0, 'body', 'Due Row'),
      txt(descColX, tableY + thH + rowH * 4 + 8, descColW - 8, 18, 'Previous Due', 13, '600', '#dc2626', 'left', 'body'),
      { ...ph(amtColX, tableY + thH + rowH * 4 + 8, amtColW - 8, 18,
          '{{previous_due}}', 'Previous Due',
          13, '#dc2626', 'right', 'body'), fontWeight: '600' },

      // Grand total row
      rect(tableX, totalY, tableW, totalH, NAVY, GOLD, 1, 0, 'body', 'Grand Total Row'),
      txt(descColX, totalY + 10, descColW - 8, 20,
        'Grand Total', 15, 'bold', WHITE, 'left', 'body'),
      { ...ph(amtColX, totalY + 10, amtColW - 8, 20,
          '{{grand_total}}', 'Grand Total',
          15, GOLD, 'right', 'body'), fontWeight: 'bold' },

      // Principal signature
      { ...divEl(sigX, sigRuleY, sigW, DIVIDER, 'footer'), height: 1 },
      { ...sigEl(sigX, sigY, sigW, sigH, true, 'footer'), zIndex: 6 },
      txt(sigX, sigLabelY, sigW, 12,
        'Authorised Signatory', 10, 'bold', SLATE, 'center', 'footer', 'Signatory Label'),

      // Footer text
      txt(M + 8, footerTextY, w - (M + 8) * 2, 14,
        'This is a computer generated receipt.', 9, 'normal', SLATE, 'center', 'footer', 'Generated Note'),
      txt(M + 8, footerTextY + 14, w - (M + 8) * 2, 14,
        'Powered by RSBS School ERP', 9, 'bold', NAVY, 'center', 'footer', 'Powered By'),

      // Gold baseline bar
      { ...divEl(4, h - 4, w - 8, GOLD, 'footer'), height: 3, zIndex: 7 },
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 13 – CUSTOM BLANK (A4)
// ═══════════════════════════════════════════════════════════════════════════════
function buildCustomBlank(): StudioState {
  const { w, h } = A4;
  return {
    name: 'Custom Template', type: 'Certificate',
    page: { size: 'A4', orientation: 'portrait', width: w, height: h },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: true, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [bg('#ffffff', w, h)],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 14 – PREMIUM STUDENT ID CARD  (FRONT)
//
// Design concept: "Split Canvas"
//   Left column (38% width): deep navy accent strip — logo top, photo centre, QR bottom
//   Right column (62% width): light surface — all text info stacked cleanly
//   Thin gold baseline accent line near bottom
//   Rounded corners (8 px) via border element
//   Palette: #0d1b2a (navy) | #c9a84c (gold) | #f0f4f8 (surface) | #1a2e44 (text)
// ═══════════════════════════════════════════════════════════════════════════════
function buildPremiumStudentIDFront(): StudioState {
  const { w, h } = IDC; // 337 × 213
  const M = IDC_M;      // 5

  // ── Column geometry ──────────────────────────────────────────────────────
  const leftW  = 118;           // navy accent strip
  const rightX = leftW;
  const rightW = w - leftW;

  // ── Left strip elements ───────────────────────────────────────────────────
  const logoSize  = 32;
  const logoX     = Math.round(leftW / 2 - logoSize / 2);
  const logoY     = M + 4;

  const photoW    = 62;
  const photoH    = 76;
  const photoCX   = Math.round(leftW / 2 - photoW / 2);
  const photoY    = logoY + logoSize + 10;

  const qrSize    = 34;
  const qrX       = Math.round(leftW / 2 - qrSize / 2);
  const qrY       = photoY + photoH + 9;

  // ── Right column: text stack ──────────────────────────────────────────────
  const rx       = rightX + 10;   // left edge for text
  const rw       = rightW - 14;   // usable text width
  const ry0      = M + 4;

  // School name (2 lines max)
  const schoolNameY = ry0;
  // "STUDENT" badge label
  const badgeY      = schoolNameY + 22;
  // Thin gold rule
  const rule1Y      = badgeY + 14;
  // Info rows start
  const rowGap      = 15;
  const row1Y       = rule1Y + 7;
  const row2Y       = row1Y + rowGap;
  const row3Y       = row2Y + rowGap;
  const row4Y       = row3Y + rowGap;
  const row5Y       = row4Y + rowGap;
  // Bottom: session + sig
  const sigW        = 56;
  const sigH        = 28;
  const sigX        = rightX + rightW - sigW - 6;
  const sigY_       = h - M - sigH - 4;
  const sessionY    = sigY_ + 4;

  // ── Gold baseline accent ──────────────────────────────────────────────────
  const accentY = h - 8;

  // ── Validate row5 fits ────────────────────────────────────────────────────
  // row5Y + 12 should be < sigY_ - 4
  // With these numbers: row5Y ≈ 5+4+22+14+7+7+4*15 = ~133, sigY_ ≈ 213-5-28-4 = 176 ✓

  return validateAndFix({
    name: 'Premium Student ID — Front', type: 'ID Card',
    page: { size: 'ID Card', orientation: 'landscape', width: w, height: h },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [
      // ── Background ──────────────────────────────────────────────────────
      bg('#f0f4f8', w, h),

      // ── Left accent strip ───────────────────────────────────────────────
      { ...rect(0, 0, leftW, h, '#0d1b2a', 'transparent', 0, 0, 'body', 'Left Strip'), zIndex: 1 },

      // ── Rounded corner border overlay ───────────────────────────────────
      border(w, h, '#c9a84c', 2, 8),

      // ── Gold divider between columns ────────────────────────────────────
      { ...divEl(leftW, M + 4, 2, '#c9a84c', 'body'), width: 2, height: h - (M + 4) * 2, zIndex: 3 },

      // ── LEFT: Logo ───────────────────────────────────────────────────────
      logoEl(logoX, logoY, logoSize, logoSize, 'header'),

      // ── LEFT: Photo ──────────────────────────────────────────────────────
      photoEl(photoCX, photoY, photoW, photoH, 6),

      // ── LEFT: QR Code ───────────────────────────────────────────────────
      qrEl(qrX, qrY, qrSize, 'body'),

      // ── RIGHT: School name ───────────────────────────────────────────────
      ph(rx, schoolNameY, rw, 20,
        '{{school_official_name}}', 'School Official Name',
        8, '#c9a84c', 'left', 'header'),

      // ── RIGHT: STUDENT badge label ───────────────────────────────────────
      txt(rx, badgeY, 54, 11,
        'STUDENT', 6, 'bold', '#ffffff', 'left', 'body', 'Badge Label'),
      { ...rect(rx - 2, badgeY - 1, 56, 11, '#c9a84c', 'transparent', 0, 3, 'body', 'Badge BG'), zIndex: 4 },
      txt(rx, badgeY, 54, 11, 'STUDENT', 6, 'bold', '#0d1b2a', 'left', 'body', 'Badge Text'),

      // ── RIGHT: Gold rule ──────────────────────────────────────────────────
      divEl(rx, rule1Y, rw, '#c9a84c80', 'body'),

      // ── RIGHT: Student name ───────────────────────────────────────────────
      ph(rx, row1Y, rw, 13,
        '{{student_full_name}}', 'Student Full Name',
        9, '#0d1b2a', 'left', 'body'),

      // ── RIGHT: Adm Ref ────────────────────────────────────────────────────
      txt(rx, row2Y, 34, 10, 'Adm:', 6, 'bold', '#64748b', 'left', 'body'),
      ph(rx + 36, row2Y, rw - 36, 10,
        '{{admission_reference_number}}', 'Admission Ref',
        6, '#1a2e44', 'left', 'body'),

      // ── RIGHT: Class & Section ────────────────────────────────────────────
      txt(rx, row3Y, 34, 10, 'Class:', 6, 'bold', '#64748b', 'left', 'body'),
      ph(rx + 36, row3Y, 48, 10,
        '{{student_class}}', 'Student Class',
        6, '#1a2e44', 'left', 'body'),
      txt(rx + 88, row3Y, 22, 10, 'Sec:', 6, 'bold', '#64748b', 'left', 'body'),
      ph(rx + 112, row3Y, rw - 112, 10,
        '{{student_section}}', 'Student Section',
        6, '#1a2e44', 'left', 'body'),

      // ── RIGHT: Verification ID ────────────────────────────────────────────
      txt(rx, row4Y, 34, 10, 'ID:', 6, 'bold', '#64748b', 'left', 'body'),
      ph(rx + 36, row4Y, rw - 36, 10,
        '{{student_verification_id}}', 'Verification ID',
        6, '#c9a84c', 'left', 'body'),

      // ── RIGHT: Roll No ────────────────────────────────────────────────────
      txt(rx, row5Y, 34, 10, 'Roll:', 6, 'bold', '#64748b', 'left', 'body'),
      ph(rx + 36, row5Y, rw - 36, 10,
        '{{student_roll_number}}', 'Roll Number',
        6, '#1a2e44', 'left', 'body'),

      // ── RIGHT: Session + Principal Sig ────────────────────────────────────
      ph(rx, sessionY, rw - sigW - 8, 10,
        '{{academic_session}}', 'Academic Session',
        6, '#64748b', 'left', 'footer'),
      sigEl(sigX, sigY_, sigW, sigH, true, 'footer'),

      // ── Gold baseline accent ───────────────────────────────────────────────
      { ...divEl(0, accentY, w, '#c9a84c', 'footer'), height: 3 },
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 15 – PREMIUM STUDENT ID CARD  (BACK)
//
// Design concept: matches front visual identity
//   Top: narrow navy header bar with school name + gold accent rule
//   Body: two info columns (DOB left, Email right)
//   Centre: frosted instructions box with numbered rules
//   Footer: lost-card notice | property line | powered-by | copyright
//   Same navy/gold/surface palette as front
// ═══════════════════════════════════════════════════════════════════════════════
function buildPremiumStudentIDBack(): StudioState {
  const { w, h } = IDC; // 337 × 213
  const M = IDC_M;      // 5

  // ── Header bar ────────────────────────────────────────────────────────────
  const headerH  = 26;
  const rule1Y   = headerH;

  // ── Info columns (two items side-by-side) ─────────────────────────────────
  const colW     = Math.floor((w - M * 2 - 8) / 2);
  const col1X    = M + 4;
  const col2X    = col1X + colW + 8;
  const infoY    = rule1Y + 9;

  // ── Instructions box ──────────────────────────────────────────────────────
  const boxX     = M + 4;
  const boxY     = infoY + 32;
  const boxW     = w - (M + 4) * 2;
  const boxH     = 76;
  const txtX     = boxX + 6;
  const txtW     = boxW - 12;

  // ── Footer strip ──────────────────────────────────────────────────────────
  const footerH  = 36;
  const footerY  = h - footerH;
  const accentY  = h - 8;

  // Instruction lines — static text (no per-line placeholder needed)
  const instrLines = [
    '1. This card must be worn visibly within school premises.',
    '2. Report loss immediately to the school administration.',
    '3. This card is non-transferable and remains school property.',
    '4. Present this card on demand by any school authority.',
  ];
  const instrLineH = 12;
  const instrStart = boxY + 8;

  return validateAndFix({
    name: 'Premium Student ID — Back', type: 'ID Card',
    page: { size: 'ID Card', orientation: 'landscape', width: w, height: h },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [
      // ── Background ──────────────────────────────────────────────────────
      bg('#f0f4f8', w, h),

      // ── Rounded corner border overlay ───────────────────────────────────
      border(w, h, '#c9a84c', 2, 8),

      // ── Header bar ───────────────────────────────────────────────────────
      { ...band(0, 0, w, headerH, '#0d1b2a', 'header', 'Header Bar'), zIndex: 1 },
      ph(M + 4, 7, w - (M + 4) * 2, 13,
        '{{school_official_name}}', 'School Official Name',
        7, '#f0f4f8', 'center', 'header'),

      // ── Gold rule under header ────────────────────────────────────────────
      { ...divEl(0, rule1Y, w, '#c9a84c', 'body'), height: 2 },

      // ── Two-column info: DOB | Email ──────────────────────────────────────
      txt(col1X, infoY,      44, 9, 'Date of Birth', 5, 'bold', '#64748b', 'left', 'body'),
      ph(col1X,  infoY + 10, colW, 12,
        '{{date_of_birth}}', 'Date of Birth',
        7, '#0d1b2a', 'left', 'body'),

      txt(col2X, infoY,      54, 9, 'School Email', 5, 'bold', '#64748b', 'left', 'body'),
      ph(col2X,  infoY + 10, colW, 12,
        '{{school_contact_email}}', 'School Email',
        7, '#0d1b2a', 'left', 'body'),

      // ── Instructions box ─────────────────────────────────────────────────
      rect(boxX, boxY, boxW, boxH,
        '#e8eef4', '#c9a84c', 1, 4, 'body', 'Instructions Box'),
      txt(txtX, boxY + 4, txtW, 9, 'IMPORTANT INSTRUCTIONS', 5, 'bold', '#c9a84c', 'left', 'body'),
      ...instrLines.map((line, i) =>
        txt(txtX, instrStart + i * instrLineH, txtW, instrLineH - 1,
          line, 5, 'normal', '#334155', 'left', 'body',
          `Instruction ${i + 1}`)
      ),

      // ── Footer strip ─────────────────────────────────────────────────────
      { ...band(0, footerY, w, footerH, '#0d1b2a', 'footer', 'Footer Strip'), zIndex: 2 },
      txt(M + 4, footerY + 3, w - (M + 4) * 2, 8,
        'If found, please return to school administration.', 5, 'normal', '#c9a84c', 'center', 'footer',
        'Lost Card Notice'),
      txt(M + 4, footerY + 12, w - (M + 4) * 2, 8,
        'Property of RSBS School  •  Powered by Inolas Technologies', 5, 'normal', '#94a3b8', 'center', 'footer',
        'Property Line'),
      txt(M + 4, footerY + 22, w - (M + 4) * 2, 8,
        '© All Rights Reserved', 5, 'normal', '#64748b', 'center', 'footer',
        'Copyright'),

      // ── Gold baseline accent ───────────────────────────────────────────────
      { ...divEl(0, accentY, w, '#c9a84c', 'footer'), height: 3 },
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 16 – ULTRA PREMIUM STUDENT ID CARD  (FRONT)   v4 — Production Polish
//
// CR80 canvas: 337 × 213 px  |  Physical: 85.6 × 54 mm
// Safe margin: 5 px all sides (IDC_M)
//
// LAYOUT
//   Left navy strip  (0 → 114 px wide, full height)
//     • School logo   centred, top of strip (32 × 32)
//     • Student photo centred, below logo   (70 × 86)   — passport aspect
//     • Thin gold separator
//     • QR code       perfectly centred     (36 × 36)
//     • "Scan to Verify" caption
//
//   Thin 1-px gold vertical rule at x = 114
//
//   Right info column  (124 → 332 px, width = 208 px usable)
//     • School Official Name  — prominent, bold, 7.5 pt
//     • "STUDENT" navy chip (gold text)
//     • 2-px gold divider
//     • 7 field rows (label 5 pt slate + value 6.5 pt navy):
//         Student Name · Class+Section · Session · Gender · DOB · VerID · Enroll
//     • Principal Signature  bottom-right, 62 × 26, centred below thin rule
//
//   3-px gold baseline bar  bottom edge
// ═══════════════════════════════════════════════════════════════════════════════
function buildUltraPremiumIDCardFront(): StudioState {
  const { w, h } = IDC;   // 337 × 213
  const M = IDC_M;         // 5

  // ── Palette ───────────────────────────────────────────────────────────────
  const NAVY    = '#0B1D3A';
  const WHITE   = '#FFFFFF';
  const GOLD    = '#C9A84C';
  const IVORY   = '#F7F8FA';
  const SLATE   = '#5A6A7A';
  const DIVIDER = '#D8E0EA';
  const TEXT    = '#0B1D3A';

  // ── Left strip geometry ───────────────────────────────────────────────────
  const leftW  = 114;                              // strip width
  const stripCX = Math.round(leftW / 2);          // centre x of strip

  // Logo
  const logoSz = 32;
  const logoX  = stripCX - Math.round(logoSz / 2);
  const logoY  = M + 5;                            // 10 px from top

  // Photo  (passport: 4:5 aspect → 70 × 87)
  const phW = 70;
  const phH = 87;
  const phX = stripCX - Math.round(phW / 2);
  const phY = logoY + logoSz + 7;                  // 7 px gap below logo

  // Gold divider below photo
  const divY = phY + phH + 5;

  // QR  (perfectly centred)
  const qrSz = 36;
  const qrX  = stripCX - Math.round(qrSz / 2);
  const qrY  = divY + 4;

  // Caption
  const capY = qrY + qrSz + 3;

  // ── Vertical gold rule ────────────────────────────────────────────────────
  const ruleX = leftW;

  // ── Right column ──────────────────────────────────────────────────────────
  const rx  = leftW + 10;                          // content start x
  const rw  = w - rx - M - 2;                     // usable width ≈ 206 px

  // School name
  const schoolY = M + 3;
  const schoolH = 14;

  // Chip
  const chipW  = 54;
  const chipH  = 12;
  const chipY  = schoolY + schoolH + 3;

  // Gold divider below chip
  const chipDivY = chipY + chipH + 4;

  // ── Field rows ────────────────────────────────────────────────────────────
  // Each block: label (5 px h) + 1.5 px gap + value (9 px h) + 3 px sep = 18.5 → ceil 19
  const fLH  = 5;    // label height
  const fVH  = 9;    // value height
  const fGap = 1;    // label→value gap
  const fSep = 4;    // after-value separator
  const fBlk = fLH + fGap + fVH + fSep;   // = 19 px

  // Name row is slightly taller (value = 11 px)
  const nameValueH = 11;
  const nameBlk    = fLH + fGap + nameValueH + fSep;  // = 21 px

  const f0Y = chipDivY + 5;                     // Student Full Name
  const f1Y = f0Y + nameBlk;                    // Class | Section
  const f2Y = f1Y + fBlk;                       // Session
  const f3Y = f2Y + fBlk;                       // Gender
  const f4Y = f3Y + fBlk;                       // Date of Birth
  const f5Y = f4Y + fBlk;                       // Verification ID
  const f6Y = f5Y + fBlk;                       // Enrollment Date

  // ── Principal signature  bottom-right ────────────────────────────────────
  const sigW  = 62;
  const sigH  = 26;
  const sigX  = w - M - sigW;
  // Position: push down to fill remaining space below last field
  const lastFieldBottom = f6Y + fLH + fGap + fVH;
  // Available space between last field and card bottom minus baseline bar (6 px)
  const availH = h - 6 - lastFieldBottom;
  const sigY  = lastFieldBottom + Math.round((availH - sigH - 8) / 2) + 4;
  const sigRuleY  = sigY - 3;
  const sigLabelY = sigY + sigH + 2;

  // Gold baseline
  const baseY = h - 4;

  return validateAndFix({
    name: 'Ultra Premium Student ID — Front', type: 'ID Card',
    page: { size: 'ID Card', orientation: 'landscape', width: w, height: h },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [

      // ── Card surface ──────────────────────────────────────────────────────
      bg(IVORY, w, h),

      // ── Borders: outer navy + inner gold ─────────────────────────────────
      { ...border(w, h, NAVY, 1, 6), zIndex: 1 },
      { ...border(w, h, GOLD, 0.8, 5),
        x: 2, y: 2, width: w - 4, height: h - 4, zIndex: 2 },

      // ── Left navy strip ───────────────────────────────────────────────────
      { ...rect(0, 0, leftW, h, NAVY, 'transparent', 0, 0, 'body', 'Left Navy Strip'),
        zIndex: 3 },

      // ── Vertical gold rule ────────────────────────────────────────────────
      { ...divEl(ruleX, 5, 1, GOLD, 'body'),
        width: 1, height: h - 10, zIndex: 4 },

      // ── Logo ─────────────────────────────────────────────────────────────
      { ...logoEl(logoX, logoY, logoSz, logoSz, 'header'), zIndex: 6 },

      // ── Student Photo ─────────────────────────────────────────────────────
      { ...photoEl(phX, phY, phW, phH, 5), zIndex: 6 },

      // ── Gold divider between photo and QR ─────────────────────────────────
      { ...divEl(M + 3, divY, leftW - M * 2 - 6, GOLD + '50', 'body'),
        height: 1, zIndex: 5 },

      // ── QR code ───────────────────────────────────────────────────────────
      { ...qrEl(qrX, qrY, qrSz, 'body'), zIndex: 6 },

      // ── "Scan to Verify" caption ──────────────────────────────────────────
      txt(0, capY, leftW, 8,
        'Scan to Verify', 4, 'normal', WHITE, 'center', 'body', 'Scan Caption'),

      // ── School Official Name ──────────────────────────────────────────────
      { ...ph(rx, schoolY, rw, schoolH,
          '{{school_official_name}}', 'School Official Name',
          7.5, TEXT, 'left', 'header'),
        fontWeight: 'bold', zIndex: 6 },

      // ── STUDENT chip ──────────────────────────────────────────────────────
      { ...rect(rx, chipY, chipW, chipH, NAVY, 'transparent', 0, 6,
          'body', 'Chip BG'), zIndex: 5 },
      txt(rx, chipY + 1, chipW, chipH - 2,
        'STUDENT', 5, 'bold', GOLD, 'center', 'body', 'Chip Text'),

      // ── Gold divider under chip ────────────────────────────────────────────
      { ...divEl(rx, chipDivY, rw, GOLD, 'body'), height: 1, zIndex: 5 },

      // ── Student Full Name ─────────────────────────────────────────────────
      txt(rx, f0Y, rw, fLH, 'Student Name', 4, 'normal', SLATE, 'left', 'body'),
      { ...ph(rx, f0Y + fLH + fGap, rw, nameValueH,
          '{{student_full_name}}', 'Student Full Name',
          7, TEXT, 'left', 'body'), fontWeight: 'bold' },
      { ...divEl(rx, f0Y + nameBlk - 1, rw, DIVIDER, 'body'), height: 1 },

      // ── Class | Section (50/50) ───────────────────────────────────────────
      txt(rx,                  f1Y, Math.floor(rw / 2) - 3, fLH, 'Class',   4, 'normal', SLATE, 'left', 'body'),
      txt(rx + Math.floor(rw / 2), f1Y, Math.ceil(rw / 2),  fLH, 'Section', 4, 'normal', SLATE, 'left', 'body'),
      ph(rx,                  f1Y + fLH + fGap, Math.floor(rw / 2) - 3, fVH,
        '{{student_class}}',   'Student Class',   6, TEXT, 'left', 'body'),
      ph(rx + Math.floor(rw / 2), f1Y + fLH + fGap, Math.ceil(rw / 2), fVH,
        '{{student_section}}', 'Student Section', 6, TEXT, 'left', 'body'),
      { ...divEl(rx, f1Y + fBlk - 1, rw, DIVIDER, 'body'), height: 1 },

      // ── Academic Session ─────────────────────────────────────────────────
      txt(rx, f2Y, rw, fLH, 'Academic Session', 4, 'normal', SLATE, 'left', 'body'),
      ph(rx, f2Y + fLH + fGap, rw, fVH,
        '{{academic_session}}', 'Academic Session', 6, TEXT, 'left', 'body'),
      { ...divEl(rx, f2Y + fBlk - 1, rw, DIVIDER, 'body'), height: 1 },

      // ── Gender ────────────────────────────────────────────────────────────
      txt(rx, f3Y, rw, fLH, 'Gender', 4, 'normal', SLATE, 'left', 'body'),
      ph(rx, f3Y + fLH + fGap, rw, fVH,
        '{{student_gender}}', 'Student Gender', 6, TEXT, 'left', 'body'),
      { ...divEl(rx, f3Y + fBlk - 1, rw, DIVIDER, 'body'), height: 1 },

      // ── Date of Birth ─────────────────────────────────────────────────────
      txt(rx, f4Y, rw, fLH, 'Date of Birth', 4, 'normal', SLATE, 'left', 'body'),
      ph(rx, f4Y + fLH + fGap, rw, fVH,
        '{{date_of_birth}}', 'Date of Birth', 6, TEXT, 'left', 'body'),
      { ...divEl(rx, f4Y + fBlk - 1, rw, DIVIDER, 'body'), height: 1 },

      // ── Verification ID (gold accent) ──────────────────────────────────────
      txt(rx, f5Y, rw, fLH, 'Verification ID', 4, 'normal', SLATE, 'left', 'body'),
      { ...ph(rx, f5Y + fLH + fGap, rw, fVH,
          '{{student_verification_id}}', 'Verification ID', 6, GOLD, 'left', 'body'),
        fontWeight: 'bold' },
      { ...divEl(rx, f5Y + fBlk - 1, rw, DIVIDER, 'body'), height: 1 },

      // ── Enrollment Date ───────────────────────────────────────────────────
      txt(rx, f6Y, rw, fLH, 'Enrollment Date', 4, 'normal', SLATE, 'left', 'body'),
      ph(rx, f6Y + fLH + fGap, rw, fVH,
        '{{enrollment_date}}', 'Enrollment Date', 6, TEXT, 'left', 'body'),

      // ── Principal Signature ───────────────────────────────────────────────
      { ...divEl(sigX - 2, sigRuleY, sigW + 2, DIVIDER, 'footer'), height: 1 },
      { ...sigEl(sigX, sigY, sigW, sigH, true, 'footer'), zIndex: 6 },
      txt(sigX, sigLabelY, sigW, 7,
        'Principal', 4, 'normal', SLATE, 'center', 'footer', 'Principal Label'),

      // ── Gold baseline bar ─────────────────────────────────────────────────
      { ...divEl(4, baseY, w - 8, GOLD, 'footer'), height: 3, zIndex: 7 },
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET 17 – ULTRA PREMIUM STUDENT ID CARD  (BACK)   v4 — Production Polish
//
// CR80 canvas: 337 × 213 px
//
// LAYOUT  (top → bottom, all within 5-px margin)
//   Navy header band  (0 → 32 px)
//     • School Official Name  centred, 7 pt white, bold
//
//   Double gold rule  (32 + 34 px)
//
//   Contact block  (41 → 100 px)
//     Each row: bold gold label (42 px wide) + value placeholder
//     Row heights are generous (18 px each) to allow text wrapping
//     Address  /  Email  /  Phone
//     Thin ivory dividers between rows
//
//   Thin gold separator rule
//
//   Notice box  (auto-sized, no dotted borders)
//     Title: "OFFICIAL NOTICE" (gold, bold, centred)
//     3 notice lines (navy, 4.5 pt, centred)
//
//   Navy footer strip  (last 30 px)
//     "Powered by Inolas Technologies"  (gold, bold, centred)
//     "An RSBS Product  •  All Rights Reserved"  (white, centred)
//
//   Gold baseline bar  (3 px)
// ═══════════════════════════════════════════════════════════════════════════════
function buildUltraPremiumIDCardBack(): StudioState {
  const { w, h } = IDC;   // 337 × 213
  const M = IDC_M;         // 5

  // ── Palette ───────────────────────────────────────────────────────────────
  const NAVY       = '#0B1D3A';
  const WHITE      = '#FFFFFF';
  const GOLD       = '#C9A84C';
  const IVORY      = '#F7F8FA';
  const SLATE      = '#5A6A7A';
  const DIVIDER    = '#D8E0EA';
  const NAVY_TINT  = '#0B1D3A12';

  // ── Header ────────────────────────────────────────────────────────────────
  const hdrH   = 32;
  const nameY  = Math.round((hdrH - 12) / 2);    // vertically centred in band

  // ── Double gold rules ─────────────────────────────────────────────────────
  const rule1Y = hdrH;
  const rule2Y = hdrH + 3;

  // ── Contact block ─────────────────────────────────────────────────────────
  const cStartY = rule2Y + 7;
  const cLabelW = 44;                              // label column width
  const cValueX = M + cLabelW + 4;
  const cValueW = w - cValueX - M;
  // Row height is 18 px — generous for address wrapping (up to 2 lines)
  const cRowH   = 18;
  const cGap    = 1;                               // divider between rows

  const addrY  = cStartY;
  const emailY = addrY  + cRowH + cGap;
  const phoneY = emailY + cRowH + cGap;

  // ── Separator rule below contact ──────────────────────────────────────────
  const sep2Y  = phoneY + cRowH + 5;

  // ── Notice box ────────────────────────────────────────────────────────────
  const bx     = M + 4;
  const bY     = sep2Y + 5;
  const bW     = w - (M + 4) * 2;
  // Content: title (7px) + rule (3px) + 3 × line (10px each) + top+bot pad (5+5)
  const bH     = 7 + 3 + 10 * 3 + 10;             // = 50 px
  const nInX   = bx + 7;
  const nW     = bW - 14;

  // ── Footer ────────────────────────────────────────────────────────────────
  const ftrH   = 30;
  const ftrY   = h - ftrH;
  const baseY  = h - 4;

  return validateAndFix({
    name: 'Ultra Premium Student ID — Back', type: 'ID Card',
    page: { size: 'ID Card', orientation: 'landscape', width: w, height: h },
    headerEnabled: true, bodyEnabled: true, footerEnabled: true,
    showGrid: false, gridSize: 'medium', snapToGrid: false, snapToElements: true,
    elements: [

      // ── Card surface ──────────────────────────────────────────────────────
      bg(IVORY, w, h),

      // ── Borders ───────────────────────────────────────────────────────────
      { ...border(w, h, NAVY, 1, 6), zIndex: 1 },
      { ...border(w, h, GOLD, 0.8, 5),
        x: 2, y: 2, width: w - 4, height: h - 4, zIndex: 2 },

      // ── Navy header band ──────────────────────────────────────────────────
      { ...band(0, 0, w, hdrH, NAVY, 'header', 'Header Band'), zIndex: 3 },

      // ── School Official Name (white, bold, centred) ───────────────────────
      { ...ph(M + 4, nameY, w - (M + 4) * 2, 14,
          '{{school_official_name}}', 'School Official Name',
          7, WHITE, 'center', 'header'),
        fontWeight: 'bold', zIndex: 6 },

      // ── Double gold rule ──────────────────────────────────────────────────
      { ...divEl(8, rule1Y, w - 16, GOLD, 'body'), height: 1.5, zIndex: 5 },
      { ...divEl(8, rule2Y, w - 16, GOLD + '60', 'body'), height: 0.8, zIndex: 5 },

      // ── Address row ───────────────────────────────────────────────────────
      txt(M + 2, addrY + 3, cLabelW, cRowH - 6,
        'Address', 4.5, 'bold', GOLD, 'left', 'body'),
      // Address value: tall enough to wrap 2 lines
      ph(cValueX, addrY + 2, cValueW, cRowH - 4,
        '{{school_complete_address}}', 'School Address',
        5, NAVY, 'left', 'body'),
      { ...divEl(M + 2, addrY + cRowH, w - M * 2 - 4, DIVIDER, 'body'), height: 1 },

      // ── Email row ─────────────────────────────────────────────────────────
      txt(M + 2, emailY + 4, cLabelW, cRowH - 8,
        'Email', 4.5, 'bold', GOLD, 'left', 'body'),
      ph(cValueX, emailY + 3, cValueW, cRowH - 6,
        '{{school_contact_email}}', 'School Email',
        5, NAVY, 'left', 'body'),
      { ...divEl(M + 2, emailY + cRowH, w - M * 2 - 4, DIVIDER, 'body'), height: 1 },

      // ── Phone row ─────────────────────────────────────────────────────────
      txt(M + 2, phoneY + 4, cLabelW, cRowH - 8,
        'Phone', 4.5, 'bold', GOLD, 'left', 'body'),
      ph(cValueX, phoneY + 3, cValueW, cRowH - 6,
        '{{school_contact_phone}}', 'School Phone',
        5, NAVY, 'left', 'body'),

      // ── Separator gold rule below contact ─────────────────────────────────
      { ...divEl(8, sep2Y, w - 16, GOLD, 'body'), height: 1, zIndex: 5 },

      // ── Notice box background ─────────────────────────────────────────────
      rect(bx, bY, bW, bH, NAVY_TINT, GOLD, 1, 4, 'body', 'Notice Box'),

      // ── Notice title ─────────────────────────────────────────────────────
      txt(nInX, bY + 4, nW, 7,
        'OFFICIAL NOTICE', 4.5, 'bold', GOLD, 'center', 'body', 'Notice Title'),

      // Thin gold rule below notice title
      { ...divEl(nInX, bY + 12, nW, GOLD + '80', 'body'), height: 0.5 },

      // ── Notice body  (3 lines, centred, navy) ─────────────────────────────
      txt(nInX, bY + 16, nW, 10,
        'This card is the official property of the school.', 4.5, 'normal', SLATE, 'center', 'body', 'Notice L1'),
      txt(nInX, bY + 26, nW, 10,
        'Carry it at all times on campus. If found,', 4.5, 'normal', SLATE, 'center', 'body', 'Notice L2'),
      txt(nInX, bY + 36, nW, 10,
        'please return to the school administration.', 4.5, 'normal', SLATE, 'center', 'body', 'Notice L3'),

      // ── Navy footer strip ─────────────────────────────────────────────────
      { ...band(0, ftrY, w, ftrH, NAVY, 'footer', 'Footer Strip'), zIndex: 2 },

      txt(M, ftrY + 7, w - M * 2, 10,
        'Powered by Inolas Technologies', 5, 'bold', GOLD, 'center', 'footer', 'Powered By'),
      txt(M, ftrY + 18, w - M * 2, 9,
        'An RSBS Product  •  All Rights Reserved', 4.5, 'normal', WHITE, 'center', 'footer', 'RSBS Line'),

      // ── Gold baseline bar ─────────────────────────────────────────────────
      { ...divEl(4, baseY, w - 8, GOLD, 'footer'), height: 3, zIndex: 7 },
    ],
  });
}

// ─── EXPORTED GALLERY CATALOG ─────────────────────────────────────────────────

export type TemplateCategory = 'ID Cards' | 'Certificates' | 'Academic' | 'Admin' | 'Blank';

export interface TemplatePreset {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  paperSize: string;
  tags: string[];
  build: () => StudioState;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'student-id-card',
    name: 'Student ID Card',
    category: 'ID Cards',
    description: 'Complete student identity card with photo, class info, QR code and verification ID.',
    paperSize: 'CR80 (ID Card)',
    tags: ['student', 'id', 'qr'],
    build: buildStudentIDCard,
  },
  {
    id: 'teacher-id-card',
    name: 'Teacher ID Card',
    category: 'ID Cards',
    description: 'Professional faculty identity card with student details and QR code.',
    paperSize: 'CR80 (ID Card)',
    tags: ['teacher', 'faculty', 'id'],
    build: buildTeacherIDCard,
  },
  {
    id: 'staff-id-card',
    name: 'Staff ID Card',
    category: 'ID Cards',
    description: 'Clean staff identity card for administrative personnel.',
    paperSize: 'CR80 (ID Card)',
    tags: ['staff', 'admin', 'id'],
    build: buildStaffIDCard,
  },
  {
    id: 'employee-id',
    name: 'Employee ID',
    category: 'ID Cards',
    description: 'Dark-theme employee identity card with designation and session info.',
    paperSize: 'CR80 (ID Card)',
    tags: ['employee', 'id', 'corporate'],
    build: buildEmployeeID,
  },
  {
    id: 'visitor-pass',
    name: 'Visitor Pass',
    category: 'ID Cards',
    description: 'Day-pass card for school visitors with QR code and visit date.',
    paperSize: 'CR80 (ID Card)',
    tags: ['visitor', 'pass', 'id'],
    build: buildVisitorPass,
  },
  {
    id: 'bonafide-certificate',
    name: 'Bonafide Certificate',
    category: 'Certificates',
    description: 'Official bonafide certificate with gold border, logo and dual signatures.',
    paperSize: 'A4',
    tags: ['bonafide', 'official', 'a4'],
    build: buildBonafideCertificate,
  },
  {
    id: 'transfer-certificate',
    name: 'Transfer Certificate',
    category: 'Certificates',
    description: 'Structured TC with all required student and departure details.',
    paperSize: 'A4',
    tags: ['tc', 'transfer', 'official', 'a4'],
    build: buildTransferCertificate,
  },
  {
    id: 'character-certificate',
    name: 'Character Certificate',
    category: 'Certificates',
    description: 'Purple-themed character certificate with decorative border.',
    paperSize: 'A4',
    tags: ['character', 'conduct', 'certificate'],
    build: buildCharacterCertificate,
  },
  {
    id: 'achievement-certificate',
    name: 'Achievement Certificate',
    category: 'Certificates',
    description: 'Landscape gold achievement certificate with star accents.',
    paperSize: 'A5 Landscape',
    tags: ['achievement', 'award', 'landscape'],
    build: buildAchievementCertificate,
  },
  {
    id: 'report-card',
    name: 'Report Card',
    category: 'Academic',
    description: 'Full progress report with marks table, grades and overall result.',
    paperSize: 'A4',
    tags: ['report', 'marks', 'grades', 'result'],
    build: buildReportCard,
  },
  {
    id: 'admit-card',
    name: 'Admit Card',
    category: 'Academic',
    description: 'Examination admit card with timetable and instructions.',
    paperSize: 'A5',
    tags: ['exam', 'admit', 'hall ticket'],
    build: buildAdmitCard,
  },
  {
    id: 'fee-receipt',
    name: 'Fee Receipt',
    category: 'Admin',
    description: 'Professional, premium A4 fee collection receipt with school branding, itemised fees, grand total and authorised signature.',
    paperSize: 'A4',
    tags: ['fee', 'receipt', 'payment', 'premium', 'invoice'],
    build: buildFeeReceipt,
  },
  {
    id: 'premium-fee-receipt',
    name: 'Premium Fee Receipt',
    category: 'Admin',
    description: 'Production-ready premium fee receipt with real placeholders: student info, itemised fees, grand total, principal signature and Inolas footer.',
    paperSize: 'A4',
    tags: ['fee', 'receipt', 'premium', 'payment', 'invoice'],
    build: buildPremiumFeeReceipt,
  },
  {
    id: 'ultra-premium-student-id-front',
    name: 'Ultra Premium Student ID — Front',
    category: 'ID Cards',
    description: 'Ultra-luxury minimal design: ivory canvas with educational wallpaper, onyx/gold palette, photo left, full info right. PVC print-ready.',
    paperSize: 'CR80 (ID Card)',
    tags: ['student', 'id', 'ultra', 'premium', 'luxury', 'double-sided', 'front'],
    build: buildUltraPremiumIDCardFront,
  },
  {
    id: 'ultra-premium-student-id-back',
    name: 'Ultra Premium Student ID — Back',
    category: 'ID Cards',
    description: 'Matching ultra-premium back: school address, phone, email, official notice and Inolas Technologies footer. Same onyx/gold palette.',
    paperSize: 'CR80 (ID Card)',
    tags: ['student', 'id', 'ultra', 'premium', 'luxury', 'double-sided', 'back'],
    build: buildUltraPremiumIDCardBack,
  },
  {
    id: 'custom-blank',
    name: 'Custom Blank',
    category: 'Blank',
    description: 'Start with a clean A4 canvas. Full creative freedom from scratch.',
    paperSize: 'A4',
    tags: ['blank', 'custom', 'empty'],
    build: buildCustomBlank,
  },
  {
    id: 'premium-student-id-front',
    name: 'Premium Student ID — Front',
    category: 'ID Cards',
    description: 'Elegant split-canvas design: navy accent strip with photo/QR left, clean info panel right. Gold accents throughout.',
    paperSize: 'CR80 (ID Card)',
    tags: ['student', 'id', 'premium', 'double-sided', 'front'],
    build: buildPremiumStudentIDFront,
  },
  {
    id: 'premium-student-id-back',
    name: 'Premium Student ID — Back',
    category: 'ID Cards',
    description: 'Matching back side: DOB, school email, instructions box, lost-card notice and branding footer.',
    paperSize: 'CR80 (ID Card)',
    tags: ['student', 'id', 'premium', 'double-sided', 'back'],
    build: buildPremiumStudentIDBack,
  },
];

export const GALLERY_CATEGORIES: { id: string; label: string }[] = [
  { id: 'all',           label: 'All Templates' },
  { id: 'ID Cards',      label: 'ID Cards'       },
  { id: 'Certificates',  label: 'Certificates'   },
  { id: 'Academic',      label: 'Academic'       },
  { id: 'Admin',         label: 'Admin'          },
  { id: 'Blank',         label: 'Blank'          },
];
