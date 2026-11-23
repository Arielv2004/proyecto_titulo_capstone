from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from routers import extract

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS restringido exclusivamente al backend-core (aislamiento de red)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.BACKEND_CORE_ORIGIN, "http://localhost:5000", "http://backend-core:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
