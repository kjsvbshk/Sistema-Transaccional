# Script para reiniciar el backend de NestJS

Write-Host "🔄 Reiniciando backend de NestJS..." -ForegroundColor Cyan

# Detener procesos de Node que puedan estar usando el puerto 3000
Write-Host "`n🛑 Deteniendo procesos existentes en el puerto 3000..." -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($processes) {
    foreach ($proc in $processes) {
        $processName = (Get-Process -Id $proc -ErrorAction SilentlyContinue).ProcessName
        if ($processName) {
            Write-Host "  Deteniendo proceso: $processName (PID: $proc)" -ForegroundColor Yellow
            Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "✅ Procesos detenidos" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "✅ No hay procesos corriendo en el puerto 3000" -ForegroundColor Green
}

# Verificar archivo .env
if (!(Test-Path ".env")) {
    Write-Host "`n⚠️  Archivo .env no encontrado. Copiando desde env.example..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env" -ErrorAction SilentlyContinue
    Write-Host "✅ Archivo .env creado" -ForegroundColor Green
} else {
    Write-Host "`n✅ Archivo .env encontrado" -ForegroundColor Green
}

# Verificar node_modules
if (!(Test-Path "node_modules")) {
    Write-Host "`n⚠️  node_modules no encontrado. Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# Verificar base de datos
Write-Host "`n🗄️  Verificando conexión a la base de datos..." -ForegroundColor Cyan
Write-Host "Asegúrate de que PostgreSQL esté corriendo y la base de datos esté configurada" -ForegroundColor Gray

Write-Host "`n🚀 Iniciando servidor de desarrollo..." -ForegroundColor Green
Write-Host "📍 El backend estará disponible en: http://localhost:3000/api/v1" -ForegroundColor Cyan
Write-Host "📚 Documentación Swagger: http://localhost:3000/api`n" -ForegroundColor Cyan

npm run start:dev

