FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY backend/package.json backend/
COPY shared/package.json shared/
COPY frontend/package.json frontend/
RUN npm ci
COPY backend backend
COPY shared shared
EXPOSE 3000
CMD ["npm", "run", "dev", "-w", "backend"]
