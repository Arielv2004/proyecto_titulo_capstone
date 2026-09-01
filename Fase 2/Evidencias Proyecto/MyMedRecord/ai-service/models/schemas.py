from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime

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

class DocumentExtractionResponse(BaseModel):
    document_type: str = Field(..., description="RECETA, EXAMEN_LAB, INFORME_MEDICO, OTRO")
    raw_text: str
    diagnoses: List[str] = []
    medications: List[MedicationEntity] = []
    lab_metrics: List[LabMetricEntity] = []
    summary: Optional[str] = None
    processed_at: datetime = Field(default_factory=datetime.utcnow)
