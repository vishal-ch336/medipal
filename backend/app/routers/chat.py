import json
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, resolve_user_from_token
from app.models.chat_history import ChatMessage
from app.models.user import User
from app.services.ai_service import (
    generate_medical_response_stream,
    sanitize_llm_response,
)
from app.services.rag import retrieve_relevant_context

logger = logging.getLogger(__name__)

router = APIRouter()

POLICY_VIOLATION_CODE = 1008


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    message: str
    conversationHistory: list[dict] = []


class ChatResponse(BaseModel):
    response: str
    severity: str


class ChatMessageOut(BaseModel):
    id: uuid.UUID
    sender: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# POST /chat/ – synchronous-style JSON reply
# ---------------------------------------------------------------------------
@router.post("/", response_model=ChatResponse)
async def post_chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Accept a user message, run the full RAG pipeline, and return the
    complete response as JSON.
    """
    context, _sources = await retrieve_relevant_context(request.message, db)
    chunks: list[str] = []
    async for token in generate_medical_response_stream(
        request.message,
        context,
        request.conversationHistory,
    ):
        chunks.append(token)

    full_response = sanitize_llm_response("".join(chunks))
    return ChatResponse(response=full_response, severity="low")


# ---------------------------------------------------------------------------
# GET /chat/history – authenticated chat history
# ---------------------------------------------------------------------------
@router.get("/history", response_model=list[ChatMessageOut])
async def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the logged-in user's chat messages, oldest first."""
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.asc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


# ---------------------------------------------------------------------------
# WebSocket /chat/ws – authenticated real-time streaming
# ---------------------------------------------------------------------------
@router.websocket("/ws")
async def chat_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream RAG response tokens to the client over a WebSocket.

    Requires a valid JWT passed as the ``token`` query parameter.
    Persists each user message and the completed AI reply to chat_messages.
    """
    current_user = await resolve_user_from_token(token, db)
    if current_user is None:
        await websocket.close(
            code=POLICY_VIOLATION_CODE,
            reason="Invalid or expired token",
        )
        return

    await websocket.accept()

    try:
        while True:
            user_message = await websocket.receive_text()

            # 1. Persist the incoming user message
            db.add(
                ChatMessage(
                    user_id=current_user.id,
                    sender="user",
                    content=user_message,
                )
            )
            await db.flush()

            # 2. Retrieve verified context and source metadata from the vector store
            context, sources = await retrieve_relevant_context(user_message, db)

            # 3–4. Generate, sanitize, and stream the grounded AI response
            response_chunks: list[str] = []
            async for token_chunk in generate_medical_response_stream(
                user_message,
                context,
            ):
                response_chunks.append(token_chunk)
                await websocket.send_text(token_chunk)

            final_response = sanitize_llm_response("".join(response_chunks))

            # 5. Persist the completed AI reply
            db.add(
                ChatMessage(
                    user_id=current_user.id,
                    sender="ai",
                    content=final_response,
                )
            )
            await db.commit()

            await websocket.send_text(
                json.dumps({"type": "sources", "data": sources})
            )
            await websocket.send_text("[DONE]")

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected (user_id=%s).", current_user.id)
    except Exception:
        await db.rollback()
        logger.exception(
            "WebSocket error for user_id=%s", current_user.id
        )
        await websocket.close(code=1011, reason="Internal server error")
