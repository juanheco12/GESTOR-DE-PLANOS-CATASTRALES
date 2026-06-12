# CatIA — Generador de Motivadas de Trámites Catastrales

Sistema local para generar motivadas administrativas de trámites catastrales usando IA (Claude).

## Stack

- **Frontend**: Next.js 14 + TypeScript + TailwindCSS (dark mode)
- **Backend**: FastAPI + Python 3.10+
- **LLM**: Claude Sonnet 4.6 (Anthropic API)
- **Documentos**: python-docx (.docx)
- **Base de datos**: SQLite (historial local)

## Estructura

```
catia-motivadas/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── config.py            # Settings (pydantic-settings)
│   ├── requirements.txt
│   ├── .env.example
│   ├── database/db.py       # SQLite + SQLAlchemy
│   ├── models/motivada.py   # ORM model
│   ├── schemas/             # Pydantic schemas
│   ├── services/            # Claude, docx, template, history
│   └── routes/              # Endpoints API
└── frontend/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx          # App principal
    │   ├── globals.css
    │   └── components/
    │       ├── Sidebar.tsx
    │       ├── FormBuilder.tsx
    │       ├── PreviewMotivada.tsx
    │       ├── HistoryPanel.tsx
    │       ├── TemplateUploader.tsx
    │       └── SettingsPanel.tsx
    └── package.json
```

## Instalación y ejecución

### 1. Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate   # Linux/Mac
# venv\Scripts\activate    # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env y agregar: ANTHROPIC_API_KEY=sk-ant-...

# Iniciar servidor
uvicorn main:app --reload --port 8000
```

El backend estará disponible en `http://localhost:8000`.
Documentación Swagger: `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3001`.

## Variables de entorno

Archivo `backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=sqlite:///./catia.db
STORAGE_DIR=./storage
```

## Funcionalidades MVP

- **Generar**: Formulario completo para Mutación Tercera Clase (Incorporación de Construcción)
- **Previsualizar**: Generar motivada sin guardar en historial
- **Descargar**: Documento Word (.docx) con la motivada completa
- **Historial**: Lista paginada con búsqueda, descarga por registro
- **Plantilla**: Subir plantilla .docx personalizada con marcadores
- **Configuración**: URL del backend, prueba de conexión
