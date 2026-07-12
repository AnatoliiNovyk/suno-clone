import React, { useEffect, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { exportTrack, type ExportFormat } from '@/lib/audioExport';
import type { Track } from '@/types';

interface ExportMenuProps {
  track: Track;
  /** Smaller trigger for tight layouts like the bottom player. */
  compact?: boolean;
}

export function ExportMenu({ track, compact = false }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const isReady = track.status === 'completed' && Boolean(track.audio_url);

  useEffect(() => {
    if (!open) return;
    const onOutsideClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, [open]);

  if (!isReady) return null;

  const handleExport = async (format: ExportFormat) => {
    setError(null);
    setExporting(format);
    try {
      await exportTrack(track, format);
      setOpen(false);
    } catch (err) {
      console.error('Track export error:', err);
      setError(err instanceof Error ? err.message : 'Не вдалося експортувати трек.');
    } finally {
      setExporting(null);
    }
  };

  const triggerSize = compact ? 'p-2' : 'p-1.5';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Експортувати трек"
        aria-expanded={open}
        className={`${triggerSize} rounded-full text-neutral-100 hover:text-neutral-50 hover:bg-white/10 transition-colors`}
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 z-50 min-w-[10rem] rounded-lg bg-neutral-700 border border-white/10 shadow-modal overflow-hidden">
          {(['mp3', 'wav'] as const).map((format) => (
            <button
              key={format}
              type="button"
              disabled={exporting !== null}
              onClick={(e) => {
                e.stopPropagation();
                handleExport(format);
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-50 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {exporting === format ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Експорт у {format.toUpperCase()}
            </button>
          ))}
          {error && (
            <p className="px-4 py-2 text-xs text-error border-t border-white/10">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
