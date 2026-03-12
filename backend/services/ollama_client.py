"""
Ollama Client - Interface to local Gemma 3 model
Production-grade with persistent connection pooling, automatic retries,
and dynamic model resolution.
"""

import httpx
import json
import asyncio
import logging
from typing import Optional, Dict, Any

from config import settings

logger = logging.getLogger(__name__)


class OllamaClient:
    """Robust Async client for Ollama API with persistent connection pooling."""
    
    _instance: Optional['OllamaClient'] = None
    
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.base_model_name = settings.OLLAMA_MODEL
        self.resolved_model: Optional[str] = None
        self.max_retries = 3
        
        # Persistent clients — created once, reused across all requests
        self._client: Optional[httpx.AsyncClient] = None
        self._fast_client: Optional[httpx.AsyncClient] = None
    
    @classmethod
    def get_instance(cls) -> 'OllamaClient':
        """Singleton accessor — ensures one client across the entire app."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    async def startup(self):
        """Initialize persistent HTTP clients. Call once on app startup."""
        if self._client is None:
            limits = httpx.Limits(
                max_keepalive_connections=20,
                max_connections=50,
                keepalive_expiry=30.0
            )
            self._client = httpx.AsyncClient(
                limits=limits,
                timeout=httpx.Timeout(120.0, connect=5.0)
            )
            self._fast_client = httpx.AsyncClient(
                limits=limits,
                timeout=httpx.Timeout(30.0, connect=3.0)
            )
            logger.info("Ollama HTTP clients initialized with connection pooling.")
        
        # Resolve model on startup
        await self._resolve_best_model()
    
    async def shutdown(self):
        """Close persistent HTTP clients. Call on app shutdown."""
        if self._client:
            await self._client.aclose()
            self._client = None
        if self._fast_client:
            await self._fast_client.aclose()
            self._fast_client = None
        logger.info("Ollama HTTP clients closed.")
    
    def _get_client(self, fast: bool = False) -> httpx.AsyncClient:
        """Get the appropriate persistent client."""
        client = self._fast_client if fast else self._client
        if client is None:
            # Fallback: create a one-off client if startup wasn't called
            return httpx.AsyncClient(
                timeout=httpx.Timeout(30.0 if fast else 120.0, connect=5.0)
            )
        return client

    async def _resolve_best_model(self) -> bool:
        """Finds the best matching model dynamically to prevent 404/500 errors."""
        try:
            client = self._get_client(fast=True)
            response = await client.get(f"{self.base_url}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                
                # Try exact match first
                if self.base_model_name in models:
                    self.resolved_model = self.base_model_name
                    return True
                
                # Check for base name match (e.g., config is 'gemma3', found 'gemma3:latest')
                for m in models:
                    if m.startswith(self.base_model_name):
                        self.resolved_model = m
                        return True
                
                logger.warning(f"Required base model '{self.base_model_name}' not found in {models}")
            else:
                logger.warning(f"Ollama tags endpoint returned {response.status_code}")
            return False
        except Exception as e:
            logger.warning(f"Ollama model resolution failed: {e}")
            return False

    async def health_check(self) -> bool:
        """Check if Ollama is running and model is available."""
        if not self.resolved_model:
            return await self._resolve_best_model()
        return True
    
    async def _execute_with_retry(self, payload: dict, fast: bool = False) -> dict:
        """Core execution engine with exponential backoff and retries."""
        if not self.resolved_model:
            if not await self._resolve_best_model():
                raise Exception("Ollama model not found or service unreachable.")
                
        payload["model"] = self.resolved_model
        client = self._get_client(fast)
        
        last_error = None
        for attempt in range(self.max_retries):
            try:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json=payload
                )
                response.raise_for_status()
                return response.json()
            except httpx.TimeoutException:
                last_error = "Ollama request timed out. The system might be overloaded."
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    self.resolved_model = None  # Force re-resolution
                last_error = f"Ollama API Error: {e.response.status_code} - {e.response.text}"
            except httpx.RequestError as e:
                last_error = f"Connection to AI Engine failed: {str(e)}"
            except Exception as e:
                last_error = f"Unexpected processing error: {str(e)}"
                
            logger.warning(f"Ollama call failed (attempt {attempt+1}/{self.max_retries}): {last_error}")
            if attempt < self.max_retries - 1:
                await asyncio.sleep(1.5 * (attempt + 1))
                
        raise Exception(f"AI Engine unresponsive after {self.max_retries} attempts. Last error: {last_error}")

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 512,
        fast: bool = False
    ) -> str:
        """Generate text response with high reliability."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "repeat_penalty": 1.15,
                "top_p": 0.9,
                "top_k": 40
            }
        }
        
        data = await self._execute_with_retry(payload, fast)
        return data.get("message", {}).get("content", "")

    async def generate_chat(
        self,
        messages: list,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 512,
        fast: bool = False
    ) -> str:
        """Generate response from a structured message list (multi-turn)."""
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)
        
        payload = {
            "messages": full_messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "repeat_penalty": 1.15,
                "top_p": 0.9,
                "top_k": 40
            }
        }
        
        data = await self._execute_with_retry(payload, fast)
        return data.get("message", {}).get("content", "")
    
    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1
    ) -> Dict[str, Any]:
        """Generate structured JSON precisely."""
        json_system = (system_prompt or "") + "\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown formatting or explanations."
        
        response_text = await self.generate(
            prompt=prompt,
            system_prompt=json_system,
            temperature=temperature,
            fast=True
        )
        
        cleaned = response_text.strip()
        if cleaned.startswith("```json"): cleaned = cleaned[7:]
        if cleaned.startswith("```"): cleaned = cleaned[3:]
        if cleaned.endswith("```"): cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\{[^{}]*\}', cleaned, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass
            return {}
            
    async def generate_multimodal(
        self,
        prompt: str,
        image_base64: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1024
    ) -> str:
        """Process multimodal inputs securely."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
            
        messages.append({
            "role": "user",
            "content": prompt,
            "images": [image_base64]
        })
        
        payload = {
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            }
        }
        
        data = await self._execute_with_retry(payload)
        return data.get("message", {}).get("content", "")
