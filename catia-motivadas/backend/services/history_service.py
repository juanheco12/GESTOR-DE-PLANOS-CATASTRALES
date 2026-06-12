from sqlalchemy.orm import Session
from models.motivada import Motivada
from typing import Optional, List
import json


def crear_registro(
    db: Session,
    expediente: str,
    propietario: str,
    numero_predio: str,
    motivada_texto: str,
    archivo_nombre: str,
    archivo_path: str,
    datos_json: dict,
    tipo_mutacion: str = "TERCERA_CLASE",
) -> Motivada:
    registro = Motivada(
        tipo_mutacion=tipo_mutacion,
        expediente=expediente,
        propietario=propietario,
        numero_predio=numero_predio,
        motivada_texto=motivada_texto,
        archivo_nombre=archivo_nombre,
        archivo_path=archivo_path,
        datos_json=json.dumps(datos_json, ensure_ascii=False),
        estado="GENERADA",
    )
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro


def listar_registros(
    db: Session, skip: int = 0, limit: int = 50, busqueda: str = None
) -> List[Motivada]:
    q = db.query(Motivada)
    if busqueda:
        q = q.filter(
            Motivada.expediente.contains(busqueda)
            | Motivada.propietario.contains(busqueda)
        )
    return q.order_by(Motivada.fecha_creacion.desc()).offset(skip).limit(limit).all()


def obtener_registro(db: Session, id: int) -> Optional[Motivada]:
    return db.query(Motivada).filter(Motivada.id == id).first()


def contar_registros(db: Session) -> int:
    return db.query(Motivada).count()
