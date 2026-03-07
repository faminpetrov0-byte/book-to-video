import { Link } from 'react-router-dom';
import { Project } from '../api/client';

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  created: { label: 'Создан', class: 'badge-pending' },
  analyzing: { label: 'Анализ...', class: 'badge-processing' },
  scenes_ready: { label: 'Сцены готовы', class: 'badge-completed' },
  generating: { label: 'Генерация...', class: 'badge-generating' },
  rendering: { label: 'Рендеринг...', class: 'badge-processing' },
  completed: { label: 'Готово', class: 'badge-completed' },
};

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const status = STATUS_MAP[project.status] || { label: project.status, class: 'badge-pending' };
  const scenesCount = project._count?.scenes ?? project.scenes?.length ?? 0;
  const videosCount = project._count?.videos ?? project.videos?.length ?? 0;

  return (
    <div className="card" style={{ position: 'relative' }}>
      <Link to={`/project/${project.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{project.title}</h3>
          <span className={`badge ${status.class}`}>{status.label}</span>
        </div>

        <div style={{ display: 'flex', gap: 16, color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 12 }}>
          <span>📄 {project.sourceFormat.toUpperCase()}</span>
          <span>🎬 {scenesCount} сцен</span>
          {videosCount > 0 && <span>🎥 {videosCount} видео</span>}
          {project.totalDuration && <span>⏱ {Math.round(project.totalDuration)}с</span>}
        </div>

        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {new Date(project.createdAt).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </Link>

      <button
        className="btn btn-danger btn-sm"
        style={{ position: 'absolute', bottom: 16, right: 16 }}
        onClick={(e) => { e.preventDefault(); onDelete(project.id); }}
      >
        Удалить
      </button>
    </div>
  );
}
