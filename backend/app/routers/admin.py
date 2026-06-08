"""
admin.py – Admin endpoints for document upload and background ingestion.
"""

import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from app.core.database import SessionLocal
from app.services.ingestion_service import SUPPORTED_EXTENSIONS, process_file_background

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parents[1] / "data" / "uploads"


async def _run_ingestion_background(file_path: str) -> None:
    """Open a dedicated DB session and run the ingestion pipeline."""
    async with SessionLocal() as db_session:
        try:
            await process_file_background(file_path, db_session)
        except Exception:
            logger.exception("Background ingestion failed for %s", file_path)


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """
    Accept a document upload, persist it to disk, and ingest it in the background.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required.")

    ext = Path(file.filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{ext}'. "
                f"Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            ),
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    safe_name = f"{uuid.uuid4().hex}_{Path(file.filename).name}"
    temporary_file_path = UPLOAD_DIR / safe_name

    contents = await file.read()
    temporary_file_path.write_bytes(contents)

    background_tasks.add_task(_run_ingestion_background, str(temporary_file_path))

    return {
        "status": "processing",
        "message": "File uploaded successfully. Ingestion started in background.",
    }
