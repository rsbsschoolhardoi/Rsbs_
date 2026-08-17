/**
 * StudioPreview – renders a document preview that always fits the container
 * while preserving the page aspect ratio and matching the editor canvas.
 */
import React, { useEffect, useRef, useState } from 'react';
import { getPlaceholderByKey } from '@/constants/placeholders';
import type { StudioElement, StudioState } from './types';

interface StudioPreviewProps {
  state: StudioState;
}

function ElementPreview({ el }: { el: StudioElement }) {
  const isText  = el.type === 'text' || el.type === 'placeholder';
  const isImage = ['photo','logo','custom_image','signature','principal_signature'].includes(el.type);
  const isQrBar = el.type === 'qrcode' || el.type === 'barcode';
  const isLine  = el.type === 'line' || el.type === 'divider';

  const baseText: React.CSSProperties = {
    fontSize: el.fontSize,
    fontWeight: el.fontWeight as React.CSSProperties['fontWeight'],
    fontStyle: el.fontStyle as React.CSSProperties['fontStyle'],
    textDecoration: el.textDecoration,
    textAlign: el.textAlign as React.CSSProperties['textAlign'],
    color: el.color,
    letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
    lineHeight: el.lineHeight,
    textTransform: el.textTransform as React.CSSProperties['textTransform'],
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', overflow: 'hidden',
    userSelect: 'none',
  };

  return (
    <div style={{
      position: 'absolute',
      left: el.x, top: el.y,
      width: el.width, height: el.height,
      opacity: (el.opacity ?? 100) / 100,
      transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
      transformOrigin: 'center center',
      backgroundColor: el.backgroundColor && el.backgroundColor !== 'transparent' ? el.backgroundColor : undefined,
      border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor}` : undefined,
      borderRadius: el.borderRadius || undefined,
      padding: el.padding || undefined,
      boxSizing: 'border-box',
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {isText && (
        <span style={baseText}>
          {el.type === 'placeholder'
            ? (getPlaceholderByKey(el.placeholder || '')?.label || el.placeholder || '')
            : (el.text || '')}
        </span>
      )}
      {isImage && (
        el.imageUrl
          ? <img src={el.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: (el.objectFit || 'cover') as React.CSSProperties['objectFit'] }} />
          : <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.04)', border: '2px dashed rgba(0,0,0,0.15)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', fontWeight: 600, textTransform: 'capitalize' }}>
                {el.type.replace(/_/g, ' ')}
              </span>
            </div>
      )}
      {isQrBar && (
        <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.03)', border: '1px dashed rgba(0,0,0,0.12)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', fontWeight: 700 }}>
            {el.type === 'qrcode' ? 'QR Code' : 'Barcode'}
          </span>
        </div>
      )}
      {isLine && <div style={{ width: '100%', height: '100%', background: el.backgroundColor || '#e2e8f0' }} />}
      {el.type === 'table' && (
        <div style={{ width: '100%', height: '100%', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 4, overflow: 'hidden' }}>
          <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[0,1,2].map(r => (
                <tr key={r}>
                  {[0,1,2].map(c => (
                    <td key={c} style={{ border: '1px solid rgba(0,0,0,0.1)', fontSize: 9, color: 'rgba(0,0,0,0.4)', textAlign: 'center', padding: 2 }}>
                      {r === 0 ? `Col ${c + 1}` : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const StudioPreview: React.FC<StudioPreviewProps> = ({ state }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const s = Math.min(rect.width / state.page.width, rect.height / state.page.height, 1);
      setScale(s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state.page.width, state.page.height]);

  const sorted = [...state.elements]
    .filter(el => !el.hidden)
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      ref={containerRef}
      className="relative w-full flex-1 min-h-0 overflow-hidden bg-muted/30 rounded-lg border border-border/60"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        style={{
          width: state.page.width,
          height: state.page.height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          background: '#ffffff',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {sorted.map(el => (
          <ElementPreview key={el.id} el={el} />
        ))}
      </div>
      <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground font-mono pointer-events-none">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
};
