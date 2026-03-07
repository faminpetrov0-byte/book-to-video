import { useState, useEffect, useRef } from 'react';
import { Scene, GeneratedMedia } from '../api/client';

interface VideoPreviewProps {
  scenes: Scene[];
  currentSceneIndex: number;
  onSeek: (index: number) => void;
  isPlaying: boolean;
}

export default function VideoPreview({ scenes, currentSceneIndex, onSeek, isPlaying }: VideoPreviewProps) {
  const timelineRef = useRef<HTMLDivElement>(null);

  // Calculate total duration
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  
  // Get current scene media
  const currentScene = scenes[currentSceneIndex];
  const imageMedia = currentScene?.generatedMedia?.filter(m => m.mediaType === 'image' && m.status === 'completed') || [];
  const videoMedia = currentScene?.generatedMedia?.filter(m => m.mediaType === 'video' && m.status === 'completed') || [];
  const audioMedia = currentScene?.generatedMedia?.filter(m => m.mediaType === 'audio' && m.status === 'completed') || [];

  const currentMedia = videoMedia[0] || imageMedia[0];
  const currentAudio = audioMedia[0];

  // Calculate progress percentage
  const elapsedBeforeCurrent = scenes.slice(0, currentSceneIndex).reduce((sum, s) => sum + s.duration, 0);
  const progressPercent = totalDuration > 0 
    ? ((elapsedBeforeCurrent + (isPlaying ? 0 : 0)) / totalDuration) * 100 
    : 0;

  if (scenes.length === 0) {
    return (
      <div style={{ 
        padding: 40, 
        textAlign: 'center', 
        color: 'var(--text-muted)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎬</div>
        <p>Нет сцен для preview</p>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'var(--bg-card)', 
      borderRadius: 'var(--radius)', 
      border: '1px solid var(--border)',
      overflow: 'hidden'
    }}>
      {/* Preview Window */}
      <div style={{ 
        aspectRatio: '16/9', 
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {currentMedia ? (
          currentMedia.mediaType === 'video' ? (
            <video
              src={mediaUrl(currentMedia)}
              autoPlay={isPlaying}
              muted
              loop
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <img 
              src={mediaUrl(currentMedia)} 
              alt="preview" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )
        ) : (
          <div style={{ color: '#666', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎥</div>
            <p>Медиа не сгенерировано</p>
          </div>
        )}

        {/* Scene Overlay */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
          color: 'white',
        }}>
          <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
            Сцена {currentSceneIndex + 1} из {scenes.length}
          </div>
          <div style={{ fontWeight: 600 }}>
            {currentScene?.title || `Сцена ${currentSceneIndex + 1}`}
          </div>
        </div>

        {/* Play/Pause Indicator */}
        {isPlaying && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '50%',
            width: 60,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
          }}>
            ▶️
          </div>
        )}
      </div>

      {/* Audio Player */}
      {currentAudio && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
          <audio 
            src={mediaUrl(currentAudio)} 
            controls 
            style={{ width: '100%', height: 32 }}
          />
        </div>
      )}

      {/* Timeline */}
      <div 
        ref={timelineRef}
        style={{ 
          padding: '12px 16px',
          cursor: 'pointer',
        }}
        onClick={(e) => {
          if (!timelineRef.current) return;
          const rect = timelineRef.current.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          const targetIndex = Math.floor(percent * scenes.length);
          onSeek(Math.max(0, Math.min(scenes.length - 1, targetIndex)));
        }}
      >
        {/* Progress Bar */}
        <div style={{ 
          height: 8, 
          background: 'var(--bg-tertiary)', 
          borderRadius: 4,
          overflow: 'hidden',
          marginBottom: 8
        }}>
          <div style={{ 
            height: '100%', 
            width: `${progressPercent}%`,
            background: 'var(--accent)',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Scene Markers */}
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {scenes.map((scene, i) => {
            const hasMedia = scene.generatedMedia?.some(m => m.status === 'completed');
            const isActive = i === currentSceneIndex;
            const isPast = i < currentSceneIndex;
            
            return (
              <div
                key={scene.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(i);
                }}
                style={{
                  flex: scene.duration,
                  minWidth: 20,
                  height: isActive ? 24 : 16,
                  background: isActive 
                    ? 'var(--accent)' 
                    : isPast 
                      ? 'var(--accent)' 
                      : hasMedia 
                        ? 'var(--bg-tertiary)' 
                        : 'var(--bg-secondary)',
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: isActive ? '2px solid white' : 'none',
                }}
                title={`${scene.title || `Сцена ${i + 1}`} (${scene.duration}с)`}
              />
            );
          })}
        </div>

        {/* Time Display */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginTop: 8,
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <span>{formatTime(elapsedBeforeCurrent)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Scene List Preview */}
      <div style={{ 
        maxHeight: 200, 
        overflow: 'auto', 
        borderTop: '1px solid var(--border)',
        padding: 8
      }}>
        {scenes.map((scene, i) => {
          const hasMedia = scene.generatedMedia?.some(m => m.status === 'completed');
          const isActive = i === currentSceneIndex;
          
          return (
            <div
              key={scene.id}
              onClick={() => onSeek(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-primary)',
              }}
            >
              <span style={{ 
                width: 24, 
                height: 24, 
                borderRadius: '50%', 
                background: isActive ? 'white' : 'var(--bg-tertiary)',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}>
                {i + 1}
              </span>
              <span style={{ flex: 1, fontSize: '0.85rem' }}>
                {scene.title || `Сцена ${i + 1}`}
              </span>
              <span style={{ fontSize: '0.75rem', color: isActive ? 'white' : 'var(--text-muted)' }}>
                {scene.duration}с
              </span>
              <span style={{ fontSize: '0.75rem' }}>
                {hasMedia ? '✅' : '⏳'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function mediaUrl(media: GeneratedMedia): string {
  const parts = media.filePath.split('/output/');
  if (parts.length > 1) {
    return `/output/${parts[1]}`;
  }
  return media.filePath;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
