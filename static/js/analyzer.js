
/* ==========================================================================
   DOCUMENT & PAPER ANALYZER LOGIC (2026 PRO EDITION)
   ========================================================================== */

let activeDocumentId = null;
let activeDocumentContent = "";
let lastAnalysisOutput = "";

document.addEventListener("DOMContentLoaded", () => {
    setupAnalyzerEvents();
    loadDocumentList();
});


function setupAnalyzerEvents() {
    const dropzone = document.getElementById("dropzoneArea");
    const fileInput = document.getElementById("documentFileInput");
    const uploadBtn = document.getElementById("uploadDocumentBtn");
    const askBtn = document.getElementById("askDocumentBtn");
    const questionInput = document.getElementById("documentQuestionInput");

    if (!dropzone || !fileInput || !uploadBtn) {
        console.error("Upload elements missing:", {
            dropzone: !!dropzone,
            fileInput: !!fileInput,
            uploadBtn: !!uploadBtn
        });
        return;
    }

    // Open the file picker when the upload area is clicked.
    dropzone.addEventListener("click", () => {
        console.log("Upload area clicked");
        fileInput.click();
    });

    // Also support keyboard access.
    dropzone.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInput.click();
        }
    });

    // Detect the selected file.
    fileInput.addEventListener("change", () => {
        console.log("File input changed:", fileInput.files?.[0]?.name);
        handleFileSelected();
    });

    dropzone.addEventListener("dragover", (event) => {
        event.preventDefault();
        dropzone.style.borderColor = "var(--accent-primary)";
    });

    dropzone.addEventListener("dragleave", () => {
        dropzone.style.borderColor = "var(--border-subtle)";
    });

    dropzone.addEventListener("drop", (event) => {
        event.preventDefault();

        if (event.dataTransfer.files.length > 0) {
            fileInput.files = event.dataTransfer.files;
            handleFileSelected();
        }
    });

    uploadBtn.disabled = true;
    uploadBtn.addEventListener("click", handleDocumentUpload);

    if (askBtn) {
        askBtn.addEventListener("click", handleGroundedQuestion);
    }

    if (questionInput) {
        questionInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                handleGroundedQuestion();
            }
        });
    }
}


/**
 * Handles file selection and enables the upload button.
 */
function handleFileSelected() {
    const fileInput = document.getElementById("documentFileInput");
    const uploadBtn = document.getElementById("uploadDocumentBtn");
    const dropzone = document.getElementById("dropzoneArea");

    if (!fileInput || !uploadBtn || !dropzone) {
        console.error("Required upload elements were not found.");
        return;
    }

    const file = fileInput.files?.[0];

    if (!file) {
        uploadBtn.disabled = true;
        return;
    }

    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
        showToast("Select a PDF, DOCX, or TXT file.", "warning");
        fileInput.value = "";
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="bi bi-upload"></i> Upload & Parse Document';
        return;
    }

    if (file.size > 32 * 1024 * 1024) {
        showToast("The file exceeds the 32 MB limit.", "warning");
        fileInput.value = "";
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="bi bi-upload"></i> Upload & Parse Document';
        return;
    }

    // A valid file is selected: enable the button.
    uploadBtn.disabled = false;
    uploadBtn.innerHTML =
        `<i class="bi bi-cloud-arrow-up-fill me-1"></i> Upload "${escapeHtml(file.name)}"`;

    // Update only the visible dropzone content.
    // IMPORTANT: Keep documentFileInput outside this element.
    dropzone.innerHTML = `
        <i class="bi bi-file-earmark-check-fill text-success display-4 mb-2 d-inline-block"></i>
        <h6 class="text-white mb-1"></h6>
        <p class="text-muted small mb-0"></p>
    `;

    dropzone.querySelector("h6").textContent = file.name;
    dropzone.querySelector("p").textContent =
        `${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload`;
}

/**
 * Uploads the selected file to Flask.
 */
