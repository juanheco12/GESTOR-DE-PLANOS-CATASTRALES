from pydantic import BaseModel
from typing import Any, Optional, List
from datetime import datetime


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None


class HistoryRecord(BaseModel):
    id: int
    fecha_creacion: datetime
    tipo_mutacion: str
    expediente: str
    propietario: str
    numero_predio: str
    estado: str
    archivo_nombre: Optional[str] = None

    class Config:
        from_attributes = True


class HistoryListResponse(BaseModel):
    records: List[HistoryRecord]
    total: int
