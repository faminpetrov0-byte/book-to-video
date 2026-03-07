import { useState } from 'react';
import { Scene, GeneratedMedia, Character } from '../api/client';

interface SceneCardProps {
  scene: Scene;
  index: number;
  generationStatus: {
    image: string;
    video: string;
    tts: string;
    error?: string;
  };
  characters?: Character[];
  onUpdate: (sceneId: string, data: Partial<Scene>) => Promise<void>;
  onDelete: (sceneId: string) => Promise<void>;
  onGenerateImage: (sceneId: string, prompt?: string) => Promise<void>;
  onGenerateVideo: (sceneId: string) => Promise<void>;
  onGenerateTTS: (sceneId: string, text?: string, voice?: string, character?: string) => Promise<void>;
  onGenerateAll: (sceneId: string) => Promise<void>;
}

export default function SceneCard({
  scene,
  index,
  generationStatus,
  characters = [],
  onUpdate,
  onDelete,
  onGenerateImage,
  onGenerateVideo,
  onGenerateTTS,
  onGenerateAll,
}: SceneCardProps) {
  const [editing, setEditing] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Rachel');
  const [editData, setEditData] = useState({
    title: scene.title || '',
    textContent: scene.textContent,
    imagePrompt: scene.imagePrompt || '',
    duration: scene.duration,
    mood: scene.mood || 'neutral',
  });

  const imageMedia = scene.generatedMedia?.filter((m) => m.mediaType === 'image' && m.status === 'completed') || [];
  const videoMedia = scene.generatedMedia?.filter((m) => m.mediaType === 'video' && m.status === 'completed') || [];
  const audioMedia = scene.generatedMedia?.filter((m) => m.mediaType === 'audio' && m.status === 'completed') || [];

  const handleSave = async () => {
    await onUpdate(scene.id, editData);
    setEditing(false);
  };

  const handleGenerateTTS = async () => {
    await onGenerateTTS(scene.id, scene.textContent, selectedVoice);
  };

  const isGenerating = generationStatus.image === 'generating'
    || generationStatus.video === 'generating'
    || generationStatus.tts === 'generating';

  return (
    <div className="card scene-card" style={{ display: 'block' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
        <div className="scene-number">{index + 1}</div>

        <div className="scene-content" style={{ flex: 1 }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label>Название сцены</label>
                <input
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                />
              </div>
              <div>
                <label>Текст / Нарратив</label>
                <textarea
                  value={editData.textContent}
                  onChange={(e) => setEditData({ ...editData, textContent: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <label>Промпт для изображения</label>
                <textarea
                  value={editData.imagePrompt}
                  onChange={(e) => setEditData({ ...editData, imagePrompt: e.target.value })}
                  rows={2}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label>Длительность (сек)</label>
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={editData.duration}
                    onChange={(e) => setEditData({ ...editData, duration: Number(e.target.value) })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Настроение</label>
                  <select
                    value={editData.mood}
                    onChange={(e) => setEditData({ ...editData, mood: e.target.value })}
                  >
                    {['neutral', 'joyful', 'sad', 'tense', 'mysterious', 'romantic', 'epic', 'peaceful'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handleSave}>Сохранить</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Отмена</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>{scene.title || `Сцена ${index + 1}`}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{scene.duration}с</span>
              </div>
              <p className="text-preview">{scene.textContent}</p>
              <div className="scene-meta">
                {scene.mood && <span className="tag">🎭 {scene.mood}</span>}
                {scene.location && scene.location !== 'Unspecified' && (
                  <span className="tag">📍 {scene.location}</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Generated media preview */}
      {(imageMedia.length > 0 || videoMedia.length > 0) && (
        <div className="media-preview" style={{ marginTop: 12, marginLeft: 64 }}>
          {imageMedia.map((m) => (
            <img key={m.id} src={mediaUrl(m)} alt="scene" />
          ))}
          {videoMedia.map((m) => (
            <video key={m.id} src={mediaUrl(m)} controls muted style={{ maxWidth: 240 }} />
          ))}
          {audioMedia.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🔊</span>
              <audio src={mediaUrl(audioMedia[0])} controls style={{ height: 32 }} />
            </div>
          )}
        </div>
      )}

      {/* Generation status */}
      {generationStatus.error && (
        <div style={{ marginTop: 8, marginLeft: 64, color: 'var(--danger)', fontSize: '0.8rem' }}>
          ⚠️ {generationStatus.error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, marginLeft: 64, flexWrap: 'wrap' }}>
        {!editing && (
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
            ✏️ Редактировать
          </button>
        )}
        <button
          className="btn btn-secondary btn-sm"
          disabled={isGenerating}
          onClick={() => onGenerateImage(scene.id, scene.imagePrompt || undefined)}
        >
          {generationStatus.image === 'generating' ? <><span className="spinner" /> Генерация...</> : '🖼️ Изображение'}
        </button>
        <button
          className="btn btn-secondary btn-sm"
          disabled={isGenerating || imageMedia.length === 0}
          onClick={() => onGenerateVideo(scene.id)}
        >
          {generationStatus.video === 'generating' ? <><span className="spinner" /> Генерация...</> : '🎥 Видео'}
        </button>
        
        {/* Voice selector + TTS */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              color: 'var(--text-primary)',
              fontSize: '0.75rem',
            }}
          >
            {characters.length > 0 ? (
              characters.map((char) => (
                <option key={char.id} value={char.voiceId || 'Rachel'}>
                  🎤 {char.name}
                </option>
              ))
            ) : (
              <>
                <option value="Rachel">🎤 Rachel (женский)</option>
                <option value="Josh">🎤 Josh (мужской)</option>
                <option value="Sam">🎤 Sam (молодой)</option>
                <option value="Arnold">🎤 Arnold (сильный)</option>
                <option value="Bella">🎤 Bella (мягкий)</option>
              </>
            )}
          </select>
          <button
            className="btn btn-secondary btn-sm"
            disabled={isGenerating}
            onClick={handleGenerateTTS}
          >
            {generationStatus.tts === 'generating' ? <><span className="spinner" />...</> : '🔊 Озвучка'}
          </button>
        </div>
        
        <button
          className="btn btn-primary btn-sm"
          disabled={isGenerating}
          onClick={() => onGenerateAll(scene.id)}
        >
          {isGenerating ? <><span className="spinner" /> Генерация...</> : '⚡ Сгенерировать всё'}
        </button>
        <button
          className="btn btn-danger btn-sm"
          onClick={() => onDelete(scene.id)}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

function mediaUrl(media: GeneratedMedia): string {
  const parts = media.filePath.split('/output/');
  if (parts.length > 1) {
    return `/output/${parts[1]}`;
  }
  return media.filePath;
}
