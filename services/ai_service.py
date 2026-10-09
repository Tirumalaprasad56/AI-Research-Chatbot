# Re-export key AI functionality for modular convenience
from services.groq_service import (
    generate_report,
    generate_presentation_slides,
    analyze_document_ai,
    ask_document_ai,
    get_groq_client
)
from services.chat_service import ask_ai, ask_document
