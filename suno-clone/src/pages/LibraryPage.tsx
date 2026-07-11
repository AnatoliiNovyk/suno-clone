import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Music } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TrackCard } from '../components/ui/TrackCard';
import { AudioPlayer } from '../components/audio/AudioPlayer';
import type { Track } from '../types';

export function LibraryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'public' | 'private'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);

  const fetchTracks = useCallback(async () => {
    if (!user) return;

    let query = supabase
      .from('tracks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (activeTab === 'public') {
      query = query.eq('is_public', true);
    } else if (activeTab === 'private') {
      query = query.eq('is_public', false);
    }

    const { data, error } = await query;

    if (!error && data) {
      setTracks(data as Track[]);
      setCurrentTrack((prev) => {
        if (!prev) return prev;
        const updated = (data as Track[]).find((t) => t.id === prev.id);
        return updated ?? prev;
      });
    }
    setLoading(false);
  }, [user, activeTab]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchTracks();
    } else {
      setLoading(false);
    }
  }, [user, activeTab, fetchTracks]);

  // Poll every in-progress track (pending/processing), not only the selected one.
  useEffect(() => {
    if (!user) return;

    const hasInFlight = tracks.some(
      (t) => t.status === 'pending' || t.status === 'processing',
    );
    if (!hasInFlight) return;

    const interval = setInterval(() => {
      fetchTracks();
    }, 2500);

    return () => clearInterval(interval);
  }, [user, tracks, fetchTracks]);

  const filteredTracks = tracks.filter(
    (track) =>
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.genre?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handlePlay = (track: Track) => {
    setCurrentTrack(track);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-24 flex items-center justify-center">
        <div className="text-center">
          <Music className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-50 mb-2">
            Увійдіть, щоб побачити бібліотеку
          </h2>
          <p className="text-neutral-100 mb-6">
            Ваші створені треки будуть зберігатися тут
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-full bg-primary-500 text-white font-medium hover:bg-primary-700 transition-colors"
          >
            Увійти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 pt-24 pb-32">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-neutral-50">Моя бібліотека</h1>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Пошук..."
                className="w-full pl-10 pr-4 py-2 bg-neutral-700 border border-neutral-500 rounded-full text-sm text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {(['all', 'public', 'private'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-700 text-neutral-100 hover:bg-neutral-700/80'
              }`}
            >
              {tab === 'all' ? 'Усі' : tab === 'public' ? 'Публічні' : 'Приватні'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="text-center py-20">
            <Music className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-neutral-50 mb-2">
              {searchQuery ? 'Нічого не знайдено' : 'Бібліотека порожня'}
            </h2>
            <p className="text-neutral-100 mb-6">
              {searchQuery ? 'Спробуйте інший пошуковий запит' : 'Створіть свій перший трек'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => navigate('/create')}
                className="px-6 py-3 rounded-full bg-primary-500 text-white font-medium hover:bg-primary-700 transition-colors"
              >
                Створити музику
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTracks.map((track) => (
              <TrackCard key={track.id} track={track} onPlay={handlePlay} />
            ))}
          </div>
        )}
      </div>

      {currentTrack && (
        <AudioPlayer track={currentTrack} onClose={() => setCurrentTrack(null)} />
      )}
    </div>
  );
}
