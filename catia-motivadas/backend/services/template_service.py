from pathlib import Path
from config import settings
import json

_INFO_FILE = Path(settings.templates_dir) / "current_template.json"


def guardar_template(file_content: bytes, filename: str) -> dict:
    path = Path(settings.templates_dir) / "template_actual.docx"
    path.write_bytes(file_content)
    info = {"nombre_original": filename, "ruta": str(path), "activo": True}
    _INFO_FILE.write_text(json.dumps(info, ensure_ascii=False))
    return info


def obtener_template_actual() -> dict:
    if not _INFO_FILE.exists():
        return {"activo": False, "nombre_original": None, "ruta": None}
    return json.loads(_INFO_FILE.read_text())


def obtener_ruta_template() -> str | None:
    info = obtener_template_actual()
    if info.get("activo") and info.get("ruta"):
        p = Path(info["ruta"])
        if p.exists():
            return str(p)
    return None
