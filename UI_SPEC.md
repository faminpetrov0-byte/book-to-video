# 🎨 Book-to-Video AI - UI/UX Design Specification
# Version 1.0

## 1. Brand Identity

### Name
**Book-to-Video AI** / **Book2Video**

### Tagline
"Превращай текст в кино" / "From Text to Cinema"

### Logo Concept
- Book icon + play button + sparkle/star
- Purple gradient (#7c5cff → #ff6bcb)
- Modern, minimal, recognizable

---

## 2. Color System

### Primary Colors
```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-tertiary: #1a1a24;
  --bg-card: #22222e;
  --bg-elevated: #2a2a38;
  
  /* Accent */
  --accent: #7c5cff;
  --accent-hover: #9d7fff;
  --accent-secondary: #ff6bcb;
  --accent-gradient: linear-gradient(135deg, #7c5cff 0%, #ff6bcb 100%);
  
  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #b8b8c8;
  --text-muted: #6b6b7b;
  
  /* Status */
  --success: #34d399;
  --warning: #fbbf24;
  --error: #f87171;
  --info: #60a5fa;
  
  /* Borders */
  --border: #333344;
  --border-focus: #7c5cff;
}
```

### Dark Theme (Default)
- Background: Deep black with subtle blue/purple tint
- Cards: Glassmorphism effect (backdrop-filter: blur)
- Borders: Subtle, 1px, low opacity

### Light Theme (Future)
- Background: Off-white, warm gray
- Cards: White with shadow
- Accent: Same purple

---

## 3. Typography

### Font Families
```css
/* Headings - Bold, Modern */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Body - Clean, Readable */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Code / Technical */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

### Font Sizes
```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

### Font Weights
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

---

## 4. Spacing System

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

---

## 5. Border Radius

```css
--radius-sm: 4px;
--radius: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 24px;
--radius-full: 9999px;
```

---

## 6. Shadows & Effects

```css
/* Card shadow */
--shadow-card: 0 4px 24px rgba(0, 0, 0, 0.4);

/* Elevated shadow */
--shadow-elevated: 0 8px 32px rgba(0, 0, 0, 0.5);

/* Glow effect */
--glow-accent: 0 0 20px rgba(124, 92, 255, 0.4);
--glow-success: 0 0 20px rgba(52, 211, 153, 0.4);

/* Glassmorphism */
--glass-bg: rgba(34, 34, 46, 0.7);
--glass-border: rgba(255, 255, 255, 0.1);
--glass-blur: blur(12px);
```

---

## 7. Layout Structure

### Desktop (> 1024px)
```
┌─────────────────────────────────────────────────────────┐
│  Header (64px)                                        │
├────────┬────────────────────────────────────────────┬───┤
│        │                                            │   │
│ Side   │         Main Content Area                  │ R │
│ bar    │                                            │ i │
│ (240px)│                                            │ g │
│        │                                            │ h │
│        │                                            │ t │
│        │                                            │   │
│        ├────────────────────────────────────────────┤   │
│        │  Timeline / Bottom Panel (200px)           │   │
└────────┴────────────────────────────────────────────┘
```

### Tablet (768px - 1024px)
- Collapsible sidebar (icon only)
- Right panel as drawer

### Mobile (< 768px)
- Bottom navigation
- Full-screen panels
- Swipe gestures

---

## 8. Core Components

### 8.1 Button
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius);
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-primary {
  background: var(--accent-gradient);
  color: white;
  border: none;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}
```

### 8.2 Card
```css
.card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}
```

### 8.3 Input
```css
.input {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 14px;
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.input:focus {
  border-color: var(--accent);
  outline: none;
}
```

### 8.4 Select / Dropdown
```css
.select {
  appearance: none;
  background-image: url("data:image/svg+xml...");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 40px;
}
```

### 8.5 Progress Bar
```css
.progress {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--accent-gradient);
  transition: width 0.3s ease;
}
```

### 8.6 Badge / Tag
```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-success {
  background: rgba(52, 211, 153, 0.2);
  color: var(--success);
}
```

### 8.7 Avatar
```css
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
}
```

---

## 9. Page Layouts

### 9.1 Dashboard
```
┌─────────────────────────────────────────┐
│ Header: Logo | Search | User            │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │Проекты│ │Видео │ │Персо-│ │Время │  │
│  │  12  │ │  45  │ │ нажи │ │ сэкно│  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│                                         │
│  Недавние проекты                       │
│  ┌────────┐ ┌────────┐ ┌────────┐    │
│  │ Card 1 │ │ Card 2 │ │ Card 3 │    │
│  │        │ │        │ │        │    │
│  └────────┘ └────────┘ └────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### 9.2 Project Editor (Main)
```
┌─────────────────────────────────────────────────────────┐
│ Header: Project Title | Save | Export | Render           │
├────────┬─────────────────────────────────┬─────────────┤
│ Scene  │                                 │ Characters  │
│ List   │     Video Preview              │             │
│        │                                 │ + Add       │
│ 1.    │                                 │ 🎭 Narrator │
│ 2.    │                                 │ 🎭 Character│
│ 3.    │                                 │             │
├────────┴─────────────────────────────────┴─────────────┤
│ Timeline: [Scene 1] [Scene 2] [Scene 3] ...            │
├─────────────────────────────────────────────────────────┤
│ Controls: [Gen Image] [Gen Video] [Gen TTS] [Render]   │
└─────────────────────────────────────────────────────────┘
```

---

## 10. Animations

```css
/* Hover lift */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}

/* Pulse glow */
@keyframes pulse-glow {
  0%, 100% { box-shadow: var(--glow-accent); }
  50% { box-shadow: 0 0 40px rgba(124, 92, 255, 0.6); }
}

/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 11. Responsive Breakpoints

```css
/* Mobile first */
.container { max-width: 100%; padding: 16px; }

@media (min-width: 768px) {
  .container { max-width: 720px; }
}

@media (min-width: 1024px) {
  .container { max-width: 960px; }
}

@media (min-width: 1280px) {
  .container { max-width: 1200px; }
}
```

---

## 12. Accessibility

- Color contrast: WCAG AA minimum
- Focus states: Visible outline
- Keyboard navigation: Full support
- Screen reader: ARIA labels
- Reduced motion: Respect prefers-reduced-motion

---

## 13. Icons

Using **Lucide React**:
- Navigation: Home, Folder, Settings, User
- Actions: Plus, Edit, Trash, Play, Pause, Download
- Status: Check, Alert, Loader, Sparkles
- Media: Image, Video, Volume, Music

---

## 14. Example Code

### Button Component
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export const Button = ({ 
  variant = 'primary', 
  size = 'md',
  loading,
  icon,
  children 
}) => (
  <button className={`btn btn-${variant} btn-${size}`}>
    {loading ? <Spinner /> : icon}
    {children}
  </button>
);
```

---

## 15. Summary

- **Theme**: Dark with purple accents
- **Style**: Glassmorphism, modern, professional
- **Feel**: Premium, cinematic, "Hollywood"
- **Responsive**: Full support across devices
- **Accessible**: WCAG compliant

---

*End of Design Specification*
