import { useState } from 'react';

interface AddSceneModalProps {
  onAdd: (data: { textContent: string; imagePrompt: string; duration: number; mood: string }) => void;
  onClose: () => void;
}

export default function AddSceneModal({ onAdd, onClose }: AddSceneModalProps) {
  const [data, setData] = useState({
    textContent: '',
    imagePrompt: '',
    duration: 10,
    mood: 'neutral',
  });

  const handleSubmit = () => {
    if (!data.textContent.trim()) return;
    onAdd(data);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Добавить сцену</h2>

        <div className="form-group">
          <label>Текст / Нарратив</label>
          <textarea
            value={data.textContent}
            onChange={(e) => setData({ ...data, textContent: e.target.value })}
            placeholder="Текст, который будет озвучен в этой сцене..."
            rows={4}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Промпт для изображения</label>
          <textarea
            value={data.imagePrompt}
            onChange={(e) => setData({ ...data, imagePrompt: e.target.value })}
            placeholder="Детальное описание визуального образа для AI-генерации..."
            rows={3}
          />
          <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Оставьте пустым — система создаст автоматически из текста
          </small>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Длительность (сек)</label>
            <input
              type="number"
              min={5}
              max={30}
              value={data.duration}
              onChange={(e) => setData({ ...data, duration: Number(e.target.value) })}
            />
          </div>

          <div className="form-group" style={{ flex: 1 }}>
            <label>Настроение</label>
            <select
              value={data.mood}
              onChange={(e) => setData({ ...data, mood: e.target.value })}
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

        <div className="actions">
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!data.textContent.trim()}
          >
            Добавить сцену
          </button>
        </div>
      </div>
    </div>
  );
}
