import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { ExportMenu } from '../ui/ExportMenu';
import type { Track } from '../../types';

interface AudioPlayerProps {
  track: Track | null;
  onClose?: () => void;
  /** Omit to disable the corresponding skip button (e.g. single-track views). */
  onPrevious?: () => void;
  onNext?: () => void;
}

const DEFAULT_VOLUME = 0.7;

export function AudioPlayer({ track, onClose, onPrevious, onNext }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const isPlayable = Boolean(track?.audio_url) && track?.status === 'completed';

  // The source, not the object. Library polling hands us a freshly deserialized
  // row every 2.5s while any track is generating; keying the reload effect on
  // `track` meant load() fired on every poll, resetting playback to 0 and
  // pausing. Only an actual change of track or of its audio warrants a reload.
  const trackId = track?.id;
  const audioSrc = track?.audio_url;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackError(null);
    // load() on a src-less <audio> fires a spurious error event.
    if (audioRef.current && audioSrc) {
      audioRef.current.load();
    }
  }, [trackId, audioSrc]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlayable) {
      if (track?.status === 'failed') {
        setPlaybackError('Генерація треку не вдалася.');
      } else {
        setPlaybackError('Трек ще генерується. Зачекайте…');
      }
      return;
    }

    setPlaybackError(null);

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (err) {
      console.error('Audio playback error:', err);
      setIsPlaying(false);
      setPlaybackError('Не вдалося відтворити трек. Спробуйте ще раз.');
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const value = audioRef.current?.duration;
    // A stream of unknown length reports Infinity, which formatTime cannot render.
    setDuration(Number.isFinite(value) ? (value as number) : 0);
  };

  const handleAudioError = () => {
    const audio = audioRef.current;
    const code = audio?.error?.code;

    console.error('Audio element error:', {
      code,
      currentSrc: audio?.currentSrc,
      src: audio?.src,
      networkState: audio?.networkState,
      readyState: audio?.readyState,
    });

    setIsPlaying(false);
    setDuration(0);
    setPlaybackError('Помилка завантаження аудіо.');
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Dragging the slider is an explicit request to hear something: while muted
  // the change used to be swallowed, because the slider renders 0 when muted.
  const handleVolumeChange = (value: number) => {
    setVolume(value);
    setIsMuted(value === 0);
  };

  const toggleMute = () => {
    if (!isMuted) {
      setIsMuted(true);
      return;
    }
    setIsMuted(false);
    // Unmuting a slider that sits at 0 would stay silent.
    if (volume === 0) setVolume(DEFAULT_VOLUME);
  };

  const formatTime = (time: number) => {
    if (!Number.isFinite(time) || time < 0) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!track) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-700/80 backdrop-blur-[40px] border-t border-white/10 shadow-modal">
      <audio
        ref={audioRef}
        src={track.audio_url || undefined}
        preload="metadata"
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={handleAudioError}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Track Info */}
        <div className="flex items-center gap-3 min-w-0 flex-shrink-0 w-48">
          <div className="w-12 h-12 rounded-md bg-neutral-500 overflow-hidden flex-shrink-0">
            {track.cover_url && (
              <img
                src={track.cover_url}
                alt={track.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-50 truncate">{track.title}</p>
            <p className="text-xs text-neutral-100 truncate">{track.genre || 'Unknown'}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onPrevious}
              disabled={!onPrevious}
              className="p-2 text-neutral-100 hover:text-neutral-50 disabled:opacity-30 disabled:hover:text-neutral-100 transition-colors"
              aria-label="Попередній трек"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              disabled={!isPlayable}
              aria-label={isPlayable ? (isPlaying ? 'Пауза' : 'Відтворити') : 'Трек ще не готовий'}
              className={
                "w-10 h-10 rounded-full flex items-center justify-center transition-transform " +
                (isPlayable
                  ? "bg-neutral-50 text-neutral-900 hover:scale-105"
                  : "bg-neutral-500 text-neutral-300 cursor-not-allowed")
              }
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!onNext}
              className="p-2 text-neutral-100 hover:text-neutral-50 disabled:opacity-30 disabled:hover:text-neutral-100 transition-colors"
              aria-label="Наступний трек"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full max-w-md flex items-center gap-2">
            <span className="text-xs text-neutral-100 w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              disabled={!isPlayable || duration === 0}
              aria-label="Позиція відтворення"
              className="flex-1 h-1 bg-neutral-500 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500"
            />
            <span className="text-xs text-neutral-100 w-10">
              {formatTime(duration)}
            </span>
          </div>

          {playbackError && (
            <div className="text-xs text-error mt-1">
              {playbackError}
            </div>
          )}

          {!isPlayable && !playbackError && (
            <div className="text-xs text-neutral-300 mt-1">
              {track.status === 'failed' ? 'Генерація завершилась помилкою.' : 'Генерація…'}
            </div>
          )}
        </div>

        {/* Export */}
        <ExportMenu track={track} compact />

        {/* Volume */}
        <div className="hidden sm:flex items-center gap-2 w-32">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Увімкнути звук' : 'Вимкнути звук'}
            className="p-2 text-neutral-100 hover:text-neutral-50 transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            aria-label="Гучність"
            className="flex-1 h-1 bg-neutral-500 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-50"
          />
        </div>

        {/* Close — the prop was always passed but the player had no way to be
            dismissed. */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити плеєр"
            className="p-2 text-neutral-100 hover:text-neutral-50 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
