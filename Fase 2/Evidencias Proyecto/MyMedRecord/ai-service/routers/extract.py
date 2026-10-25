from fastapi import APIRouter, UploadFile, File, HTTPException
from models.schemas import DocumentExtractionResponse
from core.config import settings
from starlette.concurrency import run_in_threadpool
import asyncio
import subprocess
import sys
from pathlib import Path
slots = asyncio.Semaphore(2)

def local_process(content, kind):
    result = subprocess.run([sys.executable, '-m', 'services.local_worker', kind], input=content, capture_output=True, timeout=40, cwd=Path(__file__).resolve().parent.parent, check=True)
    return result.stdout.decode('utf-8')

router = APIRouter()

@router.post("/process-document", response_model=DocumentExtractionResponse)
async def process_document(file: UploadFile = File(...)):
    content = await file.read(10 * 1024 * 1024 + 1)
    if not content or len(content) > 10 * 1024 * 1024:
        raise HTTPException(413, "El archivo supera el tamaño permitido.")
    is_pdf = content.startswith(b"%PDF-")
    is_image = content.startswith(b"\x89PNG\r\n\x1a\n") or content.startswith(b"\xff\xd8\xff") or (content.startswith(b"RIFF") and content[8:12] == b"WEBP")
    if not is_pdf and not is_image:
        raise HTTPException(400, "Formato de archivo no admitido.")
    try:
        await asyncio.wait_for(slots.acquire(), timeout=2)
        try:
            raw_text = await run_in_threadpool(local_process, content, 'pdf' if is_pdf else 'image')
        finally:
            slots.release()
        if not raw_text.strip():
            raise HTTPException(422, "No se encontró texto legible. Puedes completar los datos manualmente.")
        notice = None
        if settings.EXTERNAL_AI_ENABLED:
            if settings.LLM_API_KEY:
                from services.llm_service import LLMService
                try:
                    return await asyncio.wait_for(LLMService.extract_clinical_entities(raw_text[:100000]), timeout=30)
                except Exception:
                    notice = "Gemini no pudo estructurar el documento. Conservamos el texto OCR para revisión manual."
            else:
                notice = "Gemini no está configurado en este entorno. Conservamos el texto OCR para revisión manual."
        return DocumentExtractionResponse(document_type="OTRO", raw_text=raw_text[:100000],
            summary=None, processing_notice=notice, diagnoses=[], medications=[], lab_metrics=[], is_medical_document=True)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "No fue posible procesar el documento dentro de los límites permitidos.")
