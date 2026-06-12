from pydantic import BaseModel, Field
from typing import Optional


class PropietarioSchema(BaseModel):
    nombre: str
    cedula: str
    direccion: str = ""
    municipio: str = ""


class ConstruccionSchema(BaseModel):
    tipo: str
    uso: str = "Vivienda"
    pisos: int = Field(default=1, ge=1)
    area_construida: float = Field(..., gt=0)
    area_terreno: float = 0
    estrato: int = Field(default=1, ge=1, le=6)
    anio_construccion: int = Field(..., ge=1900)
    material_paredes: str = ""
    material_cubierta: str = ""
    material_pisos: str = ""
    descripcion: str


class TerceraClaseSchema(BaseModel):
    expediente: str
    numero_predio: str
    propietario: PropietarioSchema
    construccion: ConstruccionSchema
    fecha_solicitud: str
    funcionario_nombre: str = ""
    funcionario_cargo: str = ""


class GenerarMotivadaRequest(BaseModel):
    datos: TerceraClaseSchema
    usar_template: bool = True


class GenerarMotivadaResponse(BaseModel):
    id: int
    motivada_texto: str
    archivo_nombre: str
    mensaje: str
