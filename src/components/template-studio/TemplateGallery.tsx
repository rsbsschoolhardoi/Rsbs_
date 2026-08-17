/**
 * TemplateGallery
 *
 * Canva-style gallery shown when the user clicks "New Template".
 * Selecting a preset calls onSelect(preset) which opens the studio
 * with a pre-populated canvas.
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, ArrowLeft, Sparkles, LayoutTemplate, CreditCard,
  Award, GraduationCap, FileText, Layers,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TEMPLATE_PRESETS, GALLERY_CATEGORIES, TemplatePreset, TemplateCategory,
} from './templatePresets';

// ─── category meta (icon + gradient) ─────────────────────────────────────────
const CATEGORY_META: Record<string, { icon: React.ReactNode; gradient: string; accent: string }> = {
  'all':          { icon: <LayoutTemplate className="w-4 h-4" />, gradient: 'from-primary to-primary/70',        accent: 'text-primary' },
  'ID Cards':     { icon: <CreditCard     className="w-4 h-4" />, gradient: 'from-blue-500 to-indigo-600',       accent: 'text-blue-600' },
  'Certificates': { icon: <Award          className="w-4 h-4" />, gradient: 'from-amber-500 to-orange-500',      accent: 'text-amber-600' },
  'Academic':     { icon: <GraduationCap  className="w-4 h-4" />, gradient: 'from-emerald-500 to-teal-600',     accent: 'text-emerald-600' },
  'Admin':        { icon: <FileText       className="w-4 h-4" />, gradient: 'from-rose-500 to-pink-600',         accent: 'text-rose-600' },
  'Blank':        { icon: <Layers         className="w-4 h-4" />, gradient: 'from-slate-400 to-slate-600',       accent: 'text-slate-500' },
};

// ─── mini canvas preview renderer ────────────────────────────────────────────


// Renders a tiny visual preview from the preset's page color + type
function PresetPreview({ preset }: { preset: TemplatePreset }) {
  const state = useMemo(() => preset.build(), [preset]);
  const bg = state.elements.find(e => e.type === 'background');
  const bgColor = bg?.backgroundColor || '#ffffff';
  const accentEl = state.elements.find(e => e.type === 'rectangle' && e.zIndex === 1);
  const accentColor = accentEl?.borderColor || accentEl?.backgroundColor || '#e2e8f0';
  const isIDCard = state.page.size === 'ID Card';
  const isLandscape = state.page.orientation === 'landscape';

  return (
    <div
      className={`relative overflow-hidden rounded-xl mx-auto shadow-lg ${isIDCard ? 'w-28 h-[70px]' : isLandscape ? 'w-full h-[76px]' : 'w-28 h-[160px]'}`}
      style={{ backgroundColor: bgColor }}
    >
      {/* Border */}
      <div className="absolute inset-0 rounded-xl" style={{ border: `2px solid ${accentColor}40` }} />

      {/* Header strip */}
      <div className="absolute top-0 left-0 right-0 h-[22%] rounded-t-xl opacity-90"
           style={{ backgroundColor: accentColor }} />

      {/* Logo placeholder */}
      <div className="absolute rounded-full bg-white/30 shadow"
           style={{
             top: isIDCard ? '10%' : '6%', left: isIDCard ? '7%' : '4%',
             width: isIDCard ? '14%' : '10%', height: isIDCard ? '28%' : '14%',
           }} />

      {/* Photo placeholder (ID card only) */}
      {isIDCard && (
        <div className="absolute rounded bg-white/20 border border-white/30"
             style={{ top: '32%', left: '50%', transform: 'translateX(-50%)', width: '28%', height: '36%' }} />
      )}

      {/* Text lines */}
      {[0, 1, 2].map(i => (
        <div key={i}
             className="absolute rounded-full opacity-50"
             style={{
               backgroundColor: bgColor === '#ffffff' || bgColor === '#f8fafc' ? '#94a3b8' : '#ffffff',
               height: isIDCard ? 3 : 4,
               width: `${40 - i * 8}%`,
               top: isIDCard ? `${62 + i * 12}%` : `${50 + i * 12}%`,
               left: '50%',
               transform: 'translateX(-50%)',
             }} />
      ))}

      {/* QR placeholder (ID cards) */}
      {isIDCard && (
        <div className="absolute rounded bg-white/20 border border-white/20"
             style={{ bottom: '12%', right: '6%', width: '16%', height: '22%' }} />
      )}

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl pointer-events-none" />
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
interface TemplateGalleryProps {
  onSelect: (preset: TemplatePreset) => void;
  onBack: () => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onSelect, onBack }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return TEMPLATE_PRESETS.filter(p => {
      const matchCat = activeCategory === 'all' || p.category === activeCategory;
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.tags.some(t => t.includes(q));
      return matchCat && matchSearch;
    });
  }, [activeCategory, search]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Top Bar ── */}
      <div className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                Choose a Template
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                Start from a professionally designed layout — customise everything
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="pl-9 h-10 rounded-xl bg-muted/50 border-none text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col px-6 py-6 gap-6">
        {/* ── Mobile search ── */}
        <div className="relative md:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="pl-9 h-11 rounded-xl bg-muted/50 border-none"
          />
        </div>

        {/* ── Category Pills ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {GALLERY_CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat.id];
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  active
                    ? `bg-gradient-to-r ${meta?.gradient || 'from-primary to-primary/70'} text-white shadow-md`
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {meta?.icon}
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ── Results count ── */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-medium">
            {filtered.length} template{filtered.length !== 1 ? 's' : ''}
            {search && <> matching <span className="text-foreground font-semibold">"{search}"</span></>}
          </span>
        </div>

        {/* ── Template Grid ── */}
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-bold text-muted-foreground">No templates found</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different search term or category</p>
              <Button variant="outline" className="mt-4 rounded-xl" onClick={() => { setSearch(''); setActiveCategory('all'); }}>
                Clear filters
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-8"
            >
              {filtered.map((preset, idx) => {
                const catMeta = CATEGORY_META[preset.category] || CATEGORY_META['all'];
                const isHovered = hoveredId === preset.id;
                const isBlank = preset.id === 'custom-blank';
                return (
                  <motion.div
                    key={preset.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.22, delay: idx * 0.03 }}
                    className="group flex flex-col"
                    onMouseEnter={() => setHoveredId(preset.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Card */}
                    <div
                      className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-200 cursor-pointer flex-1 flex flex-col
                        ${isHovered
                          ? 'border-primary shadow-xl shadow-primary/15 -translate-y-1'
                          : isBlank
                            ? 'border-dashed border-muted-foreground/30 hover:border-muted-foreground/60'
                            : 'border-border hover:border-primary/40'
                        }`}
                      onClick={() => onSelect(preset)}
                    >
                      {/* Preview area */}
                      <div className={`p-4 flex items-center justify-center min-h-[140px] transition-colors duration-200
                        ${isHovered ? 'bg-primary/5' : 'bg-muted/30'}`}
                      >
                        {isBlank ? (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                            <div className="w-12 h-16 border-2 border-dashed border-current rounded-lg flex items-center justify-center">
                              <span className="text-2xl font-thin">+</span>
                            </div>
                            <span className="text-xs font-semibold">Blank Canvas</span>
                          </div>
                        ) : (
                          <PresetPreview preset={preset} />
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3 border-t border-border bg-card flex flex-col gap-1.5">
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">
                            {preset.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border-none h-auto
                              ${catMeta.accent} bg-current/10`}
                            style={{ backgroundColor: `color-mix(in srgb, currentColor 10%, transparent)` }}
                          >
                            <span className={catMeta.accent}>{preset.category}</span>
                          </Badge>
                          <span className="text-[9px] text-muted-foreground font-medium">{preset.paperSize}</span>
                        </div>
                      </div>

                      {/* Hover CTA */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-primary/90 to-primary/70"
                          >
                            <div className="text-white text-xs font-bold text-center tracking-wide">
                              Use This Template →
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Desc below card */}
                    <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5 leading-relaxed line-clamp-2">
                      {preset.description}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
