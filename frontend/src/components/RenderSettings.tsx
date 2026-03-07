import { useState } from 'react';
import { api } from '../api/client';

interface RenderSettingsProps {
  projectId: string;
  onRenderStart?: () => void;
  onRenderComplete?: () => void;
}

export default function RenderSettings({ projectId, onRenderStart, onRenderComplete }: RenderSettingsProps) {
  const [resolution, setResolution] = useState('1080p');
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('high');
  const [rendering, setRendering] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const resolutions = [
    { value: '720p', label: '720p HD', desc: '1280x720 - Быстрая загрузка' },
    { value: '1080p', label: '1080p Full HD', desc: '1920x1080 - Стандарт' },
    { value: '4k', label: '4K Ultra HD', desc: '3840x2160 - Макс качество' },
    { value: 'vertical_9:16_720', label: '📱 Вертикальный 720p', desc: '720x1280 - Stories/Reels' },
    { value: 'vertical_9:16_1080', label: '📱 Вертикальный 1080p', desc: '1080x1920 - Reels/TikTok' },
  ];

  const qualities = [
    { value: 'low', label: 'Эконом', desc: 'Быстрее, меньше размер' },
    { value: 'medium', label: 'Среднее', desc: 'Баланс качества и размера' },
    { value: 'high', label: 'Высокое', desc: 'Рекомендуется' },
    { value: 'ultra', label: 'Ультра', desc: 'Максимальное качество' },
  ];

  const handleRender = async () => {
    setRendering(true);
    onRenderStart?.();
    
    try {
      await api.renderProject(projectId, resolution, format, quality);
      onRenderComplete?.();
    } catch (err) {
      console.error('Render failed:', err);
      alert('Ошибка рендеринга: ' + (err as Error).message);
    } finally {
      setRendering(false);
    }
  };

  const isVertical = resolution.includes('vertical');

  return (
    <div style={{ 
      background: 'var(--bg-card)', 
      borderRadius: 'var(--radius)', 
      padding: 16,
      border: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: '1rem', margin: 0 }}>🎬 Настройки рендеринга</h3>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Скрыть' : 'Расширенные'}
        </button>
      </div>

      {/* Resolution Selection */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>
          Разрешение
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
          {resolutions.map((res) => (
            <label
              key={res.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                background: resolution === res.value ? 'var(--accent)' : 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                color: resolution === res.value ? 'white' : 'var(--text-primary)',
                transition: 'all 0.2s',
              }}
            >
              <input
                type="radio"
                name="resolution"
                value={res.value}
                checked={resolution === res.value}
                onChange={(e) => setResolution(e.target.value)}
                style={{ display: 'none' }}
              />
              <span style={{ fontWeight: 500 }}>{res.label}</span>
            </label>
          ))}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {resolutions.find(r => r.value === resolution)?.desc}
        </div>
      </div>

      {/* Quality Selection */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>
          Качество
        </label>
        <select
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            color: 'var(--text-primary)',
          }}
        >
          {qualities.map((q) => (
            <option key={q.value} value={q.value}>
              {q.label} - {q.desc}
            </option>
          ))}
        </select>
      </div>

      {/* Format Selection */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>
          Формат
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['mp4', 'webm'].map((f) => (
            <label
              key={f}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px',
                background: format === f ? 'var(--accent)' : 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                color: format === f ? 'white' : 'var(--text-primary)',
              }}
            >
              <input
                type="radio"
                name="format"
                value={f}
                checked={format === f}
                onChange={(e) => setFormat(e.target.value)}
                style={{ display: 'none' }}
              />
              {f.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div style={{ 
        padding: 12, 
        background: 'var(--bg-tertiary)', 
        borderRadius: 'var(--radius-sm)',
        marginBottom: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Итоговый формат:
          </div>
          <div style={{ fontWeight: 600 }}>
            {resolution.replace('vertical_9:16_', '')} {isVertical ? '📱' : '🖥️'}
            {format.toUpperCase()} • {quality}
          </div>
        </div>
        {isVertical && (
          <div style={{ 
            padding: '4px 8px', 
            background: 'rgba(124, 92, 255, 0.2)', 
            borderRadius: 4,
            fontSize: '0.75rem',
            color: 'var(--accent)'
          }}>
            Оптимизировано для Reels/TikTok
          </div>
        )}
      </div>

      {/* Render Button */}
      <button
        className="btn btn-primary"
        onClick={handleRender}
        disabled={rendering}
        style={{ width: '100%' }}
      >
        {rendering ? (
          <>
            <span className="spinner" /> Рендеринг...
          </>
        ) : (
          <>🎬 Рендерить видео</>
        )}
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div style={{ 
          marginTop: 16, 
          padding: 12, 
          background: 'var(--bg-tertiary)', 
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem' }}>Дополнительные опции:</h4>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>Цветокоррекция: включена (Hollywood style)</li>
            <li>Эффект плёнки: включён</li>
            <li>Vignette: включён</li>
            <li>Шумоподавление: адаптивное</li>
          </ul>
        </div>
      )}
    </div>
  );
}
