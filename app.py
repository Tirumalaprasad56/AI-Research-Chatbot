import os
import re
import uuid
from functools import wraps

from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    redirect,
    session,
    flash,
    send_file,
    abort
)
from werkzeug.utils import secure_filename

from config import Config
from services.database import (
    init_db,
    save_report,
    get_reports,
    get_report,
    delete_report,
    toggle_favorite,
    get_stats,
    save_document,
    get_documents,
    get_document,
    delete_document,
    create_chat_thread,
    get_chat_threads,
    get_chat_thread,
    delete_chat_thread,
    save_chat_message,
    get_thread_messages,
    save_presentation,
    get_presentations,
    delete_presentation
)
from services.auth_service import (
    register_user,
    login_user,
    sync_firebase_user,
    verify_firebase_token
)
from services.groq_service import (
    generate_report,
    generate_presentation_slides,
    analyze_document_ai,
    ask_document_ai
)
from services.chat_service import ask_ai, ask_document
from services.document_service import read_document, get_text_stats
from services.export_service import create_pdf, create_docx, create_markdown
from services.ppt_service import create_presentation


# =====================================
# APP INITIALIZATION
# =====================================

app = Flask(__name__)
app.config.from_object(Config)

# Ensure runtime folders and database exist
Config.ensure_directories()
init_db()


# =====================================
# AUTH & SECURITY HELPERS
# =====================================

def logged_in():
    return "user_id" in session


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not logged_in():
            if request.path.startswith(("/api/", "/generate", "/export", "/upload", "/ask", "/analyze", "/delete", "/favorite")):
                return jsonify({"error": "Login required to access this resource"}), 401
            return redirect("/login")
        return f(*args, **kwargs)
    return decorated_function


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS
    )


# =====================================
# CONTEXT PROCESSOR (Injects user & app info into all templates)
# =====================================

@app.context_processor
def inject_globals():
    return {
        "logged_in": logged_in(),
        "current_username": session.get("username", "Guest"),
        "groq_model": Config.GROQ_MODEL
    }


# =====================================
# HEALTH CHECK (For Render.com)
# =====================================

@app.route("/health")
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "AI Research Assistant",
        "groq_configured": bool(Config.GROQ_API_KEY),
        "groq_model": Config.GROQ_MODEL
    }), 200


# =====================================
# NAVIGATION & PAGE ROUTES
# =====================================

@app.route("/")
def home():
    if logged_in():
        return redirect("/dashboard")
    return redirect("/login")


@app.route("/dashboard")
@login_required
def dashboard():
    return render_template(
        "dashboard.html",
        username=session["username"]
    )


@app.route("/reports")
@login_required
def reports():
    return render_template(
        "reports.html",
        username=session["username"]
    )


@app.route("/presentation")
@login_required
def presentation():
    return render_template(
        "presentation.html",
        username=session["username"]
    )


@app.route("/analyzer")
@login_required
def analyzer():
    return render_template(
        "analyzer.html",
        username=session["username"]
    )
@app.route("/documents")
@app.route("/documents_page")
@login_required
def documents_page():
    # If JSON is requested (API consumer), return JSON docs
    if request.headers.get("Accept") == "application/json" or request.args.get("format") == "json":
        docs = get_documents(session["user_id"])
        return jsonify([dict(d) for d in docs])
    return render_template(
        "documents.html",
        username=session["username"]
    )


@app.route("/chat")
@login_required
def chat():
    return render_template(
        "chat.html",
        username=session["username"]
    )


# =====================================
# AUTHENTICATION ROUTES (FIREBASE POWERED)
# =====================================

@app.route("/api/auth/firebase-login", methods=["POST"])

