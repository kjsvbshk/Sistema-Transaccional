# Multi-stage build para optimizar el tamaño de la imagen
FROM node:18-alpine AS base

# Instalar dependencias necesarias para Prisma
RUN apk add --no-cache openssl

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci --only=production && npm cache clean --force

# Generar cliente de Prisma
RUN npx prisma generate

# Etapa de build
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas las dependencias (incluyendo devDependencies)
RUN npm ci

# Copiar código fuente
COPY . .

# Generar cliente de Prisma
RUN npx prisma generate

# Compilar la aplicación
RUN npm run build

# Etapa de producción
FROM node:18-alpine AS production

# Instalar dependencias necesarias para Prisma
RUN apk add --no-cache openssl

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias desde base
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/prisma ./prisma

# Copiar aplicación compilada desde builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Crear directorio para claves JWT
RUN mkdir -p keys && chown -R nestjs:nodejs keys

# Cambiar a usuario no-root
USER nestjs

# Exponer puerto
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health/live', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando de inicio
CMD ["node", "dist/main.js"]