async function handleDocumentUpload() {
    const fileInput = document.querySelector(
        'input#documentFileInput[type="file"]'
    );
    const uploadBtn = document.getElementById("uploadDocumentBtn");

    console.log("Upload input found:", !!fileInput);
    console.log("Upload button found:", !!uploadBtn);

    if (!fileInput || !uploadBtn) {
        showToast("Upload controls not found. Refresh the page.", "error");
        return;
    }

    const file = fileInput.files?.[0];

    if (!file) {
        showToast("Please select a document first.", "warning");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    uploadBtn.disabled = true;
    uploadBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span> Uploading and parsing...';

    try {
        const res = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const contentType = res.headers.get("content-type") || "";
        let data;

        if (contentType.includes("application/json")) {
            data = await res.json();
        } else {
            throw new Error(await res.text() || `Upload failed (${res.status}).`);
        }

        if (!res.ok || data.error) {
            throw new Error(data.error || `Upload failed (${res.status}).`);
        }

        showToast("Document uploaded successfully!", "success");

        // Reset the visible dropzone without moving/removing the file input.
        const dropzone = document.getElementById("dropzoneArea");

        if (dropzone) {
            dropzone.innerHTML = `
                <i class="bi bi-file-earmark-arrow-up display-4 text-primary mb-2 d-inline-block"></i>
                <h6 class="text-light mb-1">Click to browse or drop file here</h6>
                <p class="text-muted small mb-0">PDF (.pdf), Word (.docx), or Text (.txt) up to 32MB</p>
            `;
        }

        fileInput.value = "";
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="bi bi-upload"></i> Upload & Parse Document';

        await loadDocumentList();

        if (data.id !== undefined && data.id !== null) {
            await selectDocument(data.id);
        }
    } catch (error) {
        console.error("Document upload failed:", error);
        showToast(error.message || "Upload failed.", "error");

        // Permit retrying with the same selected file.
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="bi bi-upload"></i> Retry Upload';
    }
}

/**
 * Loads the document library.
 */
async function loadDocumentList() {
    const container = document.getElementById("documentListContainer");
    if (!container) return;

    try {
        const res = await fetch("/documents", {
            headers: { Accept: "application/json" }
        });

        if (!res.ok) {
            throw new Error(`Unable to load documents (${res.status}).`);
        }

        const docs = await res.json();

        if (!Array.isArray(docs) || docs.length === 0) {
            container.innerHTML = `
                <div class="empty-state-pro py-4">
                    <i class="bi bi-folder-x fs-2"></i>
                    <p class="small">No uploaded documents yet.</p>
                </div>
            `;
            return;
        }

        let html = '<div class="d-flex flex-column gap-2">';

        docs.forEach((doc) => {
            const selected = String(activeDocumentId) === String(doc.id);

            html += `
                <div class="history-item-pro ${selected ? "active" : ""}"
                     id="doc-item-${escapeHtml(doc.id)}"
                     data-document-id="${escapeHtml(doc.id)}">
                    <div class="history-text" title="${escapeHtml(doc.filename || "")}">
                        <i class="bi bi-file-earmark-text-fill text-danger me-1"></i>
                        <span>${escapeHtml(doc.filename || "Untitled document")}</span>
                    </div>
                    <div class="history-actions">
                        <button type="button" class="btn-icon-tiny delete-hover"
                                data-delete-id="${escapeHtml(doc.id)}" title="Delete">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        html += "</div>";
        container.innerHTML = html;

        // Attach events without inline HTML JavaScript.
        container.querySelectorAll("[data-document-id]").forEach((row) => {
            row.addEventListener("click", () => {
                selectDocument(row.dataset.documentId);
            });
        });

        container.querySelectorAll("[data-delete-id]").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.stopPropagation();
                deleteDocumentItem(button.dataset.deleteId);
            });
        });

        if (activeDocumentId === null && docs.length > 0) {
            await selectDocument(docs[0].id);
        }
    } catch (error) {
        console.error("Error loading documents:", error);
        showToast(error.message || "Unable to load documents.", "error");
    }
}

/**
 * Selects a document and displays its extracted text.
 */
async function selectDocument(id) {
    try {
        const res = await fetch(`/document/${encodeURIComponent(id)}`);
        const doc = await res.json();

        if (!res.ok || doc.error) {
            throw new Error(doc.error || "Failed to load document.");
        }

        activeDocumentId = doc.id;
        activeDocumentContent = doc.content || "";

        const title = document.getElementById("selectedDocTitle");
        const stats = document.getElementById("docStatsPill");
        const preview = document.getElementById("documentPreviewContent");

        if (title) title.textContent = doc.filename || "Untitled document";

        const words = doc.stats?.words != null
            ? Number(doc.stats.words).toLocaleString()
            : "N/A";

        const minutes = doc.stats?.read_time_min ?? 1;

        if (stats) stats.textContent = `${words} Words • ~${minutes} min read`;

        if (preview) {
            preview.innerHTML = "<pre style='white-space:pre-wrap;'></pre>";
            preview.querySelector("pre").textContent = activeDocumentContent;
        }

        document.querySelectorAll(".history-item-pro").forEach((row) => {
            row.classList.remove("active");
        });

        document.getElementById(`doc-item-${id}`)?.classList.add("active");
    } catch (error) {
        console.error("Error selecting document:", error);
        showToast(error.message || "Failed to load document.", "error");
    }
}

/**
 * Deletes a document from the library.
 */
async function deleteDocumentItem(id) {
    if (!confirm("Are you sure you want to delete this document from your library?")) {
        return;
    }

    try {
        const res = await fetch(`/delete_document/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        let data = {};

        try {
            data = await res.json();
        } catch {
            // The endpoint may return an empty response.
        }

        if (!res.ok || data.error) {
            throw new Error(data.error || "Failed to delete document.");
        }

        if (String(activeDocumentId) === String(id)) {
            activeDocumentId = null;
            activeDocumentContent = "";
            lastAnalysisOutput = "";

            const title = document.getElementById("selectedDocTitle");
            const stats = document.getElementById("docStatsPill");
            const preview = document.getElementById("documentPreviewContent");

            if (title) title.textContent = "No Document Selected";
            if (stats) stats.textContent = "0 Words";

            if (preview) {
                preview.innerHTML = `
                    <div class="empty-state-pro py-5">
                        <i class="bi bi-file-earmark-text display-3 text-muted"></i>
                        <h4 class="mt-3">Document Preview</h4>
                        <p>Select another document from your library.</p>
                    </div>
                `;
            }
        }

        showToast("Document deleted.", "success");
        await loadDocumentList();
    } catch (error) {
        console.error("Error deleting document:", error);
        showToast(error.message || "Error deleting document.", "error");
    }
}

/**
 * Runs the selected analysis type.
 */
async function triggerAnalysis(analysisType) {
    if (!activeDocumentId) {
        showToast("Please upload or select a document first.", "warning");
        return;
    }

    const output = document.getElementById("analysisResultContent");
    const heading = document.getElementById("analysisResultHeading");
    const copyBtn = document.getElementById("copyAnalysisBtn");

    if (!output || !heading) {
        console.error("Analysis output elements were not found.");
        return;
    }

    heading.textContent = `Analyzing: ${String(analysisType).toUpperCase()}...`;
    output.innerHTML = `
        <div class="empty-state-pro py-5">
            <div class="spinner-border text-success mb-3" role="status"></div>
            <h5>Groq AI is reviewing your document...</h5>
            <p class="small text-muted">Processing content and generating insights.</p>
        </div>
    `;

    if (copyBtn) copyBtn.disabled = true;

    try {
        const res = await fetch("/analyze_document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                document_id: activeDocumentId,
                type: analysisType
            })
        });

        const data = await res.json();

        if (!res.ok || data.error) {
            throw new Error(data.error || `Analysis failed (${res.status}).`);
        }

        lastAnalysisOutput = data.answer || "";
        heading.textContent = `${String(analysisType).toUpperCase()} Analysis`;
        output.innerHTML = `<div class="markdown-body-pro">${renderMarkdown(lastAnalysisOutput)}</div>`;

        if (copyBtn) copyBtn.disabled = !lastAnalysisOutput;

        showToast("Analysis complete!", "success");
    } catch (error) {
        console.error("Analysis failed:", error);
        heading.textContent = "AI Analysis Output";
        output.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
        showToast(error.message || "Analysis failed.", "error");
    }
}

