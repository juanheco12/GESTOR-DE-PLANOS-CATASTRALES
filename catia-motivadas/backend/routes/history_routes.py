from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database.db import get_db
from services.history_service import listar_registros, obtener_registro, contar_registros
from pathlib import Path
from config import settings

router = APIRouter()


@router.get("/")
async def get_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    search: str = Query(default=None),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * page_size
    registros = listar_registros(db, skip=skip, limit=page_size, busqueda=search)
    total = contar_registros(db)
    return {
        "success": True,
        "data": {
            "records": [
                {
                    "id": r.id,
                    "fecha_creacion": r.fecha_creacion.isoformat() if r.fecha_creacion else None,
                    "tipo_mutacion": r.tipo_mutacion,
                    "expediente": r.expediente,
                    "propietario": r.propietario,
                    "numero_predio": r.numero_predio,
                    "estado": r.estado,
                    "archivo_nombre": r.archivo_nombre,
                }
                for r in registros
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        },
    }


@router.get("/{id}")
async def get_registro(id: int, db: Session = Depends(get_db)):
    r = obtener_registro(db, id)
    if not r:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return {
        "success": True,
        "data": {
            "id": r.id,
            "expediente": r.expediente,
            "propietario": r.propietario,
            "numero_predio": r.numero_predio,
            "tipo_mutacion": r.tipo_mutacion,
            "motivada_texto": r.motivada_texto,
            "archivo_nombre": r.archivo_nombre,
            "estado": r.estado,
            "fecha_creacion": r.fecha_creacion.isoformat() if r.fecha_creacion else None,
        },
    }


@router.get("/{id}/download")
async def download_motivada(id: int, db: Session = Depends(get_db)):
    r = obtener_registro(db, id)
    if not r:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    if not r.archivo_nombre:
        raise HTTPException(status_code=404, detail="Este registro no tiene archivo adjunto")
    path = Path(settings.outputs_dir) / r.archivo_nombre
    if not path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado en disco")
    return FileResponse(
        str(path),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=r.archivo_nombre,
    )
