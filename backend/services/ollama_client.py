"""
Ollama Client - Interface to local TherapyLlama-8B model
Production-grade with persistent connection pooling, automatic retries,
dynamic model resolution, and tiered fallback architecture.

FALLBACK HIERARCHY:
- Tier 1: Primary model (configured in settings, e.g., gemma3)
- Tier 2: Any available Ollama model (auto-detected fallback)
- If both fail: raises OllamaUnavailableError for upper layers to handle
"""

import httpx
import json
import asyncio
import socket
import logging
from typing import Optional, Dict, Any, List

from config import settings

logger = logging.getLogger(__name__)


# ─── Custom Exception ─────────────────────────────────────────────────────────

class OllamaUnavailableError(Exception):
    """
    Raised when Ollama is completely unreachable or no models are available.
    
    Upper layers (routers) catch this to trigger Tier 3 (cache) and 
    Tier 4 (pre-written responses) fallbacks.
    """
    pass


# ─── Model Priority for Fallback ──────────────────────────────────────────────

# When the primary model is unavailable, prefer these models in order.
# Smaller models are prioritized for reliability on resource-constrained systems.
FALLBACK_MODEL_PRIORITY = [
    "therapyllama",   # Primary: therapy-fine-tuned model
    "gemma3",         # Same family, different tag
    "gemma2",         # Older but reliable
    "gemma",          # Original
    "llama3.2",       # Small and fast
    "llama3.1",       # Decent fallback
    "llama3",         # Widely available
    "phi3",           # Microsoft's small model
    "phi",            # Even smaller
    "mistral",        # Good quality
    "tinyllama",      # Tiny but functional
    "qwen2",          # Alternative
]


