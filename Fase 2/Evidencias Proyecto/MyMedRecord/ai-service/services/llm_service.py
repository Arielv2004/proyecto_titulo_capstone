import json
from google import genai
from google.genai import types
from core.config import settings
from models.schemas import (
    DocumentExtractionResponse,
    MedicationEntity,
    LabMetricEntity,
)


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

Clasifica el documento:
- RECETA: contiene prescripción de medicamentos (busca "Rp", "Rx", nombres de fármacos)
- EXAMEN_LAB: contiene valores numéricos con unidades (mg/dL, g/L, etc.)
- INFORME_MEDICO: narrativa clínica sin prescripción ni valores
- OTRO: cualquier otra cosa
"""


class LLMService:
    @staticmethod
    async def extract_clinical_entities(
        raw_text: str, document_hint: str = "AUTO"
    ) -> DocumentExtractionResponse:
        """
        Analiza el texto clínico crudo y extrae entidades estructuradas usando Gemini.
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

        try:
            client = genai.Client(api_key=settings.LLM_API_KEY)

            # Forzar salida JSON con el schema Pydantic
            response = client.models.generate_content(
                model=settings.LLM_MODEL,
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part(text=SYSTEM_PROMPT),
                            types.Part(text=f"\n\n--- TEXTO DEL DOCUMENTO ---\n{raw_text}"),
                        ],
                    )
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=DocumentExtractionResponse,
                    temperature=0.1,
                ),
            )

            # response.parsed ya viene como DocumentExtractionResponse gracias al schema
            if response.parsed:
                result = response.parsed
                # Asegurar que el raw_text se preserve (el LLM podría modificarlo)
                result.raw_text = raw_text
                return result

            # Fallback: parsear el JSON manualmente
            data = json.loads(response.text)
            data["raw_text"] = raw_text
            return DocumentExtractionResponse(**data)

        except Exception as e:
            # Fallback: devolver lo que se pudo extraer del texto sin LLM
            return DocumentExtractionResponse(
                document_type=_heuristic_type(raw_text),
                raw_text=raw_text,
                diagnoses=[],
                medications=[],
                lab_metrics=[],
                summary=f"⚠️ Error al procesar con LLM: {str(e)}. Texto crudo guardado.",
            )


def _heuristic_type(text: str) -> str:
    """Clasificación heurística sin LLM (fallback)."""
    lower = text.lower()
    if any(k in lower for k in ["rp:", "rx:", "receta", "prescri"]):
        return "RECETA"
    if any(k in lower for k in ["mg/dl", "g/l", "hemoglobina", "glucosa", "laboratorio"]):
        return "EXAMEN_LAB"
    if any(k in lower for k in ["informe", "evolución", "diagnóstico"]):
        return "INFORME_MEDICO"
    return "OTRO"