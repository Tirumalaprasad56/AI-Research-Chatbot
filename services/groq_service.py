import os
import json
import re
import unicodedata
from groq import Groq
from config import Config


# =====================================
# GROQ CLIENT INITIALIZATION
# =====================================

_client = None

def get_groq_client():
    """Lazy initialize and retrieve Groq client."""
    global _client
    if _client is None:
        api_key = Config.GROQ_API_KEY
        if not api_key:
            raise ValueError("GROQ_API_KEY is missing. Please set it in your environment or .env file.")
        _client = Groq(api_key=api_key)
    return _client


def clean_unicode_output(text):
    """Clean and normalize output string for safe terminal, file, and web rendering."""
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    # Replace troublesome characters for Windows console and PDF rendering
    text = text.replace("\u2011", "-").replace("\u00a0", " ")
    return text



def execute_groq_completion(messages, temperature=0.3, max_tokens=8192, preferred_model=None):
    """Execute Groq chat completion with automatic model fallback."""
    client = get_groq_client()

    models_to_try = []

    if preferred_model:
        models_to_try.append(preferred_model)

    if Config.GROQ_MODEL not in models_to_try:
        models_to_try.append(Config.GROQ_MODEL)

    for model in Config.GROQ_FALLBACK_MODELS:
        if model not in models_to_try:
            models_to_try.append(model)

    last_error = None

    for model in models_to_try:
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_completion_tokens=max_tokens
            )

            content = response.choices[0].message.content or ""

            print(f"Groq model: {model}")
            print(f"Finish reason: {response.choices[0].finish_reason}")
            print(f"Output tokens: {response.usage.completion_tokens}")

            if response.choices[0].finish_reason == "length":
                print(
                    "WARNING: Groq reached the output token limit. "
                    "Consider section-by-section document analysis."
                )

            return clean_unicode_output(content)

        except Exception as e:
            last_error = e
            print(f"Groq model {model} failed: {e}")
            continue

    raise Exception(
        f"Groq API completion failed across all available models: {last_error}"
    )

# =====================================
# GENERATE RESEARCH REPORT
# =====================================

def generate_report(topic):
    """Generate an extensive, rigorous academic research report in Markdown."""
    if not topic or not topic.strip():
        return "Please provide a valid research topic."

    topic = topic.strip()

    prompt = f"""
You are an elite AI Research Scientist and Principal Investigator.
Your task is to write a comprehensive, rigorous academic literature survey and research report.

Research Topic:
{topic}

Structure your response strictly in Markdown with these standardized sections:

# Comprehensive Research Report: {topic}

## 1. Executive Abstract
A dense 150-250 word synthesis of the field, primary breakthroughs, and current state.

## 2. Introduction & Background
- **Context & Motivation**: Why this domain matters today.
- **Problem Formulation**: Fundamental challenges being addressed.
- **Historical Evolution**: Key milestones leading to modern approaches.

## 3. Core Architecture & Technological Foundations
Detailed breakdown of technical mechanisms, algorithms, models, or equations/formulations.

## 4. State of the Art (SOTA) Literature Survey
Review the leading approaches, models, or empirical benchmarks published in recent research.

## 5. Existing Systems & Comparative Analysis
Compare prevailing methodologies, architectures, and standard libraries. Highlight operational trade-offs (compute, latency, accuracy, cost).

## 6. Critical Research Gaps
Specific open problems that prevailing systems fail to resolve.

## 7. Proposed Innovative Framework
A conceptual proposal or reference architecture designed to tackle the identified research gaps.

## 8. Detailed Methodology & Workflow
Step-by-step implementation roadmap from data collection to deployment and evaluation.

## 9. Real-World Applications & Industry Impact
Concrete domain use cases (healthcare, enterprise, robotics, finance, etc.).

## 10. Challenges, Ethical Dimensions & Limitations
Hardware constraints, safety, reproducibility, bias, and practical deployment barriers.

## 11. Future Research Roadmap
High-potential directions for the next 3-5 years.

## 12. Conclusion
A succinct concluding perspective.

## 13. Academic References
List at least 5 realistic, high-impact scholarly references formatted in APA style.

---
Guidelines:
- Write in authoritative, publishable academic tone.
- Include structured Markdown tables, bullet cards, and callout quotes where helpful.
"""

    messages = [
        {"role": "system", "content": "You are a distinguished research scientist and academic writer."},
        {"role": "user", "content": prompt}
    ]

    return execute_groq_completion(messages, temperature=0.35, max_tokens=3500)