class OllamaClient:
    """Robust Async client for Ollama API with persistent connection pooling
    and automatic model fallback."""
    
    _instance: Optional['OllamaClient'] = None
    
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.base_model_name = settings.OLLAMA_MODEL
        self.resolved_model: Optional[str] = None
        self.fallback_model: Optional[str] = None
        self.max_retries = 3
        self.fallback_retries = 2
        self._available_models: List[str] = []
        
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
        
        # Resolve models on startup
        await self._resolve_best_model()
        await self._resolve_fallback_model()
    
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

    # ─── Model Resolution ─────────────────────────────────────────────────

    async def get_available_models(self) -> List[str]:
        """Fetch all installed models from Ollama."""
        try:
            client = self._get_client(fast=True)
            response = await client.get(f"{self.base_url}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                self._available_models = models
                return models
        except Exception as e:
            logger.warning(f"Failed to fetch Ollama models: {e}")
        return []

    async def _resolve_best_model(self) -> bool:
        """Finds the best matching model dynamically to prevent 404/500 errors."""
        try:
            client = self._get_client(fast=True)
            response = await client.get(f"{self.base_url}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                self._available_models = models
                
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

    async def _resolve_fallback_model(self) -> bool:
        """
        Find the best fallback model from available Ollama models.
        Picks the highest-priority model from FALLBACK_MODEL_PRIORITY
        that is NOT the primary resolved model.
        """
        if not self._available_models:
            await self.get_available_models()
        
        for priority_model in FALLBACK_MODEL_PRIORITY:
            for available in self._available_models:
                # Skip if it's the same as primary
                if available == self.resolved_model:
                    continue
                # Match by prefix (e.g., "llama3" matches "llama3:latest")
                if available.startswith(priority_model) or available == priority_model:
                    self.fallback_model = available
                    logger.info(f"Fallback model resolved: {self.fallback_model}")
                    return True
        
        # If no priority model found, use any model that isn't the primary
        for available in self._available_models:
            if available != self.resolved_model:
                self.fallback_model = available
                logger.info(f"Fallback model (non-priority): {self.fallback_model}")
                return True
        
        logger.warning("No fallback model available")
        return False

    # ─── Health Checks ────────────────────────────────────────────────────

    def is_ollama_alive(self) -> bool:
        """
        Lightweight TCP ping to check if Ollama is running.
        Does NOT require a model — just checks if the port is open.
        """
        try:
            # Parse host and port from base_url
            from urllib.parse import urlparse
            parsed = urlparse(self.base_url)
            host = parsed.hostname or "127.0.0.1"
            port = parsed.port or 11434
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2.0)
            result = sock.connect_ex((host, port))
            sock.close()
            return result == 0
        except Exception:
            return False

    async def health_check(self) -> bool:
        """Check if Ollama is running and model is available."""
        if not self.resolved_model:
            return await self._resolve_best_model()
        return True
    
    # ─── Core Execution Engine ────────────────────────────────────────────

    async def _execute_with_retry(self, payload: dict, fast: bool = False) -> dict:
        """
        Core execution engine with exponential backoff, retries, and 
        automatic fallback to alternative models.
        
        Retry chain:
        1. Try primary model (self.max_retries attempts)
        2. Try fallback model (self.fallback_retries attempts)
        3. Raise OllamaUnavailableError
        """
        # ── Phase 1: Try primary model ──
        primary_error = await self._try_model(
            payload, self.resolved_model, self.max_retries, fast
        )
        
        if primary_error is None:
            # Success — payload was modified in-place with model, response returned via side channel
            return self._last_response  # Set by _try_model
        
        logger.warning(f"Primary model failed: {primary_error}")
        
        # ── Phase 2: Try fallback model ──
        if self.fallback_model and self.fallback_model != self.resolved_model:
            logger.info(f"Attempting fallback model: {self.fallback_model}")
            fallback_error = await self._try_model(
                payload, self.fallback_model, self.fallback_retries, fast
            )
            
            if fallback_error is None:
                return self._last_response
            
            logger.warning(f"Fallback model also failed: {fallback_error}")
        
        # ── Phase 3: Re-resolve models and try once more ──
        # Maybe a new model was pulled while we were retrying
        if await self._resolve_best_model():
            last_chance_error = await self._try_model(
                payload, self.resolved_model, 1, fast
            )
            if last_chance_error is None:
                return self._last_response
        
        # ── All tiers exhausted ──
        raise OllamaUnavailableError(
            f"AI Engine completely unreachable. "
            f"Primary error: {primary_error}"
        )
    
    async def _try_model(
        self, payload: dict, model: Optional[str], 
        max_attempts: int, fast: bool
    ) -> Optional[str]:
        """
        Try executing the payload with a specific model.
        
        Returns None on success (response stored in self._last_response).
        Returns error string on failure.
        """
        if not model:
            # Try to resolve
            if not await self._resolve_best_model():
                return "No model available"
            model = self.resolved_model
        
        payload_copy = {**payload, "model": model}
        client = self._get_client(fast)
        
        last_error = None
        for attempt in range(max_attempts):
            try:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json=payload_copy
                )
                response.raise_for_status()
                self._last_response = response.json()
                return None  # Success
            except httpx.TimeoutException:
                last_error = "Ollama request timed out. The system might be overloaded."
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    self.resolved_model = None  # Force re-resolution
                    return f"Model '{model}' not found (404)"
                last_error = f"Ollama API Error: {e.response.status_code} - {e.response.text}"
            except httpx.ConnectError:
                return "Ollama service is not running"
            except httpx.RequestError as e:
                last_error = f"Connection to AI Engine failed: {str(e)}"
            except Exception as e:
                last_error = f"Unexpected processing error: {str(e)}"
                
            logger.warning(
                f"Ollama call failed (model={model}, attempt {attempt+1}/{max_attempts}): {last_error}"
            )
            if attempt < max_attempts - 1:
                await asyncio.sleep(1.5 * (attempt + 1))
                
        return last_error

    # ─── Public Generation Methods ────────────────────────────────────────
    # Signatures are UNCHANGED — fallback is transparent to callers.

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