/**
 * Asks a question about the selected document.
 */
async function handleGroundedQuestion() {
    if (!activeDocumentId) {
        showToast("Please select a document first.", "warning");
        return;
    }

    const questionInput = document.getElementById("documentQuestionInput");

    if (!questionInput) {
        showToast("Question input was not found.", "error");
        return;
    }

    const question = questionInput.value.trim();

    if (!question) {
        showToast("Please type a question about this document.", "warning");
        questionInput.focus();
        return;
    }

    const output = document.getElementById("analysisResultContent");
    const heading = document.getElementById("analysisResultHeading");
    const copyBtn = document.getElementById("copyAnalysisBtn");

    if (!output || !heading) {
        console.error("Question result elements were not found.");
        return;
    }

    heading.textContent = "Generating an answer...";
    output.innerHTML = `
        <div class="empty-state-pro py-5">
            <div class="spinner-border text-primary mb-3" role="status"></div>
            <h5>Searching document for an answer...</h5>
        </div>
    `;

    if (copyBtn) copyBtn.disabled = true;

    try {
        const res = await fetch("/ask_document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                document_id: activeDocumentId,
                question
            })
        });

        const data = await res.json();

        if (!res.ok || data.error) {
            throw new Error(data.error || `Question failed (${res.status}).`);
        }

        lastAnalysisOutput = data.answer || "";
        heading.textContent = "Grounded Answer";

        output.innerHTML = `
            <div class="p-3 mb-3 rounded-3"
                 style="background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2)">
                <strong class="text-light">Question:</strong>
                <p class="mb-0 text-white"></p>
            </div>
            <div class="markdown-body-pro">${renderMarkdown(lastAnalysisOutput)}</div>
        `;

        output.querySelector(".p-3 p").textContent = question;

        if (copyBtn) copyBtn.disabled = !lastAnalysisOutput;

        questionInput.value = "";
        showToast("Answer generated from document context!", "success");
    } catch (error) {
        console.error("Question failed:", error);
        output.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
        showToast(error.message || "Unable to answer the question.", "error");
    }
}

/**
 * Copies the latest analysis or answer.
 */
function copyAnalysisOutput() {
    if (!lastAnalysisOutput) {
        showToast("There is no analysis output to copy.", "warning");
        return;
    }

    const copyBtn = document.getElementById("copyAnalysisBtn");

    if (typeof copyToClipboard === "function") {
        copyToClipboard(lastAnalysisOutput, copyBtn);
        return;
    }

    navigator.clipboard.writeText(lastAnalysisOutput)
        .then(() => showToast("Analysis copied to clipboard.", "success"))
        .catch((error) => {
            console.error("Clipboard copy failed:", error);
            showToast("Unable to copy the analysis.", "error");
        });
}

/**
 * Escapes text before inserting it into HTML.
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return "";

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
