"""
Chat Router - Conversational AI endpoints
Handles multi-turn conversations with different AI personas
"""

from fastapi import APIRouter, HTTPException

from models.schemas import ChatRequest, ChatResponse, ChatMode, ChatMessage
from services.ollama_client import OllamaClient
from privacy.text_obfuscator import TextObfuscator

from services.knowledge_base import kb
from prompts import (
    MODE_PROMPTS,
    MODE_INFO,
    HUMAN_REALITY_FILTER,
    COUNSELING_PRINCIPLES
)

router = APIRouter()

# Shared singletons
text_obfuscator = TextObfuscator()


@router.get("/modes")
async def get_chat_modes():
    """Get available chat modes with their info"""
    return {
        "modes": [
            {
                "id": mode.value,
                "name": info["name"],
                "emoji": info["emoji"],
                "description": info["description"],
                "category": info.get("category", "general"),
                "color": info.get("color", "purple"),
                "image": info.get("image")
            }
            for mode, info in MODE_INFO.items()
        ]
    }


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send a message to the AI in the selected mode
    
    Privacy: No conversation data is stored. Processing is ephemeral.
    """
    try:
        # Get shared client
        ollama_client = OllamaClient.get_instance()
        
        # Obfuscate user message for privacy
        obfuscated_message = text_obfuscator.obfuscate(request.message)
        
        # RAG Context Injection (only for substantive queries)
        rag_context = ""
        if len(obfuscated_message.split()) > 5:
            results = kb.search(obfuscated_message, limit=1)
            if results:
                rag_context = f"\n[COUNSELING MANUAL REFERENCE (Page {results[0]['page']})]:\n{results[0]['content']}\n"
                print(f"  RAG Hit: Found reference on Page {results[0]['page']}")

        # Construct System Prompt - Personality FIRST
        personality_prompt = MODE_PROMPTS.get(request.mode, MODE_PROMPTS[ChatMode.COMPASSIONATE_FRIEND])
        
        # Build system prompt: Reality Filter (Constraints) + Personality (Behavior)
        system_prompt = f"{HUMAN_REALITY_FILTER}\n\n[YOUR PRIMARY PERSONALITY]:\n{personality_prompt}"
        
        # Add RAG context ONLY if substantive
        if rag_context and len(obfuscated_message.split()) > 3:
            system_prompt += f"\n\n[SITUATIONAL KNOWLEDGE]:\n{rag_context}\n(Use this only if relevant to the user's specific problem.)"
        
        # Solution/Perspective Transition Logic
        if len(request.history) >= 4:
            system_prompt += "\n\n[DIRECTIVE]: You have enough context. DO NOT ask more questions. Transition to offering a solid perspective, a relevant story, or a character-specific solution that matches the user's current mood/energy."
        
        # Build proper structured messages for Ollama (not raw text concat)
        messages = []
        for msg in request.history[-10:]:  # Keep last 10 messages for context window management
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Add current user message
        messages.append({
            "role": "user",
            "content": obfuscated_message
        })
        
        # Generate response using structured multi-turn
        response = await ollama_client.generate_chat(
            messages=messages,
            system_prompt=system_prompt,
            temperature=0.8,
            max_tokens=384  # Increased from 256 for richer persona responses
        )
        
        return ChatResponse(
            response=response.strip(),
            mode=request.mode,
            data_stored=False
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@router.delete("/chat/clear")
async def clear_chat():
    """
    Clear chat context (client-side only, nothing stored server-side)
    Returns confirmation for UI update
    """
    return {"message": "Chat cleared", "data_stored": False}
