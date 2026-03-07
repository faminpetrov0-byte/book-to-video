interface StatusBadgeProps {
  status: string;
  label?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  idle: { label: 'Ожидание', className: 'badge-pending' },
  pending: { label: 'В очереди', className: 'badge-pending' },
  ready: { label: 'Готово к генерации', className: 'badge-pending' },
  generating: { label: 'Генерация...', className: 'badge-generating' },
  processing: { label: 'Обработка...', className: 'badge-processing' },
  rendering: { label: 'Рендеринг...', className: 'badge-processing' },
  image_ready: { label: 'Изображение готово', className: 'badge-completed' },
  video_ready: { label: 'Видео готово', className: 'badge-completed' },
  completed: { label: 'Завершено', className: 'badge-completed' },
  error: { label: 'Ошибка', className: 'badge-error' },
  failed: { label: 'Ошибка', className: 'badge-failed' },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'badge-pending' };

  return (
    <span className={`badge ${config.className}`}>
      {label || config.label}
    </span>
  );
}
