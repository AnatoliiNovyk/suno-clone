import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import type { Track } from '../../types';

interface AudioPlayerProps {
  track: Track | null;
  onClose?: () => void;
}

export function AudioPlayer({ track, onClose }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const isPlayable = Boolean(track?.audio_url) && track?.status === 'completed';

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (track && audioRef.current) {
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setPlaybackError(null);
    }
  }, [track]);

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
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
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

  const formatTime = (time: number) => {
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
              className="p-2 text-neutral-100 hover:text-neutral-50 transition-colors"
              aria-label="Попередній трек"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
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
              className="p-2 text-neutral-100 hover:text-neutral-50 transition-colors"
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

        {/* Volume */}
        <div className="hidden sm:flex items-center gap-2 w-32">
          <button
            onClick={() => setIsMuted(!isMuted)}
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
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            aria-label="Гучність"
            className="flex-1 h-1 bg-neutral-500 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-50"
          />
        </div>
      </div>
    </div>
  );
}
