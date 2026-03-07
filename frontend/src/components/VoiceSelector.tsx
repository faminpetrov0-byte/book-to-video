import { useState, useEffect, useRef } from 'react';
import { Voice, api } from '../api/client';

interface VoiceSelectorProps {
  value: string;
  onChange: (voiceId: string, voiceName: string) => void;
  disabled?: boolean;
  label?: string;
}

export default function VoiceSelector({ value, onChange, disabled, label }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    api.getVoices()
      .then(setVoices)
      .catch(console.error)
      .finally(() => setLoading(false));

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const selectedVoice = voices.find(v => v.id === value || v.name === value);

  // Test voice with sample text (using browser TTS as preview)
  const previewVoice = async (voiceId: string) => {
    if (playing) {
      window.speechSynthesis.cancel();
      if (playing === voiceId) {
        setPlaying(null);
        return;
      }
    }

    const voice = voices.find(v => v.id === voiceId);
    if (!voice) return;

    // Use Web Speech API for preview
    const utterance = new SpeechSynthesisUtterance(
      'Привет! Это предпрослушивание голоса. Сейчас вы услышите, как звучит этот персонаж.'
    );
    
    // Try to find matching browser voice
    const browserVoices = window.speechSynthesis.getVoices();
    const matchingVoice = browserVoices.find(v => 
      v.name.toLowerCase().includes(voice.gender === 'female' ? 'female' : 'male')
    );
    
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    utterance.onstart = () => setPlaying(voiceId);
    utterance.onend = () => setPlaying(null);
    utterance.onerror = () => setPlaying(null);

    window.speechSynthesis.speak(utterance);
  };

  if (loading) {
    return (
      <select disabled value={value} style={{ opacity: 0.5 }}>
        <option>Загрузка голосов...</option>
      </select>
    );
  }

  return (
    <div>
      {label && <label>{label}</label>}
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          value={value}
          onChange={(e) => {
            const voice = voices.find(v => v.id === e.target.value);
            onChange(e.target.value, voice?.name || e.target.value);
          }}
          disabled={disabled}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            flex: 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <option value="">Выберите голос</option>
          <optgroup label="Женские голоса">
            {voices.filter(v => v.gender === 'female').map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Мужские голоса">
            {voices.filter(v => v.gender === 'male').map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
          </optgroup>
        </select>
        
        <button
          type="button"
          onClick={() => previewVoice(value)}
          disabled={!value || disabled}
          title="Предпрослушать голос"
          style={{
            background: playing === value ? 'var(--accent)' : 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            fontSize: '1.2rem',
          }}
        >
          {playing === value ? '⏹' : '▶️'}
        </button>
      </div>
      {selectedVoice && (
        <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          🎤 Выбран: {selectedVoice.name} ({selectedVoice.gender === 'female' ? 'женский' : 'мужской'})
        </div>
      )}
    </div>
  );
}
