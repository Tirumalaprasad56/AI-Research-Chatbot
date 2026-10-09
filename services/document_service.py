import os
import re
import unicodedata
from PyPDF2 import PdfReader
from docx import Document


# =====================================
# CLEAN & SANITIZE TEXT
# =====================================

def clean_text(text):
    """Normalize unicode, remove control characters and tidy whitespace."""
    if not text:
        return ""

    # Normalize unicode (NFC)
    text = unicodedata.normalize("NFC", text)
    
    # Remove null and non-printable control characters (except tab and newline)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    
    # Replace non-breaking spaces and hyphens with standard ones
    text = text.replace("\u00a0", " ").replace("\u2011", "-").replace("\ufeff", "")

    # Split lines, strip, and collapse excessive blank lines
    lines = [line.strip() for line in text.splitlines()]
    
    cleaned_lines = []
    blank_count = 0
    for line in lines:
        if line:
            cleaned_lines.append(line)
            blank_count = 0
        else:
            blank_count += 1
            if blank_count <= 2:
                cleaned_lines.append("")

    return "\n".join(cleaned_lines).strip()


# =====================================
# READ PDF
# =====================================

def read_pdf(filepath):
    """Extract clean text content from PDF file."""
    try:
        reader = PdfReader(filepath)
        extracted = []
        
        for i, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    extracted.append(page_text.strip())
            except Exception as page_err:
                print(f"Warning: page {i} extract failed: {page_err}")
                continue

        full_text = "\n\n".join(extracted)
        if not full_text.strip():
            raise ValueError("No extractable text found in this PDF (it may contain only scanned images).")

        return clean_text(full_text)

    except Exception as e:
        raise Exception(f"PDF extraction error: {str(e)}")


# =====================================
# READ DOCX
# =====================================

def read_docx(filepath):
    """Extract clean text content from Microsoft Word DOCX file."""
    try:
        doc = Document(filepath)
        extracted = []

        # Read paragraphs
        for para in doc.paragraphs:
            if para.text.strip():
                extracted.append(para.text.strip())

        # Read tables
        for table in doc.tables:
            for row in table.rows:
                cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if cells:
                    extracted.append(" | ".join(cells))

        full_text = "\n\n".join(extracted)
        if not full_text.strip():
            raise ValueError("No text content found in Word document.")

        return clean_text(full_text)

    except Exception as e:
        raise Exception(f"DOCX extraction error: {str(e)}")


# =====================================
# READ TXT
# =====================================

def read_txt(filepath):
    """Extract text from plain text file with multiple encoding fallbacks."""
    encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252", "utf-16"]
    content = None
    
    for enc in encodings:
        try:
            with open(filepath, "r", encoding=enc, errors="strict") as f:
                content = f.read()
                break
        except (UnicodeDecodeError, UnicodeError):
            continue

    if content is None:
        # Ultimate fallback ignoring errors
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

    return clean_text(content)


# =====================================
# DOCUMENT ROUTER
# =====================================

def read_document(filepath):
    """Read document based on its extension."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Document not found at: {filepath}")

    ext = os.path.splitext(filepath)[1].lower()

    if ext == ".pdf":
        return read_pdf(filepath)
    elif ext == ".docx":
        return read_docx(filepath)
    elif ext in (".txt", ".md", ".log"):
        return read_txt(filepath)
    else:
        raise ValueError(f"Unsupported document format '{ext}'. Allowed: .pdf, .docx, .txt")


# =====================================
# DOCUMENT STATS
# =====================================

def get_text_stats(text):
    """Calculate word count, reading time, and estimated token count."""
    if not text:
        return {"words": 0, "characters": 0, "read_time_min": 0, "estimated_tokens": 0}
    
    words = len(text.split())
    chars = len(text)
    read_time = max(1, round(words / 200))
    est_tokens = max(1, round(chars / 4))
    
    return {
        "words": words,
        "characters": chars,
        "read_time_min": read_time,
        "estimated_tokens": est_tokens
    }