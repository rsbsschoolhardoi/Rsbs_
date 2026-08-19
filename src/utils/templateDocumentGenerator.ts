/**
 * Template-Driven A4 / A5 / Letter Document PDF Generator
 *
 * Renders a DocumentTemplate (Certificate / Admin / Academic / Fee Receipt)
 * built in Template Studio directly onto a jsPDF page using the same
 * StudioElement model as the ID Card generator.
 */

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import type { Student, BrandingSettings, DocumentTemplate, FeeReceiptData } from '@/types';
import { legacyToElements, StudioElement, PAGE_PRESETS } from '@/components/template-studio/types';
import { buildPlaceholderMap, resolvePlaceholder } from './placeholderResolver';

const MM_PER_PX = 25.4 / 96; // 1 CSS pixel = 0.26458 mm
const PT_PER_PX = 72 / 96;   // 1 CSS pixel = 0.75 pt (jsPDF setFontSize uses pt)

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function hexToRgba(hex: string): Rgba {
  const clean = hex.replace('#', '').toLowerCase();
  const invalid = { r: 0, g: 0, b: 0, a: 1 };

  const parse = (str: string) => {
    const v = parseInt(str, 16);
    return isNaN(v) ? 0 : v;
  };

  if (clean.length === 3) {
    return {
      r: parse(clean[0] + clean[0]),
      g: parse(clean[1] + clean[1]),
      b: parse(clean[2] + clean[2]),
      a: 1,
    };
  }

  if (clean.length === 4) {
    return {
      r: parse(clean[0] + clean[0]),
      g: parse(clean[1] + clean[1]),
      b: parse(clean[2] + clean[2]),
      a: parse(clean[3] + clean[3]) / 255,
    };
  }

  if (clean.length === 6) {
    return {
      r: parse(clean.slice(0, 2)),
      g: parse(clean.slice(2, 4)),
      b: parse(clean.slice(4, 6)),
      a: 1,
    };
  }

  if (clean.length === 8) {
    return {
      r: parse(clean.slice(0, 2)),
      g: parse(clean.slice(2, 4)),
      b: parse(clean.slice(4, 6)),
      a: parse(clean.slice(6, 8)) / 255,
    };
  }

  return invalid;
}

function setFill(doc: jsPDF, hex: string) {
  const { r, g, b } = hexToRgba(hex);
  doc.setFillColor(r, g, b);
}

function setStroke(doc: jsPDF, hex: string) {
  const { r, g, b } = hexToRgba(hex);
  doc.setDrawColor(r, g, b);
}

function setTextCol(doc: jsPDF, hex: string) {
  const { r, g, b } = hexToRgba(hex);
  doc.setTextColor(r, g, b);
}

function withOpacity(doc: jsPDF, alpha: number, fn: () => void) {
  if (alpha >= 0.99) {
    fn();
    return;
  }
  try {
    const gstate = new (doc as any).GState({ opacity: alpha });
    doc.setGState(gstate);
    fn();
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
  } catch {
    // Fallback: draw fully opaque if GState is not supported
    fn();
  }
}

function detectFormat(dataUrl: string): string {
  if (dataUrl.includes('data:image/png'))  return 'PNG';
  if (dataUrl.includes('data:image/gif'))  return 'GIF';
  if (dataUrl.includes('data:image/webp')) return 'WEBP';
  if (dataUrl.includes('data:image/svg'))  return 'SVG';
  return 'JPEG';
}

function safeAddImage(
  doc: jsPDF,
  dataUrl: string,
  x: number, y: number, w: number, h: number,
) {
  if (!dataUrl) return;
  const fmt = detectFormat(dataUrl);
  try {
    doc.addImage(dataUrl, fmt, x, y, w, h);
  } catch {
    try {
      doc.addImage(dataUrl, 'PNG', x, y, w, h);
    } catch {
      // Image corrupt or unsupported — leave blank
    }
  }
}

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

