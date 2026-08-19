/**
 * Template Studio – Core Types
 * Fully backward-compatible with DocumentTemplate / TemplateElement from @/types
 */

export type ElementType =
  | 'text'
  | 'placeholder'
  | 'photo'
  | 'logo'
  | 'qrcode'
  | 'barcode'
  | 'signature'
  | 'principal_signature'
  | 'custom_image'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'table'
  | 'background'
  | 'divider';

export type PageSize = 'A4' | 'A5' | 'Letter' | 'ID Card' | 'Custom';
export type Orientation = 'portrait' | 'landscape';

export interface StudioElement {
  id: string;
  type: ElementType;
  // Position & size (px at 100% zoom, relative to canvas)
  x: number;
  y: number;
  width: number;
  height: number;
  // Display
  label?: string;         // user-visible name in layers panel
  locked: boolean;
  hidden: boolean;
  // Text
  text?: string;
  placeholder?: string;   // e.g. {{student_full_name}}
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '600' | '800';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase';
  // Style
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;       // 0-100
  rotation?: number;
  padding?: number;
  // Image
  imageUrl?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  // Shadow
  shadowColor?: string;
  shadowBlur?: number;
  shadowX?: number;
  shadowY?: number;
  // Section (maps to legacy header/body/footer)
  section: 'header' | 'body' | 'footer';
  zIndex: number;
  // Grouping
  groupId?: string;
}

export interface PageConfig {
  size: PageSize;
  orientation: Orientation;
  width: number;   // px
  height: number;  // px
  customWidth?: number;
  customHeight?: number;
}

export interface StudioState {
  name: string;
  type: 'Certificate' | 'ID Card' | 'Admission Certificate' | 'Result' | 'Fee Receipt';
  page: PageConfig;
  elements: StudioElement[];
  headerEnabled: boolean;
  bodyEnabled: boolean;
  footerEnabled: boolean;
  showGrid: boolean;
  gridSize: 'small' | 'medium' | 'large'; // 8px / 16px / 32px
  snapToGrid: boolean;
  snapToElements: boolean;
}

export const PAGE_PRESETS: Record<PageSize, { w: number; h: number }> = {
  'A4':      { w: 794,  h: 1123 },
  'A5':      { w: 559,  h: 794  },
  'Letter':  { w: 816,  h: 1056 },
  'ID Card': { w: 337,  h: 213  },
  'Custom':  { w: 794,  h: 1123 },
};

export const GRID_PX: Record<'small' | 'medium' | 'large', number> = {
  small:  8,
  medium: 16,
  large:  32,
};

/** Scale existing elements so the layout fits a new page size.
 *  Uses the page width/height ratio to reposition and resize every element,
 *  preserving font sizes relative to the smaller dimension so the design
 *  stays readable and proportional after the page is resized.
 */
export function adaptElementsToPage(
  oldPage: PageConfig,
  newPage: PageConfig,
  elements: StudioElement[],
): StudioElement[] {
  const scaleX = newPage.width / oldPage.width;
  const scaleY = newPage.height / oldPage.height;
  const fontScale = Math.min(scaleX, scaleY);

  return elements.map(el => {
    // Background always fills the page; all other elements scale proportionally.
    if (el.type === 'background') {
      return { ...el, x: 0, y: 0, width: newPage.width, height: newPage.height };
    }

    const x = el.x * scaleX;
    const y = el.y * scaleY;
    const width = el.width * scaleX;
    const height = el.height * scaleY;
    const fontSize = el.fontSize != null
      ? Math.max(4, Math.min(120, el.fontSize * fontScale))
      : el.fontSize;

    return {
      ...el,
      x,
      y,
      width,
      height,
      fontSize,
      borderWidth: el.borderWidth != null ? el.borderWidth * fontScale : el.borderWidth,
      borderRadius: el.borderRadius != null ? el.borderRadius * fontScale : el.borderRadius,
      padding: el.padding != null ? el.padding * fontScale : el.padding,
      shadowBlur: el.shadowBlur != null ? el.shadowBlur * fontScale : el.shadowBlur,
      shadowX: el.shadowX != null ? el.shadowX * fontScale : el.shadowX,
      shadowY: el.shadowY != null ? el.shadowY * fontScale : el.shadowY,
    };
  });
}

/** Convert StudioElement[] back to legacy TemplateElement[] format */
export function elementsToLegacy(elements: StudioElement[], section: 'header' | 'body' | 'footer') {
  return elements
    .filter(el => el.section === section)
    .map(el => ({
      id: el.id,
      type: el.placeholder ? 'dynamic' as const : 'static' as const,
      text: el.text,
      placeholder: el.placeholder,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      // Extended fields stored under a namespace to keep schema compatible
      _studio: {
        elementType: el.type,
        label: el.label,
        locked: el.locked,
        hidden: el.hidden,
        fontSize: el.fontSize,
        fontWeight: el.fontWeight,
        fontStyle: el.fontStyle,
        textDecoration: el.textDecoration,
        textAlign: el.textAlign,
        color: el.color,
        letterSpacing: el.letterSpacing,
        lineHeight: el.lineHeight,
        textTransform: el.textTransform,
        backgroundColor: el.backgroundColor,
        borderColor: el.borderColor,
        borderWidth: el.borderWidth,
        borderRadius: el.borderRadius,
        opacity: el.opacity,
        rotation: el.rotation,
        padding: el.padding,
        imageUrl: el.imageUrl,
        objectFit: el.objectFit,
        shadowColor: el.shadowColor,
        shadowBlur: el.shadowBlur,
        shadowX: el.shadowX,
        shadowY: el.shadowY,
        zIndex: el.zIndex,
      }
    }));
}