# =====================================
# GENERATE PRESENTATION SLIDES (STRUCTURED)
# =====================================


# =====================================
# GENERATE PRESENTATION SLIDES (STRUCTURED)
# =====================================

def generate_presentation_slides(topic, slide_count=8, theme="Modern"):
    """Generate detailed slide content with JSON parsing and fallback handling."""

    topic = topic.strip()

    try:
        count = int(slide_count)
        if count < 3 or count > 25:
            count = 8
    except (ValueError, TypeError):
        count = 8

    prompt = f"""
You are an expert academic presentation designer and technical subject-matter expert.

Create a detailed, informative, professional PowerPoint presentation.

TOPIC: {topic}
NUMBER OF SLIDES: {count}
THEME: {theme}

CONTENT REQUIREMENTS:
1. Generate exactly {count} slides.
2. Every slide must explain meaningful concepts, not just list keywords.
3. Provide 4-5 detailed points per slide, normally 20-35 words each.
4. Explain what each concept means, how it works, and why it matters.
5. Include relevant examples, applications, comparisons, and technical details.
6. For methodology slides, explain the workflow step by step.
7. For architecture slides, explain the components and their interactions.
8. For results slides, explain findings and their significance.
9. Do not repeat content or use vague filler.
10. Never invent statistics, experimental results, or citations.
11. The first slide introduces the topic, objectives, and scope.
12. The final slide presents conclusions and key takeaways.
13. Keep slide content informative but readable.
14. Put additional explanations and examples in speaker_notes.
15. Generate exactly {count} slide objects.

OUTPUT FORMAT:
Return ONLY a valid JSON array. Do not use Markdown code fences.

Each object must follow this structure:
{{
    "title": "Descriptive slide title",
    "subtitle": "Short slide context",
    "points": [
        "Detailed explanatory point one",
        "Detailed explanatory point two",
        "Detailed explanatory point three",
        "Detailed explanatory point four"
    ],
    "speaker_notes": "Additional explanation and examples for the presenter."
}}

Ensure the output is valid JSON with double quotes and no trailing commas.
"""

    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert presentation designer. "
                "Generate informative slides and return only valid JSON."
            )
        },
        {
            "role": "user",
            "content": prompt
        }
    ]

    # IMPORTANT: Keep this indentation at four spaces inside the function.
    raw_response = execute_groq_completion(
        messages,
        temperature=0.3,
        max_tokens=8192
    )

    # -------------------------------------
    # EXTRACT AND PARSE JSON
    # -------------------------------------

    slides = []

    # Remove optional Markdown code fences.
    cleaned_response = raw_response.strip()
    cleaned_response = re.sub(
        r"^```(?:json)?\s*",
        "",
        cleaned_response,
        flags=re.IGNORECASE
    )
    cleaned_response = re.sub(
        r"\s*```$",
        "",
        cleaned_response
    ).strip()

    # First, try parsing the complete response.
    try:
        parsed = json.loads(cleaned_response)
        if isinstance(parsed, list):
            slides = parsed
    except (json.JSONDecodeError, TypeError):
        pass

    # If necessary, locate the JSON array in the response.
    if not slides:
        start = cleaned_response.find("[")
        end = cleaned_response.rfind("]")

        if start != -1 and end > start:
            json_text = cleaned_response[start:end + 1]

            try:
                parsed = json.loads(json_text)
                if isinstance(parsed, list):
                    slides = parsed
            except json.JSONDecodeError:
                pass

    # -------------------------------------
    # FALLBACK PARSER
    # -------------------------------------

    if not slides:
        current = None
        fallback_slides = []

        for line in raw_response.splitlines():
            line = line.strip()

            if not line:
                continue

            clean_line = re.sub(r"^[#*\-\s]+", "", line)

            if (
                clean_line.lower().startswith("slide ")
                or clean_line.lower().startswith("title:")
            ):
                if current and current.get("title"):
                    fallback_slides.append(current)

                if ":" in clean_line:
                    title_value = clean_line.split(":", 1)[1].strip()
                else:
                    title_value = clean_line

                current = {
                    "title": title_value or f"Slide {len(fallback_slides) + 1}",
                    "subtitle": topic,
                    "points": [],
                    "speaker_notes": ""
                }

            elif current and clean_line.startswith(
                ("-", "•", "*", "1.", "2.", "3.", "4.", "5.")
            ):
                point = re.sub(
                    r"^(?:[-*•]|\d+[.)])\s*",
                    "",
                    clean_line
                ).strip()

                if point:
                    current["points"].append(point)

        if current and current.get("title"):
            fallback_slides.append(current)

        slides = fallback_slides

    # -------------------------------------
    # VALIDATE SLIDE DATA
    # -------------------------------------

    valid_slides = []

    for item in slides:
        if not isinstance(item, dict):
            continue

        slide_title = str(item.get("title", "")).strip()

        if not slide_title:
            continue

        points = item.get("points", [])

        if isinstance(points, str):
            points = [points]

        if not isinstance(points, list):
            points = []

        points = [
            str(point).strip()
            for point in points
            if point is not None and str(point).strip()
        ]

        valid_slides.append({
            "title": slide_title,
            "subtitle": str(item.get("subtitle", "")),
            "points": points,
            "speaker_notes": str(item.get("speaker_notes", ""))
        })

    slides = valid_slides

    # -------------------------------------
    # MINIMAL FALLBACK
    # -------------------------------------

    if not slides:
        slides = [
            {
                "title": topic,
                "subtitle": "Executive Overview",
                "points": [
                    f"Introduction to {topic} and its main objectives.",
                    "Explain the fundamental concepts and their importance.",
                    "Discuss practical applications and current challenges.",
                    "Summarize potential solutions and future directions."
                ],
                "speaker_notes": (
                    f"Introduce {topic}, explain its relevance, "
                    "and outline what the audience will learn."
                )
            },
            {
                "title": "Core Concepts and Foundations",
                "subtitle": "Technical Background",
                "points": [
                    "Explain the essential concepts and terminology.",
                    "Describe how the main components work together.",
                    "Discuss relevant methods and practical examples.",
                    "Identify important considerations and limitations."
                ],
                "speaker_notes": "Expand on the fundamental concepts with examples."
            },
            {
                "title": "Challenges and Solutions",
                "subtitle": "Critical Analysis",
                "points": [
                    "Identify the main technical and practical challenges.",
                    "Explain why these challenges occur.",
                    "Compare potential approaches and their trade-offs.",
                    "Describe appropriate mitigation strategies."
                ],
                "speaker_notes": "Discuss the challenges and explain the reasoning behind possible solutions."
            },
            {
                "title": "Conclusion and Future Directions",
                "subtitle": "Key Takeaways",
                "points": [
                    "Summarize the most important concepts.",
                    "Highlight practical implications and applications.",
                    "Identify remaining challenges and opportunities.",
                    "Present clear recommendations for future work."
                ],
                "speaker_notes": "Conclude with the most important lessons and future opportunities."
            }
        ]

    # Do not silently return an unexpectedly short deck.
    # A truncated or invalid response should be investigated rather than
    # pretending the requested number of slides was generated.
    if len(slides) != count:
        print(
            f"Warning: Requested {count} slides, "
            f"but parsed {len(slides)} slides from Groq."
        )

    return slides

