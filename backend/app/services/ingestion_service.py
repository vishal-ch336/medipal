"""
ingestion_service.py – Production-grade document ingestion pipeline.

Loads .txt, .md, .pdf, and .csv files, chunks text, embeds via Ollama in
controlled batches of 50, and persists to the medical_documents table using
SQLAlchemy 2.0 bulk operations with per-batch commits.

Performance characteristics:
  - CSV files are streamed row-by-row via csv.DictReader (never loaded
    fully into memory), bypassing LangChain's CSVLoader entirely.
  - Embedding calls are batched (BATCH_SIZE=50) to cap Ollama memory usage.
  - `session.add_all()` + per-batch `commit()` minimises DB lock duration.
  - Failed batches are logged but do not abort the remaining work.
  - Temporary upload files are always deleted in a `finally` block.
"""

import csv
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

from langchain_community.document_loaders import PyMuPDFLoader, TextLoader
from langchain_ollama import OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import MedicalDocument

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
EMBEDDING_MODEL = "nomic-embed-text"  # 768-dim output – matches Vector(768)
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
BATCH_SIZE = 50  # chunks per embedding + DB write cycle

SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf", ".csv"}

embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    length_function=len,
    is_separator_regex=False,
)


# ---------------------------------------------------------------------------
# Document loaders
# ---------------------------------------------------------------------------
def get_document_loader(file_path: str | Path):
    """Return the appropriate LangChain loader for *file_path*, or None.

    Note: CSV files are handled by the streaming path in
    ``_process_csv_streaming`` and are *not* routed through this function.
    """
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext in (".txt", ".md"):
        return TextLoader(str(path), encoding="utf-8")
    if ext == ".pdf":
        return PyMuPDFLoader(str(path))

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


