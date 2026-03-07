import { useState, useEffect } from 'react';
import { Character, Voice, api } from '../api/client';
import VoiceSelector from './VoiceSelector';

interface CharacterManagerProps {
  projectId: string;
  onRefresh: () => void;
}

const VOICE_COLORS = [
  '#7c5cff', '#ff6bcb', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa', '#fb923c'
];

export default function CharacterManager({ projectId, onRefresh }: CharacterManagerProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newCharacter, setNewCharacter] = useState({ name: '', voiceId: 'Rachel', description: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const [chars, voiceList] = await Promise.all([
        api.getCharacters(projectId),
        api.getVoices()
      ]);
      setCharacters(chars);
      setVoices(voiceList);
    } catch (err) {
      console.error('Failed to load characters:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCharacter = async () => {
    if (!newCharacter.name.trim()) return;
    
    try {
      const voice = voices.find(v => v.id === newCharacter.voiceId);
      await api.addCharacter(projectId, {
        name: newCharacter.name,
        voiceId: newCharacter.voiceId,
        voiceName: voice?.name || newCharacter.voiceId,
        description: newCharacter.description,
        color: VOICE_COLORS[characters.length % VOICE_COLORS.length],
      });
      
      setNewCharacter({ name: '', voiceId: 'Rachel', description: '' });
      setShowAdd(false);
      loadData();
      onRefresh();
    } catch (err) {
      console.error('Failed to add character:', err);
    }
  };

  const handleDeleteCharacter = async (id: string) => {
    if (!confirm('Удалить персонажа?')) return;
    try {
      await api.deleteCharacter(id);
      loadData();
      onRefresh();
    } catch (err) {
      console.error('Failed to delete character:', err);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 20 }}>Загрузка...</div>;
  }

  return (
    <div style={{ 
      background: 'var(--bg-card)', 
      borderRadius: 'var(--radius)', 
      padding: 16,
      marginBottom: 16,
      border: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: '1rem', margin: 0 }}>🎭 Персонажи</h3>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => setShowAdd(!showAdd)}
        >
          {showAdd ? 'Отмена' : '+ Добавить персонажа'}
        </button>
      </div>

      {showAdd && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr auto', 
          gap: 12, 
          marginBottom: 16,
          padding: 12,
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)'
        }}>
          <div>
            <label>Имя персонажа</label>
            <input
              value={newCharacter.name}
              onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
              placeholder="Например: Рассказчик, Алексей, Наташа"
            />
          </div>
          <VoiceSelector
            value={newCharacter.voiceId}
            onChange={(id, name) => setNewCharacter({ ...newCharacter, voiceId: id })}
            label="Голос"
          />
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={handleAddCharacter}>
              Добавить
            </button>
          </div>
        </div>
      )}

      {characters.length === 0 && !showAdd && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>
          Нет персонажей. Добавьте персонажей для озвучки разными голосами.
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {characters.map((char) => (
          <div
            key={char.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              borderRadius: 20,
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              background: char.color || '#7c5cff' 
            }} />
            <span style={{ fontWeight: 500 }}>{char.name}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              🎤 {char.voiceName || char.voiceId || 'Rachel'}
            </span>
            <button
              onClick={() => handleDeleteCharacter(char.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--danger)',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: '0.8rem'
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
