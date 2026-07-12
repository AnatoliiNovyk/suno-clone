import React from 'react';
import { Play, Heart, Eye } from 'lucide-react';
import { ExportMenu } from './ExportMenu';
import type { Track } from '../../types';

interface TrackCardProps {
  track: Track;
  onPlay: (track: Track) => void;
}

export function TrackCard({ track, onPlay }: TrackCardProps) {
  return (
    <div className="group relative bg-card backdrop-blur-[20px] rounded-lg border border-white/5 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-base overflow-hidden">
      <div className="aspect-square relative overflow-hidden">
        <img
          src={track.cover_url || '/images/suno_music_2.jpg'}
          alt={track.title}
          className="w-full h-full object-cover group-hover:brightness-75 transition-all duration-base"
        />
        <button
          onClick={() => onPlay(track)}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-base"
        >
          <div className="w-16 h-16 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-glow-orange hover:scale-110 transition-transform">
            <Play className="w-7 h-7 ml-1" />
          </div>
        </button>
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