# ---------------------------------------------------------------------------
# CSV streaming ingestion (bypasses LangChain CSVLoader entirely)
# ---------------------------------------------------------------------------
async def _process_csv_streaming(
    path: Path,
    db_session: AsyncSession,
) -> int:
    """
    Stream a CSV file row-by-row via ``csv.DictReader``, format each row as
    a ``key: value`` text block, and embed + save in batches of BATCH_SIZE.

    This avoids loading the entire file into memory, which is critical for
    50 MB+ CSVs that cause LangChain's ``CSVLoader`` to hang.

    Returns the total number of rows successfully embedded and saved.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    saved_total = 0
    batch_count = 0
    row_index = 0
    current_batch: list[str] = []

    logger.info("  -> Streaming CSV row-by-row with csv.DictReader ...")
    logger.info("  -> Generating embeddings with '%s' via Ollama ...", EMBEDDING_MODEL)

    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        reader = csv.DictReader(fh)

        for row in reader:
            # Format the row as a readable text block: "key: value\n"
            text = "\n".join(f"{key}: {value}" for key, value in row.items() if value)
            if not text.strip():
                continue

            current_batch.append(text)
            row_index += 1

            # Flush when we hit BATCH_SIZE
            if len(current_batch) == BATCH_SIZE:
                batch_count += 1
                saved = await _flush_csv_batch(
                    current_batch, batch_count, row_index, path, now_iso, db_session,
                )
                saved_total += saved
                current_batch.clear()

    # Flush any remaining rows
    if current_batch:
        batch_count += 1
        saved = await _flush_csv_batch(
            current_batch, batch_count, row_index, path, now_iso, db_session,
        )
        saved_total += saved
        current_batch.clear()

    logger.info(
        "  -> %s rows saved to 'medical_documents' table across %s batch(es).",
        saved_total,
        batch_count,
    )
    return saved_total


async def _flush_csv_batch(
    batch_texts: list[str],
    batch_num: int,
    row_index: int,
    path: Path,
    now_iso: str,
    db_session: AsyncSession,
) -> int:
    """Embed one batch of CSV-row texts and bulk-insert them."""
    try:
        vectors: list[list[float]] = await embeddings.aembed_documents(batch_texts)

        document_objects = [
            MedicalDocument(
                id=uuid.uuid4(),
                content=text,
                embedding=vector,
                metadata_={
                    "source_file": path.name,
                    "source_path": str(path),
                    "file_type": "csv",
                    "chunk_index": row_index - len(batch_texts) + i,
                    "batch": batch_num,
                    "ingested_at": now_iso,
                },
            )
            for i, (text, vector) in enumerate(zip(batch_texts, vectors))
        ]

        db_session.add_all(document_objects)
        await db_session.commit()

        print(f"✅ Successfully embedded and saved batch {batch_num}")
        logger.info(
            "  -> Batch %s committed (%s rows, up to row %s)",
            batch_num,
            len(document_objects),
            row_index,
        )
        return len(document_objects)

    except Exception:
        logger.exception(
            "Failed to process CSV batch %s for file %s",
            batch_num,
            path.name,
        )
        await db_session.rollback()
        return 0


# ---------------------------------------------------------------------------
# Core ingestion: batched vectorisation + bulk DB writes
# ---------------------------------------------------------------------------
async def process_file_background(
    file_path: str,
    db_session: AsyncSession,
    *,
    cleanup: bool = True,
) -> int:
    """
    Load one file, chunk it, embed in batches of BATCH_SIZE, and bulk-insert
    each batch into the database with a per-batch commit.

    Parameters
    ----------
    file_path : str
        Absolute path to the file on disk.
    db_session : AsyncSession
        An open SQLAlchemy async session.
    cleanup : bool
        If True (the default for API uploads), delete the file from disk
        after processing finishes or fails.

    Returns
    -------
    int
        Total number of chunks successfully saved to the database.
    """
    path = Path(file_path)
    label = format_label(path)
    logger.info("Processing [%s]: %s", label, path.name)

    try:
        # ---- CSV fast-path: stream row-by-row, never load fully -----------
        if path.suffix.lower() == ".csv":
            return await _process_csv_streaming(path, db_session)

        # ---- 1. Extract text (non-CSV) ------------------------------------
        raw_text = load_text_from_file(path)
        if raw_text is None:
            return 0

        logger.info("  -> %s characters extracted from %s", f"{len(raw_text):,}", path.name)

        # ---- 2. Split into chunks ------------------------------------------
        chunks = text_splitter.split_text(raw_text)
        if not chunks:
            logger.warning("No chunks produced – skipping: %s", path.name)
            return 0

        total_chunks = len(chunks)
        total_batches = (total_chunks + BATCH_SIZE - 1) // BATCH_SIZE
        logger.info(
            "  -> %s chunks created (size=%s, overlap=%s) — %s batch(es) of %s",
            total_chunks,
            CHUNK_SIZE,
            CHUNK_OVERLAP,
            total_batches,
            BATCH_SIZE,
        )
        logger.info("  -> Generating embeddings with '%s' via Ollama ...", EMBEDDING_MODEL)

        # ---- 3. Process in batches -----------------------------------------
        saved_total = 0
        now_iso = datetime.now(timezone.utc).isoformat()

        for batch_idx in range(total_batches):
            start = batch_idx * BATCH_SIZE
            end = min(start + BATCH_SIZE, total_chunks)
            batch_texts = chunks[start:end]
            batch_num = batch_idx + 1

            try:
                # Async batch embedding – all chunks in one Ollama call
                vectors: list[list[float]] = await embeddings.aembed_documents(batch_texts)

                # Build ORM objects for the entire batch
                document_objects = [
                    MedicalDocument(
                        id=uuid.uuid4(),
                        content=text,
                        embedding=vector,
                        metadata_={
                            "source_file": path.name,
                            "source_path": str(path),
                            "file_type": path.suffix.lower().lstrip("."),
                            "chunk_index": start + i,
                            "chunk_total": total_chunks,
                            "batch": batch_num,
                            "ingested_at": now_iso,
                        },
                    )
                    for i, (text, vector) in enumerate(zip(batch_texts, vectors))
                ]

                # Bulk insert + commit to free DB locks immediately
                db_session.add_all(document_objects)
                await db_session.commit()

                saved_total += len(document_objects)
                logger.info(
                    "  -> Batch %s/%s committed (%s chunks)",
                    batch_num,
                    total_batches,
                    len(document_objects),
                )

            except Exception:
                logger.exception(
                    "Failed to process batch %s/%s for file %s",
                    batch_num,
                    total_batches,
                    path.name,
                )
                # Roll back the failed batch so the session stays usable
                await db_session.rollback()
                # Continue with the next batch

        logger.info(
            "  -> %s/%s chunks saved to 'medical_documents' table.",
            saved_total,
            total_chunks,
        )
        return saved_total

    finally:
        # ---- 4. Cleanup temporary file on disk -----------------------------
        if cleanup and path.exists():
            try:
                path.unlink()
                logger.info("  -> Cleaned up temp file: %s", path.name)
            except OSError:
                logger.warning("  -> Could not delete temp file: %s", path.name)


# ---------------------------------------------------------------------------
# Directory ingestion (used by the CLI script)
# ---------------------------------------------------------------------------
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
                # CLI-ingested files are not temp uploads — don't delete them
                saved = await process_file_background(
                    str(file_path), session, cleanup=False
                )
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
