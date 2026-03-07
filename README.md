# 🎬 Book-to-Video AI - ИМБА v3.0

## Полностью бесплатный стек + Cloud AI

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ 100% Бесплатные AI Сервисы

| Тип | Бесплатно | Платно (опционально) |
|-----|-----------|---------------------|
| **TTS** | Coqui TTS (локально) | ElevenLabs |
| **TTS** | System TTS | - |
| **LLM** | Ollama (локально) | OpenAI |
| **LLM** | LM Studio (локально) | Claude/GPT |
| **Image** | Local Stable Diffusion | SDXL, DALL-E |
| **Image** | HuggingFace (free tier) | - |
| **Video** | Slideshow (FFmpeg) | SVD |
| **Filters** | Cinematic (FFmpeg) | - |

---

## 🏗 Архитектура

```
backend/src/
├── core/                     # Ядро
│   ├── Engine.ts           # Hollywood Engine
│   └── WebSocketServer.ts  # Real-time updates
├── services/
│   ├── providers/          # 🔌 AI Провайдеры
│   │   ├── base/          # Интерфейсы
│   │   ├── image/         # SDXL, HuggingFace, Local
│   │   ├── tts/           # Coqui, ElevenLabs, System
│   │   ├── local/          # 🔥 Ollama, LM Studio, Local SD
│   │   └── ProviderManager.ts
│   └── videoProcessor.ts  # 🔥 Slideshow, Clips, Filters
└── routes/                 # API
```

---

## 🔥 Новые фичи

### 1. Локальные AI (без интернета!)
- **Ollama** - запусти LLM локально (Llama, Mistral, Qwen)
- **LM Studio** - альтернатива с красивым UI
- **Local SD** - генерация картинок без облака

### 2. Video Tools
- **Slideshow Generator** - видео из картинок (если нет GPU)
- **Short Clips** - нарезай клипы 15-60сек для соцсетей
- **Cinematic Filters** - применяй стили в один клик

### 3. Гибкая деградация
```
Нет GPU → Картинки → Slideshow → Готово
Есть GPU → SDXL → SVD → Видео
```

---

## 🚀 Запуск

### Требования
- Node.js 18+
- FFmpeg (обязательно!)

### Для полного бесплатного стека:
```bash
# Установи локальные AI (опционально):
# 1. Ollama: https://ollama.ai
# 2. LM Studio: https://lmstudio.ai
# 3. Stable Diffusion WebUI (для локальной генерации)

# Запуск:
cd backend
npm install
npx prisma generate && npx prisma db push
npm run dev

# Frontend (другой терминал):
cd frontend && npm install && npm run dev
```

---

## 📡 API Endpoints

```bash
# Провайдеры
GET  /api/providers/status     # Статус всех провайдеров
GET  /api/providers/models     # Доступные модели
POST /api/providers/configure # Настроить провайдеры

# Генерация
POST /api/providers/generate/image  # Изображение
POST /api/providers/generate/tts     # Озвучка

# Видео
POST /api/video/slideshow   # Создать слайдшоу
POST /api/video/clips        # Нарезать клипы
POST /api/video/filters      # Применить фильтры
```

---

## ⚙️ Настройка провайдеров

### Полностью бесплатно:
```bash
# 1. Coqui TTS (локально)
pip install TTS

# 2. Ollama (локальный LLM)
curl -fsSL https://ollama.ai | sh
ollama pull llama2

# 3. Local Stable Diffusion
# Скачай и запусти WebUI
```

### С API ключами (опционально):
```bash
# .env
HUGGINGFACE_API_KEY=hf_xxx
ELEVENLABS_API_KEY=el_xxx
OLLAMA_BASE_URL=http://localhost:11434
SD_BASE_URL=http://localhost:7860
```

---

## 🎯 Provider Chains

```
Image Generation:
Local SD → HuggingFace → Stability AI → SVG Placeholder

TTS:
Coqui (free) → ElevenLabs → System TTS (free)

LLM (Prompt Expansion):
Ollama → LM Studio → Template Fallback

Video:
Slideshow → SVD → Ken Burns Effect
```

---

## 📦 Структура проекта

| Компонент | Описание |
|-----------|---------|
| `backend/src/core/` | Ядро, WebSocket |
| `backend/src/services/providers/` | 🔌 Модульная система |
| `backend/src/services/videoProcessor.ts` | 🔥 Video tools |
| `backend/scripts/` | YouTube uploader |
| `frontend/src/` | React UI |

---

## 🎬 Roadmap

- [x] Provider System (модульная)
- [x] WebSocket real-time
- [x] YouTube Auto-upload
- [x] Fallback chains
- [x] Local AI (Ollama, LM Studio)
- [x] Video Processor (Slideshow, Clips)
- [ ] Stock Images integration
- [ ] Scene Freeze feature
- [ ] Style Templates

---

## 📄 Лицензия

MIT

---

**Проект готов к использованию! 🚀**

Для старта:
```bash
cd backend && npm install && npm run dev
```
