/**
 * PropertiesPanel – document settings (nothing selected) or per-element properties
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  LayoutTemplate, Settings2, Upload, ImageOff,
} from 'lucide-react';
import type { StudioElement, StudioState, PageSize, Orientation } from './types';
import { PAGE_PRESETS, adaptElementsToPage } from './types';

interface PropertiesPanelProps {
  state: StudioState;
  selectedElement: StudioElement | null;
  onUpdateElement: (id: string, patch: Partial<StudioElement>) => void;
  onUpdateState: (patch: Partial<StudioState>) => void;
  onBackgroundImageChange?: (file: File) => void;
}

/** Compact row label */
const Row: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <div className={cn('flex items-center gap-2', className)}>
    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-14 shrink-0">{label}</span>
    <div className="flex-1 min-w-0">{children}</div>
  </div>
);

/** Small number input */
const NumInput: React.FC<{
  value: number | undefined;
  onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
  className?: string;
}> = ({ value, onChange, min, max, step = 1, className }) => (
  <input
    type="number"
    value={value ?? 0}
    min={min}
    max={max}
    step={step}
    onChange={e => onChange(parseFloat(e.target.value) || 0)}
    className={cn(
      'h-7 w-full rounded-lg border border-border/60 bg-muted/30 px-2 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary/50',
      className,
    )}
  />
);

/** Color picker row */
const ColorRow: React.FC<{ label: string; value?: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <Row label={label}>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || '#000000'}
        onChange={e => onChange(e.target.value)}
        className="w-7 h-7 rounded-lg border border-border/60 cursor-pointer p-0.5 bg-transparent"
      />
      <input
        type="text"
        value={value || '#000000'}
        onChange={e => onChange(e.target.value)}
        className="flex-1 h-7 rounded-lg border border-border/60 bg-muted/30 px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
      />
    </div>
  </Row>
);

