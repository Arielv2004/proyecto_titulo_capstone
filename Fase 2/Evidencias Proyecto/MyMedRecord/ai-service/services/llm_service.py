import json
import asyncio
import logging
import warnings
from google import genai
from google.genai import types
from core.config import settings
from models.schemas import (
    ClinicalExtractionData,
    DocumentExtractionResponse,
    MedicationEntity,
    LabMetricEntity,
    ClinicalReportSummaryRequest,
    ClinicalReportSummaryResponse,
)

# Silenciar advertencia interna de AFC de la librería google-genai
warnings.filterwarnings("ignore", message=".*automatic function calling.*")

SYSTEM_PROMPT = """Eres un asistente médico experto en digitalizar documentos clínicos chilenos.
Recibes el texto crudo extraído por OCR de una receta, examen de laboratorio o informe médico.

Tu trabajo es EXTRAER la información estructurada en el JSON solicitado, respetando las siguientes reglas:

REGLA PREVIA OBLIGATORIA - VALIDACIÓN DE DOCUMENTO CLÍNICO:
ANTES de extraer cualquier información, determina si el texto corresponde a un documento médico clínico real (receta médica, examen de laboratorio, informe médico, interconsulta o epicrisis).

Marca is_medical_document=false si el texto es:
- Un error de sistema, stack trace, mensaje de consola o código SQL/de programación.
- Logs, mensajes de error técnicos, configuración o código fuente.
- Contenido no relacionado con salud (recetas de cocina, poemas, facturas comerciales, publicidad, capturas de pantalla de interfaces genéricas, etc.).
- Texto ilegible o ruido de OCR sin estructura ni terminología médica reconocible.

Cuando is_medical_document=false:
- diagnoses, medications y lab_metrics DEBEN ser listas vacías [].
- document_type DEBE ser 'OTRO'.
- suggested_title DEBE ser 'Doc. No Médico'.
- summary DEBE ser: 'El documento no contiene información médica legible.'
- NUNCA intentes interpretar mensajes de error técnico, código o texto genérico como diagnósticos ni medicamentos.

REGLAS DE EXTRACCIÓN (cuando is_medical_document=true):
1. Los documentos pueden tener errores de OCR (letras cambiadas, espacios incorrectos). Corrige el texto cuando sea evidente (ej: "Shiguellosis" → "Shigelosis").
2. Si un campo no está en el documento, déjalo en null (para campos opcionales) o lista vacía (para arrays).
3. NO inventes información que no esté en el texto. Si no estás seguro, deja el campo vacío.
4. Para medicamentos, extrae:
   - name: nombre del fármaco en MAYÚSCULAS
   - dosage: dosis completa (ej: "200 mg/5 ml")
   - frequency: frecuencia de administración (ej: "1 vez al día", "cada 8 horas")
   - duration: duración del tratamiento tal como aparece (ej: "4 días", "por 1 semana")
   - duration_days: número entero de días que dura el tratamiento:
     * "4 días" o "por 4 días" → 4
     * "1 semana" o "por 7 días" → 7
     * "2 semanas" o "14 días" → 14
     * "1 mes" o "30 días" → 30
     * "3 meses" → 90
     * Si es tratamiento crónico, permanente o no se puede deducir, deja en null.
5. Para la fecha del documento (document_date):
   - Extrae la fecha de emisión del documento en formato YYYY-MM-DD (ej: "2026-09-27").
   - Si no está visible en el texto, déjala en null.
6. Para diagnósticos, corrige tildes y errores de OCR.
7. El "summary" debe ser un resumen clínico breve en español (2-3 frases).
8. Genera un `suggested_title` de máximo 20 caracteres. Usa el formato '[Tipo] - [Diagnóstico corto]'. Ejemplo: 'Receta - Diabetes', 'Examen - Sangre'. Si no hay diagnóstico explícito, usa el fármaco o prueba principal (ej: 'Receta - Paracetamol', 'Examen - Orina'). NUNCA superes los 20 caracteres.

Clasifica el documento con estas reglas, en este orden de prioridad:

1. RECETA: si contiene nombres de MEDICAMENTOS con dosis o instrucciones de toma.
   Palabras clave: "Rp", "Rx", "tableta", "cápsula", "jarabe", "mg", "ml",
   "vía oral", "cada X horas", "por X días", "dosis".
   → TIENE PRIORIDAD sobre cualquier otra categoría si hay medicamentos.

2. EXAMEN_LAB: si contiene MÚLTIPLES valores numéricos con unidades médicas
   (mg/dL, g/L, mmol/L, %, mmHg, etc.) Y NO contiene medicamentos con
   instrucciones de toma.

3. INFORME_MEDICO: narrativa clínica sin prescripción ni valores numéricos.

4. OTRO: cualquier otra cosa.

Ejemplos:
- "Paracetamol 500 mg, 1 tableta cada 8 horas por 5 días" → RECETA (is_medical_document=true)
- "Glucosa 110 mg/dL, Colesterol 200 mg/dL" → EXAMEN_LAB (is_medical_document=true)
- "Paciente con diabetes tipo 2, controlada con metformina" → INFORME_MEDICO (is_medical_document=true)
- "SELECT * FROM users WHERE error..." → OTRO (is_medical_document=false)
- "Harina 500g, 2 huevos, azúcar" → OTRO (is_medical_document=false)
"""


