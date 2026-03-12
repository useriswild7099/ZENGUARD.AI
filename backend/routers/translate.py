"""
Translation Router - On-demand multilingual support
Uses local LLM to translate content while preserving tone and formatting.
"""

from fastapi import APIRouter, HTTPException
from models.schemas import TranslationRequest, TranslationResponse
from services.ollama_client import OllamaClient

router = APIRouter()
ollama_client = OllamaClient.get_instance()

TRANSLATION_SYSTEM_PROMPT = """
[IDENTITY]
You are a professional, empathetic multilingual translator specializing in mental health and wellbeing content.

[GOAL]
Translate the provided text into the target language while:
1. PRESERVING TONE: Maintain the warmth, empathy, and professional nature of the content.
2. PRESERVING FORMATTING: Keep all Markdown elements (headers, lists, bold text) exactly as they are.
3. CULTURAL SENSITIVITY: Adapt idioms or concepts to be culturally relevant in the target language if necessary, but stay true to the meaning.
4. NON-CLINICAL LANGUAGE: Use natural, accessible words in the target language.

[RESTRICTION]
Respond ONLY with the translated text. No explanations or intro/outro.
"""

@router.post("/translate", response_model=TranslationResponse)
async def translate_content(request: TranslationRequest):
    """
    On-demand translation using local LLM.
    
    Privacy: Ephemeral processing, no data stored.
    """
    try:
        prompt = f"Target Language: {request.target_language}\n\nText to Translate:\n{request.text}"
        
        translated_text = await ollama_client.generate(
            prompt=prompt,
            system_prompt=TRANSLATION_SYSTEM_PROMPT,
            temperature=0.3, # Low temperature for accurate reproduction
            max_tokens=2000
        )
        
        return TranslationResponse(
            translated_text=translated_text.strip(),
            detected_language=None, # Detection can be added if needed
            data_stored=False
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")
