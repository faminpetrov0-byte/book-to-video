import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface YouTubeUploadProps {
  videoId: string;
  videoTitle?: string;
  onUploadComplete?: (result: any) => void;
}

export default function YouTubeUpload({ videoId, videoTitle, onUploadComplete }: YouTubeUploadProps) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Upload settings
  const [title, setTitle] = useState(videoTitle || '');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('book,ai,video,story');
  const [privacy, setPrivacy] = useState<'private' | 'public' | 'unlisted'>('private');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/youtube/status');
      const data = await res.json();
      setConnected(data.connected);
    } catch (err) {
      console.error('Failed to check YouTube status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (email: string, password: string) => {
    setLoading(true);
    try {
      await fetch('/api/youtube/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      setConnected(true);
      setShowSettings(false);
    } catch (err) {
      console.error('Failed to connect:', err);
      alert('Ошибка подключения');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Отключить YouTube аккаунт?')) return;
    
    try {
      await fetch('/api/youtube/auth', { method: 'DELETE' });
      setConnected(false);
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    setResult(null);
    
    try {
      const res = await fetch('/api/youtube/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          title,
          description,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          privacy,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setResult(data);
        onUploadComplete?.(data);
      } else {
        alert('Ошибка загрузки: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Ошибка загрузки на YouTube');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center' }}>Проверка подключения...</div>;
  }

  return (
    <div style={{ 
      background: 'var(--bg-card)', 
      borderRadius: 'var(--radius)', 
      padding: 16,
      border: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: '1rem', margin: 0 }}>📺 YouTube Загрузка</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {connected && (
            <span style={{ 
              fontSize: '0.75rem', 
              padding: '4px 8px', 
              background: '#34d39920', 
              color: '#34d399', 
              borderRadius: 4 
            }}>
              ✅ Подключено
            </span>
          )}
        </div>
      </div>

      {!connected ? (
        // Connection Form
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            Подключи YouTube аккаунт для автоматической загрузки видео
          </p>
          
          <YouTubeConnectForm onConnect={handleConnect} loading={loading} />
        </div>
      ) : result ? (
        // Upload Result
        <div style={{ 
          padding: 16, 
          background: '#34d39920', 
          borderRadius: 'var(--radius-sm)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Загрузка на YouTube начата!</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Видео появится на канале в течение нескольких минут
          </div>
          {result.taskId && (
            <div style={{ 
              marginTop: 12, 
              padding: 8, 
              background: 'var(--bg-tertiary)', 
              borderRadius: 4,
              fontSize: '0.75rem',
              fontFamily: 'monospace'
            }}>
              Task ID: {result.taskId}
            </div>
          )}
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ marginTop: 12 }}
            onClick={() => setResult(null)}
          >
            Загрузить ещё
          </button>
        </div>
      ) : (
        // Upload Form
        <div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Название видео</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите название..."
              maxLength={100}
            />
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              {title.length}/100
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание видео..."
              rows={3}
              maxLength={5000}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Теги (через запятую)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="book,ai,video,story"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Приватность</label>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as any)}
              style={{ width: '100%' }}
            >
              <option value="private">🔒 Приватное</option>
              <option value="unlisted">🔗 По ссылке</option>
              <option value="public">🌍 Публичное</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary"
              onClick={handleDisconnect}
              style={{ flex: 1 }}
            >
              Отключить
            </button>
            <button
              className="btn btn-danger"
              onClick={handleUpload}
              disabled={uploading || !title.trim()}
              style={{ flex: 2 }}
            >
              {uploading ? '⏳ Загрузка...' : '📺 Загрузить на YouTube'}
            </button>
          </div>

          <div style={{ 
            marginTop: 12, 
            padding: 8, 
            background: 'var(--bg-tertiary)', 
            borderRadius: 4,
            fontSize: '0.7rem',
            color: 'var(--text-muted)'
          }}>
            ℹ️ Видео будет загружено через Selenium бота. Убедись что установлен Chrome и chromedriver.
          </div>
        </div>
      )}
    </div>
  );
}

// Separate component for connection form
function YouTubeConnectForm({ onConnect, loading }: { onConnect: (email: string, password: string) => void, loading: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onConnect(email, password);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Пароль</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль от аккаунта"
          required
        />
      </div>

      <div style={{ 
        padding: 8, 
        background: 'rgba(248,113,113,0.1)', 
        borderRadius: 4,
        fontSize: '0.7rem',
        color: 'var(--danger)',
        marginBottom: 12
      }}>
        ⚠️ Пароли хранятся локально. Для безопасности используй app password в Google.
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading || !email || !password}
        style={{ width: '100%' }}
      >
        {loading ? 'Подключение...' : '🔗 Подключить YouTube'}
      </button>
    </form>
  );
}
