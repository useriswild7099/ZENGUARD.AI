"""
Chat Router - Conversational AI endpoints
Handles multi-turn conversations with different AI personas

FALLBACK CHAIN:
- Tier 1+2: Ollama (primary + fallback model) — handled by OllamaClient
- Tier 3: Response cache — cached previous AI responses
- Tier 4: Pre-written persona responses — hardcoded last resort
"""

from fastapi import APIRouter, HTTPException
import asyncio

from models.schemas import ChatRequest, ChatResponse, ChatMode, ChatMessage
from services.ollama_client import OllamaClient, OllamaUnavailableError
from services.response_cache import response_cache
from services.fallback_responses import get_response as get_fallback_response
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
    
    Fallback chain:
    - Tier 1+2: Live Ollama response (primary + fallback models)
    - Tier 3: Cached response from previous similar queries
    - Tier 4: Pre-written persona-specific response
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
        
        # ── Try Tier 1+2: Live Ollama ──
        try:
            response = await ollama_client.generate_chat(
                messages=messages,
                system_prompt=system_prompt,
                temperature=0.8,
                max_tokens=384  # Increased from 256 for richer persona responses
            )
            
            # Success — write to cache asynchronously (fire-and-forget)
            asyncio.create_task(
                _cache_response_async(request.mode, request.message, response.strip())
            )
            
            return ChatResponse(
                response=response.strip(),
                mode=request.mode,
                data_stored=False,
                fallback_used=False,
                fallback_tier=1,
            )
            
        except OllamaUnavailableError:
            # Ollama completely offline — fall through to cache/fallback
            pass
        
        # ── Tier 3: Try cache ──
        cached = response_cache.get_chat_response(request.mode, request.message)
        if cached:
            return ChatResponse(
                response=cached,
                mode=request.mode,
                data_stored=False,
                fallback_used=True,
                fallback_tier=3,
            )
        
        # ── Tier 4: Pre-written fallback ──
        fallback = get_fallback_response(request.mode, request.message)
        return ChatResponse(
            response=fallback,
            mode=request.mode,
            data_stored=False,
            fallback_used=True,
            fallback_tier=4,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


async def _cache_response_async(mode: str, query: str, response: str):
    """Write response to cache in the background. Failures are silent."""
    try:
        response_cache.put_chat_response(mode, query, response)
    except Exception:
        pass  # Cache failures should never crash the main flow


@router.delete("/chat/clear")
async def clear_chat():
    """
    Clear chat context (client-side only, nothing stored server-side)
    Returns confirmation for UI update
    """
    return {"message": "Chat cleared", "data_stored": False}
