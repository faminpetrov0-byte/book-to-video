import { Project, Scene } from '../api/client';

interface ProjectStatsProps {
  project: Project;
}

export default function ProjectStats({ project }: ProjectStatsProps) {
  const scenes = project.scenes || [];
  const characters = project.characters || [];
  
  // Calculate stats
  const totalDuration = scenes.reduce((sum, s) => sum + (s.duration || 0), 0);
  
  const imagesGenerated = scenes.reduce((sum, s) => {
    return sum + (s.generatedMedia?.filter(m => m.mediaType === 'image' && m.status === 'completed').length || 0);
  }, 0);
  
  const videosGenerated = scenes.reduce((sum, s) => {
    return sum + (s.generatedMedia?.filter(m => m.mediaType === 'video' && m.status === 'completed').length || 0);
  }, 0);
  
  const audioGenerated = scenes.reduce((sum, s) => {
    return sum + (s.generatedMedia?.filter(m => m.mediaType === 'audio' && m.status === 'completed').length || 0);
  }, 0);
  
  const readyForRender = imagesGenerated > 0 && scenes.length > 0 
    ? Math.min(imagesGenerated, scenes.length) 
    : 0;

  const completion = scenes.length > 0 
    ? Math.round((readyForRender / scenes.length) * 100) 
    : 0;

  return (
    <div style={{ 
      background: 'var(--bg-card)', 
      borderRadius: 'var(--radius)', 
      padding: 16,
      border: '1px solid var(--border)',
      marginBottom: 16
    }}>
      <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>📊 Статистика проекта</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
        {/* Scenes */}
        <div style={{ 
          textAlign: 'center', 
          padding: 12, 
          background: 'var(--bg-tertiary)', 
          borderRadius: 'var(--radius-sm)' 
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>
            {scenes.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Сцен</div>
        </div>

        {/* Characters */}
        <div style={{ 
          textAlign: 'center', 
          padding: 12, 
          background: 'var(--bg-tertiary)', 
          borderRadius: 'var(--radius-sm)' 
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff6bcb' }}>
            {characters.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Персонажей</div>
        </div>

        {/* Duration */}
        <div style={{ 
          textAlign: 'center', 
          padding: 12, 
          background: 'var(--bg-tertiary)', 
          borderRadius: 'var(--radius-sm)' 
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#34d399' }}>
            {Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, '0')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Длительность</div>
        </div>

        {/* Images */}
        <div style={{ 
          textAlign: 'center', 
          padding: 12, 
          background: 'var(--bg-tertiary)', 
          borderRadius: 'var(--radius-sm)' 
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>
            {imagesGenerated}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Изображений</div>
        </div>

        {/* Videos */}
        <div style={{ 
          textAlign: 'center', 
          padding: 12, 
          background: 'var(--bg-tertiary)', 
          borderRadius: 'var(--radius-sm)' 
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f87171' }}>
            {videosGenerated}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Видео</div>
        </div>

        {/* Audio */}
        <div style={{ 
          textAlign: 'center', 
          padding: 12, 
          background: 'var(--bg-tertiary)', 
          borderRadius: 'var(--radius-sm)' 
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>
            {audioGenerated}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Аудио</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Готовность к рендерингу
          </span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>
            {completion}%
          </span>
        </div>
        <div style={{ 
          height: 8, 
          background: 'var(--bg-tertiary)', 
          borderRadius: 4,
          overflow: 'hidden'
        }}>
          <div style={{ 
            height: '100%', 
            width: `${completion}%`,
            background: completion === 100 
              ? 'linear-gradient(90deg, #34d399, #10b981)' 
              : 'var(--accent)',
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>
    </div>
  );
}