def firebase_login():
    """
    Authenticate and synchronize a Firebase user with the SQLite backend.
    Receives: { idToken: string, username: string (optional) }
    """
    data = request.get_json(silent=True) or {}
    id_token = data.get("idToken", "").strip()
    client_username = data.get("username", "").strip()

    if not id_token:
        return jsonify({"error": "Missing Firebase ID token"}), 400

    try:
        # Verify the Firebase ID token
        verified = verify_firebase_token(id_token)

        # Check email verification
        if not verified.get("email_verified", False):
            return jsonify({
                "error": "Please verify your email before continuing."
            }), 403

        firebase_uid = verified["uid"]
        email = verified["email"]
        username = (
            client_username
            or verified.get("username")
            or email.split("@")[0]
        )

        # Link or create user in SQLite database
        user = sync_firebase_user(firebase_uid, email, username)

        # Establish Flask session
        session["user_id"] = user["id"]
        session["username"] = user["username"]
        session["firebase_uid"] = firebase_uid
        session.permanent = True

        return jsonify({
            "success": True,
            "redirect": "/dashboard",
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"]
            }
        }), 200

    except Exception as e:
        app.logger.exception("Firebase login failed")
        return jsonify({
            "error": str(e)
        }), 401


@app.route("/register", methods=["GET", "POST"])
def register():
    # If JSON is posted (e.g. from frontend api), forward to firebase_login
    if request.is_json:
        return firebase_login()

    if logged_in():
        return redirect("/dashboard")

    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    # If JSON is posted (e.g. from frontend api), forward to firebase_login
    if request.is_json:
        return firebase_login()

    if logged_in():
        return redirect("/dashboard")

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    flash("You have been signed out.", "info")
    return redirect("/login")


# =====================================
# DASHBOARD STATS API
# =====================================

@app.route("/stats")
@login_required
def stats():
    return jsonify(get_stats(session["user_id"]))


# =====================================
# RESEARCH REPORTS API
# =====================================

