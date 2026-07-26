from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    redirect,
    session,
    flash,
    send_file
)

import os
import uuid

from werkzeug.utils import secure_filename


from services.groq_service import generate_report


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
    delete_document
)


from services.auth_service import (
    register_user,
    login_user
)


from services.chat_service import (
    ask_ai,
    ask_document
)


from services.document_service import read_document


from services.export_service import (
    create_pdf,
    create_docx
)

from services.ppt_service import create_presentation

# =====================================
# APP CONFIG
# =====================================


app = Flask(__name__)


app.secret_key = os.environ.get(
    "SECRET_KEY",
    "research_ai_secret"
)



UPLOAD_FOLDER="uploads"


EXPORT_FOLDER="exports"



ALLOWED_EXTENSIONS={

    "pdf",
    "docx",
    "txt"

}



app.config["UPLOAD_FOLDER"]=UPLOAD_FOLDER



os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


os.makedirs(
    EXPORT_FOLDER,
    exist_ok=True
)



init_db()





# =====================================
# HELPERS
# =====================================


def logged_in():

    return "user_id" in session




def allowed_file(filename):

    return (

        "." in filename

        and

        filename.rsplit(".",1)[1].lower()

        in ALLOWED_EXTENSIONS

    )






# =====================================
# HOME
# =====================================


@app.route("/")
def home():

    if not logged_in():

        return redirect("/login")


    return render_template(

        "index.html",

        username=session["username"]

    )





# =====================================
# REGISTER
# =====================================


@app.route(
    "/register",
    methods=["GET","POST"]
)

def register():


    if request.method=="POST":


        try:


            register_user(

                request.form["username"],

                request.form["email"],

                request.form["password"]

            )


            flash(

                "Registration successful",

                "success"

            )


            return redirect("/login")



        except Exception:


            flash(

                "Email already exists",

                "danger"

            )



    return render_template(
        "register.html"
    )






# =====================================
# LOGIN
# =====================================


@app.route(
    "/login",
    methods=["GET","POST"]
)

def login():


    if request.method=="POST":


        user=login_user(

            request.form["email"],

            request.form["password"]

        )


        if user:


            session["user_id"]=user["id"]

            session["username"]=user["username"]


            return redirect("/dashboard")



        flash(

            "Invalid credentials",

            "danger"

        )



    return render_template(
        "login.html"
    )






@app.route("/logout")
def logout():

    session.clear()

    return redirect("/login")

@app.route("/dashboard")
def dashboard():

    if not logged_in():
        return redirect("/login")

    return render_template(
        "dashboard.html",
        username=session["username"]
    )

@app.route("/reports")
def reports():

    if not logged_in():
        return redirect("/login")

    return render_template(
        "reports.html",
        username=session["username"]
    )
@app.route("/presentation")
def presentation():

    if not logged_in():
        return redirect("/login")

    return render_template(
        "presentation.html",
        username=session["username"]
    )
@app.route("/analyzer")
def analyzer():

    if not logged_in():
        return redirect("/login")

    return render_template(
        "analyzer.html",
        username=session["username"]
    )
# =====================================
# AI CHAT PAGE
# =====================================

@app.route("/chat")
def chat():

    if not logged_in():
        return redirect("/login")

    return render_template(
        "chat.html",
        username=session["username"]
    )
@app.route("/documents_page")
def documents_page():

    if "username" not in session:
        return redirect("/login")

    return render_template(
        "documents.html",
        username=session["username"]
    )


# =====================================
# GENERATE REPORT
# =====================================


@app.route(
    "/generate",
    methods=["POST"]
)

def generate():


    if not logged_in():

        return jsonify(
            error="Login required"
        )



    topic=request.json.get(

        "topic",

        ""

    ).strip()



    if topic=="":

        return jsonify(
            error="Topic required"
        )



    try:


        report=generate_report(topic)



        save_report(

            session["user_id"],

            topic,

            report

        )



        return jsonify(

            report=report

        )



    except Exception as e:


        return jsonify(

            error=str(e)

        )
# =====================================
# REPORT HISTORY
# =====================================


