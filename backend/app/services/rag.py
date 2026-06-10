import re
from typing import Any

from langchain_community.embeddings import OllamaEmbeddings
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import MedicalDocument

EMBEDDING_MODEL = "nomic-embed-text"

embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)

_CHUNK_ARTIFACT_PATTERN = re.compile(
    r"(?i)(Self-care possible|Find a .* Near Me|Find a doctor).*"
)


def _sanitize_chunk_content(content: str) -> str:
    return _CHUNK_ARTIFACT_PATTERN.sub("", content).strip()


def _document_source_title(content: str) -> str:
    return f"{content[:45].replace('\n', ' ')}..."


def _document_source_metadata(doc: MedicalDocument, cleaned_content: str) -> dict[str, Any]:
    return {
        "id": str(doc.id),
        "title": _document_source_title(cleaned_content),
    }


async def retrieve_relevant_context(
    query: str,
    db: AsyncSession,
    limit: int = 5,
) -> tuple[str, list[dict[str, Any]]]:
    query_embedding: list[float] = await embeddings.aembed_query(
        f"search_query: {query}"
    )

    stmt = (
        select(MedicalDocument)
        .order_by(MedicalDocument.embedding.cosine_distance(query_embedding))
        .limit(limit)
    )
    result = await db.execute(stmt)
    documents = result.scalars().all()

    cleaned_chunks = [_sanitize_chunk_content(doc.content) for doc in documents]
    context = "\n\n".join(cleaned_chunks)
    sources = [
        _document_source_metadata(doc, cleaned)
        for doc, cleaned in zip(documents, cleaned_chunks)
    ]

    return context, sources
