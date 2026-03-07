# 📥 Как загрузить проект на локальный компьютер

## Вариант 1: Скачать ZIP-архив (самый простой)

### Шаг 1: Найди папку с проектом
```
/root/.openclaw/workspace/book-to-video/
```

### Шаг 2: Создай архив
В терминале выполни:
```bash
cd /root/.openclaw/workspace
zip -r book-to-video.zip book-to-video
```

### Шаг 3: Скачай файл
- Если работаешь через SFTP/FTP → скачай `book-to-video.zip`
- Через файловый менеджер → найди этот файл и скачай

---

## Вариант 2: Клонирование через Git (рекомендуется)

### Если есть GitHub репозиторий:
```bash
git clone https://github.com/твой-репозиторий/book-to-video.git
cd book-to-video
```

### Создай свой GitHub репозиторий:
```bash
cd /root/.openclaw/workspace/book-to-video
git init
git add .
git commit -m "Initial commit: Book-to-Video AI MVP"
# Создай репозиторий на GitHub, затем:
git remote add origin https://github.com/ТВОЙ_НИК/book-to-video.git
git push -u origin master
```

---

## 🚀 Запуск проекта локально

### Требования:
- Node.js 18+
- FFmpeg (обязательно!)
- Redis (опционально, для очереди задач)

### Windows:

```powershell
# 1. Установи Node.js
# Скачай с https://nodejs.org

# 2. Установи FFmpeg
# Скачай с https://ffmpeg.org/download.html
# Добавь в PATH

# 3. Клонируй проект или распакуй архив
cd book-to-video

# 4. Установи зависимости backend
cd backend
npm install

# 5. Настрой базу данных
npx prisma generate
npx prisma db push

# 6. Запусти backend (в одном терминале)
npm run dev

# 7. В новом терминале запусти frontend
cd ../frontend
npm install
npm run dev
```

### macOS:

```bash
# 1. Установи Homebrew (если нет)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Установи FFmpeg
brew install ffmpeg

# 3. Установи Node.js
brew install node

# 4. Запусти проект
cd book-to-video/backend
npm install
npx prisma generate
npx prisma db push
npm run dev

# В другом терминале:
cd book-to-video/frontend
npm install
npm run dev
```

### Linux (Ubuntu/Debian):

```bash
# 1. Установи FFmpeg
sudo apt update
sudo apt install ffmpeg

# 2. Установи Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# 3. Запусти проект
cd book-to-video/backend
npm install
npx prisma generate
npx prisma db push
npm run dev

# В другом терминале:
cd book-to-video/frontend
npm install
npm run dev
```

---

## ⚙️ Настройка API ключей (опционально)

Для улучшения качества генерации добавь API ключи в `backend/.env`:

```env
# Hugging Face (бесплатные токены)
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxx

# Fal.ai (бесплатный тариф)
FAL_API_KEY=xxxxxxxxxxxx

# ElevenLabs (бесплатный тариф 10,000 символов/месяц)
ELEVENLABS_API_KEY=xxxxxxxxxxxx

# Coqui TTS (ПОЛНОСТЬЮ БЕСПЛАТНО! Требует установки Python)
COQUI_ENABLED=true
```

### Получить бесплатные ключи:
- **Hugging Face**: https://huggingface.co/settings/tokens
- **Fal.ai**: https://fal.ai/dashboard
- **ElevenLabs**: https://elevenlabs.io (регистрация без карты)

### Установка Coqui TTS (бесплатно, без API ключей!):
```bash
pip install TTS
```

---

## ✨ Новые функции (версия 2.0)

### 1. Пакетная генерация
- Генерируй изображения/видео/озвучку для всех сцен сразу
- Параллельный режим для ускорения
- Выбор конкретных сцен

### 2. Preview плеер
- Просмотр всех сцен с таймлайном
- Воспроизведение с автоматическим переходом
- Индикация готовности медиа

### 3. Экспорт проекта
- Экспорт в JSON (все данные + сцены)
- ZIP архив (все медиафайлы)

### 4. Webhooks
- Подписка на события генерации
- URL уведомления для интеграций

### 5. Бесплатная TTS
- **Coqui TTS** - полностью бесплатная альтернатива
- **System TTS** - встроенный в macOS/Windows
- 8 голосов ElevenLabs (с API ключом)

### 6. Drag-n-Drop сортировка
- Перетаскивай сцены мышкой
- Кнопки ↑↓ для перемещения
- Сохранение порядка

### 7. Вертикальный формат (NEW!)
- 📱 9:16 для Reels/Stories/TikTok
- 720p и 1080p вертикальные
- Hollywood цветокоррекция
- Эффект плёнки + vignette

### 8. AI Пресеты (NEW!)
- Cinematic Hollywood
- Anime Style
- Documentary
- Epic Fantasy
- Vintage Film
- Minimalist

### 9. AI Модели (NEW!)
- Stable Diffusion XL (free)
- FLUX Schnell (free)
- Stable Video Diffusion (free)
- Coqui XTTS v2 (free)
- ElevenLabs (free tier)

### 10. Субтитры (NEW!)
- Автогенерация SRT
- Burn-in в видео
- Настройка шрифта и позиции

### 11. Фоновая музыка (NEW!)
- Выбор треков по настроению
- Настройка громкости
- Fade in/out

### 12. Audio Effects (NEW!)
- Нормализация звука
- Reverb, Echo
- Pitch/Speed изменение
- Аудио микширование

---

## 🎬 Использование

1. Открой http://localhost:5173
2. Загрузи текстовый файл (TXT, EPUB, PDF, DOCX)
3. Дождись автоматического анализа и создания сцен
4. Добавь персонажей и выбери для каждого голос
5. Сгенерируй изображения для каждой сцены
6. Создай видео из изображений
7. Добавь озвучку (выбери голос для каждой сцены)
8. Запусти финальный рендеринг

---

## 🔧 Возможные проблемы

### "FFmpeg not found"
- Убедись что FFmpeg установлен и добавлен в PATH
- Проверь: `ffmpeg -version`

### "Cannot find module"
- Удали `node_modules` и переустанови:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Ошибки базы данных
- Удали файл `dev.db` и пересоздай:
```bash
rm prisma/dev.db
npx prisma db push
```

---

## 📱 Первый тест с твоей книгой

Твой текст книги сохранён в `sample-book.txt`. 
Загрузи его в приложение для теста!

---

Удачи с запуском! 🎬