@app.route("/generate", methods=["POST"])
@login_required
def generate():
    data = request.get_json(silent=True) or {}
    topic = data.get("topic", "").strip()

    if not topic:
        return jsonify({"error": "Please provide a research topic."}), 400

    try:
        report_content = generate_report(topic)
        report_id = save_report(session["user_id"], topic, report_content)

        return jsonify({
            "success": True,
            "id": report_id,
            "topic": topic,
            "report": report_content
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/history")
@login_required
def history():
    rows = get_reports(session["user_id"])
    return jsonify([dict(row) for row in rows])


@app.route("/report/<int:id>")
@login_required
def open_report(id):
    row = get_report(id, session["user_id"])
    if not row:
        return jsonify({"error": "Report not found or unauthorized."}), 404
    return jsonify(dict(row))


@app.route("/delete/<int:id>", methods=["DELETE"])
@login_required
def remove_report(id):
    delete_report(id, session["user_id"])
    return jsonify({"success": True})


@app.route("/favorite/<int:id>", methods=["POST"])
@login_required
def favorite(id):
    row = get_report(id, session["user_id"])
    if not row:
        return jsonify({"error": "Report not found"}), 404
    toggle_favorite(id, session["user_id"])
    return jsonify({"success": True})


# =====================================
# EXPORT API (PDF, DOCX, MARKDOWN)
# =====================================

@app.route("/export/pdf", methods=["POST"])
@login_required
def export_pdf():
    data = request.get_json(silent=True) or {}
    report_text = data.get("report", "").strip()
    title = data.get("title", "AI Research Report").strip()

    if not report_text:
        return jsonify({"error": "No report content provided for export."}), 400

    try:
        filepath = create_pdf(report_text, title=title)
        download_name = f"{secure_filename(title[:40])}_Report.pdf"
        return send_file(
            filepath,
            as_attachment=True,
            download_name=download_name,
            mimetype="application/pdf"
        )
    except Exception as e:
        return jsonify({"error": f"PDF generation failed: {str(e)}"}), 500


@app.route("/export/docx", methods=["POST"])
@login_required
def export_docx():
    data = request.get_json(silent=True) or {}
    report_text = data.get("report", "").strip()
    title = data.get("title", "AI Research Report").strip()

    if not report_text:
        return jsonify({"error": "No report content provided for export."}), 400

    try:
        filepath = create_docx(report_text, title=title)
        download_name = f"{secure_filename(title[:40])}_Report.docx"
        return send_file(
            filepath,
            as_attachment=True,
            download_name=download_name,
            mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    except Exception as e:
        return jsonify({"error": f"Word export failed: {str(e)}"}), 500


@app.route("/export/markdown", methods=["POST"])
@login_required
def export_markdown():
    data = request.get_json(silent=True) or {}
    report_text = data.get("report", "").strip()
    title = data.get("title", "AI Research Report").strip()

    if not report_text:
        return jsonify({"error": "No report content provided."}), 400

    try:
        filepath = create_markdown(report_text, title=title)
        download_name = f"{secure_filename(title[:40])}_Report.md"
        return send_file(
            filepath,
            as_attachment=True,
            download_name=download_name,
            mimetype="text/markdown"
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================================
# AI PRESENTATION GENERATOR API
# =====================================

@app.route("/generate_ppt", methods=["POST"])
@login_required
def generate_ppt():
    data = request.get_json(silent=True) or {}
    topic = data.get("topic", "").strip()
    slide_count = data.get("slides", 8)
    theme = data.get("theme", "Modern").strip()

    if not topic:
        return jsonify({"error": "Presentation topic is required."}), 400

    try:
        # Generate structured slide data via Groq
        slides_data = generate_presentation_slides(topic, slide_count=slide_count, theme=theme)
        
        # Build PowerPoint deck
        filepath = create_presentation(topic, slides_data, theme_name=theme)
        
        # Save presentation record in database
        save_presentation(
            session["user_id"],
            topic,
            len(slides_data),
            theme,
            filepath
        )

        download_name = f"{secure_filename(topic[:40])}_Presentation.pptx"
        return send_file(
            filepath,
            as_attachment=True,
            download_name=download_name,
            mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
    except Exception as e:
        return jsonify({"error": f"Presentation generation failed: {str(e)}"}), 500


@app.route("/presentations")
@login_required
def list_presentations():
    rows = get_presentations(session["user_id"])
    return jsonify([dict(r) for r in rows])


# =====================================
# DOCUMENT MANAGEMENT & ANALYSIS API
# =====================================

@app.route("/upload", methods=["POST"])
@app.route("/upload_paper", methods=["POST"])  # Backward-compatible alias
@login_required
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Please select a file to upload."}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only PDF (.pdf), Word (.docx), and Text (.txt) files are supported."}), 400

    original_filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4().hex[:8]}_{original_filename}"
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], unique_filename)
    
    file.save(filepath)

    try:
        content = read_document(filepath)
        stats = get_text_stats(content)
        
        doc_id = save_document(
            session["user_id"],
            original_filename,
            filepath,
            content
        )
        session["current_document"] = doc_id

        return jsonify({
            "success": True,
            "id": doc_id,
            "filename": original_filename,
            "stats": stats,
            "message": "Document uploaded and parsed successfully."
        })
    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"error": f"Could not process document: {str(e)}"}), 400


@app.route("/document/<int:id>")
@login_required
def get_single_document(id):
    doc = get_document(id, session["user_id"])
    if not doc:
        return jsonify({"error": "Document not found or unauthorized."}), 404

    session["current_document"] = id
    stats = get_text_stats(doc["content"])
    
    return jsonify({
        "id": doc["id"],
        "filename": doc["filename"],
        "content": doc["content"],
        "uploaded_at": doc["uploaded_at"],
        "stats": stats
    })


@app.route("/delete_document/<int:id>", methods=["DELETE"])
@app.route("/delete_paper/<int:id>", methods=["DELETE"])  # Backward-compatible alias
@login_required
def remove_document(id):
    doc = get_document(id, session["user_id"])
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    try:
        if doc["filepath"] and os.path.exists(doc["filepath"]):
            os.remove(doc["filepath"])
    except Exception:
        pass

    delete_document(id, session["user_id"])

    if session.get("current_document") == id:
        session.pop("current_document", None)

    return jsonify({"success": True})


