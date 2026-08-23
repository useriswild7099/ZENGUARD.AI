"""
Pydantic Models/Schemas for API Request/Response
All models are designed for stateless, privacy-first processing
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from enum import Enum


class EmotionType(str, Enum):
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    FEAR = "fear"
    SURPRISE = "surprise"
    DISGUST = "disgust"
    NEUTRAL = "neutral"
    ANXIETY = "anxiety"
    HOPE = "hope"


class InterventionType(str, Enum):
    BREATHING = "breathing"
    GROUNDING = "grounding"
    MEMORY_BOX = "memory_box"
    AFFIRMATION = "affirmation"
    MUSIC = "music"
    JOURNALING = "journaling"


class Emotion(BaseModel):
    """Single emotion with intensity"""
    type: EmotionType
    intensity: float = Field(ge=0, le=1, description="Emotion intensity from 0 to 1")
    
    
class MaskingIndicator(BaseModel):
    """Emotional masking detection result"""
    detected: bool = False
    confidence: float = Field(default=0, ge=0, le=1)
    surface_emotion: Optional[EmotionType] = None
    underlying_emotion: Optional[EmotionType] = None
    indicators: List[str] = []


class Intervention(BaseModel):
    """Recommended self-care intervention"""
    type: InterventionType
    title: str
    description: str
    priority: int = Field(ge=1, le=5, description="1 = highest priority")


class AnalysisRequest(BaseModel):
    """
    Request for sentiment analysis
    Note: Text should be pre-obfuscated on client side
    """
    text: str = Field(
        min_length=1,
        max_length=10000,
        description="Journal entry text (should be obfuscated)"
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Anonymous session ID for trend tracking within session only"
    )


class AnalysisResponse(BaseModel):
    """Full sentiment analysis response"""
    # Wellness Score (inverted risk - higher is better)
    wellness_score: float = Field(ge=0, le=100, description="Overall wellness 0-100")
    confidence: float = Field(ge=0, le=1, description="Analysis confidence")
    
    # Emotional Analysis
    primary_emotion: Emotion
    secondary_emotions: List[Emotion] = []
    emotional_intensity: float = Field(ge=0, le=1)
    
    # Pattern Detection
    masking: MaskingIndicator
    repetition_detected: bool = False
    emotional_shift: Optional[str] = None  # "improving", "declining", "stable"
    
    # Mood Visualization Data
    mood_seed_stage: str = Field(
        description="Plant growth stage: withered, seedling, growing, blooming, flourishing"
    )
    mood_color: str = Field(description="Hex color for mood visualization")
    
    # Interventions
    recommended_interventions: List[Intervention] = []
    supportive_message: str
    
    # Privacy Confirmation
    data_stored: bool = False  # Always False


class QuickCheckRequest(BaseModel):
    """Lightweight request for real-time feedback while typing"""
    text: str = Field(min_length=1, max_length=2000)


class QuickCheckResponse(BaseModel):
    """Lightweight response for real-time feedback"""
    emotional_tone: str  # "positive", "neutral", "concerning"
    intensity: float = Field(ge=0, le=1)
    suggestion: Optional[str] = None


class PersonalityCategory(str, Enum):
    """Categories for AI personalities"""
    GENERAL = "general"
    FAMILY = "family"
    EDUCATION = "education"
    FRIEND = "friend"
    DATING = "dating"
    SPIRITUAL = "spiritual"
    PSYCHOLOGY = "psychology"
    ENTREPRENEUR = "entrepreneur"
    FAMOUS = "famous"
    INDIAN_STARS = "indian_stars"
    PHILOSOPHERS = "philosophers"
    SCIENTISTS = "scientists"
    TOUGH_LOVE = "tough_love"
    CREATIVE = "creative"
    ARCHETYPES = "archetypes"


class ChatMode(str, Enum):
    """AI chat persona modes"""
    # General (existing)
    COMPASSIONATE_FRIEND = "compassionate_friend"
    ACADEMIC_COACH = "academic_coach"
    MINDFULNESS_GUIDE = "mindfulness_guide"
    MOTIVATIONAL_COACH = "motivational_coach"
    
    # Family
    MOTHER = "mother"
    FATHER = "father"
    SISTER = "sister"
    BROTHER = "brother"
    COOL_PARENT = "cool_parent"
    COOL_UNCLE_AUNT = "cool_uncle_aunt"
    GRANDMOTHER = "grandmother"
    GRANDFATHER = "grandfather"
    YOUNGER_SIBLING = "younger_sibling"
    THE_PET = "the_pet"

    # Education
    SCHOOL_TEACHER = "school_teacher"
    UNIVERSITY_PROFESSOR = "university_professor"

    # Friend
    BEST_FRIEND = "best_friend"
    STUDY_PARTNER = "study_partner"
    
    # Dating
    LOVER = "lover"

    # Spiritual
    DALAI_LAMA = "dalai_lama"
    SADGURU = "sadguru"

    # Psychology
    CARL_ROGERS = "carl_rogers"
    SIGMUND_FREUD = "sigmund_freud"
    OPRAH_MENTOR = "oprah_mentor"

    # Entrepreneur
    LOGICAL_MENTOR = "logical_mentor"
    MUKESH_AMBANI = "mukesh_ambani"
    ELON_MENTOR = "elon_mentor"

    # Famous
    BRITTANY_BROSKI = "brittany_broski"
    DELANEY_ROWE = "delaney_rowe"
    ROB_ANDERSON = "rob_anderson"

    # Indian Stars
    ASHISH_CHANCHLANI = "ashish_chanchlani"
    BHUVAN_BAM = "bhuvan_bam"
    SAMEY_RAINA = "samey_raina"
    SHAH_RUKH_KHAN = "shah_rukh_khan"
    ZAKIR_KHAN = "zakir_khan"
    RANVEER_ALLAHBADIA = "ranveer_allahbadia"
    ANKUR_WARIKOO = "ankur_warikoo"

    # Philosophers
    MARCUS_AURELIUS = "marcus_aurelius"
    SOCRATES = "socrates"
    ALAN_WATTS = "alan_watts"
    RUMI = "rumi"

    # Scientists
    ALBERT_EINSTEIN = "albert_einstein"
    APJ_ABDUL_KALAM = "apj_abdul_kalam"
    MARIE_CURIE = "marie_curie"
    STEVE_JOBS = "steve_jobs"

    # Tough Love
    DAVID_GOGGINS = "david_goggins"
    JORDAN_PETERSON = "jordan_peterson"
    STRICT_COACH = "strict_coach"
    GORDON_RAMSAY = "gordon_ramsay"

    # Creative
    THE_POET = "the_poet"
    THE_ARTIST = "the_artist"
    THE_MUSICIAN = "the_musician"
    BOB_ROSS = "bob_ross"

    # Archetypes
    THE_LIBRARIAN = "the_librarian"
    THE_GARDENER = "the_gardener"
    THE_TIME_TRAVELER = "the_time_traveler"
    THE_UNIVERSE = "the_universe"


class ChatMessage(BaseModel):
    """Single chat message"""
    role: str = Field(description="'user' or 'assistant'")
    content: str


class ChatRequest(BaseModel):
    """Request for chat endpoint"""
    message: str = Field(min_length=1, max_length=5000)
    mode: ChatMode = ChatMode.COMPASSIONATE_FRIEND
    session_id: Optional[str] = None
    history: List[ChatMessage] = []
    model: Optional[str] = None



class ChatResponse(BaseModel):
    """Response from chat endpoint"""
    response: str
    mode: ChatMode
    data_stored: bool = False
    fallback_used: bool = False
    fallback_tier: Optional[int] = None  # 1=primary, 2=fallback model, 3=cache, 4=pre-written


class SiaRequest(BaseModel):
    """Request for Sia Navigational Assistant"""
    message: str = Field(min_length=1, max_length=2000)
    context: Optional[str] = Field(default="general", description="Current page or search context")
    history: List[ChatMessage] = []


class SiaResponse(BaseModel):
    """Response from Sia Assistant"""
    response: str
    suggested_action: Optional[str] = None  # e.g., "navigate:knowledge", "open:journal"
    action_payload: Optional[str] = None    # e.g., "sleep-hygiene" (article id)
    data_stored: bool = False
    fallback_used: bool = False


class TranslationRequest(BaseModel):
    """Request for on-demand content translation"""
    text: str = Field(min_length=1)
    target_language: str = Field(description="Target language name or code")


class TranslationResponse(BaseModel):
    """Response from translation engine"""
    translated_text: str
    detected_language: Optional[str] = None
    data_stored: bool = False
    fallback_used: bool = False

