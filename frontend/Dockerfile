FROM node:20-alpine

WORKDIR /app

# Сначала копируем файлы зависимостей
COPY package.json package-lock.json* ./

# Ставим чистые зависимости
RUN npm install --production

# Копируем остальной код
COPY . .

# Экспонируем порт Next.js
EXPOSE 3000

# Запускаем dev-сервер Next.js на хосте 0.0.0.0, чтобы контейнер был доступен снаружи
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]