# =====================================
# AI DOCUMENT ANALYZER (12 MODES)
# =====================================

ANALYSIS_PROMPTS = {
    "summary": "Provide a comprehensive Executive Summary of this research document. Outline the core objective, main methodology, primary findings, and practical implications in well-structured paragraphs with bold highlights.",
    
    "keywords": "Extract and explain the 10-15 most significant technical and academic keywords from this document. Format as a table or structured list with: Keyword, Domain Definition, and Relevance to this document.",
    
    "points": "Synthesize the 10 most critical takeaways and key findings from this document. Present them as clear, impactful bullet points categorized by theme.",
    
    "abstract": "Draft a publication-grade Academic Abstract for this document (approx. 200 words), following the standard structure: Background, Problem Statement, Methodology, Results, and Conclusion.",
    
    "quiz": "Generate an interactive 10-question quiz based on this document. Include a mix of conceptual multiple-choice questions (with options A-D) and analytical short-answer questions. Provide an Answer Key with explanations at the bottom.",
    
    "interview": "Generate 10 technical viva / interview questions based on this document, suitable for a technical interview or thesis defense. For each question, provide a model candidate answer and key criteria the interviewer looks for.",
    
    "concepts": "Identify the 5-7 most complex theoretical or technical concepts in this document. Explain each concept in plain language, followed by a relatable real-world analogy and why it matters.",
    
    "novelty": "Analyze the core novelty of this work: What is genuinely new or innovative compared to previous literature? Highlight novel algorithms, unique datasets, unexpected empirical results, or architectural improvements.",
    
    "gap": "Identify and critique the Research Gaps: What problems remain unaddressed by this document? What are the unresolved edge cases, unexamined assumptions, or scalability questions?",
    
    "methodology": "Provide a detailed step-by-step breakdown of the Methodology and experimental workflow described in this document. Diagram the conceptual pipeline and explain data preparation, modeling, and evaluation metrics.",
    
    "limitations": "Conduct a critical assessment of the Limitations, constraints, and threats to validity in this document (e.g. dataset bias, computational requirements, generalizability, statistical assumptions).",
    
    "future": "Synthesize the Future Research Directions suggested by this document or emerging from its conclusions. What should the next generation of researchers investigate?"
}

