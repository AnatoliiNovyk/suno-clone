import React from 'react';
import { Play, Heart, Eye, Loader2, AlertCircle } from 'lucide-react';
import { ExportMenu } from './ExportMenu';
import type { Track } from '../../types';

interface TrackCardProps {
  track: Track;
  onPlay: (track: Track) => void;
}

/** Non-terminal and failed states get a badge; a completed track shows none. */
const STATUS_BADGE: Record<string, { label: string; className: string; spinning?: boolean }> = {
  pending: { label: 'У черзі', className: 'bg-neutral-900/80 text-neutral-100', spinning: true },
  processing: { label: 'Генерується', className: 'bg-primary-500/90 text-white', spinning: true },
  failed: { label: 'Помилка', className: 'bg-error/90 text-white' },
};

export function TrackCard({ track, onPlay }: TrackCardProps) {
  const isPlayable = track.status === 'completed' && Boolean(track.audio_url);
  const badge = STATUS_BADGE[track.status];

  return (
    <div className="group relative bg-card backdrop-blur-[20px] rounded-lg border border-white/5 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-base overflow-hidden">
      <div className="aspect-square relative overflow-hidden">
        <img
          src={track.cover_url || '/images/suno_music_2.jpg'}
          alt={track.title}
          className={`w-full h-full object-cover transition-all duration-base ${
            isPlayable ? 'group-hover:brightness-75' : 'brightness-50'
          }`}
        />

        {/* Always visible, unlike the hover-only play button: the whole point is
            to tell at a glance which tracks are not ready yet. */}
        {badge && (
          <span
            className={`absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${badge.className}`}
          >
            {badge.spinning ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
            {badge.label}
          </span>
        )}

        {isPlayable && (
          <button
            type="button"
            onClick={() => onPlay(track)}
            aria-label={`Відтворити ${track.title}`}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-base"
          >
            <div className="w-16 h-16 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-glow-orange hover:scale-110 transition-transform">
              <Play className="w-7 h-7 ml-1" />
            </div>
          </button>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-base font-semibold text-neutral-50 truncate">{track.title}</h3>
        <p className="text-sm text-neutral-100 mt-1 truncate">{track.genre || 'Pop'}</p>
        <div className="flex items-center gap-4 mt-3 text-xs text-neutral-300">
          <span className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            {track.likes}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {track.plays}
          </span>
          <span className="ml-auto">
            <ExportMenu track={track} />
          </span>
        </div>
      </div>
    </div>
  );
}
