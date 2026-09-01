import json
from models.schemas import DocumentExtractionResponse, MedicationEntity, LabMetricEntity

class LLMService:
    @staticmethod
    async def extract_clinical_entities(raw_text: str, document_hint: str = "AUTO") -> DocumentExtractionResponse:
        """
        Analiza el texto clínico crudo y clasifica entidades médicas estructuradas.
        Preparado para integración con LLM API (Gemini/OpenAI) o parser semántico de respaldo.
        """
        # Formato estructurado base
        # Por ahora generamos una respuesta base y estructurada lista para conectarse al cliente de LLM
        return DocumentExtractionResponse(
            document_type="EXAMEN_LAB" if "laboratorio" in raw_text.lower() or "mg/dl" in raw_text.lower() else "RECETA",
            raw_text=raw_text,
            diagnoses=[],
            medications=[],
            lab_metrics=[],
            summary="Documento procesado correctamente listo para análisis con LLM."
        )
