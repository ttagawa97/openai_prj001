FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY frontend/package.json frontend/
COPY shared/package.json shared/
COPY backend/package.json backend/
RUN npm ci
COPY frontend frontend
COPY shared shared
EXPOSE 5173
CMD ["npm", "run", "dev", "-w", "frontend", "--", "--host", "0.0.0.0"]
