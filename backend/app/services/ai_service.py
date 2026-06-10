"""
ai_service.py – RAG generation for MediPal.

Builds a strict XML-sandboxed prompt from retrieved context, streams the
local Ollama LLM response, and sanitizes known dataset artifacts.
"""

import re
from collections.abc import AsyncGenerator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_ollama import ChatOllama

# ---------------------------------------------------------------------------
# LLM configuration
# ---------------------------------------------------------------------------
CHAT_MODEL = "llama3.2"

llm = ChatOllama(
    model=CHAT_MODEL,
    temperature=0.3,
    streaming=True,
)

_ARTIFACT_PATTERN = re.compile(
    r"Self-care possible.*|Find a .* Near Me.*",
    flags=re.IGNORECASE | re.DOTALL,
)


def build_rag_prompt(context: str, query: str) -> str:
    return (
        "You are a strict clinical AI. You must answer the user's query using "
        "ONLY the provided context.\n"
        "\n"
        f"<context>\n"
        f"{context}\n"
        f"</context>\n"
        "\n"
        f"<user_query>\n"
        f"{query}\n"
        f"</user_query>\n"
        "\n"
        "If the answer is not explicitly in the <context>, reply: "
        "'Insufficient clinical data.' Do not invent sub-classifications."
    )


def sanitize_llm_response(text: str) -> str:
    """Strip known scraped dataset artifacts from the compiled LLM output."""
    return _ARTIFACT_PATTERN.sub("", text).strip()


def _history_to_messages(chat_history: list[dict]) -> list[HumanMessage | AIMessage]:
    messages: list[HumanMessage | AIMessage] = []
    for item in chat_history:
        role = item.get("role") or item.get("sender") or item.get("type")
        content = item.get("content", "")
        if role in ("user", "human"):
            messages.append(HumanMessage(content=content))
        elif role in ("assistant", "ai", "bot"):
            messages.append(AIMessage(content=content))
    return messages


async def generate_medical_response_stream(
    user_message: str,
    context: str,
    chat_history: list[dict] | None = None,
) -> AsyncGenerator[str, None]:
    """
    Stream an LLM reply grounded in retrieved RAG context.

    The model response is buffered, sanitized, then yielded so clients and
    persistence layers only receive artifact-free clinical text.
    """
    prompt = build_rag_prompt(context, user_message)

    messages: list[SystemMessage | HumanMessage | AIMessage] = [
        *_history_to_messages(chat_history or []),
        SystemMessage(content=prompt),
    ]

    raw_chunks: list[str] = []
    async for chunk in llm.astream(messages):
        token = chunk.content
        if token:
            raw_chunks.append(token)

    sanitized = sanitize_llm_response("".join(raw_chunks))
    if sanitized:
        yield sanitized
