/**
 * ComponentLibrary – Left panel component palette + placeholder chips
 *
 * Placeholder list is driven entirely by DOCUMENT_PLACEHOLDERS — every entry
 * backed by a real DB field appears here automatically with no extra coding.
 */
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Type, Image, QrCode, BarChart2, PenLine, User, Building2,
  Square, Circle, Minus, Table2, Layers, SeparatorHorizontal,
  ChevronRight, ChevronDown, Hash, Link, Calendar, FileText, Hash as NumberIcon,
} from 'lucide-react';
import type { ElementType } from './types';
import { DOCUMENT_PLACEHOLDERS, type PlaceholderDataType } from '@/constants/placeholders';

interface ComponentLibraryProps {
  onAddElement: (type: ElementType) => void;
  onAddPlaceholder: (key: string) => void;
}

interface ComponentDef {
  type: ElementType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const COMPONENTS: ComponentDef[] = [
  { type: 'text',               label: 'Text',               icon: <Type className="w-4 h-4" />,             description: 'Static text block' },
  { type: 'photo',              label: 'Student Photo',       icon: <User className="w-4 h-4" />,             description: 'Student profile photo' },
  { type: 'logo',               label: 'School Logo',         icon: <Building2 className="w-4 h-4" />,        description: 'School branding logo' },
  { type: 'qrcode',             label: 'QR Code',             icon: <QrCode className="w-4 h-4" />,           description: 'Auto-generated QR' },
  { type: 'barcode',            label: 'Barcode',             icon: <BarChart2 className="w-4 h-4" />,        description: 'Auto-generated barcode' },
  { type: 'signature',          label: 'Signature',           icon: <PenLine className="w-4 h-4" />,          description: 'Signature placeholder' },
  { type: 'principal_signature',label: 'Principal Sign.',     icon: <PenLine className="w-4 h-4" />,          description: 'Principal signature' },
  { type: 'custom_image',       label: 'Custom Image',        icon: <Image className="w-4 h-4" />,            description: 'Upload any image' },
  { type: 'rectangle',          label: 'Rectangle',           icon: <Square className="w-4 h-4" />,           description: 'Shape block' },
  { type: 'circle',             label: 'Circle',              icon: <Circle className="w-4 h-4" />,           description: 'Circle / oval' },
  { type: 'line',               label: 'Line',                icon: <Minus className="w-4 h-4" />,            description: 'Horizontal/vertical line' },
  { type: 'table',              label: 'Table',               icon: <Table2 className="w-4 h-4" />,           description: 'Data table' },
  { type: 'background',         label: 'Background',          icon: <Layers className="w-4 h-4" />,           description: 'Full-page background' },
  { type: 'divider',            label: 'Divider',             icon: <SeparatorHorizontal className="w-4 h-4" />, description: 'Thin divider rule' },
];

// DataType → badge colour + icon (all using semantic tokens, no raw colours)
const DATA_TYPE_CONFIG: Record<PlaceholderDataType, { cls: string; icon: React.ReactNode }> = {
  'String':    { cls: 'bg-primary/10 text-primary',               icon: <FileText className="w-2.5 h-2.5" /> },
  'Date':      { cls: 'bg-accent/20 text-accent-foreground',      icon: <Calendar className="w-2.5 h-2.5" /> },
  'Image URL': { cls: 'bg-secondary/60 text-secondary-foreground', icon: <Image className="w-2.5 h-2.5" /> },
  'Number':    { cls: 'bg-muted text-muted-foreground',           icon: <NumberIcon className="w-2.5 h-2.5" /> },
  'URL':       { cls: 'bg-muted text-muted-foreground',           icon: <Link className="w-2.5 h-2.5" /> },
};

// Group placeholders by category — derived live from DOCUMENT_PLACEHOLDERS
const grouped = DOCUMENT_PLACEHOLDERS.reduce<Record<string, typeof DOCUMENT_PLACEHOLDERS>>(
  (acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  },
  {},
);

export const ComponentLibrary: React.FC<ComponentLibraryProps> = ({ onAddElement, onAddPlaceholder }) => {
  const [openSection, setOpenSection]   = useState<'components' | 'placeholders'>('components');
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const toggle = (cat: string) => setOpenCategory(p => p === cat ? null : cat);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab switcher */}
      <div className="flex border-b border-border/60 shrink-0">
        {(['components', 'placeholders'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setOpenSection(tab)}
            className={cn(
              'flex-1 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors',
              openSection === tab
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab === 'components' ? 'Components' : `Placeholders (${DOCUMENT_PLACEHOLDERS.length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {openSection === 'components' ? (
          <div className="p-2 grid grid-cols-2 gap-1.5">
            {COMPONENTS.map(comp => (
              <button
                key={comp.type}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('studio/component', comp.type);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => onAddElement(comp.type)}
                title={comp.description}
                className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all duration-150 active:scale-95 cursor-grab active:cursor-grabbing group"
              >
                <span className="text-muted-foreground group-hover:text-primary transition-colors">
                  {comp.icon}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground leading-tight text-center">
                  {comp.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {/* Sync note */}
            <p className="text-[9px] text-muted-foreground px-2 py-1 rounded bg-muted/40 leading-relaxed">
              All placeholders are live-linked to your database. New fields appear here automatically.
            </p>

            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <button
                  onClick={() => toggle(cat)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {cat}
                    <span className="ml-1.5 font-normal normal-case tracking-normal">({items.length})</span>
                  </span>
                  {openCategory === cat
                    ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                </button>

                {openCategory === cat && (
                  <div className="space-y-0.5 mt-0.5">
                    {items.map(p => {
                      const dtCfg = DATA_TYPE_CONFIG[p.dataType] ?? DATA_TYPE_CONFIG['String'];
                      return (
                        <button
                          key={p.key}
                          draggable
                          onDragStart={e => {
                            e.dataTransfer.setData('studio/placeholder', p.key);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          onClick={() => onAddPlaceholder(p.key)}
                          title={`${p.description}${p.source ? `\nSource: ${p.source}` : ''}`}
                          className="w-full flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-primary/8 transition-colors text-left cursor-grab active:cursor-grabbing group"
                        >
                          <Hash className="w-3 h-3 text-primary/60 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-semibold text-foreground truncate">{p.label}</p>
                              <span className={cn('inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold leading-none', dtCfg.cls)}>
                                {dtCfg.icon}
                                {p.dataType}
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-primary/70 truncate">{p.key}</p>
                            {p.source && (
                              <p className="text-[9px] text-muted-foreground/70 truncate mt-0.5">
                                ↳ {p.source}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
