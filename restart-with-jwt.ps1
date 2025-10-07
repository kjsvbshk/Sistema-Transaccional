# Script para reiniciar el backend con JWT RSA configurado

Write-Host "Configurando JWT con claves RSA..." -ForegroundColor Cyan

# Verificar si existen las claves
$privateKeyPath = ".\keys\private.pem"
$publicKeyPath = ".\keys\public.pem"

if (!(Test-Path $privateKeyPath)) {
    Write-Host "Clave privada no encontrada. Generando claves..." -ForegroundColor Red
    node scripts/generate-jwt-keys.js
} else {
    Write-Host "Clave privada encontrada" -ForegroundColor Green
}

if (!(Test-Path $publicKeyPath)) {
    Write-Host "Clave publica no encontrada. Generando claves..." -ForegroundColor Red
    node scripts/generate-jwt-keys.js
} else {
    Write-Host "Clave publica encontrada" -ForegroundColor Green
}

# Verificar archivo .env
if (!(Test-Path ".env")) {
    Write-Host "`nArchivo .env no encontrado. Copiando desde env.example..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "Archivo .env creado" -ForegroundColor Green
} else {
    Write-Host "`nArchivo .env encontrado" -ForegroundColor Green
}

# Mostrar configuración JWT
Write-Host "`nConfiguracion JWT:" -ForegroundColor Cyan
Write-Host "  Clave privada: $privateKeyPath" -ForegroundColor Gray
Write-Host "  Clave publica: $publicKeyPath" -ForegroundColor Gray
Write-Host "  Access token: 15m" -ForegroundColor Gray
Write-Host "  Refresh token: 7d" -ForegroundColor Gray

# Detener procesos existentes
Write-Host "`nDeteniendo procesos existentes..." -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($processes) {
    foreach ($proc in $processes) {
        $processName = (Get-Process -Id $proc -ErrorAction SilentlyContinue).ProcessName
        if ($processName) {
            Write-Host "  Deteniendo proceso: $processName (PID: $proc)" -ForegroundColor Yellow
            Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 2
}

# Verificar node_modules
if (!(Test-Path "node_modules")) {
    Write-Host "`nnode_modules no encontrado. Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

Write-Host "`nIniciando servidor con JWT RSA..." -ForegroundColor Green
Write-Host "Backend: http://localhost:3000/api/v1" -ForegroundColor Cyan
Write-Host "Swagger: http://localhost:3000/api" -ForegroundColor Cyan
Write-Host "JWT: RS256 con claves RSA" -ForegroundColor Cyan

npm run start:dev
