import anthropic
from config import settings
from schemas.tercera_clase import TerceraClaseSchema

SYSTEM_PROMPT = """
Eres un asistente especializado en redacción de motivadas y resoluciones de trámites catastrales colombianos,
siguiendo las normas del IGAC y la Resolución 1040 de 2018.

Tu tarea es generar una MOTIVADA JURÍDICAMENTE VÁLIDA para una mutación catastral de TERCERA CLASE
(Incorporación de Construcción), conforme al Decreto 1170 de 2015 y demás normas vigentes.

La motivada debe tener esta estructura exacta, con cada sección claramente separada:

I. ANTECEDENTES DE HECHO
(Describe quién solicita, qué solicita, cuándo y con qué documentos)

II. FUNDAMENTOS JURÍDICOS
(Cita las normas aplicables: Ley 388/97, Decreto 1170/2015, Resolución IGAC 1040/2018, etc.)

III. CONSIDERACIONES TÉCNICAS Y JURÍDICAS
(Análisis del caso concreto a la luz de la normativa)

IV. CONCLUSIÓN
(Justificación clara de por qué procede la incorporación)

Reglas de redacción:
- Estilo formal administrativo colombiano
- Sin markdown ni códigos de formato
- Párrafos separados por línea en blanco
- Máximo 750 palabras en total
- Citas normativas precisas y pertinentes
- Primera persona plural institucional ("Esta Dependencia", "Se constata", "Se concluye")
"""


def generar_motivada_tercera_clase(datos: TerceraClaseSchema) -> str:
    if not settings.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEY no configurada. Revisa el archivo .env")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    c = datos.construccion
    p = datos.propietario

    materiales = ", ".join(filter(None, [
        f"paredes: {c.material_paredes}" if c.material_paredes else "",
        f"cubierta: {c.material_cubierta}" if c.material_cubierta else "",
        f"pisos: {c.material_pisos}" if c.material_pisos else "",
    ])) or "No especificados"

    user_prompt = f"""
Genera la motivada para la siguiente mutación catastral de TERCERA CLASE:

EXPEDIENTE: {datos.expediente}
CÓDIGO CATASTRAL DEL PREDIO: {datos.numero_predio}
FECHA DE SOLICITUD: {datos.fecha_solicitud}

PROPIETARIO:
- Nombre: {p.nombre}
- Cédula: {p.cedula}
- Dirección: {p.direccion}
- Municipio: {p.municipio}

CONSTRUCCIÓN A INCORPORAR:
- Tipo: {c.tipo}
- Uso: {c.uso}
- Número de pisos: {c.pisos}
- Área construida: {c.area_construida} m²
- Área del terreno: {c.area_terreno} m²
- Estrato socioeconómico: {c.estrato}
- Año de construcción: {c.anio_construccion}
- Materiales predominantes: {materiales}
- Descripción: {c.descripcion}

FUNCIONARIO RESPONSABLE: {datos.funcionario_nombre} ({datos.funcionario_cargo})

Genera la motivada completa y profesional.
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    return message.content[0].text
