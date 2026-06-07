from fastapi import APIRouter, WebSocket
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    conversationHistory: List[Dict[str, Any]]

class ChatResponse(BaseModel):
    response: str
    severity: str

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    return ChatResponse(
        response=f"Solution: This is a simulated response to your message: '{request.message}'. The backend is successfully rewired!",
        severity="low"
    )

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Message text was: {data}")