interface ImageInfo {
  dataUrl: string;
  width: number;
  height: number;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function processImageDataUrl(
  sourceDataUrl: string,
  fit: 'cover' | 'contain' | 'fill',
  w: number,
  h: number,
  borderRadius?: number,
): Promise<ImageInfo | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const width = Math.max(1, Math.round(w));
      const height = Math.max(1, Math.round(h));
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      if (borderRadius && borderRadius > 0) {
        roundRectPath(ctx, 0, 0, width, height, borderRadius);
        ctx.clip();
      }

      const imgRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
      const boxRatio = width / Math.max(1, height);
      let dw = width;
      let dh = height;
      let dx = 0;
      let dy = 0;

      if (fit === 'contain') {
        if (imgRatio > boxRatio) {
          dw = width;
          dh = width / imgRatio;
          dy = (height - dh) / 2;
        } else {
          dh = height;
          dw = height * imgRatio;
          dx = (width - dw) / 2;
        }
      } else if (fit === 'cover') {
        if (imgRatio > boxRatio) {
          dh = height;
          dw = height * imgRatio;
          dx = (width - dw) / 2;
        } else {
          dw = width;
          dh = width / imgRatio;
          dy = (height - dh) / 2;
        }
      }

      ctx.drawImage(img, dx, dy, dw, dh);
      resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
    };
    img.onerror = () => resolve(null);
    img.src = sourceDataUrl;
  });
}

async function generateQRDataUrl(text: string): Promise<string | null> {
  if (!text) return null;
  try {
    return await QRCode.toDataURL(text, {
      width: 256,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });
  } catch {
    return null;
  }
}

async function generateBarcodeDataUrl(text: string): Promise<string | null> {
  if (!text) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 100;
    // jsbarcode may need the canvas attached to the DOM in some envs
    canvas.style.position = 'fixed';
    canvas.style.left = '-9999px';
    document.body.appendChild(canvas);
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: 2,
      height: 60,
      displayValue: false,
      margin: 0,
    });
    const dataUrl = canvas.toDataURL('image/png');
    document.body.removeChild(canvas);
    return dataUrl;
  } catch {
    return null;
  }
}

/**
 * Placeholders that resolve to image URLs must never be printed as text.
 */
const IMAGE_URL_PLACEHOLDERS = new Set([
  '{{student_photo_url}}',
  '{{school_logo_url}}',
  '{{principal_signature_image_url}}',
  '{{school_official_seal_image_url}}',
  '{{verification_url}}',
  '{{principal_signature}}',
  '{{school_seal}}',
]);

function isImageUrlPlaceholder(placeholder?: string): boolean {
  if (!placeholder) return false;
  return IMAGE_URL_PLACEHOLDERS.has(placeholder) || placeholder.endsWith('_url');
}

