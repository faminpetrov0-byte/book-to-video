import { useState, useRef, DragEvent } from 'react';

interface UploadZoneProps {
  onUpload: (file: File, title?: string) => Promise<void>;
  loading?: boolean;
}

export default function UploadZone({ onUpload, loading }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      await onUpload(file);
      setFileName(null);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      await onUpload(file);
      setFileName(null);
    }
  };

  return (
    <div
      className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.epub,.pdf,.docx,.mp3,.wav"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {loading ? (
        <>
          <div className="icon"><span className="spinner" style={{ width: 48, height: 48 }} /></div>
          <h3>Анализируем {fileName}...</h3>
          <p>Извлекаем текст и создаём сцены</p>
        </>
      ) : (
        <>
          <div className="icon">📚</div>
          <h3>Загрузите книгу или аудиофайл</h3>
          <p>Поддерживаемые форматы: TXT, EPUB, PDF, DOCX, MP3, WAV</p>
          <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Перетащите файл сюда или нажмите для выбора
          </p>
        </>
      )}
    </div>
  );
}
