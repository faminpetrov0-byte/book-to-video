import { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  icon: string;
}

interface TabPanelProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  children: React.ReactNode;
}

export default function TabPanel({ tabs, activeTab, onChange, children }: TabPanelProps) {
  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: 4, 
        marginBottom: 16, 
        borderBottom: '1px solid var(--border)',
        paddingBottom: 8,
        overflowX: 'auto'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {children}
      </div>
    </div>
  );
}

// Predefined tab configurations for different views
export const PROJECT_TABS = {
  main: [
    { id: 'scenes', label: 'Сцены', icon: '🎬' },
    { id: 'preview', label: 'Preview', icon: '👁️' },
    { id: 'generate', label: 'Генерация', icon: '⚡' },
  ],
  production: [
    { id: 'effects', label: 'Эффекты', icon: '🎨' },
    { id: 'music', label: 'Музыка', icon: '🎵' },
    { id: 'render', label: 'Рендер', icon: '🎬' },
  ],
  settings: [
    { id: 'characters', label: 'Персонажи', icon: '🎭' },
    { id: 'export', label: 'Экспорт', icon: '📥' },
  ],
};

export function getAllTabs() {
  return [
    ...PROJECT_TABS.main,
    ...PROJECT_TABS.production,
    ...PROJECT_TABS.settings,
  ];
}
