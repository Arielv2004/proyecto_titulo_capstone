import io
from pdfminer.high_level import extract_text

class PDFService:
    @staticmethod
    def extract_text_from_bytes(file_bytes: bytes) -> str:
        """Extrae texto plano directamente del stream de bytes de un archivo PDF nativo."""
        try:
            with io.BytesIO(file_bytes) as pdf_file:
                text = extract_text(pdf_file)
                return text.strip()
        except Exception as e:
            raise RuntimeError(f"Error al procesar PDF con pdfminer: {str(e)}")
