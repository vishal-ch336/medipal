"""
ai_service.py – RAG business logic for MediPal.

Converts a user's medical question into a vector, retrieves the most
relevant chunks from the medical_documents table via cosine similarity,
constructs a grounded prompt, and streams the LLM response token-by-token.
"""

from collections.abc import AsyncGenerator

from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import MedicalDocument

# ---------------------------------------------------------------------------
# LLM & Embedding configuration
# ---------------------------------------------------------------------------
CHAT_MODEL = "llama3.2"
EMBEDDING_MODEL = "nomic-embed-text"  # 768-dim, matches Vector(768)
TOP_K = 3  # number of context chunks to retrieve

llm = ChatOllama(
    model=CHAT_MODEL,
    temperature=0.3,       # low creativity – prefer factual answers
    streaming=True,
)

embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)

# ---------------------------------------------------------------------------
# System prompt template
# ---------------------------------------------------------------------------
SYSTEM_PROMPT_TEMPLATE = """\
You are MediPal, an AI-powered medical assistant.
Your purpose is to provide helpful, evidence-based health information.

## Rules
1. Base your answers **strictly** on the CONTEXT provided below.
2. If the context does not contain enough information to answer the \
question, say so honestly – do NOT make up medical facts.
3. Use clear, empathetic language that a patient can understand.
4. When relevant, suggest the user consult a specialist and mention \
what kind of specialist would be appropriate.
5. Structure your response with short paragraphs or bullet points for \
readability.

## CONTEXT (retrieved from verified medical documents)
{context}

## IMPORTANT DISCLAIMER
⚠️ This information is for **educational purposes only** and does NOT \
constitute professional medical advice, diagnosis, or treatment. \
Always consult a qualified healthcare provider for medical concerns.
"""


# ---------------------------------------------------------------------------
# Helper: retrieve top-K relevant document chunks
# ---------------------------------------------------------------------------
async def _retrieve_context(
    query_vector: list[float],
    db: AsyncSession,
    top_k: int = TOP_K,
) -> list[str]:
    """Return the text content of the *top_k* most similar documents."""

    stmt = (
        select(MedicalDocument.content)
        .order_by(MedicalDocument.embedding.cosine_distance(query_vector))
        .limit(top_k)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return list(rows)


# ---------------------------------------------------------------------------
# Public API: streaming RAG response
# ---------------------------------------------------------------------------
async def generate_medical_response_stream(
    user_message: str,
    db_session: AsyncSession,
) -> AsyncGenerator[str, None]:
    """
    End-to-end RAG pipeline that yields response text chunks.

    1. Embed the user's query.
    2. Retrieve the top-K most relevant medical document chunks.
    3. Build a grounded system prompt with the retrieved context.
    4. Stream the LLM reply, yielding each token as it arrives.
    """

    # ---- 1. Vectorise the user query --------------------------------------
    query_vector: list[float] = await embeddings.aembed_query(user_message)

    # ---- 2. Retrieve relevant context from the vector store ---------------
    context_chunks = await _retrieve_context(query_vector, db_session)

    if context_chunks:
        context_block = "\n\n---\n\n".join(context_chunks)
    else:
        context_block = (
            "No relevant medical documents were found in the knowledge base. "
            "Answer to the best of your general medical knowledge while "
            "clearly stating that the information is general."
        )

    # ---- 3. Construct the prompt ------------------------------------------
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(context=context_block)

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_message),
    ]

    # ---- 4. Stream the LLM response --------------------------------------
    async for chunk in llm.astream(messages):
        # chunk is an AIMessageChunk; its .content is a string fragment
        token = chunk.content
        if token:
            yield token