async function prefetchImages(
  elements: StudioElement[],
  pmap: Record<string, string>,
  student: Student,
): Promise<Map<string, ImageInfo | null>> {
  const map = new Map<string, ImageInfo | null>();

  for (const el of elements) {
    if (el.hidden) continue;

    if (el.type === 'background' && el.imageUrl) {
      const dataUrl = await toDataURL(el.imageUrl);
      if (dataUrl) {
        const processed = await processImageDataUrl(
          dataUrl,
          el.objectFit ?? 'cover',
          el.width,
          el.height,
        );
        map.set(el.id, processed);
      }
      continue;
    }

    if (el.type === 'qrcode') {
      const value = pmap['{{verification_url}}'] ||
        `${typeof window !== 'undefined' ? window.location.origin : ''}/verify?id=${student.verification_id}`;
      const dataUrl = await generateQRDataUrl(value);
      if (dataUrl) {
        const processed = await processImageDataUrl(
          dataUrl,
          el.objectFit ?? 'contain',
          el.width,
          el.height,
          el.borderRadius,
        );
        map.set(el.id, processed);
      }
      continue;
    }

    if (el.type === 'barcode') {
      const value = student.verification_id || student.login_id;
      const dataUrl = await generateBarcodeDataUrl(value);
      if (dataUrl) {
        const processed = await processImageDataUrl(
          dataUrl,
          el.objectFit ?? 'contain',
          el.width,
          el.height,
          el.borderRadius,
        );
        map.set(el.id, processed);
      }
      continue;
    }

    if (
      el.type === 'logo' ||
      el.type === 'photo' ||
      el.type === 'custom_image' ||
      el.type === 'signature' ||
      el.type === 'principal_signature'
    ) {
      let rawUrl = el.imageUrl ?? '';
      if (!rawUrl) {
        if (el.type === 'logo') rawUrl = pmap['{{school_logo_url}}'] ?? '';
        if (el.type === 'photo') rawUrl = pmap['{{student_photo_url}}'] ?? '';
        if (el.type === 'principal_signature' || el.type === 'signature') {
          rawUrl = pmap['{{principal_signature_image_url}}'] ?? pmap['{{principal_signature}}'] ?? '';
        }
      }
      if (!rawUrl) continue;

      const dataUrl = await toDataURL(rawUrl);
      if (!dataUrl) continue;

      const fit = el.objectFit ?? (el.type === 'photo' ? 'cover' : 'contain');
      const processed = await processImageDataUrl(
        dataUrl,
        fit,
        el.width,
        el.height,
        el.borderRadius,
      );
      map.set(el.id, processed);
    }
  }

  return map;
}

/**
 * Draw a simple 7×7 QR placeholder pattern when QR generation fails.
 */
function drawQR(doc: jsPDF, x: number, y: number, size: number) {
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, size, size, 'F');
  doc.setFillColor(30, 30, 40);
  const cell = (size - 2) / 7;
  const pattern = [
    [1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1],
    [1,0,1,0,1,0,1],
    [1,0,0,1,0,0,1],
    [1,0,1,0,1,0,1],
    [1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1],
  ];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (pattern[r][c]) {
        doc.rect(x + 1 + c * cell, y + 1 + r * cell, cell, cell, 'F');
      }
    }
  }
}

interface RenderContext {
  doc: jsPDF;
  scale: number;
  pmap: Record<string, string>;
  imgMap: Map<string, ImageInfo | null>;
  pageW: number;
  pageH: number;
}

