import io
from pdfminer.high_level import extract_text
from pdfminer.pdfpage import PDFPage

class PDFService:
    @staticmethod
    def extract_text_from_bytes(file_bytes: bytes) -> str:
        for index, _ in enumerate(PDFPage.get_pages(io.BytesIO(file_bytes), check_extractable=True)):
            if index >= 20:
                raise ValueError("Máximo 20 páginas")
        return extract_text(io.BytesIO(file_bytes), maxpages=20).strip()