@app.route("/history")
def history():


    if not logged_in():

        return jsonify([])



    reports=get_reports(

        session["user_id"]

    )


    return jsonify(

        [dict(row) for row in reports]

    )





# =====================================
# OPEN REPORT
# =====================================


@app.route("/report/<int:id>")
def open_report(id):


    if not logged_in():

        return jsonify(
            error="Login required"
        )


    row=get_report(id)



    if not row:


        return jsonify(
            error="Report not found"
        )



    if row["user_id"] != session["user_id"]:


        return jsonify(
            error="Unauthorized"
        )



    return jsonify(

        dict(row)

    )






# =====================================
# DELETE REPORT
# =====================================


@app.route(
    "/delete/<int:id>",
    methods=["DELETE"]
)

def remove_report(id):


    row=get_report(id)



    if row and row["user_id"]==session["user_id"]:


        delete_report(id)



    return jsonify(

        success=True

    )






# =====================================
# FAVORITE REPORT
# =====================================


@app.route(
    "/favorite/<int:id>",
    methods=["POST"]
)

def favorite(id):


    row=get_report(id)



    if not row:


        return jsonify(
            error="Report not found"
        )



    if row["user_id"] != session["user_id"]:


        return jsonify(
            error="Unauthorized"
        )



    toggle_favorite(id)



    return jsonify(

        success=True

    )






# =====================================
# STATISTICS
# =====================================


@app.route("/stats")
def stats():


    if not logged_in():

        return jsonify({})



    return jsonify(

        get_stats(

            session["user_id"]

        )

    )




@app.route(
    "/ask",
    methods=["POST"]
)

def ask():


    if not logged_in():

        return jsonify(

            error="Login required"

        )



    message=request.json.get(

        "message",

        ""

    ).strip()



    if message=="":

        return jsonify(

            error="Message required"

        )



    try:


        answer=ask_ai(message)



        return jsonify(

            answer=answer

        )


    except Exception as e:


        return jsonify(

            error=str(e)

        )


# =====================================
# CHAT WITH DOCUMENT
# =====================================

@app.route("/ask_document", methods=["POST"])
def ask_document():

    if not logged_in():
        return jsonify(error="Login required")

    document_id = session.get("current_document")

    if not document_id:
        return jsonify(error="Open a document first.")

    question = request.json.get("question","").strip()

    if question == "":
        return jsonify(error="Question required")

    doc = get_document(
    document_id,
    session["user_id"]
)

    if not doc:
        return jsonify(error="Document not found")

    prompt = f"""
Answer ONLY using this document.

Document:
{doc['content']}

Question:
{question}
"""

    answer = ask_ai(prompt)

    return jsonify(answer=answer)
# =====================================
# AI PAPER ANALYZER
# =====================================

@app.route("/analyze_document", methods=["POST"])
def analyze_document():

    if not logged_in():
        return jsonify(error="Login required")

    document_id = session.get("current_document")

    if not document_id:
        return jsonify(error="Open a document first.")

    doc = get_document(
        document_id,
        session["user_id"]
    )

    if not doc:
        return jsonify(error="Document not found")

    analysis_type = request.json.get("type", "")

    prompts = {

        "summary":
        "Summarize this research paper in simple language.",

        "keywords":
        "Extract the important keywords from this research paper.",

        "points":
        "List the important key points from this research paper.",

        "abstract":
        "Write a concise abstract for this research paper.",

        "quiz":
        "Generate 10 quiz questions with answers based on this research paper.",

        "interview":
        "Generate 10 technical interview questions and answers from this research paper.",

        "concepts":
        "Explain the difficult concepts present in this research paper in simple language."

    }

    instruction = prompts.get(analysis_type)

    if not instruction:
        return jsonify(error="Invalid analysis type")

    prompt = f"""
You are an AI Research Assistant.

{instruction}

Research Paper:

{doc['content']}
"""

    answer = ask_ai(prompt)

    return jsonify(answer=answer)
# =====================================
# UPLOAD DOCUMENT
# =====================================

