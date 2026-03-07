interface VideoPlayerProps {
  src: string;
  duration?: number | null;
  fileSize?: number | null;
  resolution?: string;
}

export default function VideoPlayer({ src, duration, fileSize, resolution }: VideoPlayerProps) {
  return (
    <div style={{
      background: 'var(--bg-tertiary)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      border: '1px solid var(--border)',
    }}>
      <video
        src={src}
        controls
        style={{ width: '100%', display: 'block' }}
      />
      <div style={{
        padding: '10px 16px',
        display: 'flex',
        gap: 16,
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
      }}>
        {duration != null && <span>⏱ {duration.toFixed(1)}с</span>}
        {fileSize != null && <span>💾 {(fileSize / 1024 / 1024).toFixed(1)} МБ</span>}
        {resolution && <span>📐 {resolution}</span>}
      </div>
    </div>
  );
}
