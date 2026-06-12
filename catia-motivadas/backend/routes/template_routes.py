from fastapi import APIRouter, UploadFile, File, HTTPException
from services.template_service import guardar_template, obtener_template_actual

router = APIRouter()


@router.post("/upload")
async def upload_template(file: UploadFile = File(...)):
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos .docx")
    content = await file.read()
    info = guardar_template(content, file.filename)
    return {"success": True, "template": info, "mensaje": f"Template '{file.filename}' cargado"}


@router.get("/current")
async def get_current_template():
    return obtener_template_actual()
