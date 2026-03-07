import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import UploadZone from '../components/UploadZone';
import ProjectCard from '../components/ProjectCard';

export default function ProjectsPage() {
  const { projects, loading, error, createProject, deleteProject } = useProjects();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploadError(null);
      const project = await createProject(file);
      navigate(`/project/${project.id}`);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Удалить проект и все связанные данные?')) {
      try {
        await deleteProject(id);
      } catch (err) {
        alert((err as Error).message);
      }
    }
  };

  return (
    <div>
      <UploadZone onUpload={handleUpload} loading={uploading} />

      {uploadError && (
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(248,113,113,0.1)', borderRadius: 8, color: 'var(--danger)', fontSize: '0.875rem' }}>
          ⚠️ {uploadError}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: 20 }}>
          Мои проекты {projects.length > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({projects.length})</span>}
        </h2>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <span className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        )}

        {error && (
          <div style={{ padding: 20, color: 'var(--danger)', textAlign: 'center' }}>
            Ошибка загрузки: {error}
          </div>
        )}

        {!loading && projects.length === 0 && !error && (
          <div className="empty-state">
            <div className="icon">📖</div>
            <h2>Пока нет проектов</h2>
            <p>Загрузите книгу или аудиофайл, чтобы начать</p>
          </div>
        )}

        <div className="projects-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
