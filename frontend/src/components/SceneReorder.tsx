import { useState, useCallback } from 'react';
import { Scene, api } from '../api/client';

interface Scene {
  id: string;
  orderIndex: number;
  title: string | null;
  textContent: string;
  duration: number;
}

interface SceneReorderProps {
  scenes: Scene[];
  onReorder: (newOrder: string[]) => void;
}

export default function SceneReorder({ scenes, onReorder }: SceneReorderProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[]>(scenes.map(s => s.id));

  const handleDragStart = (e: React.DragEvent, sceneId: string) => {
    setDraggedId(sceneId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sceneId);
  };

  const handleDragOver = (e: React.DragEvent, sceneId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(sceneId);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const newOrder = [...localOrder];
    const draggedIndex = newOrder.indexOf(draggedId);
    const targetIndex = newOrder.indexOf(targetId);

    // Remove dragged item
    newOrder.splice(draggedIndex, 1);
    // Insert at new position
    newOrder.splice(targetIndex, 0, draggedId);

    setLocalOrder(newOrder);
    setDraggedId(null);
    setDragOverId(null);

    // Notify parent
    onReorder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...localOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setLocalOrder(newOrder);
    onReorder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === localOrder.length - 1) return;
    const newOrder = [...localOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setLocalOrder(newOrder);
    onReorder(newOrder);
  };

  // Build scene map for quick lookup
  const sceneMap = new Map(scenes.map(s => [s.id, s]));

  return (
    <div style={{ 
      background: 'var(--bg-card)', 
      borderRadius: 'var(--radius)', 
      padding: 16,
      marginBottom: 16,
      border: '1px solid var(--border)'
    }}>
      <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>🔄 Сортировка сцен</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {localOrder.map((sceneId, index) => {
          const scene = sceneMap.get(sceneId);
          if (!scene) return null;
          
          const isDragging = draggedId === sceneId;
          const isDragOver = dragOverId === sceneId;

          return (
            <div
              key={sceneId}
              draggable
              onDragStart={(e) => handleDragStart(e, sceneId)}
              onDragOver={(e) => handleDragOver(e, sceneId)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, sceneId)}
              onDragEnd={handleDragEnd}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: isDragging 
                  ? 'var(--accent)' 
                  : isDragOver 
                    ? 'rgba(124, 92, 255, 0.2)' 
                    : 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'grab',
                opacity: isDragging ? 0.5 : 1,
                transition: 'all 0.2s',
                border: isDragOver ? '2px dashed var(--accent)' : '2px solid transparent',
              }}
            >
              <span style={{ 
                width: 24, 
                height: 24, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                moveUp(index);
              }}
              >
                ↑
              </span>
              <span style={{ 
                width: 24, 
                height: 24, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                moveDown(index);
              }}
              >
                ↓
              </span>
              <span style={{ 
                width: 24, 
                height: 24, 
                borderRadius: '50%', 
                background: 'var(--accent)',
                color: 'white',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}>
                {index + 1}
              </span>
              <span style={{ flex: 1, fontSize: '0.875rem' }}>
                {scene.title || `Сцена ${index + 1}`}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {scene.duration}с
              </span>
              <span style={{ cursor: 'grab', opacity: 0.5 }}>⋮⋮</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        💡 Перетаскивай сцены для изменения порядка или используй стрелки ↑↓
      </div>
    </div>
  );
}
