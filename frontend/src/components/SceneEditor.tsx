import { useState } from 'react';
import { Scene, Character, GeneratedMedia, api } from '../api/client';
import VoiceSelector from './VoiceSelector';

interface SceneEditorProps {
  scene: Scene;
  index: number;
  characters: Character[];
  generationStatus: {
    image: string;
    video: string;
    tts: string;
    error?: string;
  };
  onUpdate: (sceneId: string, data: Partial<Scene>) => Promise<void>;
  onDelete: (sceneId: string) => Promise<void>;
  onGenerateImage: (sceneId: string, prompt?: string) => Promise<void>;
  onGenerateVideo: (sceneId: string) => Promise<void>;
  onGenerateTTS: (sceneId: string, text?: string, voice?: string, character?: string) => Promise<void>;
  onGenerateAll: (sceneId: string) => Promise<void>;
}

export default function SceneEditor({
  scene,
  index,
  characters,
  generationStatus,
  onUpdate,
  onDelete,
  onGenerateImage,
  onGenerateVideo,
  onGenerateTTS,
  onGenerateAll,
}: SceneEditorProps) {
  const [editing, setEditing] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(() => {
    // Try to detect character from scene text and use their voice
    if (characters.length > 0 && scene.textContent) {
      for (const char of characters) {
        if (scene.textContent.toLowerCase().includes(char.name.toLowerCase())) {
          return char.voiceId || 'Rachel';
        }
      }
    }
    return 'Rachel';
  });
  const [voiceForText, setVoiceForText] = useState<{ start: number; end: number; voice: string; text: string }[]>([]);
  
  const [editData, setEditData] = useState({
    title: scene.title || '',
    textContent: scene.textContent,
    imagePrompt: scene.imagePrompt || '',
    duration: scene.duration,
    mood: scene.mood || 'neutral',
  });

  // Parse characters from scene text (dialogue detection)
  const dialogueMatches = scene.textContent?.match(/^([^:]+):\s*(.+)$/gm) || [];
  const hasDialogue = dialogueMatches.length > 0;

  const imageMedia = scene.generatedMedia?.filter((m) => m.mediaType === 'image' && m.status === 'completed') || [];
  const videoMedia = scene.generatedMedia?.filter((m) => m.mediaType === 'video' && m.status === 'completed') || [];
  const audioMedia = scene.generatedMedia?.filter((m) => m.mediaType === 'audio' && m.status === 'completed') || [];

  const handleSave = async () => {
    await onUpdate(scene.id, editData);
    setEditing(false);
  };

  const handleGenerateTTS = async () => {
    // If has dialogue, try to use different voices for each character
    if (hasDialogue && characters.length > 0) {
      // Split by dialogue and generate with different voices
      const lines = scene.textContent.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          const [, charName, text] = match;
          const char = characters.find(c => c.name.toLowerCase() === charName.toLowerCase());
          const voice = char?.voiceId || selectedVoice;
          await onGenerateTTS(scene.id, text, voice, charName);
        } else {
          // Narrator text
          const defaultChar = characters.find(c => c.name.toLowerCase() === 'narrator');
          await onGenerateTTS(scene.id, line, defaultChar?.voiceId || selectedVoice, 'Narrator');
        }
      }
    } else {
      await onGenerateTTS(scene.id, scene.textContent, selectedVoice);
    }
  };

  const isGenerating = generationStatus.image === 'generating'
    || generationStatus.video === 'generating'
    || generationStatus.tts === 'generating';

  return (
    <div className="card" style={{ marginBottom: 16, border: '1px solid var(--border)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: 'white'
          }}>
            {index + 1}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{scene.title || `Сцена ${index + 1}`}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {scene.duration} сек • {scene.location || '—'} • {scene.mood || 'нейтрально'}
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setEditing(!editing)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: 4,
            }}
            title="Редактировать"
          >
            {editing ? '✕' : '✏️'}
          </button>
          <button
            onClick={() => {
              if (confirm('Удалить сцену?')) onDelete(scene.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: 4,
              color: 'var(--danger)',
            }}
            title="Удалить"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Content */}
      {editing ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Название</label>
            <input
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>
          
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Текст</label>
            <textarea
              value={editData.textContent}
              onChange={(e) => setEditData({ ...editData, textContent: e.target.value })}
              rows={4}
              style={{ width: '100%' }}
              placeholder="Текст сцены. Используйте формат: Имя: Текст для диалогов"
            />
            {hasDialogue && (
              <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: 4 }}>
                ℹ️ Обнаружены диалоги — можно использовать разные голоса для персонажей
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Промпт для изображения</label>
            <textarea
              value={editData.imagePrompt}
              onChange={(e) => setEditData({ ...editData, imagePrompt: e.target.value })}
              rows={2}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Длительность (сек)</label>
              <input
                type="number"
                min={5}
                max={30}
                value={editData.duration}
                onChange={(e) => setEditData({ ...editData, duration: Number(e.target.value) })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Настроение</label>
              <select
                value={editData.mood}
                onChange={(e) => setEditData({ ...editData, mood: e.target.value })}
              >
                <option value="neutral">Нейтральное</option>
                <option value="joyful">Радостное</option>
                <option value="sad">Грустное</option>
                <option value="tense">Напряжённое</option>
                <option value="mysterious">Загадочное</option>
                <option value="romantic">Романтичное</option>
                <option value="epic">Эпичное</option>
                <option value="peaceful">Спокойное</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
              Отмена
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>
              Сохранить
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <p style={{ 
            fontSize: '0.875rem', 
            color: 'var(--text-secondary)', 
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            maxHeight: 100,
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {scene.textContent}
          </p>
        </div>
      )}

      {/* Media Preview */}
      {(imageMedia.length > 0 || videoMedia.length > 0) && (
        <div style={{ 
          display: 'flex', 
          gap: 8, 
          marginBottom: 12, 
          flexWrap: 'wrap',
          padding: 12,
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)'
        }}>
          {imageMedia.map((m) => (
            <img 
              key={m.id} 
              src={mediaUrl(m)} 
              alt="preview" 
              style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 4 }}
            />
          ))}
          {videoMedia.map((m) => (
            <video 
              key={m.id} 
              src={mediaUrl(m)} 
              controls 
              muted 
              style={{ width: 160, height: 90, borderRadius: 4 }}
            />
          ))}
          {audioMedia.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'var(--bg-secondary)', borderRadius: 4 }}>
              <span>🔊</span>
              <audio src={mediaUrl(audioMedia[0])} controls style={{ height: 28 }} />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Image Generation */}
        <button
          className="btn btn-secondary btn-sm"
          disabled={isGenerating}
          onClick={() => onGenerateImage(scene.id, scene.imagePrompt || undefined)}
        >
          {generationStatus.image === 'generating' ? '⏳' : '🖼️'} Изображение
        </button>

        {/* Video Generation */}
        <button
          className="btn btn-secondary btn-sm"
          disabled={isGenerating || imageMedia.length === 0}
          onClick={() => onGenerateVideo(scene.id)}
        >
          {generationStatus.video === 'generating' ? '⏳' : '🎥'} Видео
        </button>

        {/* Voice Selection + TTS */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              minWidth: 140,
            }}
          >
            {characters.length > 0 ? (
              characters.map((char) => (
                <option key={char.id} value={char.voiceId || 'Rachel'}>
                  🎭 {char.name}
                </option>
              ))
            ) : (
              <>
                <option value="Rachel">🎤 Rachel (жен)</option>
                <option value="Josh">🎤 Josh (муж)</option>
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
            title="Сгенерировать озвучку"
          >
            {generationStatus.tts === 'generating' ? '⏳' : '🔊'} Озвучка
          </button>
        </div>

        {/* Generate All */}
        <button
          className="btn btn-primary btn-sm"
          disabled={isGenerating}
          onClick={() => onGenerateAll(scene.id)}
        >
          ⚡ Всё
        </button>

        {/* Status */}
        {generationStatus.error && (
          <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>
            ⚠️ {generationStatus.error}
          </span>
        )}
      </div>

      {/* Character Tags */}
      {characters.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {characters.slice(0, 4).map((char) => (
            <span
              key={char.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                background: `${char.color || '#7c5cff'}20`,
                border: `1px solid ${char.color || '#7c5cff'}`,
                borderRadius: 12,
                fontSize: '0.7rem',
                color: char.color || '#7c5cff',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: char.color || '#7c5cff' }} />
              {char.name}
            </span>
          ))}
        </div>
      )}
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
