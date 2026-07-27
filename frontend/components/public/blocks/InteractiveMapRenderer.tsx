'use client';

import { useRef, useState, useEffect } from 'react';
import { InteractiveMapAttrs, MapPin, PinCategory, PIN_CATEGORY_COLORS } from '@/lib/gaming-block-renderers';
import '@/styles/gaming-content.css';

interface InteractiveMapRendererProps {
  mapData: InteractiveMapAttrs;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function touchDist(t1: React.Touch, t2: React.Touch) {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

export default function InteractiveMapRenderer({ mapData }: InteractiveMapRendererProps) {
  const { mapImageUrl, title, pins } = mapData;
  const safePins = Array.isArray(pins) ? pins : [];

  const viewportRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<Set<PinCategory>>(new Set());

  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; startTranslate: { x: number; y: number } } | null>(null);
  const pinchState = useRef<{ startDist: number; startScale: number } | null>(null);

  const usedCategories = Array.from(new Set(safePins.map(p => p.category)));

  const toggleCategory = (cat: PinCategory) => {
    setHiddenCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // -- Mouse panning ------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, startTranslate: { ...translate } };
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const ds = dragState.current;
      if (!ds?.dragging) return;
      setTranslate({
        x: ds.startTranslate.x + (e.clientX - ds.startX),
        y: ds.startTranslate.y + (e.clientY - ds.startY),
      });
    };
    const handleMouseUp = () => {
      if (dragState.current) dragState.current.dragging = false;
      setIsDragging(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // -- Wheel zoom (zoom toward cursor) ---------------------------------------
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;

      setScale(prevScale => {
        const newScale = clamp(prevScale * factor, MIN_SCALE, MAX_SCALE);
        if (newScale === prevScale) return prevScale;

        setTranslate(prevTranslate => {
          const stageX = (mouseX - prevTranslate.x) / prevScale;
          const stageY = (mouseY - prevTranslate.y) / prevScale;
          return { x: mouseX - stageX * newScale, y: mouseY - stageY * newScale };
        });

        return newScale;
      });
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, []);

  // -- Touch pan + pinch zoom ---------------------------------------------
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      dragState.current = { dragging: true, startX: t.clientX, startY: t.clientY, startTranslate: { ...translate } };
      pinchState.current = null;
    } else if (e.touches.length === 2) {
      dragState.current = null;
      pinchState.current = { startDist: touchDist(e.touches[0], e.touches[1]), startScale: scale };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && dragState.current?.dragging) {
      const t = e.touches[0];
      const ds = dragState.current;
      setTranslate({
        x: ds.startTranslate.x + (t.clientX - ds.startX),
        y: ds.startTranslate.y + (t.clientY - ds.startY),
      });
    } else if (e.touches.length === 2 && pinchState.current) {
      const newDist = touchDist(e.touches[0], e.touches[1]);
      const ratio = newDist / pinchState.current.startDist;
      setScale(clamp(pinchState.current.startScale * ratio, MIN_SCALE, MAX_SCALE));
    }
  };

  const handleTouchEnd = () => {
    if (dragState.current) dragState.current.dragging = false;
    pinchState.current = null;
  };

  if (!mapImageUrl) return null;

  return (
    <div className="gc-interactive-map" data-type="interactive-map">
      {title && <div className="gc-im-header">{title}</div>}

      {usedCategories.length > 0 && (
        <div className="gc-im-filters">
          {usedCategories.map(cat => (
            <button
              key={cat}
              type="button"
              className={`gc-im-pill ${hiddenCategories.has(cat) ? 'inactive' : 'active'}`}
              onClick={() => toggleCategory(cat)}
            >
              <span className="gc-im-pill-dot" style={{ background: PIN_CATEGORY_COLORS[cat] }} />
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}

      <div
        ref={viewportRef}
        className={`gc-im-viewport ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setSelectedPin(null)}
      >
        <div
          className="gc-im-stage"
          style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})` }}
        >
          <img src={mapImageUrl} alt={title || 'Map'} className="gc-im-image" draggable={false} />
          {safePins
            .filter(pin => !hiddenCategories.has(pin.category))
            .map(pin => (
              <div
                key={pin.id}
                className="gc-im-pin"
                style={{
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                  background: PIN_CATEGORY_COLORS[pin.category],
                  color: PIN_CATEGORY_COLORS[pin.category],
                }}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedPin(pin);
                }}
              >
                {pin.icon && <span style={{ color: '#fff' }}>{pin.icon}</span>}
                <span className="gc-im-pin-tooltip">{pin.label}</span>
              </div>
            ))}
        </div>

        <div className={`gc-im-popup ${selectedPin ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
          {selectedPin && (
            <>
              <button type="button" className="gc-im-popup-close" onClick={() => setSelectedPin(null)}>✕</button>
              <h4 className="gc-im-popup-title">{selectedPin.label}</h4>
              <span className="gc-im-popup-badge" style={{ background: PIN_CATEGORY_COLORS[selectedPin.category] }}>
                {selectedPin.category.replace('_', ' ')}
              </span>
              <p className="gc-im-popup-desc">{selectedPin.description}</p>
            </>
          )}
        </div>
      </div>

      <div className="gc-im-hint">Drag to pan • Scroll or pinch to zoom</div>
    </div>
  );
}
