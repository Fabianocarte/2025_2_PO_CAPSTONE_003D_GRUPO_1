#!/bin/bash

# ============================================
# SCRIPT DE PREPARACIÓN PARA DEPLOY EN RENDER
# PepsiCo Fleet Management System
# ============================================

echo "🚀 Preparando proyecto para deploy en Render..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# VERIFICACIONES PREVIAS
# ============================================

echo "📋 Verificando archivos necesarios..."

# Verificar render.yaml
if [ -f "render.yaml" ]; then
    echo -e "${GREEN}✓${NC} render.yaml encontrado"
else
    echo -e "${RED}✗${NC} render.yaml NO encontrado"
    echo "   Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Verificar backend/package.json
if [ -f "backend/package.json" ]; then
    echo -e "${GREEN}✓${NC} backend/package.json encontrado"
else
    echo -e "${RED}✗${NC} backend/package.json NO encontrado"
    exit 1
fi

# Verificar frontend/package.json
if [ -f "frontend/package.json" ]; then
    echo -e "${GREEN}✓${NC} frontend/package.json encontrado"
else
    echo -e "${RED}✗${NC} frontend/package.json NO encontrado"
    exit 1
fi

echo ""

# ============================================
# VERIFICAR .gitignore
# ============================================

echo "🔒 Verificando .gitignore..."

GITIGNORE_CONTENT="node_modules/
.env
.env.local
.env.production
*.log
uploads/
dist/
.DS_Store"

if [ -f ".gitignore" ]; then
    echo -e "${GREEN}✓${NC} .gitignore encontrado"
    
    # Verificar que .env esté ignorado
    if grep -q "^\.env$" .gitignore; then
        echo -e "${GREEN}✓${NC} .env está en .gitignore"
    else
        echo -e "${YELLOW}⚠${NC}  Agregando .env a .gitignore"
        echo ".env" >> .gitignore
    fi
else
    echo -e "${YELLOW}⚠${NC}  Creando .gitignore"
    echo "$GITIGNORE_CONTENT" > .gitignore
fi

echo ""

# ============================================
# VERIFICAR QUE .env NO ESTÉ EN GIT
# ============================================

echo "🔐 Verificando que credenciales no estén en Git..."

if git ls-files --error-unmatch backend/.env 2>/dev/null; then
    echo -e "${RED}✗${NC} ¡PELIGRO! backend/.env está en Git"
    echo "   Ejecuta: git rm --cached backend/.env"
    echo "   Luego: git commit -m 'Remover .env del repositorio'"
else
    echo -e "${GREEN}✓${NC} backend/.env NO está en Git"
fi

echo ""

# ============================================
# CREAR BACKUP DE .env
# ============================================

echo "💾 Creando backup de .env..."

if [ -f "backend/.env" ]; then
    cp backend/.env backend/.env.backup
    echo -e "${GREEN}✓${NC} Backup creado: backend/.env.backup"
    echo "   (Guárdalo en un lugar seguro)"
else
    echo -e "${YELLOW}⚠${NC}  No se encontró backend/.env"
fi

echo ""

# ============================================
# INSTALAR DEPENDENCIAS
# ============================================

echo "📦 Verificando dependencias..."

# Backend
if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Backend: node_modules instalado"
else
    echo -e "${YELLOW}⚠${NC}  Instalando dependencias del backend..."
    cd backend && npm install && cd ..
fi

# Frontend
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Frontend: node_modules instalado"
else
    echo -e "${YELLOW}⚠${NC}  Instalando dependencias del frontend..."
    cd frontend && npm install && cd ..
fi

echo ""

# ============================================
# VERIFICAR GIT
# ============================================

echo "📡 Verificando estado de Git..."

# Verificar que estamos en un repo git
if [ -d ".git" ]; then
    echo -e "${GREEN}✓${NC} Repositorio Git encontrado"
    
    # Verificar branch actual
    CURRENT_BRANCH=$(git branch --show-current)
    echo "   Branch actual: $CURRENT_BRANCH"
    
    # Verificar cambios sin commit
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}⚠${NC}  Hay cambios sin commit"
        echo ""
        echo "   Archivos modificados:"
        git status --short
        echo ""
        read -p "   ¿Quieres hacer commit ahora? (s/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            git add .
            read -p "   Mensaje del commit: " COMMIT_MSG
            git commit -m "$COMMIT_MSG"
            echo -e "${GREEN}✓${NC} Commit realizado"
        fi
    else
        echo -e "${GREEN}✓${NC} No hay cambios pendientes"
    fi
    
    # Verificar remote
    if git remote -v | grep -q "origin"; then
        echo -e "${GREEN}✓${NC} Remote 'origin' configurado"
        REMOTE_URL=$(git remote get-url origin)
        echo "   URL: $REMOTE_URL"
    else
        echo -e "${RED}✗${NC} No hay remote 'origin' configurado"
        echo "   Configura tu repositorio en GitHub primero"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} No es un repositorio Git"
    echo "   Inicializa Git con: git init"
    exit 1
fi

echo ""

# ============================================
# RESUMEN Y PRÓXIMOS PASOS
# ============================================

echo "============================================"
echo -e "${GREEN}✅ PROYECTO LISTO PARA DEPLOY${NC}"
echo "============================================"
echo ""
echo "📝 PRÓXIMOS PASOS:"
echo ""
echo "1️⃣  Subir código a GitHub:"
echo "   git push origin $CURRENT_BRANCH"
echo ""
echo "2️⃣  Crear cuenta en PlanetScale (MySQL gratis):"
echo "   https://planetscale.com/"
echo ""
echo "3️⃣  Crear cuenta en Render (deploy gratis):"
echo "   https://render.com/"
echo ""
echo "4️⃣  Conectar Render con tu repositorio GitHub"
echo "   - New → Blueprint"
echo "   - Seleccionar repositorio"
echo "   - Render detectará render.yaml automáticamente"
echo ""
echo "5️⃣  Configurar variables de entorno en Render"
echo "   - Copiar de: backend/.env.backup"
echo "   - Actualizar DB_* con credenciales de PlanetScale"
echo ""
echo "6️⃣  Deployar frontend en Vercel:"
echo "   https://vercel.com/"
echo ""
echo "7️⃣  Configurar cron-job.org (keep-alive):"
echo "   https://cron-job.org/"
echo ""
echo "📚 Guía completa: DEPLOY_RENDER_GRATIS.md"
echo ""
echo "============================================"
echo ""

# Preguntar si quiere hacer push ahora
read -p "¿Quieres hacer push a GitHub ahora? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🚀 Haciendo push..."
    git push origin $CURRENT_BRANCH
    echo -e "${GREEN}✓${NC} Push completado"
    echo ""
    echo "Ahora ve a Render.com y crea el Blueprint con tu repo"
fi

echo ""
echo "¡Buena suerte con el deploy! 🎉"
