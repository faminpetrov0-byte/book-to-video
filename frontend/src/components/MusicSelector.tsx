import { useState, useEffect } from 'react';

interface MusicTrack {
  id: string;
  name: string;
  mood: string;
  duration: number;
  source: string;
  url: string | null;
}

interface MusicSelectorProps {
  videoDuration?: number;
  onSelect?: (track: MusicTrack, settings: MusicSettings) => void;
}

interface MusicSettings {
  volume: number;
  fadeIn: number;
  fadeOut: number;
}

export default function MusicSelector({ videoDuration = 60, onSelect }: MusicSelectorProps) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string>('none');
  const [volume, setVolume] = useState(0.3);
  const [fadeIn, setFadeIn] = useState(2);
  const [fadeOut, setFadeOut] = useState(2);
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    try {
      const res = await fetch('/api/ai/music');
      const data = await res.json();
      setTracks(data);
    } catch (err) {
      console.error('Failed to load tracks:', err);
      // Fallback tracks
      setTracks([
        { id: 'none', name: 'Без музыки', mood: 'none', duration: 0, source: 'none', url: null },
        { id: 'placeholder-1', name: 'Cinematic Ambient', mood: 'epic', duration: 180, source: 'placeholder', url: '' },
        { id: 'placeholder-2', name: 'Piano Reflection', mood: 'calm', duration: 120, source: 'placeholder', url: '' },
        { id: 'placeholder-3', name: 'Epic Orchestra', mood: 'epic', duration: 240, source: 'placeholder', url: '' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (trackId: string) => {
    if (playing === trackId) {
      setPlaying(null);
    } else {
      setPlaying(trackId);
      // In real implementation, would play audio
    }
  };

  const handleApply = () => {
    const track = tracks.find(t => t.id === selectedTrack);
    if (track && onSelect) {
      onSelect(track, { volume, fadeIn, fadeOut });
    }
  };

  const getMoodColor = (mood: string) => {
    const colors: Record<string, string> = {
      epic: '#ff6b6b',
      calm: '#4ecdc4',
      peaceful: '#45b7d1',
      dramatic: '#f7dc6f',
      none: '#95a5a6',
    };
    return colors[mood] || '#7c5cff';
  };

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center' }}>Загрузка...</div>;
  }

  return (
    <div style={{ 
      background: 'var(--bg-card)', 
      borderRadius: 'var(--radius)', 
      padding: 16,
      border: '1px solid var(--border)'
    }}>
      <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>🎵 Фоновая музыка</h3>

      {/* Track List */}
      <div style={{ marginBottom: 16 }}>
        {tracks.map((track) => (
          <div
            key={track.id}
            onClick={() => setSelectedTrack(track.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              marginBottom: 4,
              background: selectedTrack === track.id ? 'var(--accent)' : 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: selectedTrack === track.id ? 'white' : 'var(--text-primary)',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="radio"
              name="track"
              checked={selectedTrack === track.id}
              onChange={() => setSelectedTrack(track.id)}
              style={{ display: 'none' }}
            />
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePreview(track.id);
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: playing === track.id ? 'white' : 'rgba(255,255,255,0.2)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
              }}
            >
              {playing === track.id ? '⏸' : '▶️'}
            </button>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{track.name}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                {track.mood !== 'none' && (
                  <span style={{ 
                    display: 'inline-block',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: getMoodColor(track.mood),
                    color: 'white',
                    fontSize: '0.65rem',
                    marginRight: 8,
                  }}>
                    {track.mood.toUpperCase()}
                  )}
                )}
                {track.duration > 0 && `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`}
              </div>
            </div>

            {track.source === 'placeholder' && (
              <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>
                Скоро
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Volume & Fade Settings */}
      {selectedTrack !== 'none' && (
        <div style={{ 
          padding: 12, 
          background: 'var(--bg-tertiary)', 
          borderRadius: 'var(--radius-sm)',
          marginBottom: 16
        }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Громкость музыки: {Math.round(volume * 100)}%
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Fade In (сек)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={fadeIn}
                onChange={(e) => setFadeIn(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Fade Out (сек)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={fadeOut}
                onChange={(e) => setFadeOut(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Apply Button */}
      <button
        className="btn btn-primary"
        onClick={handleApply}
        disabled={selectedTrack === 'none'}
        style={{ width: '100%' }}
      >
        🎵 Добавить музыку
      </button>

      {/* Info */}
      <div style={{ marginTop: 12, fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        ℹ️ Музыка будет смешана с озвучкой и добавлена к видео
      </div>
    </div>
  );
}