def analyze_document_ai(content, analysis_type):
    """Run specialized AI research analysis on document content."""
    if not content or not content.strip():
        return "The document contains no readable text to analyze."

    instruction = ANALYSIS_PROMPTS.get(analysis_type.lower())
    if not instruction:
        instruction = ANALYSIS_PROMPTS["summary"]

    # Budget document content to fit comfortably within context limits (approx 15,000 words / 60k chars)
    budgeted_content = content.strip()
    if len(budgeted_content) > 65000:
        budgeted_content = budgeted_content[:65000] + "\n\n[Document truncated for length...]"

    prompt = f"""
You are an expert academic peer-reviewer and AI Research Specialist.

Task:
{instruction}

Document Content:
\"\"\"
{budgeted_content}
\"\"\"

Output format: Professional Markdown with headers, bullet points, and tables where appropriate.
"""

    messages = [
        {"role": "system", "content": "You are an elite academic peer reviewer and research analyst."},
        {"role": "user", "content": prompt}
    ]

    return execute_groq_completion(messages, temperature=0.3, max_tokens=3000)


# =====================================
# DOCUMENT QUESTION ANSWERING (GROUNDED)
# =====================================

def ask_document_ai(document_content, question):
    """Answer user question strictly grounded in the document content."""
    if not document_content or not document_content.strip():
        return "No document content provided to answer from."
    if not question or not question.strip():
        return "Please ask a specific question."

    budgeted_content = document_content.strip()
    if len(budgeted_content) > 65000:
        budgeted_content = budgeted_content[:65000] + "\n\n[Document truncated for length...]"

    prompt = f"""
You are an expert research assistant answering queries about an uploaded research document.

Rules:
1. Answer strictly based on the facts and data present in the document.
2. If the document does not contain enough information to answer, state clearly: "I could not find information regarding this in the uploaded document." Do not hallucinate.
3. Quote or reference specific sections, terms, or data points from the document when possible.
4. Format your answer cleanly in Markdown.

Document:
\"\"\"
{budgeted_content}
\"\"\"

User Question:
{question.strip()}
"""

    messages = [
        {"role": "system", "content": "You are a factual research assistant. Only use the provided document context."},
        {"role": "user", "content": prompt}
    ]

    return execute_groq_completion(messages, temperature=0.25, max_tokens=2000)