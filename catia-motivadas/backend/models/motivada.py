from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from database.db import Base


class Motivada(Base):
    __tablename__ = "motivadas"

    id = Column(Integer, primary_key=True, index=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    tipo_mutacion = Column(String(100), default="TERCERA_CLASE")
    expediente = Column(String(100), index=True)
    propietario = Column(String(200))
    numero_predio = Column(String(100))
    motivada_texto = Column(Text)
    archivo_nombre = Column(String(255))
    archivo_path = Column(String(500))
    estado = Column(String(50), default="GENERADA")
    datos_json = Column(Text)  # serialized form data
