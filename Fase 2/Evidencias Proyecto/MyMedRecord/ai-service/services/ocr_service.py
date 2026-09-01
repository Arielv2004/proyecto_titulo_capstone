import io
from PIL import Image
import pytesseract

class OCRService:
    @staticmethod
    def extract_text_from_image_bytes(image_bytes: bytes, lang: str = "spa") -> str:
        """Extrae texto de imágenes usando Tesseract OCR con soporte para español."""
        try:
            image = Image.open(io.BytesIO(image_bytes))
            # Convertir a RGB si es necesario
            if image.mode not in ("L", "RGB"):
                image = image.convert("RGB")
            
            # Extraer texto
            text = pytesseract.image_to_string(image, lang=lang)
            return text.strip()
        except Exception as e:
            # Si el idioma no está instalado, intentar fallback en inglés
            try:
                image = Image.open(io.BytesIO(image_bytes))
                return pytesseract.image_to_string(image).strip()
            except Exception as inner_e:
                raise RuntimeError(f"Error en OCR: {str(e)} / {str(inner_e)}")
