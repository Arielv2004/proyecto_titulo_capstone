from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import secrets
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from routers import extract

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS complementa la autenticación del backend; no sustituye el aislamiento de red.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.BACKEND_CORE_ORIGIN, "http://localhost:5000", "http://backend-core:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def authenticate_backend(request: Request, call_next):
    if request.url.path != "/health":
        configured = settings.AI_SERVICE_TOKEN
        supplied = request.headers.get("x-service-token", "")
        if len(configured) < 32 or not secrets.compare_digest(supplied, configured):
            return JSONResponse(status_code=401, content={"detail": "Servicio no autorizado."})
    return await call_next(request)

# Registro de routers
app.include_router(extract.router, prefix=f"{settings.API_V1_STR}/ai", tags=["AI & OCR Extraction"])

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "UP",
        "service": "ai-service",
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
