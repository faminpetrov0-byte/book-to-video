# Book-to-Video AI - Development Commands

.PHONY: help install setup dev test clean youtube-install youtube-upload

# Default target
help:
	@echo "Book-to-Video AI - Доступные команды:"
	@echo ""
	@echo "  make install       Установить все зависимости"
	@echo "  make setup         Настроить базу данных"
	@echo "  make dev           Запустить dev сервер"
	@echo "  make dev-full      Запустить backend + frontend"
	@echo "  make test          Запустить тесты"
	@echo "  make clean         Очистить временные файлы"
	@echo ""
	@echo "YouTube:"
	@echo "  make youtube-install  Установить Selenium зависимости"
	@echo "  make youtube-upload   Запустить YouTube upload"

# Install all dependencies
install:
	@echo "Установка зависимостей..."
	cd backend && npm install
	cd frontend && npm install
	@echo "✅ Зависимости установлены"

# Setup database
setup:
	@echo "Настройка базы данных..."
	cd backend && npx prisma generate
	cd backend && npx prisma db push
	@echo "✅ База данных готова"

# Run backend only
dev:
	@echo "Запуск backend..."
	cd backend && npm run dev

# Run both backend and frontend
dev-full:
	@echo "Запуск backend и frontend..."
	cd backend && npm run dev &
	sleep 3
	cd frontend && npm run dev

# Run tests
test:
	@echo "Запуск тестов..."
	cd backend && npm test

# Clean temporary files
clean:
	@echo "Очистка..."
	find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name ".turbo" -type d -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Очистка завершена"

# Install YouTube upload dependencies
youtube-install:
	@echo "Установка Python зависимостей для YouTube..."
	cd backend/scripts && pip install -r requirements.txt
	@echo "✅ Selenium установлен"

# Test YouTube upload
youtube-upload:
	@echo "Тест загрузки на YouTube..."
	cd backend/scripts && python youtube_uploader.py --help

# Production build
build:
	@echo "Сборка для продакшена..."
	cd frontend && npm run build
	@echo "✅ Сборка завершена"

# Docker build
docker-build:
	docker-compose build
	@echo "✅ Docker образ собран"

# Docker run
docker-run:
	docker-compose up -d
	@echo "✅ Контейнеры запущены"
