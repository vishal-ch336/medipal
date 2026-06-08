"""
ingestion_service.py – Shared document ingestion logic for CLI scripts and API routes.

Loads .txt, .md, .pdf, and .csv files, chunks text, embeds via Ollama, and persists
to the medical_documents table.
"""

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

from langchain_community.document_loaders import CSVLoader, PyPDFLoader, TextLoader
from langchain_ollama import OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import MedicalDocument

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "nomic-embed-text"  # 768-dim output – matches Vector(768)
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf", ".csv"}

embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    length_function=len,
    is_separator_regex=False,
)


def get_document_loader(file_path: str | Path):
    """Return the appropriate LangChain loader for *file_path*, or None."""
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext in (".txt", ".md"):
        return TextLoader(str(path), encoding="utf-8")
    if ext == ".pdf":
        return PyPDFLoader(str(path))
    if ext == ".csv":
        return CSVLoader(str(path), encoding="utf-8")

    logger.warning("Unsupported file format – skipping: %s", path.name)
    return None


def format_label(file_path: Path) -> str:
    ext = file_path.suffix.lower()
    if ext in (".txt", ".md"):
        return "TEXT"
    if ext == ".pdf":
        return "PDF"
    if ext == ".csv":
        return "CSV"
    return ext.lstrip(".").upper() or "UNKNOWN"


def load_text_from_file(file_path: Path) -> str | None:
    """Load and concatenate page content from a supported document."""
    loader = get_document_loader(file_path)
    if loader is None:
        return None

    documents = loader.load()
    parts = [doc.page_content.strip() for doc in documents if doc.page_content.strip()]
    if not parts:
        logger.warning("No extractable text – skipping: %s", file_path.name)
        return None

    return "\n\n".join(parts)


async def process_file_background(file_path: str, db_session: AsyncSession) -> int:
    """
    Load one file, chunk it, embed each chunk, and persist to the database.

    Intended for use from API background tasks or other async callers that
    provide an open AsyncSession.
    """
    path = Path(file_path)
    label = format_label(path)
    logger.info("Processing [%s]: %s", label, path.name)

    raw_text = load_text_from_file(path)
    if raw_text is None:
        return 0

    logger.info("  → %s characters extracted from %s", f"{len(raw_text):,}", path.name)

    chunks = text_splitter.split_text(raw_text)
    if not chunks:
        logger.warning("No chunks produced – skipping: %s", path.name)
        return 0

    logger.info(
        "  → %s chunks created (size=%s, overlap=%s)",
        len(chunks),
        CHUNK_SIZE,
        CHUNK_OVERLAP,
    )
    logger.info("  → Generating embeddings with '%s' via Ollama …", EMBEDDING_MODEL)

    vectors: list[list[float]] = await embeddings.aembed_documents(chunks)
    logger.info("  → %s embeddings generated (dim=%s)", len(vectors), len(vectors[0]))

    saved = 0
    for idx, (chunk, vector) in enumerate(zip(chunks, vectors)):
        doc = MedicalDocument(
            id=uuid.uuid4(),
            content=chunk,
            embedding=vector,
            metadata_={
                "source_file": path.name,
                "source_path": str(path),
                "file_type": path.suffix.lower().lstrip("."),
                "chunk_index": idx,
                "chunk_total": len(chunks),
                "ingested_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        db_session.add(doc)
        saved += 1

    await db_session.commit()
    logger.info("  → %s chunks saved to 'medical_documents' table.", saved)
    return saved


async def ingest_directory(directory: str | Path) -> tuple[int, int]:
    """
    Ingest every supported file in *directory*.

    Returns (files_ingested, total_chunks_saved).
    """
    from app.core.database import SessionLocal

    dir_path = Path(directory)
    files = sorted(
        f for f in dir_path.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
    )

    if not files:
        logger.info("No supported files found in %s", dir_path)
        return 0, 0

    total_chunks = 0
    processed = 0

    for file_path in files:
        try:
            async with SessionLocal() as session:
                saved = await process_file_background(str(file_path), session)
            total_chunks += saved
            if saved > 0:
                processed += 1
        except Exception:
            logger.exception("Failed to ingest %s", file_path.name)

    logger.info(
        "Done – %s/%s file(s) ingested, %s total chunk(s) saved.",
        processed,
        len(files),
        total_chunks,
    )
    return processed, total_chunks
