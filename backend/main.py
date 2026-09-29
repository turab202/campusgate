from fastapi import FastAPI

app = FastAPI(
    title="CampusGate API",
    description="University Access, Asset & Security Management Platform",
    version="1.0.0",
)


@app.get("/")
def root():
    return {
        "message": "CampusGate API is running",
        "version": "1.0.0",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "campusgate-api",
    }