@app.route("/analyze_document", methods=["POST"])
@app.route("/analyze_paper", methods=["POST"])  # Backward-compatible alias
@login_required
def analyze_document():
    data = request.get_json(silent=True) or {}
    analysis_type = data.get("type", "summary").strip()
    
    # Priority: explicit document_id in body, or current session document
    doc_id = data.get("document_id") or data.get("paper_id") or session.get("current_document")
    if not doc_id:
        return jsonify({"error": "Please select or upload a document first."}), 400

    doc = get_document(doc_id, session["user_id"])
    if not doc:
        return jsonify({"error": "Document not found."}), 404

    try:
        answer = analyze_document_ai(doc["content"], analysis_type)
        return jsonify({
            "success": True,
            "type": analysis_type,
            "answer": answer
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/ask_document", methods=["POST"])
@login_required
def ask_document_route():
    data = request.get_json(silent=True) or {}
    question = data.get("question", "").strip()
    doc_id = data.get("document_id") or data.get("paper_id") or session.get("current_document")

    if not doc_id:
        return jsonify({"error": "Please select or upload a document first."}), 400
    if not question:
        return jsonify({"error": "Please enter a question about the document."}), 400

    doc = get_document(doc_id, session["user_id"])
    if not doc:
        return jsonify({"error": "Document not found."}), 404

    try:
        answer = ask_document_ai(doc["content"], question)
        return jsonify({"success": True, "answer": answer})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================================
# PERSISTENT AI CHAT API
# =====================================

@app.route("/ask", methods=["POST"])
@login_required
def ask():
    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()
    thread_id = data.get("thread_id")

    if not message:
        return jsonify({"error": "Message is required."}), 400

    user_id = session["user_id"]

    # Ensure valid thread or create a new one
    thread = None
    if thread_id:
        thread = get_chat_thread(thread_id, user_id)

    if not thread:
        # Create thread titled after first message
        title = (message[:36] + "...") if len(message) > 36 else message
        thread_id = create_chat_thread(user_id, title=title)

    # Fetch past messages in thread to provide context
    existing_messages = get_thread_messages(thread_id)
    history = [
        {"role": m["role"], "content": m["content"]}
        for m in existing_messages
    ]

    try:
        # Save user message
        save_chat_message(thread_id, "user", message)

        # Query Groq
        answer = ask_ai(message, history=history)

        # Save assistant message
        save_chat_message(thread_id, "assistant", answer)

        return jsonify({
            "success": True,
            "thread_id": thread_id,
            "answer": answer
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/chat/threads", methods=["GET"])
@login_required
def list_threads():
    threads = get_chat_threads(session["user_id"])
    return jsonify([dict(t) for t in threads])


@app.route("/api/chat/threads", methods=["POST"])
@login_required
def create_thread():
    data = request.get_json(silent=True) or {}
    title = data.get("title", "New Conversation").strip()
    thread_id = create_chat_thread(session["user_id"], title=title)
    return jsonify({"success": True, "id": thread_id, "title": title})


@app.route("/api/chat/threads/<int:thread_id>", methods=["GET"])
@login_required
def get_thread(thread_id):
    thread = get_chat_thread(thread_id, session["user_id"])
    if not thread:
        return jsonify({"error": "Thread not found"}), 404
    messages = get_thread_messages(thread_id)
    return jsonify({
        "thread": dict(thread),
        "messages": [dict(m) for m in messages]
    })


@app.route("/api/chat/threads/<int:thread_id>", methods=["DELETE"])
@login_required
def remove_thread(thread_id):
    delete_chat_thread(thread_id, session["user_id"])
    return jsonify({"success": True})


# =====================================
# ERROR HANDLERS
# =====================================

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({"error": "File size exceeds the 32MB upload limit."}), 413


@app.errorhandler(404)
def not_found(error):
    if request.path.startswith(("/api/", "/export", "/generate", "/upload")):
        return jsonify({"error": "Endpoint not found"}), 404
    return render_template("dashboard.html", username=session.get("username", "Guest")), 404


@app.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Internal server error occurred."}), 500


# =====================================
# ENTRY POINT
# =====================================

if __name__ == "__main__":
    port = Config.PORT
    debug = Config.DEBUG
    print(f"🚀 AI Research Assistant starting on port {port} (Debug: {debug})")
    print(f"🤖 Groq Model: {Config.GROQ_MODEL}")
    app.run(
        host="0.0.0.0",
        port=port,
        debug=debug
    )