class LLMService:
    @staticmethod
    async def extract_clinical_entities(
        raw_text: str, document_hint: str = "AUTO"
    ) -> DocumentExtractionResponse:
        """
        Analiza el texto clínico crudo y extrae entidades estructuradas usando Gemini.
        Con fallback entre modelos activos si uno falla por saturación (503/429).
        """
        if settings.LLM_API_KEY and settings.LLM_API_KEY != "tu_api_key_de_llm_aqui":
            # Dos intentos de 18 s dejan margen para el OCR dentro de los 60 s de la API.
            fallback_model = "gemini-2.5-flash" if settings.LLM_MODEL == "gemini-3.1-flash-lite" else "gemini-3.1-flash-lite"
            async with genai.Client(api_key=settings.LLM_API_KEY).aio as client:
                for model_name in (settings.LLM_MODEL, fallback_model):
                    try:
                        response = await asyncio.wait_for(
                            client.models.generate_content(
                                model=model_name,
                                contents=[f"--- TEXTO DEL DOCUMENTO ---\n{raw_text}"],
                                config=types.GenerateContentConfig(
                                    system_instruction=SYSTEM_PROMPT,
                                    response_mime_type="application/json",
                                    response_schema=ClinicalExtractionData,
                                    temperature=0.1,
                                ),
                            ),
                            timeout=18,
                        )
                        extracted = response.parsed or ClinicalExtractionData.model_validate_json(response.text)
                        return DocumentExtractionResponse(raw_text=raw_text, **extracted.model_dump())
                    except Exception as exc:
                        code = getattr(exc, "code", None)
                        logging.getLogger(__name__).warning(
                            "Extracción con %s fallida (%s)", model_name, code or type(exc).__name__
                        )
                        if code in (401, 403):
                            break

        return DocumentExtractionResponse(
            extraction_status="text_only",
            suggested_title="Documento",
            document_type=_heuristic_type(raw_text),
            raw_text=raw_text,
        )


def _heuristic_type(text: str) -> str:
    """Clasificación heurística sin LLM (fallback de seguridad)."""
    lower = text.lower()

    # 1. Prioridad RECETA: buscar prescripción o palabras clave de medicamentos y dosis
    recipe_keywords = [
        "rp:", "rp.", "rx:", "rx.", "receta", "prescri", "comprimido", "comprimidos",
        "tableta", "tabletas", "cápsula", "capsula", "cápsulas", "capsulas",
        "jarabe", "vía oral", "via oral", "cada 8", "cada 12", "cada 24",
        "cada 6", "cada 4", "por día", "por dia", "veces al día", "veces al dia",
        "paracetamol", "amoxicilina", "ibuprofeno", "azitromicina", "metformina",
        "losartan", "enalapril", "atorvastatina", "omeprazol", "salbutamol",
        "miligramos", "gotas"
    ]
    if any(k in lower for k in recipe_keywords):
        return "RECETA"

    # 2. EXAMEN_LAB: unidades o términos médicos de laboratorio
    lab_keywords = [
        "mg/dl", "g/l", "mmol/l", "hemoglobina", "leucocitos", "hematocrito",
        "plaquetas", "creatinina", "urocultivo", "colesterol", "triglicéridos",
        "trigliceridos", "orina completa", "laboratorio clínico", "laboratorio clinico"
    ]
    if any(k in lower for k in lab_keywords):
        return "EXAMEN_LAB"

    # 3. INFORME_MEDICO: narrativa clínica
    informe_keywords = [
        "epicrisis", "informe", "interconsulta", "evolución", "evolucion",
        "diagnóstico:", "diagnostico:", "anamnesis"
    ]
    if any(k in lower for k in informe_keywords):
        return "INFORME_MEDICO"

    return "OTRO"


