import { useState } from 'react';
import { api, Project } from '../api/client';

interface ExportButtonProps {
  project: Project;
}

export default function ExportButton({ project }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = async (format: 'json' | 'zip') => {
    setExporting(true);
    setShowMenu(false);

    try {
      const data = await api.prepareExport(project.id);
      
      if (format === 'json') {
        // Download as JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.title.replace(/[^a-z0-9]/gi, '_')}_export.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // For ZIP, we would need JSZip - show instructions for now
        alert('ZIP экспорт требует дополнительной настройки. Скачайте JSON и создайте архив вручную.');
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Ошибка экспорта: ' + (err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn btn-secondary"
        onClick={() => setShowMenu(!showMenu)}
        disabled={exporting}
      >
        {exporting ? '⏳ Экспорт...' : '📥 Экспорт'}
      </button>

      {showMenu && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 4,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 0',
          minWidth: 180,
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          <button
            onClick={() => handleExport('json')}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 16px',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
            }}
          >
            📄 JSON (проект + сцены)
          </button>
          <button
            onClick={() => handleExport('zip')}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 16px',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
            }}
          >
            📦 ZIP (все медиа)
          </button>
        </div>
      )}

      {/* Click outside to close */}
      {showMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
          }}
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