function drawElement(el: StudioElement, ctx: RenderContext) {
  const { doc, scale, pmap, imgMap } = ctx;
  const x = el.x * scale;
  const y = el.y * scale;
  const w = el.width * scale;
  const h = el.height * scale;
  const r = el.borderRadius ? Math.min(el.borderRadius * scale, w / 2, h / 2) : 0;

  if (el.hidden) return;

  switch (el.type) {
    case 'background': {
      const bgImg = imgMap.get(el.id);
      if (bgImg?.dataUrl) {
        safeAddImage(doc, bgImg.dataUrl, x, y, w, h);
        return;
      }
      const bg = hexToRgba(el.backgroundColor ?? '#FFFFFF');
      if (bg.a <= 0.05) return;
      withOpacity(doc, bg.a, () => {
        setFill(doc, el.backgroundColor!);
        doc.roundedRect(x, y, w, h, r, r, 'F');
      });
      break;
    }

    case 'rectangle':
    case 'circle': {
      const bg = hexToRgba(el.backgroundColor ?? 'transparent');
      const hasBg = el.backgroundColor && el.backgroundColor !== 'transparent' && bg.a > 0.05;
      const hasBd = el.borderWidth && el.borderWidth > 0 && el.borderColor && el.borderColor !== 'transparent';

      withOpacity(doc, bg.a, () => {
        if (hasBg) {
          setFill(doc, el.backgroundColor!);
          doc.roundedRect(x, y, w, h, r, r, 'F');
        }
        if (hasBd) {
          setStroke(doc, el.borderColor!);
          doc.setLineWidth(el.borderWidth! * scale);
          doc.roundedRect(x, y, w, h, r, r, 'S');
        }
      });
      break;
    }

    case 'line': {
      const lineColor = el.backgroundColor && el.backgroundColor !== 'transparent'
        ? el.backgroundColor : '#00000020';
      setStroke(doc, lineColor);
      doc.setLineWidth(el.borderWidth && el.borderWidth > 0 ? el.borderWidth * scale : 0.3);
      const cy = y + h / 2;
      doc.line(x, cy, x + w, cy);
      break;
    }

    case 'table': {
      // Draw a placeholder grid matching the StudioPreview placeholder.
      const cols = 3;
      const rows = 3;
      const cellW = w / cols;
      const cellH = h / rows;
      const borderColor = el.borderColor && el.borderColor !== 'transparent'
        ? el.borderColor : '#00000026';
      setStroke(doc, borderColor);
      doc.setLineWidth((el.borderWidth ?? 0.5) * scale);
      doc.roundedRect(x, y, w, h, r, r, 'S');
      doc.setLineWidth(0.2);
      for (let i = 1; i < cols; i++) {
        doc.line(x + cellW * i, y, x + cellW * i, y + h);
      }
      for (let i = 1; i < rows; i++) {
        doc.line(x, y + cellH * i, x + w, y + cellH * i);
      }
      const headerFontSize = Math.max(4, Math.min(48, (el.fontSize ?? 9) * PT_PER_PX));
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(headerFontSize);
      setTextCol(doc, el.color ?? '#00000066');
      for (let c = 0; c < cols; c++) {
        doc.text(`Col ${c + 1}`, x + cellW * c + cellW / 2, y + cellH / 2 + headerFontSize / 2, {
          align: 'center',
          baseline: 'middle',
        });
      }
      break;
    }

    case 'divider': {
      const dc = el.backgroundColor && el.backgroundColor !== 'transparent'
        ? el.backgroundColor : '#00000020';
      setStroke(doc, dc);
      doc.setLineWidth(0.2);
      doc.line(x, y, x + w, y);
      break;
    }

    case 'logo':
    case 'photo':
    case 'custom_image':
    case 'signature':
    case 'principal_signature': {
      const info = imgMap.get(el.id);
      if (info?.dataUrl) {
        safeAddImage(doc, info.dataUrl, x, y, w, h);
        if (el.type === 'photo') {
          setStroke(doc, '#C9A84C');
          doc.setLineWidth(0.5);
          doc.roundedRect(x, y, w, h, r, r, 'S');
        }
      } else {
        // Missing image — draw a light placeholder instead of a URL
        doc.setFillColor(240, 242, 245);
        doc.roundedRect(x, y, w, h, r, r, 'F');
        setStroke(doc, '#C9A84C');
        doc.setLineWidth(0.3);
        doc.setLineDashPattern([0.8, 0.8], 0);
        doc.roundedRect(x, y, w, h, r, r, 'S');
        doc.setLineDashPattern([], 0);
        setTextCol(doc, '#94a3b8');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(4);
        const lbl = el.type === 'photo' ? 'PHOTO'
                  : el.type === 'logo' ? 'LOGO'
                  : 'SIGN';
        doc.text(lbl, x + w / 2, y + h / 2 + 0.5, { align: 'center' });
      }
      break;
    }

    case 'qrcode':
    case 'barcode': {
      const info = imgMap.get(el.id);
      if (info?.dataUrl) {
        safeAddImage(doc, info.dataUrl, x, y, w, h);
      } else {
        drawQR(doc, x, y, Math.min(w, h));
      }
      break;
    }

    case 'text':
    case 'placeholder': {
      const raw = el.type === 'placeholder'
        ? resolvePlaceholder(el.placeholder ?? '', pmap)
        : el.text ?? '';
      if (!raw) break;

      // Never print image URLs as text
      if (
        el.type === 'placeholder' &&
        isImageUrlPlaceholder(el.placeholder)
      ) break;

      // Prevent any URL text from leaking through
      if (
        /^(https?:\/\/|data:image)/.test(raw.trim()) &&
        (el.placeholder ? isImageUrlPlaceholder(el.placeholder) : true)
      ) break;

      const pxFontSize = Math.max(4, Math.min(120, el.fontSize ?? 10));
      const fontSizeMM = pxFontSize * MM_PER_PX;   // element/preview unit
      const fontSizePt = pxFontSize * PT_PER_PX;   // jsPDF font-size unit
      const isBold =
        el.fontWeight === 'bold' ||
        el.fontWeight === '600' ||
        el.fontWeight === '800';
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(fontSizePt);
      setTextCol(doc, el.color ?? '#000000');

      const align = el.textAlign ?? 'left';
      const padding = (el.padding ?? 0) * scale;
      const boxW = Math.max(1, w - padding * 2);
      const boxH = Math.max(1, h - padding * 2);
      const lineHeight = (el.lineHeight ?? 1.3); // factor, same as preview CSS
      const lineHeightMM = fontSizeMM * lineHeight;
      const lines = doc.splitTextToSize(raw, boxW);
      const maxLines = Math.max(1, Math.floor(boxH / lineHeightMM));
      const visibleLines = lines.slice(0, maxLines);

      let tx = x + padding;
      if (align === 'center') tx = x + w / 2;
      if (align === 'right') tx = x + w - padding;

      const totalH = visibleLines.length * lineHeightMM;
      const ty = y + (h - totalH) / 2;

      doc.text(visibleLines, tx, ty, {
        align,
        baseline: 'top',
        lineHeightFactor: lineHeight,
        maxWidth: boxW,
      });
      break;
    }
  }
}

