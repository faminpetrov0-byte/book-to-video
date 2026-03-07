import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '../hooks/useProject';
import { useGeneration } from '../hooks/useGeneration';
import { useBatchGeneration } from '../hooks/useBatchGeneration';
import SceneEditor from '../components/SceneEditor';
import CharacterManager from '../components/CharacterManager';
import VideoPreview from '../components/VideoPreview';
import BatchControls from '../components/BatchControls';
import ExportButton from '../components/ExportButton';
import SceneReorder from '../components/SceneReorder';
import RenderSettings from '../components/RenderSettings';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { project, loading, error, fetchProject, updateScene, deleteScene, addScene } = useProject(id);
  const generation = useGeneration(fetchProject);
  const batch = useBatchGeneration(fetchProject);
  
  const [showAddScene, setShowAddScene] = useState(false);
  const [newScene, setNewScene] = useState({ textContent: '', imagePrompt: '', duration: 10 });
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const [showRenderSettings, setShowRenderSettings] = useState(false);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <span className="spinner" style={{ width: 40, height: 40 }} />
        <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Загрузка проекта...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <p style={{ color: 'var(--danger)' }}>❌ {error || 'Проект не найден'}</p>
        <Link to="/" className="btn btn-secondary" style={{ marginTop: 16 }}>← Назад</Link>
      </div>
    );
  }

  const scenes = project.scenes || [];
  const videos = project.videos || [];
  const latestVideo = videos[0];

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const scenesWithVideo = scenes.filter(
    (s) => s.generatedMedia?.some((m) => m.mediaType === 'video' && m.status === 'completed')
  ).length;

  const handleAddScene = async () => {
    if (!newScene.textContent.trim()) return;
    await addScene(newScene);
    setNewScene({ textContent: '', imagePrompt: '', duration: 10 });
    setShowAddScene(false);
  };

  const handleGenerateAll = async () => {
    for (const scene of scenes) {
      try {
        await generation.generateAllForScene(scene.id, scene.imagePrompt || undefined, scene.textContent);
      } catch { /* continue with next scene */ }
    }
  };

  const handlePreviewSeek = (index: number) => {
    setPreviewIndex(index);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // Auto-advance to next scene when current finishes
    if (!isPlaying && previewIndex < scenes.length - 1) {
      setTimeout(() => {
        setPreviewIndex(prev => prev + 1);
      }, (scenes[previewIndex]?.duration || 10) * 1000);
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <Link to="/" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>← Все проекты</Link>

      {/* Project header */}
      <div style={{ marginTop: 16, marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>{project.title}</h2>
            <div style={{ display: 'flex', gap: 16, color: 'var(--text-secondary)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
              <span>📄 {project.sourceFormat.toUpperCase()}</span>
              <span>🎬 {scenes.length} сцен</span>
              <span>⏱ {Math.round(totalDuration)}с ({(totalDuration / 60).toFixed(1)} мин)</span>
              <span>🎥 {scenesWithVideo}/{scenes.length} видео готово</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowReorder(!showReorder)}
              disabled={scenes.length === 0}
            >
              {showReorder ? '✓ Готово' : '🔄 Сортировка'}
            </button>
            
            <button
              className="btn btn-secondary"
              onClick={() => setShowPreview(!showPreview)}
              disabled={scenes.length === 0}
            >
              {showPreview ? '👁️ Скрыть' : '👁️ Preview'}
            </button>
            
            <ExportButton project={project} />
            
            <button
              className="btn btn-secondary"
              onClick={handleGenerateAll}
              disabled={scenes.length === 0}
            >
              ⚡ Сгенерировать всё
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowRenderSettings(!showRenderSettings)}
              disabled={scenesWithVideo === 0}
            >
              {showRenderSettings ? '✓ Скрыть настройки' : '🎬 Рендер'}
            </button>
          </div>
        </div>

        {/* Render status */}
        {generation.renderStatus === 'completed' && (
          <div style={{ marginTop: 16, padding: 16, background: 'rgba(52,211,153,0.1)', borderRadius: 12, border: '1px solid rgba(52,211,153,0.3)' }}>
            ✅ Рендеринг завершён!
            {latestVideo && (
              <div style={{ marginTop: 8 }}>
                <video
                  src={`/output/final/${latestVideo.id}.mp4`}
                  controls
                  style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8 }}
                />
                <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Длительность: {latestVideo.duration?.toFixed(1)}с |
                  Размер: {latestVideo.fileSize ? `${(latestVideo.fileSize / 1024 / 1024).toFixed(1)} МБ` : 'N/A'} |
                  Разрешение: {latestVideo.resolution}
                </div>
              </div>
            )}
          </div>
        )}

        {generation.renderError && (
          <div style={{ marginTop: 16, padding: 12, background: 'rgba(248,113,113,0.1)', borderRadius: 8, color: 'var(--danger)', fontSize: '0.875rem' }}>
            ⚠️ Ошибка рендеринга: {generation.renderError}
          </div>
        )}
      </div>

      {/* Video Preview */}
      {showPreview && (
        <div style={{ marginBottom: 24 }}>
          <VideoPreview
            scenes={scenes}
            currentSceneIndex={previewIndex}
            onSeek={handlePreviewSeek}
            isPlaying={isPlaying}
          />
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
            <button
              className="btn btn-secondary"
              onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
              disabled={previewIndex === 0}
            >
              ⏮ Предыдущая
            </button>
            <button
              className="btn btn-primary"
              onClick={handlePlayPause}
            >
              {isPlaying ? '⏸ Пауза' : '▶️ Воспроизвести'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setPreviewIndex(Math.min(scenes.length - 1, previewIndex + 1))}
              disabled={previewIndex === scenes.length - 1}
            >
              Следующая ⏭
            </button>
          </div>
        </div>
      )}

      {/* Batch Controls */}
      <BatchControls
        scenes={scenes}
        onGenerateImages={batch.generateAllImages}
        onGenerateVideos={batch.generateAllVideos}
        onGenerateTTS={batch.generateAllTTS}
        onGenerateAll={batch.generateAll}
        loading={batch.loading}
      />

      {/* Scene Reorder */}
      {showReorder && (
        <SceneReorder
          scenes={scenes}
          onReorder={async (newOrder) => {
            await fetchProject(); // Refresh after reorder
          }}
        />
      )}

      {/* Render Settings */}
      {showRenderSettings && (
        <div style={{ marginBottom: 24 }}>
          <RenderSettings
            projectId={project.id}
            onRenderStart={() => {}}
            onRenderComplete={fetchProject}
          />
        </div>
      )}

      {/* Character Manager */}
      <CharacterManager projectId={project.id} onRefresh={fetchProject} />

      {/* Scenes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: '1.1rem' }}>Сцены</h3>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowAddScene(!showAddScene)}>
          + Добавить сцену
        </button>
      </div>

      {/* Add scene form */}
      {showAddScene && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label>Текст сцены</label>
              <textarea
                value={newScene.textContent}
                onChange={(e) => setNewScene({ ...newScene, textContent: e.target.value })}
                placeholder="Введите текст для сцены..."
                rows={3}
              />
            </div>
            <div>
              <label>Промпт для изображения (необязательно)</label>
              <textarea
                value={newScene.imagePrompt}
                onChange={(e) => setNewScene({ ...newScene, imagePrompt: e.target.value })}
                placeholder="Описание визуального образа..."
                rows={2}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
              <div style={{ width: 120 }}>
                <label>Длительность (сек)</label>
                <input
                  type="number"
                  min={5}
                  max={30}
                  value={newScene.duration}
                  onChange={(e) => setNewScene({ ...newScene, duration: Number(e.target.value) })}
                />
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleAddScene}>
                Добавить
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddScene(false)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scene list */}
      <div className="scene-list">
        {scenes.map((scene, index) => (
          <SceneEditor
            key={scene.id}
            scene={scene}
            index={index}
            characters={project.characters || []}
            generationStatus={generation.getSceneStatus(scene.id)}
            onUpdate={async (sid, data) => { await updateScene(sid, data); }}
            onDelete={deleteScene}
            onGenerateImage={generation.generateImage}
            onGenerateVideo={generation.generateVideo}
            onGenerateTTS={generation.generateTTS}
            onGenerateAll={async (sid) => {
              const s = scenes.find((sc) => sc.id === sid);
              if (s) await generation.generateAllForScene(sid, s.imagePrompt || undefined, s.textContent);
            }}
          />
        ))}
      </div>

      {scenes.length === 0 && (
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="icon">🎬</div>
          <h2>Нет сцен</h2>
          <p>Добавьте сцены вручную или перезагрузите проект</p>
        </div>
      )}
    </div>
  );
}
