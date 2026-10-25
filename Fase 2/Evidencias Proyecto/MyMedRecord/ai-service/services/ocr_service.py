import io
from PIL import Image
import pytesseract
Image.MAX_IMAGE_PIXELS = 20000000

class OCRService:
    @staticmethod
    def extract_text_from_image_bytes(image_bytes: bytes, lang: str = "spa") -> str:
        with Image.open(io.BytesIO(image_bytes)) as image:
            if image.width * image.height > 20000000:
                raise ValueError("Imagen demasiado grande")
            image.load()
            if image.mode not in ("L", "RGB"):
                image = image.convert("RGB")
            return pytesseract.image_to_string(image, lang=lang, timeout=30).strip()
