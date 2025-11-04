# ============================================
# SCRIPT DE PREPARACIÓN PARA DEPLOY EN RENDER
# PepsiCo Fleet Management System - Windows
# ============================================

Write-Host "🚀 Preparando proyecto para deploy en Render..." -ForegroundColor Cyan
Write-Host ""

# ============================================
# VERIFICACIONES PREVIAS
# ============================================

Write-Host "📋 Verificando archivos necesarios..." -ForegroundColor Yellow

# Verificar render.yaml
if (Test-Path "render.yaml") {
    Write-Host "✓ render.yaml encontrado" -ForegroundColor Green
} else {
    Write-Host "✗ render.yaml NO encontrado" -ForegroundColor Red
    Write-Host "  Ejecuta este script desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Verificar backend/package.json
if (Test-Path "backend/package.json") {
    Write-Host "✓ backend/package.json encontrado" -ForegroundColor Green
} else {
    Write-Host "✗ backend/package.json NO encontrado" -ForegroundColor Red
    exit 1
}

# Verificar frontend/package.json
if (Test-Path "frontend/package.json") {
    Write-Host "✓ frontend/package.json encontrado" -ForegroundColor Green
} else {
    Write-Host "✗ frontend/package.json NO encontrado" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================
# VERIFICAR .gitignore
# ============================================

Write-Host "🔒 Verificando .gitignore..." -ForegroundColor Yellow

$gitignoreContent = @"
node_modules/
.env
.env.local
.env.production
*.log
uploads/
dist/
.DS_Store
"@

if (Test-Path ".gitignore") {
    Write-Host "✓ .gitignore encontrado" -ForegroundColor Green
    
    $gitignoreExists = Get-Content ".gitignore" | Select-String -Pattern "^\.env$"
    if ($gitignoreExists) {
        Write-Host "✓ .env está en .gitignore" -ForegroundColor Green
    } else {
        Write-Host "⚠ Agregando .env a .gitignore" -ForegroundColor Yellow
        Add-Content ".gitignore" "`n.env"
    }
} else {
    Write-Host "⚠ Creando .gitignore" -ForegroundColor Yellow
    Set-Content ".gitignore" $gitignoreContent
}

Write-Host ""

# ============================================
# VERIFICAR QUE .env NO ESTÉ EN GIT
# ============================================

Write-Host "🔐 Verificando que credenciales no estén en Git..." -ForegroundColor Yellow

$envInGit = git ls-files --error-unmatch "backend/.env" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✗ ¡PELIGRO! backend/.env está en Git" -ForegroundColor Red
    Write-Host "  Ejecuta: git rm --cached backend/.env" -ForegroundColor Red
    Write-Host "  Luego: git commit -m 'Remover .env del repositorio'" -ForegroundColor Red
} else {
    Write-Host "✓ backend/.env NO está en Git" -ForegroundColor Green
}

Write-Host ""

# ============================================
# CREAR BACKUP DE .env
# ============================================

Write-Host "💾 Creando backup de .env..." -ForegroundColor Yellow

if (Test-Path "backend/.env") {
    Copy-Item "backend/.env" "backend/.env.backup"
    Write-Host "✓ Backup creado: backend/.env.backup" -ForegroundColor Green
    Write-Host "  (Guárdalo en un lugar seguro)" -ForegroundColor Cyan
} else {
    Write-Host "⚠ No se encontró backend/.env" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# INSTALAR DEPENDENCIAS
# ============================================

Write-Host "📦 Verificando dependencias..." -ForegroundColor Yellow

# Backend
if (Test-Path "backend/node_modules") {
    Write-Host "✓ Backend: node_modules instalado" -ForegroundColor Green
} else {
    Write-Host "⚠ Instalando dependencias del backend..." -ForegroundColor Yellow
    Push-Location backend
    npm install
    Pop-Location
}

# Frontend
if (Test-Path "frontend/node_modules") {
    Write-Host "✓ Frontend: node_modules instalado" -ForegroundColor Green
} else {
    Write-Host "⚠ Instalando dependencias del frontend..." -ForegroundColor Yellow
    Push-Location frontend
    npm install
    Pop-Location
}

Write-Host ""

# ============================================
# VERIFICAR GIT
# ============================================

Write-Host "📡 Verificando estado de Git..." -ForegroundColor Yellow

if (Test-Path ".git") {
    Write-Host "✓ Repositorio Git encontrado" -ForegroundColor Green
    
    $currentBranch = git branch --show-current
    Write-Host "  Branch actual: $currentBranch" -ForegroundColor Cyan
    
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Host "⚠ Hay cambios sin commit" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Archivos modificados:" -ForegroundColor Cyan
        git status --short
        Write-Host ""
        
        $response = Read-Host "  ¿Quieres hacer commit ahora? (s/n)"
        if ($response -eq "s" -or $response -eq "S") {
            git add .
            $commitMsg = Read-Host "  Mensaje del commit"
            git commit -m $commitMsg
            Write-Host "✓ Commit realizado" -ForegroundColor Green
        }
    } else {
        Write-Host "✓ No hay cambios pendientes" -ForegroundColor Green
    }
    
    $remoteUrl = git remote get-url origin 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Remote 'origin' configurado" -ForegroundColor Green
        Write-Host "  URL: $remoteUrl" -ForegroundColor Cyan
    } else {
        Write-Host "✗ No hay remote 'origin' configurado" -ForegroundColor Red
        Write-Host "  Configura tu repositorio en GitHub primero" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✗ No es un repositorio Git" -ForegroundColor Red
    Write-Host "  Inicializa Git con: git init" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================
# RESUMEN Y PRÓXIMOS PASOS
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ PROYECTO LISTO PARA DEPLOY" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 PRÓXIMOS PASOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  Subir código a GitHub:" -ForegroundColor White
Write-Host "   git push origin $currentBranch" -ForegroundColor Cyan
Write-Host ""
Write-Host "2️⃣  Crear cuenta en PlanetScale (MySQL gratis):" -ForegroundColor White
Write-Host "   https://planetscale.com/" -ForegroundColor Cyan
Write-Host ""
Write-Host "3️⃣  Crear cuenta en Render (deploy gratis):" -ForegroundColor White
Write-Host "   https://render.com/" -ForegroundColor Cyan
Write-Host ""
Write-Host "4️⃣  Conectar Render con tu repositorio GitHub" -ForegroundColor White
Write-Host "   - New → Blueprint" -ForegroundColor Cyan
Write-Host "   - Seleccionar repositorio" -ForegroundColor Cyan
Write-Host "   - Render detectará render.yaml automáticamente" -ForegroundColor Cyan
Write-Host ""
Write-Host "5️⃣  Configurar variables de entorno en Render" -ForegroundColor White
Write-Host "   - Copiar de: backend/.env.backup" -ForegroundColor Cyan
Write-Host "   - Actualizar DB_* con credenciales de PlanetScale" -ForegroundColor Cyan
Write-Host ""
Write-Host "6️⃣  Deployar frontend en Vercel:" -ForegroundColor White
Write-Host "   https://vercel.com/" -ForegroundColor Cyan
Write-Host ""
Write-Host "7️⃣  Configurar cron-job.org (keep-alive):" -ForegroundColor White
Write-Host "   https://cron-job.org/" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Guía completa: DEPLOY_RENDER_GRATIS.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$pushNow = Read-Host "¿Quieres hacer push a GitHub ahora? (s/n)"
if ($pushNow -eq "s" -or $pushNow -eq "S") {
    Write-Host "🚀 Haciendo push..." -ForegroundColor Cyan
    git push origin $currentBranch
    Write-Host "✓ Push completado" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ahora ve a Render.com y crea el Blueprint con tu repo" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "¡Buena suerte con el deploy! 🎉" -ForegroundColor Green