@app.route("/upload", methods=["POST"])
def upload():

    if "user_id" not in session:
        return jsonify({
            "error": "Please login first."
        })

    if "file" not in request.files:
        return jsonify({
            "error": "No file selected."
        })

    file = request.files["file"]

    if file.filename == "":
        return jsonify({
            "error": "Please choose a file."
        })

    if not allowed_file(file.filename):
        return jsonify({
            "error": "Only PDF, DOCX and TXT files are allowed."
        })

    filename = secure_filename(file.filename)

    filepath = os.path.join(
        app.config["UPLOAD_FOLDER"],
        filename
    )

    file.save(filepath)

    try:

        content = read_document(filepath)

        save_document(
            session["user_id"],
            filename,
            filepath,
            content
        )

        return jsonify({
            "success": True,
            "message": "Document uploaded successfully.",
            "filename": filename
        })
    
    except Exception as e:

        return jsonify({
            "error": str(e)
        })
# =====================================
# DOCUMENT LIST
# =====================================


@app.route("/documents")
def documents():


    if not logged_in():

        return jsonify([])



    docs=get_documents(

        session["user_id"]

    )



    return jsonify(

        [dict(d) for d in docs]

    )







# =====================================
# OPEN DOCUMENT
# =====================================

@app.route("/document/<int:id>")
def document(id):

    if not logged_in():
        return jsonify(error="Login required")

    doc = get_document(id, session["user_id"])

    if not doc:
        return jsonify(error="Document not found")

    session["current_document"] = id

    return jsonify(
        filename=doc["filename"],
        content=doc["content"]
    )
# =====================================
# DELETE DOCUMENT
# =====================================


@app.route("/delete_document/<int:id>", methods=["DELETE"])
def remove_document(id):

    if not logged_in():
        return jsonify(error="Login required")

    doc = get_document(id, session["user_id"])

    if not doc:
        return jsonify(error="Document not found")

    if os.path.exists(doc["filepath"]):
        os.remove(doc["filepath"])

    delete_document(id)

    return jsonify(success=True)
# =====================================
# EXPORT PDF
# =====================================


@app.route(
    "/export/pdf",
    methods=["POST"]
)

def export_pdf():


    data=request.get_json()


    report=data.get(

        "report",

        ""

    )



    if report=="":

        return jsonify(

            error="No report available"

        )



    filename=create_pdf(report)



    return send_file(

        filename,

        as_attachment=True

    )






# =====================================
# EXPORT WORD
# =====================================


@app.route(
    "/export/docx",
    methods=["POST"]
)

def export_docx():


    data=request.get_json()


    report=data.get(

        "report",

        ""

    )



    if report=="":

        return jsonify(

            error="No report available"

        )



    filename=create_docx(report)



    return send_file(

        filename,

        as_attachment=True

    )






# =====================================
# RUN APPLICATION
# =====================================
@app.route("/test_documents")
def test_documents():

    if not logged_in():
        return jsonify(error="Login required")

    docs = get_documents(session["user_id"])

    return jsonify([dict(doc) for doc in docs])
# =====================================
# GENERATE POWERPOINT
# =====================================

@app.route("/generate_ppt", methods=["POST"])
def generate_ppt():

    if not logged_in():
        return jsonify(error="Login required")

    data = request.json

    topic = data.get("topic", "").strip()

    if topic == "":
        return jsonify(error="Topic is required")

    prompt = f"""
Create a professional PowerPoint presentation on:

{topic}

Return ONLY the presentation in this exact format.

Slide 1:
Title: ...
Points:
- ...
- ...

Slide 2:
Title: ...
Points:
- ...
- ...

Create 8 slides.
"""

    ai_response = ask_ai(prompt)

    slides = []

    current = None

    for line in ai_response.splitlines():

        line = line.strip()

        if line.startswith("Title:"):

            if current:
                slides.append(current)

            current = {
                "title": line.replace("Title:", "").strip(),
                "points": []
            }

        elif line.startswith("-"):

            if current:
                current["points"].append(
                    line.replace("-", "").strip()
                )

    if current:
        slides.append(current)

    filepath = create_presentation(
        topic,
        slides
    )

    return send_file(
        filepath,
        as_attachment=True,
        download_name="Research_Presentation.pptx"
    )
if __name__=="__main__":


    app.run(

        host="0.0.0.0",

        port=5000,

        debug=True

    )
