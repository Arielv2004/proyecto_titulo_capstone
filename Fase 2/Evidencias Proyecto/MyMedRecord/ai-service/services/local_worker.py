import sys
from services.pdf_service import PDFService
from services.ocr_service import OCRService
if __name__ == "__main__":
    content = sys.stdin.buffer.read(10 * 1024 * 1024 + 1)
    if len(content) > 10 * 1024 * 1024:
        raise ValueError("Límite de archivo")
    processor = PDFService.extract_text_from_bytes if sys.argv[1] == "pdf" else OCRService.extract_text_from_image_bytes
    text = processor(content)
    sys.stdout.buffer.write(text[:100000].encode("utf-8"))
