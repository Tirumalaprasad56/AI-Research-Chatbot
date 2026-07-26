// =====================================
// ANALYZER PAGE
// =====================================


// =====================================
// ELEMENTS
// =====================================

const uploadBtn = document.getElementById("uploadBtn");

const documentList = document.getElementById("documentList");

const report = document.getElementById("report");


// =====================================
// UPLOAD DOCUMENT
// =====================================

if (uploadBtn) {

    uploadBtn.onclick = async () => {

        const fileInput = document.getElementById("documentFile");

        if (fileInput.files.length === 0) {

            alert("Please choose a document.");

            return;

        }

        const formData = new FormData();

        formData.append("file", fileInput.files[0]);

        uploadBtn.disabled = true;

        uploadBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm"></span>
            Uploading...
        `;

        try {

            const response = await fetch("/upload", {

                method: "POST",

                body: formData

            });

            const data = await response.json();

            if (data.error) {

                alert(data.error);

            }

            else {

                alert("Document uploaded successfully.");

                fileInput.value = "";

                await loadDocuments();

            }

        }

        catch (err) {

            alert(err);

        }

        finally {

            uploadBtn.disabled = false;

            uploadBtn.innerHTML = `
                <i class="bi bi-upload"></i>
                Upload
            `;

        }

    };

}


// =====================================
// LOAD DOCUMENTS
// =====================================

async function loadDocuments() {

    if (!documentList)
        return;

    const response = await fetch("/documents");

    const docs = await response.json();

    documentList.innerHTML = "";

    if (docs.length === 0) {

        documentList.innerHTML = `
            <div class="text-center text-secondary p-4">

                No uploaded documents.

            </div>
        `;

        currentDocument = null;

        return;

    }

    docs.forEach(doc => {

        if (currentDocument === null) {

            currentDocument = doc.id;

        }

        const row = document.createElement("div");

        row.className = "history-item";

        row.innerHTML = `

            <span class="doc-name">

                📄 ${doc.filename}

            </span>

            <button class="btn btn-danger btn-sm">

                🗑

            </button>

        `;

        row.querySelector(".doc-name").onclick = () => {

            openDocument(doc.id);

        };

        row.querySelector("button").onclick = () => {

            deleteDocument(doc.id);

        };

        documentList.appendChild(row);

    });

}
// =====================================
// OPEN DOCUMENT
// =====================================

async function openDocument(id) {

    currentDocument = id;

    console.log("Selected Document:", currentDocument);

    try {

        const response = await fetch(`/document/${id}`);

        const doc = await response.json();

        if (doc.error) {

            alert(doc.error);

            return;

        }

        report.innerHTML = `
            <div class="card shadow-sm">

                <div class="card-header">

                    <h5 class="mb-0">

                        📄 ${doc.filename}

                    </h5>

                </div>

                <div class="card-body">

                    <pre style="white-space:pre-wrap;">
${doc.content}
                    </pre>

                </div>

            </div>
        `;

    }

    catch (err) {

        console.log(err);

        alert("Unable to open document.");

    }

}


// =====================================
// DELETE DOCUMENT
// =====================================

async function deleteDocument(id) {

    if (!confirm("Delete this document?"))

        return;

    try {

        const response = await fetch(`/delete_document/${id}`, {

            method: "DELETE"

        });

        const data = await response.json();

        if (data.error) {

            alert(data.error);

            return;

        }

        // If the deleted document was selected,
        // clear everything.

        if (currentDocument === id) {

            currentDocument = null;

            if (report) {

                report.innerHTML = "";

            }

            const answer = document.getElementById("documentAnswer");

            if (answer) {

                answer.innerHTML = "";

            }

        }

        await loadDocuments();

        alert("Document deleted successfully.");

    }

    catch (err) {

        console.log(err);

        alert("Unable to delete document.");

    }

}
// =====================================
// ASK AI ABOUT DOCUMENT
// =====================================

const askDocumentBtn = document.getElementById("askDocumentBtn");

if (askDocumentBtn) {

    askDocumentBtn.onclick = async () => {

        if (currentDocument === null) {

            alert("Please open a document first.");

            return;

        }

        const question = document
            .getElementById("documentQuestion")
            .value
            .trim();

        if (question === "") {

            alert("Please enter your question.");

            return;

        }

        const answerBox = document.getElementById("documentAnswer");

        answerBox.innerHTML = `
            <div class="alert alert-info">
                <span class="spinner-border spinner-border-sm me-2"></span>
                AI is reading the document...
            </div>
        `;

        try {

            const response = await fetch("/ask_document", {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    document_id: currentDocument,

                    question: question

                })

            });

            const data = await response.json();

            if (data.error) {

                answerBox.innerHTML = `
                    <div class="alert alert-danger">
                        ${data.error}
                    </div>
                `;

                return;

            }

            answerBox.innerHTML = `
                <div class="card shadow-sm mt-3">

                    <div class="card-header bg-primary text-white">

                        🤖 AI Answer

                    </div>

                    <div class="card-body">

                        ${marked.parse(data.answer)}

                    </div>

                </div>
            `;

        }

        catch (err) {

            answerBox.innerHTML = `
                <div class="alert alert-danger">
                    ${err}
                </div>
            `;

        }

    };

}


// =====================================
// CLEAR QUESTION
// =====================================

const clearQuestionBtn = document.getElementById("clearQuestionBtn");

if (clearQuestionBtn) {

    clearQuestionBtn.onclick = () => {

        document.getElementById("documentQuestion").value = "";

        document.getElementById("documentAnswer").innerHTML = "";

    };

}


// =====================================
// ENTER KEY SUPPORT
// =====================================

const questionBox = document.getElementById("documentQuestion");

if (questionBox) {

    questionBox.addEventListener("keydown", function (event) {

        if (event.key === "Enter" && !event.shiftKey) {

            event.preventDefault();

            askDocumentBtn.click();

        }

    });

}
// =====================================
// AI DOCUMENT ANALYZER
// =====================================

async function analyzeDocument(type) {

    console.log("Analyze:", type);

    // Recover selected document if needed
    if (currentDocument === null) {

        const response = await fetch("/documents");

        const docs = await response.json();

        if (docs.length > 0) {

            currentDocument = docs[0].id;

        }

    }

    if (currentDocument === null) {

        alert("Please upload or open a document first.");

        return;

    }

    const result = document.getElementById("analysisResult");

    result.innerHTML = `
        <div class="alert alert-info">

            <span class="spinner-border spinner-border-sm"></span>

            AI is analyzing your document...

        </div>
    `;

    try {

        const response = await fetch("/analyze_document", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                type: type

            })

        });

        const data = await response.json();

        if (data.error) {

            result.innerHTML = `
                <div class="alert alert-danger">

                    ${data.error}

                </div>
            `;

            return;

        }

        result.innerHTML = `
            <div class="card shadow-sm">

                <div class="card-header bg-success text-white">

                    AI Analysis

                </div>

                <div class="card-body">

                    ${marked.parse(data.answer)}

                </div>

            </div>
        `;

    }

    catch (err) {

        result.innerHTML = `
            <div class="alert alert-danger">

                ${err}

            </div>
        `;

    }

}


// =====================================
// SUMMARY
// =====================================

const summaryBtn = document.getElementById("summaryBtn");

if (summaryBtn) {

    summaryBtn.onclick = () => {

        analyzeDocument("summary");

    };

}


// =====================================
// KEYWORDS
// =====================================

const keywordsBtn = document.getElementById("keywordsBtn");

if (keywordsBtn) {

    keywordsBtn.onclick = () => {

        analyzeDocument("keywords");

    };

}


// =====================================
// KEY POINTS
// =====================================

const pointsBtn = document.getElementById("pointsBtn");

if (pointsBtn) {

    pointsBtn.onclick = () => {

        analyzeDocument("points");

    };

}


// =====================================
// ABSTRACT
// =====================================

const abstractBtn = document.getElementById("abstractBtn");

if (abstractBtn) {

    abstractBtn.onclick = () => {

        analyzeDocument("abstract");

    };

}


// =====================================
// QUIZ
// =====================================

const quizBtn = document.getElementById("quizBtn");

if (quizBtn) {

    quizBtn.onclick = () => {

        analyzeDocument("quiz");

    };

}


// =====================================
// INTERVIEW QUESTIONS
// =====================================

const interviewBtn = document.getElementById("interviewBtn");

if (interviewBtn) {

    interviewBtn.onclick = () => {

        analyzeDocument("interview");

    };

}


// =====================================
// CONCEPT EXTRACTION
// =====================================

const conceptBtn = document.getElementById("conceptBtn");

if (conceptBtn) {

    conceptBtn.onclick = () => {

        analyzeDocument("concepts");

    };

}


// =====================================
// REFRESH DOCUMENT LIST
// =====================================

window.addEventListener("DOMContentLoaded", () => {

    loadDocuments();

});