export async function generateTemplateDocumentPDF({
  student,
  branding,
  template,
  feeData,
  filename = 'document.pdf',
}: {
  student: Student;
  branding: BrandingSettings;
  template: DocumentTemplate;
  feeData?: FeeReceiptData;
  filename?: string;
}): Promise<jsPDF> {
  // Use the exact page size stored in the template so the exported PDF matches the
  // editor preview (page dimensions, orientation and element positions) — no extra
  // background or second canvas is created.
  const savedSize = (template.layout_config?.page_size as keyof typeof PAGE_PRESETS) ?? 'A4';
  const savedOrientation = template.layout_config?.orientation ?? 'portrait';
  const preset = PAGE_PRESETS[savedSize] ?? PAGE_PRESETS.A4;
  let pxW = template.layout_config?.page_width ??
    (savedOrientation === 'landscape' ? Math.max(preset.w, preset.h) : Math.min(preset.w, preset.h));
  let pxH = template.layout_config?.page_height ??
    (savedOrientation === 'landscape' ? Math.min(preset.w, preset.h) : Math.max(preset.w, preset.h));
  const mmW = pxW * MM_PER_PX;
  const mmH = pxH * MM_PER_PX;
  const scale = mmW / pxW;

  const doc = new jsPDF({
    orientation: pxW > pxH ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [mmW, mmH],
  });

  const pmap = buildPlaceholderMap(student, branding, feeData);
  const elements: StudioElement[] = [
    ...legacyToElements(template.content_config.header, 'header'),
    ...legacyToElements(template.content_config.body, 'body'),
    ...legacyToElements(template.content_config.footer, 'footer'),
  ];

  const sorted = [...elements]
    .filter(el => !el.hidden)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  // Draw a default white background so the page is never transparent
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, mmW, mmH, 'F');

  const imgMap = await prefetchImages(sorted, pmap, student);

  for (const el of sorted) {
    drawElement(el, { doc, scale, pmap, imgMap, pageW: mmW, pageH: mmH });
  }

  // Draw exact fee period on every receipt PDF so it is always visible even if
  // the template does not include the period placeholder.
  if (feeData?.period_value) {
    const periodText = feeData.period_type
      ? `${feeData.period_type.charAt(0).toUpperCase() + feeData.period_type.slice(1)}: ${feeData.period_value}`
      : `Period: ${feeData.period_value}`;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(periodText, 10, mmH - 10, { maxWidth: mmW - 20 });
  }

  return doc;
}
