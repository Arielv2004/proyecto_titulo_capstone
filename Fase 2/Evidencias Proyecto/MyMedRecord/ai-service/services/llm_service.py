import json
import asyncio
import warnings
from google import genai
from google.genai import types
from core.config import settings
from models.schemas import (
    ClinicalExtractionData,
    DocumentExtractionResponse,
    MedicationEntity,
    LabMetricEntity,
)

# Silenciar advertencia interna de AFC de la librería google-genai
warnings.filterwarnings("ignore", message=".*automatic function calling.*")

SYSTEM_PROMPT = """Eres un asistente médico experto en digitalizar documentos clínicos chilenos.
Recibes el texto crudo extraído por OCR de una receta, examen de laboratorio o informe médico.

Tu trabajo es EXTRAER la información estructurada en el JSON solicitado, respetando las siguientes reglas:

1. Los documentos pueden tener errores de OCR (letras cambiadas, espacios incorrectos). Corrige el texto cuando sea evidente (ej: "Shiguellosis" → "Shigelosis").
2. Si un campo no está en el documento, déjalo en null (para campos opcionales) o lista vacía (para arrays).
3. NO inventes información que no esté en el texto. Si no estás seguro, deja el campo vacío.
4. Para medicamentos, extrae:
   - name: nombre del fármaco en MAYÚSCULAS
   - dosage: dosis completa (ej: "200 mg/5 ml")
   - frequency: frecuencia de administración (ej: "1 vez al día")
   - duration: duración del tratamiento (ej: "4 días")
5. Para diagnósticos, corrige tildes y errores de OCR.
6. El "summary" debe ser un resumen clínico breve en español (2-3 frases).

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
- "Paracetamol 500 mg, 1 tableta cada 8 horas por 5 días" → RECETA
- "Glucosa 110 mg/dL, Colesterol 200 mg/dL" → EXAMEN_LAB
- "Paciente con diabetes tipo 2, controlada con metformina" → INFORME_MEDICO
- "Paracetamol 500 mg + Glucosa 110 mg/dL" → RECETA (porque hay medicamento)
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
        # Si no hay API key configurada, devolver respuesta vacía con el texto crudo
        if not settings.LLM_API_KEY or settings.LLM_API_KEY == "tu_api_key_de_llm_aqui":
            return DocumentExtractionResponse(
                document_type=_heuristic_type(raw_text),
                raw_text=raw_text,
                diagnoses=[],
                medications=[],
                lab_metrics=[],
                summary="⚠️ LLM no configurado. Configure LLM_API_KEY en .env",
            )

        # Modelos activos soportados para fallback (en orden de prioridad)
        models_to_try = [settings.LLM_MODEL]
        for fallback in ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)

        client = genai.Client(api_key=settings.LLM_API_KEY)
        last_error = None

        for model_name in models_to_try:
            for attempt in range(2):  # 2 intentos por modelo
                try:
                    response = await client.aio.models.generate_content(
                        model=model_name,
                        contents=[f"--- TEXTO DEL DOCUMENTO ---\n{raw_text}"],
                        config=types.GenerateContentConfig(
                            system_instruction=SYSTEM_PROMPT,
                            response_mime_type="application/json",
                            response_schema=ClinicalExtractionData,
                            temperature=0.1,
                        ),
                    )

                    if response.parsed:
                        extracted = response.parsed
                        return DocumentExtractionResponse(
                            raw_text=raw_text,
                            **extracted.model_dump(),
                        )

                    data = json.loads(response.text)
                    data["raw_text"] = raw_text
                    return DocumentExtractionResponse(**data)

                except Exception as e:
                    last_error = e
                    err_str = str(e).lower()
                    # Si es error 503, 429 o timeout, esperar y reintentar
                    if any(code in err_str for code in ["503", "429", "unavailable", "timeout", "demand"]):
                        wait = 1.5 * (attempt + 1)
                        await asyncio.sleep(wait)
                        continue
                    # Si el modelo no existe o ya no está disponible (404), saltar al siguiente modelo
                    if any(code in err_str for code in ["404", "not_found", "no longer available"]):
                        break
                    # Otros errores: pasar al siguiente modelo
                    break

        # Si todos los modelos fallaron, fallback heurístico
        return DocumentExtractionResponse(
            document_type=_heuristic_type(raw_text),
            raw_text=raw_text,
            diagnoses=[],
            medications=[],
            lab_metrics=[],
            summary=f"⚠️ Error al procesar con LLM después de varios intentos: {str(last_error)[:200]}. Texto crudo guardado.",
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
        "miligramos", "mg ", " mg", "gotas"
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