REPORT_SUMMARY_SYSTEM_PROMPT = """Eres un médico especialista auditor en salud digital.
Tu tarea es redactar una "Síntesis Clínica Narrativa" formal, humana, concisa y profesional para el Informe Clínico de un paciente.

REGLAS ESTRICTAS DE REDACCIÓN:
1. Longitud: exactamente 2 párrafos concisos y bien estructurados (longitud total recomendada entre 600 y 900 caracteres, aprox. 100 a 140 palabras). Evita textos excesivamente largos o redundantes.
2. Tono: formal, clínico, objetivo y asistencial. Dirigido a profesionales de la salud y al propio paciente.
3. Redacción fluida en español:
   - Prohibido terminantemente usar expresiones mecánicas con paréntesis como "documento(s)", "receta(s)", "examen(es)".
   - Adapta siempre la redacción al número real: "cuenta con 1 documento registrado", "cuenta con 5 documentos registrados".
   - No uses corchetes ni formatos de plantilla técnica.
4. Contenido estructurado en 2 párrafos:
   - Párrafo 1: Identificación y estado de salud general, antecedentes declarados de alergias y patologías crónicas.
   - Párrafo 2: Resumen del esquema terapéutico activo (medicamentos y posologías principales) y estado de exámenes paraclínicos recientes o recomendaciones de seguimiento preventivo.
5. RIGOR Y SEGURIDAD CLÍNICA (Ley 21.668 / Ley 21.719):
   - NUNCA inventes patologías, fármacos ni valores que no figuren en los datos suministrados.
   - Si no existen recetas o exámenes registrados, indícalo textualmente de manera objetiva y natural (ej: "A la fecha no se registran recetas farmacológicas vigentes ni exámenes paraclínicos cargados en la plataforma").
   - Prohibido emitir diagnósticos definitivos nuevos que no hayan sido formalmente consignados por los médicos emisores.
"""

class LLMReportService:
    @staticmethod
    async def generate_clinical_summary(req: ClinicalReportSummaryRequest) -> ClinicalReportSummaryResponse:
        from datetime import datetime, timezone
        now_iso = datetime.now(timezone.utc).isoformat()

        # Modelos a intentar en orden de preferencia
        models_to_try = [settings.LLM_MODEL]
        for fallback in ["gemini-2.5-flash", "gemini-3.0-flash", "gemini-2.0-flash"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)

        prompt_data = (
            f"DATOS DEL PACIENTE:\n"
            f"- Nombre: {req.patient_name}\n"
            f"- RUT: {req.patient_rut or 'No informado'}\n"
            f"- Alergias declaradas: {', '.join(req.allergies) if req.allergies else 'Ninguna conocida'}\n"
            f"- Condiciones crónicas: {', '.join(req.chronic_conditions) if req.chronic_conditions else 'Ninguna declarada'}\n\n"
            f"RECETAS Y TRATAMIENTOS:\n{json.dumps(req.prescriptions, ensure_ascii=False, indent=2)}\n\n"
            f"EXÁMENES DE LABORATORIO:\n{json.dumps(req.lab_reports, ensure_ascii=False, indent=2)}\n\n"
            f"TOTAL DOCUMENTOS DIGITALIZADOS: {req.documents_count}"
        )

        client = genai.Client(api_key=settings.LLM_API_KEY)
        for model_name in models_to_try:
            try:
                response = await client.aio.models.generate_content(
                    model=model_name,
                    contents=[prompt_data],
                    config=types.GenerateContentConfig(
                        system_instruction=REPORT_SUMMARY_SYSTEM_PROMPT,
                        temperature=0.2,
                    ),
                )
                text = (response.text or "").strip()
                if text:
                    return ClinicalReportSummaryResponse(
                        summary_text=text,
                        model_used=model_name,
                        generated_at=now_iso,
                    )
            except Exception as e:
                continue

        # Fallback determinista si los modelos de IA no responden (redacción natural en español)
        doc_count = req.documents_count
        doc_phrase = "1 documento registrado" if doc_count == 1 else f"{doc_count} documentos registrados"
        
        rx_count = len(req.prescriptions)
        if rx_count == 0:
            rx_phrase = "no cuenta con prescripciones activas registradas en su historial"
        elif rx_count == 1:
            rx_phrase = "cuenta con una prescripción médica registrada en su historial clínico digitalizado"
        else:
            rx_phrase = f"cuenta con {rx_count} prescripciones médicas registradas en su historial clínico digitalizado"

        lab_count = len(req.lab_reports)
        if lab_count == 0:
            lab_phrase = "no registra informes de laboratorio cargados a la fecha"
        elif lab_count == 1:
            lab_phrase = "un reporte de laboratorio clínico para seguimiento"
        else:
            lab_phrase = f"{lab_count} reportes de laboratorio clínico para seguimiento"

        lines = [
            f"El paciente {req.patient_name} (RUT: {req.patient_rut or 'No informado'}) mantiene ficha clínica digital en MyMedRecord. "
            f"Presenta antecedentes declarados de alergias: {', '.join(req.allergies) if req.allergies else 'ninguna alergia conocida informada'}, "
            f"y comorbilidades crónicas: {', '.join(req.chronic_conditions) if req.chronic_conditions else 'sin patologías crónicas registradas'}.",

            f"En relación a su esquema terapéutico y paraclínico, el paciente {rx_phrase}, con {doc_phrase} y {lab_phrase}. "
            f"Se sugiere mantener adherencia a las indicaciones médicas emitidas por los profesionales tratantes y realizar controles periódicos de seguimiento."
        ]

        return ClinicalReportSummaryResponse(
            summary_text="\n\n".join(lines),
            model_used="deterministic-fallback",
            generated_at=now_iso,
        )