/** Convert legacy TemplateElement[] to StudioElement[] */
export function defaultLabelFor(el: Partial<StudioElement> & { type: ElementType }, fallbackIndex = 0): string {
  if (el.label) return el.label;
  if (el.type === 'background') return 'Background';
  if (el.type === 'placeholder') return el.placeholder || 'Placeholder';
  if (el.type === 'text') return el.text || 'Text';
  if (el.type === 'principal_signature') return 'Principal Signature';
  if (el.type === 'custom_image') return 'Custom Image';
  if (el.type === 'qrcode') return 'QR Code';
  if (el.type === 'barcode') return 'Barcode';
  return el.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function legacyToElements(legacy: any[], section: 'header' | 'body' | 'footer'): StudioElement[] {
  return legacy.map((el, i) => {
    const s = el._studio || {};
    const type = s.elementType || (el.type === 'dynamic' ? 'placeholder' : 'text');
    const inferred: Partial<StudioElement> = {
      type,
      label: s.label,
      text: el.text,
      placeholder: el.placeholder,
      backgroundColor: s.backgroundColor,
    };
    return {
      id: el.id || Math.random().toString(36).slice(2),
      type,
      x: el.x ?? 0,
      y: el.y ?? 0,
      width: el.width ?? 200,
      height: el.height ?? 40,
      label: defaultLabelFor(inferred as any, i),
      locked: s.locked ?? false,
      hidden: s.hidden ?? false,
      text: el.text,
      placeholder: el.placeholder,
      fontSize: s.fontSize ?? 14,
      fontWeight: s.fontWeight ?? 'normal',
      fontStyle: s.fontStyle ?? 'normal',
      textDecoration: s.textDecoration ?? 'none',
      textAlign: s.textAlign ?? 'left',
      color: s.color ?? '#000000',
      letterSpacing: s.letterSpacing ?? 0,
      lineHeight: s.lineHeight ?? 1.4,
      textTransform: s.textTransform ?? 'none',
      backgroundColor: s.backgroundColor ?? 'transparent',
      borderColor: s.borderColor ?? 'transparent',
      borderWidth: s.borderWidth ?? 0,
      borderRadius: s.borderRadius ?? 0,
      opacity: s.opacity ?? 100,
      rotation: s.rotation ?? 0,
      padding: s.padding ?? 4,
      imageUrl: s.imageUrl,
      objectFit: s.objectFit ?? 'cover',
      shadowColor: s.shadowColor,
      shadowBlur: s.shadowBlur ?? 0,
      shadowX: s.shadowX ?? 0,
      shadowY: s.shadowY ?? 0,
      section,
      zIndex: s.zIndex ?? i,
    };
  });
}

export function makeElement(
  type: ElementType,
  section: 'header' | 'body' | 'footer',
  overrides: Partial<StudioElement> = {},
  zIndex: number = 0
): StudioElement {
  const defaults: Record<ElementType, Partial<StudioElement>> = {
    text:               { width: 200, height: 36, text: 'Text', fontSize: 16, color: '#111111' },
    placeholder:        { width: 220, height: 36, fontSize: 14, color: '#1a56db' },
    photo:              { width: 100, height: 120 },
    logo:               { width: 120, height: 60 },
    qrcode:             { width: 80,  height: 80  },
    barcode:            { width: 160, height: 60  },
    signature:          { width: 160, height: 60  },
    principal_signature:{ width: 160, height: 60  },
    custom_image:       { width: 160, height: 120 },
    rectangle:          { width: 200, height: 80,  backgroundColor: '#e2e8f0', borderColor: '#94a3b8', borderWidth: 1 },
    circle:             { width: 80,  height: 80,  backgroundColor: '#e2e8f0', borderColor: '#94a3b8', borderWidth: 1, borderRadius: 9999 },
    line:               { width: 300, height: 2,   backgroundColor: '#94a3b8' },
    table:              { width: 400, height: 200 },
    background:         { width: 794, height: 1123, backgroundColor: '#ffffff', zIndex: -1 },
    divider:            { width: 300, height: 1,   backgroundColor: '#e2e8f0' },
  };
  const base = defaults[type] || {};
  return {
    id: Math.random().toString(36).slice(2),
    type,
    x: 40,
    y: 40,
    width: 200,
    height: 40,
    locked: false,
    hidden: false,
    fontSize: 14,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    color: '#000000',
    letterSpacing: 0,
    lineHeight: 1.4,
    textTransform: 'none',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    opacity: 100,
    rotation: 0,
    padding: 4,
    objectFit: 'cover',
    shadowBlur: 0,
    shadowX: 0,
    shadowY: 0,
    section,
    zIndex,
    label: defaultLabelFor({ type, label: overrides.label, text: overrides.text, placeholder: overrides.placeholder }, 0),
    ...base,
    ...overrides,
  };
}