/** Section separator */
const Sep: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-2 mt-3 mb-1">
    <span className="text-[9px] font-black uppercase tracking-widest text-primary/70">{label}</span>
    <div className="flex-1 h-px bg-border/60" />
  </div>
);

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  state, selectedElement, onUpdateElement, onUpdateState, onBackgroundImageChange,
}) => {
  const el = selectedElement;
  const upd = (patch: Partial<StudioElement>) => el && onUpdateElement(el.id, patch);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onBackgroundImageChange?.(file);
    e.target.value = '';
  };

  /* ── Document Settings (nothing selected) ── */
  if (!el) {
    return (
      <div className="p-3 space-y-3 overflow-y-auto h-full">
        <div className="flex items-center gap-2 pb-1 border-b border-border/60">
          <Settings2 className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Document</span>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</Label>
          <Input
            value={state.name}
            onChange={e => onUpdateState({ name: e.target.value })}
            className="h-8 text-xs rounded-lg bg-muted/30 border-border/60"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</Label>
          <Select value={state.type} onValueChange={v => onUpdateState({ type: v as any })}>
            <SelectTrigger className="h-8 text-xs rounded-lg bg-muted/30 border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['Certificate', 'ID Card', 'Admission Certificate', 'Result'].map(t => (
                <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Sep label="Page" />
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Size</Label>
          <Select
            value={state.page.size}
            onValueChange={v => {
              const size = v as PageSize;
              const preset = PAGE_PRESETS[size];
              const newPage = { ...state.page, size, width: preset.w, height: preset.h };
              onUpdateState({
                page: newPage,
                elements: adaptElementsToPage(state.page, newPage, state.elements),
              });
            }}
          >
            <SelectTrigger className="h-8 text-xs rounded-lg bg-muted/30 border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['A4', 'A5', 'Letter', 'ID Card', 'Custom'] as PageSize[]).map(s => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Orientation</Label>
          <div className="flex gap-2">
            {(['portrait', 'landscape'] as Orientation[]).map(o => (
              <button
                key={o}
                onClick={() => {
                  const p = state.page;
                  const newPage = {
                    ...p,
                    orientation: o,
                    width:  o === 'landscape' ? Math.max(p.width, p.height) : Math.min(p.width, p.height),
                    height: o === 'landscape' ? Math.min(p.width, p.height) : Math.max(p.width, p.height),
                  };
                  onUpdateState({
                    page: newPage,
                    elements: adaptElementsToPage(p, newPage, state.elements),
                  });
                }}
                className={cn(
                  'flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-colors',
                  state.page.orientation === o
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-muted/20 border-border/50 text-muted-foreground hover:bg-muted/40',
                )}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {state.page.size === 'Custom' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] font-bold text-muted-foreground">W (px)</Label>
              <NumInput value={state.page.width} onChange={v => {
                const newPage = { ...state.page, width: v };
                onUpdateState({
                  page: newPage,
                  elements: adaptElementsToPage(state.page, newPage, state.elements),
                });
              }} />
            </div>
            <div>
              <Label className="text-[10px] font-bold text-muted-foreground">H (px)</Label>
              <NumInput value={state.page.height} onChange={v => {
                const newPage = { ...state.page, height: v };
                onUpdateState({
                  page: newPage,
                  elements: adaptElementsToPage(state.page, newPage, state.elements),
                });
              }} />
            </div>
          </div>
        )}

        <Sep label="Sections" />
        {[
          { key: 'headerEnabled', label: 'Header' },
          { key: 'bodyEnabled',   label: 'Body'   },
          { key: 'footerEnabled', label: 'Footer' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-1">
            <span className="text-xs font-semibold">{label}</span>
            <Switch
              checked={state[key as keyof StudioState] as boolean}
              onCheckedChange={v => onUpdateState({ [key]: v } as any)}
            />
          </div>
        ))}

        <Sep label="Grid" />
        <div className="flex items-center justify-between py-1">
          <span className="text-xs font-semibold">Show Grid</span>
          <Switch checked={state.showGrid} onCheckedChange={v => onUpdateState({ showGrid: v })} />
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-xs font-semibold">Snap to Grid</span>
          <Switch checked={state.snapToGrid} onCheckedChange={v => onUpdateState({ snapToGrid: v })} />
        </div>
        <Row label="Size">
          <Select value={state.gridSize} onValueChange={v => onUpdateState({ gridSize: v as any })}>
            <SelectTrigger className="h-7 text-xs rounded-lg bg-muted/30 border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small"  className="text-xs">Small (8px)</SelectItem>
              <SelectItem value="medium" className="text-xs">Medium (16px)</SelectItem>
              <SelectItem value="large"  className="text-xs">Large (32px)</SelectItem>
            </SelectContent>
          </Select>
        </Row>
      </div>
    );
  }

  /* ── Element Properties ── */
  const isText = ['text', 'placeholder'].includes(el.type);
  const isBackground = el.type === 'background';

  return (
    <div className="p-3 space-y-2 overflow-y-auto h-full">
      <div className="flex items-center gap-2 pb-1 border-b border-border/60">
        <LayoutTemplate className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-widest text-primary capitalize">
          {el.label || el.type}
        </span>
      </div>

      {/* Background controls */}
      {isBackground && (
        <>
          <Sep label="Background" />
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3 h-3 mr-1" />
                {el.imageUrl ? 'Replace Image' : 'Upload Image'}
              </Button>
              {el.imageUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => upd({ imageUrl: undefined })}
                >
                  <ImageOff className="w-3 h-3 mr-1" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {el.imageUrl
                ? 'An image is applied. Use the controls to replace or remove it.'
                : 'Select an image and crop it to the document ratio before applying.'}
            </p>
          </div>
        </>
      )}

      {/* Position & Size */}
      <Sep label="Position" />
      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-[10px] font-bold text-muted-foreground">X</Label><NumInput value={el.x} onChange={v => upd({ x: v })} /></div>
        <div><Label className="text-[10px] font-bold text-muted-foreground">Y</Label><NumInput value={el.y} onChange={v => upd({ y: v })} /></div>
        <div><Label className="text-[10px] font-bold text-muted-foreground">W</Label><NumInput value={el.width} onChange={v => upd({ width: Math.max(4, v) })} /></div>
        <div><Label className="text-[10px] font-bold text-muted-foreground">H</Label><NumInput value={el.height} onChange={v => upd({ height: Math.max(4, v) })} /></div>
      </div>
      <Row label="Rotate">
        <NumInput value={el.rotation} onChange={v => upd({ rotation: v })} min={-360} max={360} />
      </Row>
      <Row label="Opacity">
        <div className="flex items-center gap-2">
          <input
            type="range" min={0} max={100} step={1}
            value={el.opacity ?? 100}
            onChange={e => upd({ opacity: parseInt(e.target.value) })}
            className="flex-1 accent-primary"
          />
          <span className="text-[10px] font-mono w-8 text-right">{el.opacity ?? 100}%</span>
        </div>
      </Row>

      {/* Text properties */}
      {isText && (
        <>
          <Sep label="Text" />
          {el.type === 'text' && (
            <div>
              <Label className="text-[10px] font-bold text-muted-foreground">Content</Label>
              <textarea
                value={el.text || ''}
                onChange={e => upd({ text: e.target.value })}
                className="w-full mt-1 min-h-[56px] rounded-lg border border-border/60 bg-muted/30 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
              />
            </div>
          )}
          <Row label="Size">
            <NumInput value={el.fontSize} onChange={v => upd({ fontSize: Math.max(6, v) })} min={6} max={200} />
          </Row>
          <Row label="Weight">
            <Select value={el.fontWeight || 'normal'} onValueChange={v => upd({ fontWeight: v as any })}>
              <SelectTrigger className="h-7 text-xs rounded-lg bg-muted/30 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                <SelectItem value="600"    className="text-xs">Semi Bold</SelectItem>
                <SelectItem value="bold"   className="text-xs">Bold</SelectItem>
                <SelectItem value="800"    className="text-xs">Extra Bold</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Align">
            <div className="flex gap-1">
              {[
                { v: 'left',   icon: <AlignLeft  className="w-3 h-3" /> },
                { v: 'center', icon: <AlignCenter className="w-3 h-3" /> },
                { v: 'right',  icon: <AlignRight  className="w-3 h-3" /> },
              ].map(({ v, icon }) => (
                <button
                  key={v}
                  onClick={() => upd({ textAlign: v as any })}
                  className={cn(
                    'flex-1 h-7 flex items-center justify-center rounded-lg border transition-colors',
                    el.textAlign === v
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-muted/20 border-border/50 text-muted-foreground hover:bg-muted/40',
                  )}
                >{icon}</button>
              ))}
            </div>
          </Row>
          <Row label="Style">
            <div className="flex gap-1">
              <button
                onClick={() => upd({ fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic' })}
                className={cn('flex-1 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-colors',
                  el.fontStyle === 'italic' ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-muted/20 border-border/50 text-muted-foreground')}
              ><Italic className="w-3 h-3" /></button>
              <button
                onClick={() => upd({ textDecoration: el.textDecoration === 'underline' ? 'none' : 'underline' })}
                className={cn('flex-1 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-colors',
                  el.textDecoration === 'underline' ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-muted/20 border-border/50 text-muted-foreground')}
              ><Underline className="w-3 h-3" /></button>
            </div>
          </Row>
          <Row label="Case">
            <Select value={el.textTransform || 'none'} onValueChange={v => upd({ textTransform: v as any })}>
              <SelectTrigger className="h-7 text-xs rounded-lg bg-muted/30 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none"      className="text-xs">None</SelectItem>
                <SelectItem value="uppercase" className="text-xs">UPPERCASE</SelectItem>
                <SelectItem value="lowercase" className="text-xs">lowercase</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Spacing">
            <NumInput value={el.letterSpacing} onChange={v => upd({ letterSpacing: v })} step={0.5} />
          </Row>
          <Row label="Line H">
            <NumInput value={el.lineHeight} onChange={v => upd({ lineHeight: v })} min={0.5} max={4} step={0.1} />
          </Row>
          <ColorRow label="Color" value={el.color} onChange={v => upd({ color: v })} />
        </>
      )}

      {/* Fill / Border */}
      <Sep label={isBackground ? 'Background Color' : 'Fill & Border'} />
      <ColorRow label={isBackground ? 'Color' : 'Fill'} value={el.backgroundColor === 'transparent' ? '#ffffff' : el.backgroundColor} onChange={v => upd({ backgroundColor: v })} />
      <ColorRow label="Stroke" value={el.borderColor === 'transparent' ? '#000000' : el.borderColor} onChange={v => upd({ borderColor: v })} />
      <Row label="Stroke W">
        <NumInput value={el.borderWidth} onChange={v => upd({ borderWidth: v })} min={0} max={20} />
      </Row>
      <Row label="Radius">
        <NumInput value={el.borderRadius} onChange={v => upd({ borderRadius: v })} min={0} max={500} />
      </Row>
      <Row label="Padding">
        <NumInput value={el.padding} onChange={v => upd({ padding: v })} min={0} />
      </Row>

      {/* Shadow */}
      <Sep label="Shadow" />
      <ColorRow label="Color" value={el.shadowColor || '#00000033'} onChange={v => upd({ shadowColor: v })} />
      <Row label="Blur">
        <NumInput value={el.shadowBlur} onChange={v => upd({ shadowBlur: v })} min={0} max={100} />
      </Row>
      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-[10px] font-bold text-muted-foreground">X</Label><NumInput value={el.shadowX} onChange={v => upd({ shadowX: v })} /></div>
        <div><Label className="text-[10px] font-bold text-muted-foreground">Y</Label><NumInput value={el.shadowY} onChange={v => upd({ shadowY: v })} /></div>
      </div>

      {/* Lock / Section */}
      <Sep label="Layer" />
      <div className="flex items-center justify-between py-1">
        <span className="text-xs font-semibold">Locked</span>
        <Switch checked={el.locked} onCheckedChange={v => upd({ locked: v })} />
      </div>
      <div className="flex items-center justify-between py-1">
        <span className="text-xs font-semibold">Hidden</span>
        <Switch checked={el.hidden} onCheckedChange={v => upd({ hidden: v })} />
      </div>
      <Row label="Section">
        <Select value={el.section} onValueChange={v => upd({ section: v as any })}>
          <SelectTrigger className="h-7 text-xs rounded-lg bg-muted/30 border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="header" className="text-xs">Header</SelectItem>
            <SelectItem value="body"   className="text-xs">Body</SelectItem>
            <SelectItem value="footer" className="text-xs">Footer</SelectItem>
          </SelectContent>
        </Select>
      </Row>
    </div>
  );
};
