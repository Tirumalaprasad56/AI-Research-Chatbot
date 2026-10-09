
import os
from dotenv import load_dotenv

# Load environment variables from the project root .env file
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))


class Config:
    """Central configuration for AI Research Chatbot."""

    # =====================================================
    # FLASK SESSION SECURITY
    # =====================================================

    SECRET_KEY = os.environ.get(
        "SECRET_KEY",
        "ai_research_chatbot_secure_key_2026_xyz"
    )

    # =====================================================
    # GROQ API CONFIGURATION
    # =====================================================

    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

    GROQ_MODEL = os.environ.get(
        "GROQ_MODEL",
        "llama-3.3-70b-versatile"
    )

    GROQ_FALLBACK_MODELS = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "openai/gpt-oss-120b",
        "mixtral-8x7b-32768"
    ]

    # =====================================================
    # FIREBASE CONFIGURATION
    # =====================================================

    # Use the Web API key from your Firebase project.
    # Set FIREBASE_API_KEY in your .env file.
    FIREBASE_API_KEY = os.environ.get("FIREBASE_API_KEY", "").strip()

    FIREBASE_PROJECT_ID = os.environ.get(
        "FIREBASE_PROJECT_ID",
        "ai-research-chatbot"
    )

    # =====================================================
    # DATABASE CONFIGURATION
    # =====================================================

    DATABASE_PATH = os.environ.get(
        "DATABASE_PATH",
        os.path.join(BASE_DIR, "database", "research.db")
    )

    # =====================================================
    # STORAGE FOLDERS
    # =====================================================

    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
    EXPORT_FOLDER = os.path.join(BASE_DIR, "exports")
    PPT_FOLDER = os.path.join(BASE_DIR, "generated_ppt")

    # =====================================================
    # UPLOAD LIMITS AND FORMATS
    # =====================================================

    MAX_CONTENT_LENGTH = 32 * 1024 * 1024  # 32 MB

    ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}

    # =====================================================
    # SESSION COOKIE SECURITY
    # =====================================================

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    SESSION_COOKIE_SECURE = (
        os.environ.get("RENDER", "").lower() == "true"
        or os.environ.get("FLASK_ENV") == "production"
    )

    # =====================================================
    # SERVER CONFIGURATION
    # =====================================================

    PORT = int(os.environ.get("PORT", "5000"))

    DEBUG = os.environ.get(
        "FLASK_DEBUG", "false"
    ).lower() in ("true", "1", "t")

    # =====================================================
    # CREATE REQUIRED DIRECTORIES
    # =====================================================

    @classmethod
    def ensure_directories(cls):
        """Ensure all required runtime directories exist."""

        directories = [
            os.path.dirname(cls.DATABASE_PATH),
            cls.UPLOAD_FOLDER,
            cls.EXPORT_FOLDER,
            cls.PPT_FOLDER
        ]

        for path in directories:
            if path:
                os.makedirs(path, exist_ok=True)
