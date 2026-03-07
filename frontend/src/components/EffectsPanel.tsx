import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface Preset {
  id: string;
  name: string;
  description: string;
  imagePrompt: string;
  videoEffects: {
    duration: number;
    fps: number;
    transitions: string;
    filters: string[];
  };
}

interface Model {
  id: string;
  name: string;
  type: string;
  provider: string;
  status: string;
  quality: string;
  cost: string;
}

interface EffectsPanelProps {
  projectId: string;
  onApplyPreset?: (preset: Preset) => void;
}

export default function EffectsPanel({ projectId, onApplyPreset }: EffectsPanelProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('sdxl-base');
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Custom effect settings
  const [effects, setEffects] = useState({
    colorgrade: { rs: 0.1, gs: 0.05, bs: -0.1 },
    vignette: { angle: 0.5 },
    noise: { intensity: 15 },
    blur: { radius: 0 },
    sharpen: { enabled: false },
    fadeIn: { duration: 0 },
    fadeOut: { duration: 0 },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [presetsData, modelsData] = await Promise.all([
        fetch('/api/ai/presets').then(r => r.json()).catch(() => []),
        fetch('/api/ai/models').then(r => r.json()).catch(() => []),
      ]);
      setPresets(presetsData);
      setModels(modelsData);
    } catch (err) {
      console.error('Failed to load presets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = presets.find(p => p.id === presetId);
    if (preset && onApplyPreset) {
      onApplyPreset(preset);
    }
  };

  const activePreset = presets.find(p => p.id === selectedPreset);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: '1rem', margin: 0 }}>🎨 Эффекты и пресеты</h3>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Основное' : 'Расширенные'}
        </button>
      </div>

      {/* Presets */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>
          Пресеты
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              style={{
                padding: '12px 8px',
                background: selectedPreset === preset.id ? 'var(--accent)' : 'var(--bg-tertiary)',
                border: selectedPreset === preset.id ? '2px solid white' : '2px solid transparent',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                color: selectedPreset === preset.id ? 'white' : 'var(--text-primary)',
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{preset.name}</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: 4 }}>
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Model Selection */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>
          AI Модель
        </label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            color: 'var(--text-primary)',
          }}
        >
          <optgroup label="Изображения">
            {models.filter(m => m.type === 'image' && m.cost === 'free').map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.provider})
              </option>
            ))}
          </optgroup>
          <optgroup label="Видео">
            {models.filter(m => m.type === 'video' && m.cost === 'free').map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.provider})
              </option>
            ))}
          </optgroup>
          <optgroup label="TTS">
            {models.filter(m => m.type === 'tts').map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.provider})
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Advanced Effects */}
      {showAdvanced && (
        <div style={{ 
          padding: 12, 
          background: 'var(--bg-tertiary)', 
          borderRadius: 'var(--radius-sm)',
          marginBottom: 16
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>Ручные эффекты</h4>
          
          {/* Color Grade */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Цветокоррекция</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                type="range"
                min={-0.3}
                max={0.3}
                step={0.05}
                value={effects.colorgrade.rs}
                onChange={(e) => setEffects({ ...effects, colorgrade: { ...effects.colorgrade, rs: parseFloat(e.target.value) } })}
                style={{ flex: 1 }}
              />
              <span style={{ width: 40, fontSize: '0.75rem' }}>R:{effects.colorgrade.rs}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                type="range"
                min={-0.3}
                max={0.3}
                step={0.05}
                value={effects.colorgrade.gs}
                onChange={(e) => setEffects({ ...effects, colorgrade: { ...effects.colorgrade, gs: parseFloat(e.target.value) } })}
                style={{ flex: 1 }}
              />
              <span style={{ width: 40, fontSize: '0.75rem' }}>G:{effects.colorgrade.gs}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                type="range"
                min={-0.3}
                max={0.3}
                step={0.05}
                value={effects.colorgrade.bs}
                onChange={(e) => setEffects({ ...effects, colorgrade: { ...effects.colorgrade, bs: parseFloat(e.target.value) } })}
                style={{ flex: 1 }}
              />
              <span style={{ width: 40, fontSize: '0.75rem' }}>B:{effects.colorgrade.bs}</span>
            </div>
          </div>

          {/* Vignette */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Vignette</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={effects.vignette.angle}
              onChange={(e) => setEffects({ ...effects, vignette: { angle: parseFloat(e.target.value) } })}
              style={{ width: '100%' }}
            />
          </div>

          {/* Film Grain */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Зерно плёнки</label>
            <input
              type="range"
              min={0}
              max={30}
              step={5}
              value={effects.noise.intensity}
              onChange={(e) => setEffects({ ...effects, noise: { intensity: parseInt(e.target.value) } })}
              style={{ width: '100%' }}
            />
          </div>

          {/* Fade In/Out */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fade In (сек)</label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={effects.fadeIn.duration}
                onChange={(e) => setEffects({ ...effects, fadeIn: { duration: parseFloat(e.target.value) } })}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fade Out (сек)</label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={effects.fadeOut.duration}
                onChange={(e) => setEffects({ ...effects, fadeOut: { duration: parseFloat(e.target.value) } })}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Preset Info */}
      {activePreset && (
        <div style={{ 
          padding: 12, 
          background: 'rgba(124, 92, 255, 0.1)', 
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--accent)'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Активный пресет: {activePreset.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            FPS: {activePreset.videoEffects.fps} • 
            Transition: {activePreset.videoEffects.transitions} • 
            Фильтров: {activePreset.videoEffects.filters.length}
          </div>
        </div>
      )}
    </div>
  );
}
