# 🎬 Book-to-Video AI - UI/UX Pitch Deck Prompt

---

## Презентация для генерации UI/UX

### Основная концепция

```
Book-to-Video AI - это веб-приложение, которое превращает текст (книги, статьи, сценарии) в кинематографические видео с AI-озвучкой и визуальными эффектами.
```

---

## 🎯 Промт для ИИ-генератора UI (v0, Midjourney, etc.)

```
Create a modern web application UI design for "Book-to-Video AI" - a SaaS platform that converts text books into cinematic videos with AI voiceover and visual effects.

## Project Type
Full-stack web application with dark mode interface

## Core Functionality
- Upload text files (TXT, EPUB, PDF)
- AI splits text into scenes automatically
- Generate images for each scene (AI art)
- Generate video from images (AI video)
- Add voiceover with character voices (TTS)
- Mix audio tracks
- Apply cinematic filters
- Render final video
- Auto-upload to YouTube

## Target Users
Content creators, authors, YouTubers, educators, marketers

## Visual Style
- Dark theme with purple/violet accent colors (#7c5cff)
- Glassmorphism cards with subtle blur
- Clean, cinematic feel
- Professional video editing software aesthetic
- Premium, "Hollywood" vibe

## Color Palette
- Background: Deep dark (#0a0a0f, #12121a)
- Surface: Dark gray (#1a1a24, #22222e)
- Primary accent: Electric purple (#7c5cff)
- Secondary: Soft pink (#ff6bcb)
- Success: Emerald (#34d399)
- Warning: Amber (#fbbf24)
- Error: Coral (#f87171)
- Text: White (#ffffff), Muted (#8b8b9a)

## Layout Structure
1. **Sidebar Navigation** (left, collapsible)
   - Logo
   - Dashboard
   - Projects
   - Templates
   - Settings

2. **Main Content Area**
   - Project list / grid
   - Scene editor
   - Preview player
   - Generation controls

3. **Right Panel** (contextual)
   - Scene details
   - Character manager
   - Effects panel

## Key Screens to Design

### 1. Dashboard
- Stats cards (projects, videos, time saved)
- Recent projects grid
- Quick start button

### 2. Project List
- Card-based grid view
- Thumbnail preview
- Status indicators
- Quick actions

### 3. Project Editor (MAIN SCREEN)
- Scene timeline (horizontal)
- Preview player (center)
- Scene details (right)
- Generation controls (bottom)
- Character/voice panel

### 4. Scene Editor
- Text content editor
- Image prompt editor
- Voice selection
- Duration slider
- Mood/style tags

### 5. Preview Player
- Video player with timeline
- Scene thumbnails
- Play/pause controls
- Volume mixer

### 6. Settings/Configuration
- Provider selection (toggle switches)
- API key inputs
- Quality presets

## UI Components to Include
- Glassmorphism cards with #7c5cff borders
- Gradient buttons with purple/pink
- Floating action buttons
- Progress bars with glow effects
- Drag-and-drop zones with dashed borders
- Toast notifications
- Modal dialogs with backdrop blur
- Timeline with scene markers
- Waveform audio visualizer
- Tag chips with colors
- Avatar circles for characters

## Typography
- Headings: Bold, modern sans-serif (Inter, SF Pro)
- Body: Clean, readable (Inter, Roboto)
- Monospace: For code/technical (JetBrains Mono)

## Special Effects
- Subtle glow on interactive elements
- Smooth transitions (300ms)
- Hover lift effects on cards
- Progress pulse animations
- Film grain texture overlay option
- Cinematic letterboxing for previews

## Export Requirements
- SVG/PNG at 2x resolution
- Include light and dark variants if needed
- Show responsive mobile view
- Include icon set for navigation
```

---

## 📝 Промт для разработчиков / дизайнеров

### Ключевые слова для поиска вдохновения:

```
UI/UX References:
- DaVinci Resolve / Premiere Pro interface
- Notion / Linear dark theme
- Figma interface
- Spotify desktop app
- Adobe Creative Cloud
- Streamlabs OBS

Design Systems:
- Glassmorphism
- Neumorphism (subtle)
- Bento grid layouts
- Card-based design
- Micro-interactions

Colors:
- Purple (#7c5cff)
- Deep black (#0a0a0f)
- Soft pink (#ff6bcb)
- Emerald (#34d399)
```

---

## 🎨 Технические требования к UI

### Frontend Stack
```json
{
  "framework": "React 18 + TypeScript",
  "styling": "CSS Modules / Tailwind",
  "state": "Zustand / React Context",
  "routing": "React Router v6",
  "icons": "Lucide React",
  "animations": "Framer Motion"
}
```

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Performance Targets
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Score: > 90

---

## 📱 Адаптивный дизайн

### Mobile (упрощённый)
- Bottom navigation
- Full-screen scene editor
- Swipeable scene cards
- Floating action button

### Desktop (полный)
- Sidebar navigation
- Multi-panel layout
- Keyboard shortcuts
- Drag-and-drop

---

## 🎬 Примеры UI текстов

### Заголовки
- "Создавай видео из книг"
- "Твой личный киностудия AI"
- "От текста до кино за минуты"

### Кнопки
- "Создать проект"
- "Сгенерировать"
- "Рендер"
- "Экспорт"

### Статусы
- "Готов к генерации"
- "Генерируется..."
- "Ошибка"
- "Завершено"

---

## 🎯 Готовый промт для генерации

```
A modern dark-themed web application UI design for "Book-to-Video AI" - a platform that converts text into cinematic videos. 

The interface features:
- Deep dark background (#0a0a0f) with glassmorphism cards
- Electric purple (#7c5cff) accent color with soft pink (#ff6bcb) gradients
- Sidebar navigation with gradient icons
- Scene timeline at bottom
- Video preview in center with cinematic letterboxing
- Character/voice panel on right
- Generation progress with purple glow effects
- Clean sans-serif typography
- Professional video editing software aesthetic
- Premium Hollywood feel with subtle film grain texture

Show a desktop layout with:
- Project dashboard view
- Scene editor with timeline
- Provider configuration panel
- Preview player

Award-winning UI design, 4k, clean lines, modern, Figma quality, dark mode interface
```
