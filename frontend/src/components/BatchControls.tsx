import { useState } from 'react';
import { Scene } from '../api/client';

interface BatchControlsProps {
  scenes: Scene[];
  onGenerateImages: (sceneIds: string[], parallel: boolean) => Promise<void>;
  onGenerateVideos: (sceneIds: string[], parallel: boolean) => Promise<void>;
  onGenerateTTS: (sceneIds: string[], parallel: boolean) => Promise<void>;
  onGenerateAll: (sceneIds: string[], parallel: boolean) => Promise<void>;
  loading?: boolean;
}

export default function BatchControls({
  scenes,
  onGenerateImages,
  onGenerateVideos,
  onGenerateTTS,
  onGenerateAll,
  loading = false,
}: BatchControlsProps) {
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set());
  const [parallel, setParallel] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const toggleScene = (sceneId: string) => {
    setSelectedScenes(prev => {
      const next = new Set(prev);
      if (next.has(sceneId)) {
        next.delete(sceneId);
      } else {
        next.add(sceneId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedScenes.size === scenes.length) {
      setSelectedScenes(new Set());
    } else {
      setSelectedScenes(new Set(scenes.map(s => s.id)));
    }
  };

  const handleGenerate = async (type: 'images' | 'videos' | 'tts' | 'all') => {
    const ids = selectedScenes.size > 0 ? Array.from(selectedScenes) : scenes.map(s => s.id);
    
    switch (type) {
      case 'images':
        await onGenerateImages(ids, parallel);
        break;
      case 'videos':
        await onGenerateVideos(ids, parallel);
        break;
      case 'tts':
        await onGenerateTTS(ids, parallel);
        break;
      case 'all':
        await onGenerateAll(ids, parallel);
        break;
    }
  };

  const readyForVideo = scenes.filter(s => 
    s.generatedMedia?.some(m => m.mediaType === 'image' && m.status === 'completed')
  ).length;

  const readyForTTS = scenes.filter(s => s.textContent).length;

  return (
    <div style={{ 
      background: 'var(--bg-card)', 
      borderRadius: 'var(--radius)', 
      padding: 16,
      marginBottom: 16,
      border: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: '1rem', margin: 0 }}>⚡ Пакетная генерация</h3>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => setShowOptions(!showOptions)}
        >
          {showOptions ? 'Скрыть' : 'Настройки'}
        </button>
      </div>

      {showOptions && (
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          marginBottom: 12,
          padding: 12,
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={parallel}
              onChange={(e) => setParallel(e.target.checked)}
            />
            <span>Параллельная генерация</span>
          </label>
          
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={selectAll}
            >
              {selectedScenes.size === scenes.length ? 'Снять всё' : 'Выбрать все'}
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
              {selectedScenes.size > 0 ? `${selectedScenes.size} выбрано` : `${scenes.length} сцен`}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          className="btn btn-secondary"
          onClick={() => handleGenerate('images')}
          disabled={loading || scenes.length === 0}
        >
          🖼️ Изображения ({scenes.length})
        </button>
        
        <button
          className="btn btn-secondary"
          onClick={() => handleGenerate('videos')}
          disabled={loading || readyForVideo === 0}
        >
          🎥 Видео ({readyForVideo})
        </button>
        
        <button
          className="btn btn-secondary"
          onClick={() => handleGenerate('tts')}
          disabled={loading || readyForTTS === 0}
        >
          🔊 Озвучка ({readyForTTS})
        </button>
        
        <button
          className="btn btn-primary"
          onClick={() => handleGenerate('all')}
          disabled={loading || scenes.length === 0}
        >
          ⚡ Всё вместе
        </button>
      </div>

      {selectedScenes.size > 0 && (
        <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Будет обработано: {selectedScenes.size} сцен
          {parallel && ' (параллельно)'}
        </div>
      )}
    </div>
  );
}
