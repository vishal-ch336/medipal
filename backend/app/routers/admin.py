"""
admin.py – Admin endpoints for document upload and background ingestion.

Uses memory-safe streaming writes so that multi-megabyte uploads never load
the entire payload into Python memory at once.
"""

import logging
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile

from app.core.database import SessionLocal
from app.core.security import get_current_admin_user
from app.services.ingestion_service import SUPPORTED_EXTENSIONS, process_file_background

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(get_current_admin_user)])

UPLOAD_DIR = Path(__file__).resolve().parents[1] / "data" / "uploads"
STREAM_CHUNK_SIZE = 1024 * 1024  # 1 MiB read-blocks for streaming uploads


async def _run_ingestion_background(file_path: str) -> None:
    """Open a dedicated DB session and run the ingestion pipeline."""
    async with SessionLocal() as db_session:
        try:
            await process_file_background(file_path, db_session)
        except Exception:
            logger.exception("Background ingestion failed for %s", file_path)


@router.post("/upload")
async def upload_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
):
    """
    Accept one or more document uploads, stream each to disk in 1 MiB blocks
    (never loading the entire file into memory), then trigger background
    ingestion for every successfully saved file.
    """
    if not files:
        raise HTTPException(status_code=400, detail="At least one file is required.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    queued: list[str] = []
    skipped: list[dict] = []

    for file in files:
        # ---- Validate each file ----------------------------------------
        if not file.filename:
            skipped.append({"filename": None, "reason": "Filename is required."})
            continue

        ext = Path(file.filename).suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            skipped.append({
                "filename": file.filename,
                "reason": (
                    f"Unsupported file type '{ext}'. "
                    f"Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
                ),
            })
            continue

        # ---- Stream to a unique temp path on disk ----------------------
        safe_name = f"{uuid.uuid4().hex}_{Path(file.filename).name}"
        temporary_file_path = UPLOAD_DIR / safe_name

        try:
            with open(temporary_file_path, "wb") as buffer:
                while True:
                    chunk = await file.read(STREAM_CHUNK_SIZE)
                    if not chunk:
                        break
                    buffer.write(chunk)
        except Exception:
            temporary_file_path.unlink(missing_ok=True)
            logger.exception("Failed to write upload to disk: %s", safe_name)
            skipped.append({
                "filename": file.filename,
                "reason": "Failed to save uploaded file.",
            })
            continue

        logger.info(
            "Upload saved to disk (%s bytes): %s",
            temporary_file_path.stat().st_size,
            safe_name,
        )

        # ---- Schedule background ingestion -----------------------------
        background_tasks.add_task(
            _run_ingestion_background, str(temporary_file_path)
        )
        queued.append(file.filename)

    if not queued:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "No files were queued for processing.",
                "skipped": skipped,
            },
        )

    return {
        "status": "processing",
        "message": f"{len(queued)} file(s) uploaded successfully. Ingestion started in background.",
        "queued_count": len(queued),
        "queued_files": queued,
        "skipped_count": len(skipped),
        "skipped": skipped,
    }
