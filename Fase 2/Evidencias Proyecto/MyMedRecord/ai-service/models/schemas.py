from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone

class MedicationEntity(BaseModel):
    name: str = Field(..., description="Nombre del fármaco")
    dosage: Optional[str] = Field(None, description="Dosis prescrita")
    frequency: Optional[str] = Field(None, description="Frecuencia de administración")
    duration: Optional[str] = Field(None, description="Duración del tratamiento")

class LabMetricEntity(BaseModel):
    test_name: str = Field(..., description="Nombre del examen (ej. Glucosa, Colesterol)")
    value: float = Field(..., description="Valor numérico obtenido")
    unit: str = Field(..., description="Unidad de medida (ej. mg/dL)")
    reference_range: Optional[str] = Field(None, description="Rango de referencia normal")
    is_abnormal: bool = Field(False, description="Indica si está fuera de rango")

class ClinicalExtractionData(BaseModel):
    """Schema estructurado para la respuesta del LLM (sin campos de transporte como raw_text)."""
    document_type: str = Field(..., description="RECETA, EXAMEN_LAB, INFORME_MEDICO, OTRO")
    diagnoses: List[str] = Field(default_factory=list, description="Lista de diagnósticos identificados")
    medications: List[MedicationEntity] = Field(default_factory=list, description="Lista de medicamentos prescritos")
    lab_metrics: List[LabMetricEntity] = Field(default_factory=list, description="Métricas o resultados de laboratorio")
    summary: Optional[str] = Field(None, description="Resumen clínico breve en español")

class DocumentExtractionResponse(ClinicalExtractionData):
    raw_text: str = Field("", description="Texto crudo extraído por OCR")
    processed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
