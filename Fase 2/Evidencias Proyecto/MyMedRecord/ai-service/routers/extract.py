from fastapi import APIRouter, UploadFile, File, HTTPException, status
from services.pdf_service import PDFService
from services.ocr_service import OCRService
from services.llm_service import LLMService
from models.schemas import DocumentExtractionResponse

router = APIRouter()

@router.post("/process-document", response_model=DocumentExtractionResponse)
async def process_document(file: UploadFile = File(...)):
    """
    Endpoint de procesamiento documental:
    - PDFs: extracción nativa de texto con pdfminer.six
    - Imágenes (JPG, PNG): OCR con Tesseract
    - Envío al LLM para estructuración de entidades médicas
    """
    try:
        content = await file.read()
        filename = (file.filename or "").lower()
        
        raw_text = ""
        if filename.endswith(".pdf") or file.content_type == "application/pdf":
            raw_text = PDFService.extract_text_from_bytes(content)
        elif any(filename.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp"]) or "image/" in (file.content_type or ""):
            raw_text = OCRService.extract_text_from_image_bytes(content)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato no soportado. Debe ser PDF o Imagen (PNG, JPG, JPEG)."
            )
            
        if not raw_text.strip():
            # Si el PDF era escaneado (sin texto nativo), intentar OCR en las páginas si aplica
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No se pudo extraer texto legible del documento."
            )
            
        result = await LLMService.extract_clinical_entities(raw_text)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en procesamiento de IA: {str(e)}"
        )
