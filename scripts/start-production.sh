#!/bin/bash

# Script de inicio para producción
set -e

echo "🚀 Iniciando aplicación en modo producción..."

# Verificar variables de entorno críticas
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL no está definida"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ Error: JWT_SECRET no está definida"
    exit 1
fi

# Generar cliente de Prisma
echo "🔧 Generando cliente de Prisma..."
npx prisma generate

# Aplicar migraciones
echo "📦 Aplicando migraciones..."
npx prisma migrate deploy

# Verificar conexión a la base de datos
echo "🔍 Verificando conexión a la base de datos..."
npx prisma db push --accept-data-loss

# Iniciar la aplicación
echo "🎉 Iniciando aplicación..."
exec node dist/main.js
