from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database.db import init_db
from routes import motivada_routes, template_routes, history_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="CatIA API",
    description="Generador de Motivadas Catastrales con IA",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(motivada_routes.router, prefix="/api/motivada", tags=["Motivada"])
app.include_router(template_routes.router, prefix="/api/template", tags=["Template"])
app.include_router(history_routes.router, prefix="/api/history", tags=["Historial"])


@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "CatIA API v1.0"}
