from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from schemas.tercera_clase import GenerarMotivadaRequest
from services.claude_service import generar_motivada_tercera_clase
from services.docx_service import generar_documento_word
from services.template_service import obtener_ruta_template
from services.history_service import crear_registro

router = APIRouter()


@router.post("/generar")
async def generar_motivada(request: GenerarMotivadaRequest, db: Session = Depends(get_db)):
    try:
        motivada_texto = generar_motivada_tercera_clase(request.datos)

        datos_dict = request.datos.model_dump()
        template_path = obtener_ruta_template() if request.usar_template else None
        archivo_nombre = generar_documento_word(motivada_texto, datos_dict, template_path)

        registro = crear_registro(
            db=db,
            expediente=request.datos.expediente,
            propietario=request.datos.propietario.nombre,
            numero_predio=request.datos.numero_predio,
            motivada_texto=motivada_texto,
            archivo_nombre=archivo_nombre,
            archivo_path=f"./storage/outputs/{archivo_nombre}",
            datos_json=datos_dict,
        )

        return {
            "success": True,
            "data": {
                "id": registro.id,
                "motivada_texto": motivada_texto,
                "archivo_nombre": archivo_nombre,
                "mensaje": "Motivada generada exitosamente",
            },
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando motivada: {str(e)}")


@router.post("/preview")
async def preview_motivada(request: GenerarMotivadaRequest):
    try:
        motivada_texto = generar_motivada_tercera_clase(request.datos)
        return {
            "success": True,
            "data": {"texto_preview": motivada_texto},
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en preview: {str(e)}")
