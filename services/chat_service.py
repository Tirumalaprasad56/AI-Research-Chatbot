from services.groq_service import (
    execute_groq_completion,
    ask_document_ai
)


# =====================================
# AI CHAT FUNCTION WITH HISTORY SUPPORT
# =====================================

def ask_ai(message, context=None, history=None):
    """Conversational AI research assistant with context and thread history."""
    if not message or not message.strip():
        return "Please enter a valid research question."

    system_prompt = """You are an advanced AI Research Companion and Academic Copilot.

Your Core Capabilities:
- Answer cutting-edge research, technology, academic, and project questions with depth and clarity.
- Structure your answers rigorously: use clear Markdown headings, bullet points, numbered lists, math notation, and code snippets where appropriate.
- Help students, researchers, and engineers with:
  * Literature surveys & SOTA summaries
  * Research paper analysis & comparative studies
  * Artificial Intelligence, Machine Learning & Data Science algorithms
  * Project architecture, systems design, and tech stack choices
  * Scientific methodology, hypothesis validation, and experimental setup
  * Technical documentation and thesis structuring

Style Guidelines:
- Authoritative, precise, helpful, and academically grounded.
- If a query touches non-research topics, provide a polite, concise response and seamlessly redirect the conversation toward related scientific or technological concepts.
"""

    messages = [{"role": "system", "content": system_prompt}]

    # Append past conversation history if provided
    if history and isinstance(history, list):
        for msg in history[-10:]:  # Keep recent 10 turns to conserve context window
            role = msg.get("role")
            content = msg.get("content")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

    # Add single legacy context if present
    if context and not history:
        messages.append({"role": "assistant", "content": str(context)})

    # Append current user prompt
    messages.append({"role": "user", "content": message.strip()})

    try:
        return execute_groq_completion(messages, temperature=0.35, max_tokens=2500)
    except Exception as e:
        return f"Unable to generate response. Error: {str(e)}"


# =====================================
# DOCUMENT QUESTION ANSWERING ALIAS
# =====================================

def ask_document(document, question):
    """Answer question grounded in document content."""
    try:
        return ask_document_ai(document, question)
    except Exception as e:
        return f"Document analysis error: {str(e)}"