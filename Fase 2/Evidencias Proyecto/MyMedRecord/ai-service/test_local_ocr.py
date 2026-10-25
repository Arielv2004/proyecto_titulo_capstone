import io
from pathlib import Path
import httpx
from PIL import Image, ImageDraw, ImageFont
from dotenv import dotenv_values

def run():
    token = dotenv_values(Path(__file__).parent / ".env")["AI_SERVICE_TOKEN"]
    url = "http://127.0.0.1:8000/api/v1/ai/process-document"
    with httpx.Client(timeout=55) as client:
        assert client.post(url, files={"file": ("fake.png", b"bad", "image/png")}).status_code == 401
        assert client.post(url, headers={"x-service-token": token}, files={"file": ("fake.png", b"bad", "image/png")}).status_code == 400
        image = Image.new("RGB", (1200, 400), "white")
        draw = ImageDraw.Draw(image)
        font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 40)
        draw.text((30, 50), "DOCUMENTO FICTICIO\nReceta de prueba\nSin datos de pacientes reales", fill="black", font=font, spacing=20)
        out = io.BytesIO()
        image.save(out, format="PNG")
        content = out.getvalue()
        result = client.post(url, headers={"x-service-token": token}, files={"file": ("ficticio.png", content, "image/png")})
        assert result.status_code == 200, result.text
        assert "FICTICIO" in result.json()["raw_text"].upper()
        assert result.json()["medications"] == []
        fixture = Path(__file__).parent.parent / ".private" / "ficticio.png"
        fixture.write_bytes(content)
        # PDF nativo mínimo; todo su contenido es ficticio.
        stream = b"BT /F1 18 Tf 40 700 Td (DOCUMENTO FICTICIO PDF) Tj ET"
        objects = [b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
                   b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
                   b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
                   b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream"]
        pdf = b"%PDF-1.4\n"
        offsets = [0]
        for i, obj in enumerate(objects, 1):
            offsets.append(len(pdf))
            pdf += str(i).encode() + b" 0 obj\n" + obj + b"\nendobj\n"
        xref = len(pdf)
        pdf += b"xref\n0 6\n0000000000 65535 f \n"
        for offset in offsets[1:]:
            pdf += f"{offset:010d} 00000 n \n".encode()
        pdf += f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode()
        response = client.post(url, headers={"x-service-token": token}, files={"file": ("ficticio.pdf", pdf, "application/pdf")})
        assert response.status_code == 200, response.text
        assert "FICTICIO PDF" in response.json()["raw_text"]
        assert "llm_service" not in (Path(__file__).parent / "routers" / "extract.py").read_text(encoding="utf-8")
    print("PASS OCR real de imagen y PDF, servicio autenticado y formato rechazado.")
if __name__ == "__main__":
    run()
