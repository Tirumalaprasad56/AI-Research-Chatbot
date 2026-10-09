// ==========================================================================
// DOCUMENT & PAPER ANALYZER LOGIC (2026 PRO EDITION)
// ==========================================================================

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

    // Dropzone click -> file select
    if (dropzone && fileInput) {
        dropzone.onclick = () => fileInput.click();

        dropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropzone.style.borderColor = "var(--accent-primary)";
            dropzone.style.background = "rgba(59, 130, 246, 0.08)";
        });

        dropzone.addEventListener("dragleave", () => {
            dropzone.style.borderColor = "var(--border-subtle)";
            dropzone.style.background = "var(--bg-input)";
        });

        dropzone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropzone.style.borderColor = "var(--border-subtle)";
            dropzone.style.background = "var(--bg-input)";
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelected();
            }
        });

        fileInput.addEventListener("change", handleFileSelected);
    }

    if (uploadBtn) {
        uploadBtn.onclick = handleDocumentUpload;
    }

    if (askBtn) {
        askBtn.onclick = handleGroundedQuestion;
    }

    if (questionInput) {
        questionInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") handleGroundedQuestion();
        });
    }
}

function handleFileSelected() {
    const fileInput = document.getElementById("documentFileInput");
    const uploadBtn = document.getElementById("uploadDocumentBtn");
    const dropzone = document.getElementById("dropzoneArea");

    if (fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = `<i class="bi bi-cloud-arrow-up-fill me-1"></i> Upload "${file.name}"`;
        dropzone.innerHTML = `
            <i class="bi bi-file-earmark-check-fill text-success display-4 mb-2 d-inline-block"></i>
            <h6 class="text-white mb-1">${file.name}</h6>
            <p class="text-muted small mb-0">${(file.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready to upload</p>
        `;
    }
}

async function handleDocumentUpload() {
    const fileInput = document.getElementById("documentFileInput");
    const uploadBtn = document.getElementById("uploadDocumentBtn");

    if (!fileInput.files || fileInput.files.length === 0) {
        showToast("Please choose a document to upload", "warning");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    uploadBtn.disabled = true;
    uploadBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Parsing & Extracting Text...`;

    try {
        const res = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Upload failed");

        showToast("Document uploaded and parsed successfully!", "success");

        // Reset dropzone
        const dropzone = document.getElementById("dropzoneArea");
        dropzone.innerHTML = `
            <i class="bi bi-file-earmark-arrow-up display-4 text-primary mb-2 d-inline-block"></i>
            <h6 class="text-light mb-1">Click to browse or drop file here</h6>
            <p class="text-muted small mb-0">PDF (.pdf), Word (.docx), or Text (.txt) up to 32MB</p>
        `;
        fileInput.value = "";
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = `<i class="bi bi-upload"></i> Upload & Parse Document`;

        // Load document list and open new document
        await loadDocumentList();
        if (data.id) {
            await selectDocument(data.id);
        }
    } catch (err) {
        console.error(err);
        showToast(err.message, "error");
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = `<i class="bi bi-upload"></i> Retry Upload`;
    }
}

async function loadDocumentList() {
    const container = document.getElementById("documentListContainer");
    if (!container) return;

    try {
        const res = await fetch("/documents", {
            headers: { "Accept": "application/json" }
        });
        const docs = await res.json();

        if (!docs || docs.length === 0) {
            container.innerHTML = `
                <div class="empty-state-pro py-4">
                    <i class="bi bi-folder-x fs-2"></i>
                    <p class="small">No uploaded documents yet.</p>
                </div>
            `;
            return;
        }

        let html = '<div class="d-flex flex-column gap-2">';
        docs.forEach(d => {
            const isSelected = activeDocumentId === d.id;
            html += `
                <div class="history-item-pro ${isSelected ? 'active' : ''}" id="doc-item-${d.id}" onclick="selectDocument(${d.id})">
                    <div class="history-text" title="${d.filename}">
                        <i class="bi bi-file-earmark-pdf-fill text-danger me-1"></i>
                        <span>${d.filename}</span>
                    </div>
                    <div class="history-actions" onclick="event.stopPropagation()">
                        <button type="button" class="btn-icon-tiny delete-hover" onclick="deleteDocumentItem(${d.id})" title="Delete">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;

        // Auto-select first doc if none selected
        if (activeDocumentId === null && docs.length > 0) {
            selectDocument(docs[0].id);
        }
    } catch (e) {
        console.error("Error loading documents:", e);
    }
}

async function selectDocument(id) {
    try {
        const res = await fetch(`/document/${id}`);
        const doc = await res.json();
        if (!res.ok || doc.error) throw new Error(doc.error || "Failed to load document");

        activeDocumentId = doc.id;
        activeDocumentContent = doc.content;

        // Update UI preview
        document.getElementById("selectedDocTitle").innerText = doc.filename;
        const words = doc.stats ? doc.stats.words.toLocaleString() : "N/A";
        const readTime = doc.stats ? doc.stats.read_time_min : 1;
        document.getElementById("docStatsPill").innerText = `${words} Words &bull; ~${readTime} min read`;

        const previewBox = document.getElementById("documentPreviewContent");
        previewBox.innerHTML = `
            <pre style="white-space: pre-wrap; font-family: var(--font-mono); font-size: 13px; color: var(--text-secondary); margin: 0;">${escapeHtml(doc.content)}</pre>
        `;

        // Highlight active list row
        document.querySelectorAll(".history-item-pro").forEach(el => el.classList.remove("active"));
        const row = document.getElementById(`doc-item-${id}`);
        if (row) row.classList.add("active");
    } catch (e) {
        showToast(e.message, "error");
    }
}

async function deleteDocumentItem(id) {
    if (!confirm("Are you sure you want to delete this document from your library?")) return;

    try {
        const res = await fetch(`/delete_document/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");

        showToast("Document deleted", "info");

        if (activeDocumentId === id) {
            activeDocumentId = null;
            activeDocumentContent = "";
            document.getElementById("selectedDocTitle").innerText = "No Document Selected";
            document.getElementById("docStatsPill").innerText = "0 Words";
            document.getElementById("documentPreviewContent").innerHTML = `
                <div class="empty-state-pro py-5">
                    <i class="bi bi-file-earmark-text display-3 text-muted"></i>
                    <h4 class="mt-3">Document Preview</h4>
                    <p>Select another document from your library.</p>
                </div>
            `;
        }

        await loadDocumentList();
    } catch (e) {
        showToast("Error deleting document", "error");
    }
}

async function triggerAnalysis(analysisType) {
    if (!activeDocumentId) {
        showToast("Please upload or select a document first.", "warning");
        return;
    }

    const outputContainer = document.getElementById("analysisResultContent");
    const heading = document.getElementById("analysisResultHeading");
    const copyBtn = document.getElementById("copyAnalysisBtn");

    heading.innerHTML = `<span class="spinner-border spinner-border-sm text-success me-2"></span> Analyzing: ${analysisType.toUpperCase()}...`;
    outputContainer.innerHTML = `
        <div class="empty-state-pro py-5">
            <div class="spinner-border text-success mb-3" role="status"></div>
            <h5>Groq AI is reviewing your document...</h5>
            <p class="small text-muted">Processing content, synthesizing key insights, and cross-checking references.</p>
        </div>
    `;

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
        if (!res.ok || data.error) throw new Error(data.error || "Analysis failed");

        lastAnalysisOutput = data.answer;
        heading.innerHTML = `<i class="bi bi-cpu text-success fs-5 me-2"></i> ${analysisType.toUpperCase()} Analysis`;
        outputContainer.innerHTML = `<div class="markdown-body-pro">${renderMarkdown(data.answer)}</div>`;
        copyBtn.disabled = false;
        showToast(`${analysisType.toUpperCase()} analysis complete!`, "success");
    } catch (err) {
        console.error(err);
        heading.innerHTML = `AI Analysis Output`;
        outputContainer.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
        showToast(err.message, "error");
    }
}

async function handleGroundedQuestion() {
    if (!activeDocumentId) {
        showToast("Please select a document first.", "warning");
        return;
    }

    const questionInput = document.getElementById("documentQuestionInput");
    const question = questionInput.value.trim();
    if (!question) {
        showToast("Please type a question about this document.", "warning");
        questionInput.focus();
        return;
    }

    const outputContainer = document.getElementById("analysisResultContent");
    const heading = document.getElementById("analysisResultHeading");
    const copyBtn = document.getElementById("copyAnalysisBtn");

    heading.innerHTML = `<span class="spinner-border spinner-border-sm text-primary me-2"></span> Answering: "${question.substring(0, 30)}..."`;
    outputContainer.innerHTML = `
        <div class="empty-state-pro py-5">
            <div class="spinner-border text-primary mb-3" role="status"></div>
            <h5>Searching document for verified answer...</h5>
            <p class="small text-muted">Grounding response strictly in text facts without hallucinations.</p>
        </div>
    `;

    try {
        const res = await fetch("/ask_document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                document_id: activeDocumentId,
                question: question
            })
        });

        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Query failed");

        lastAnalysisOutput = data.answer;
        heading.innerHTML = `<i class="bi bi-chat-quote-fill text-primary me-2"></i> Grounded Answer`;
        outputContainer.innerHTML = `
            <div class="p-3 mb-3 rounded-3" style="background:rgba(59, 130, 246, 0.1); border:1px solid rgba(59, 130, 246, 0.2);">
                <strong class="text-light">Question:</strong>
                <p class="mb-0 text-white">${escapeHtml(question)}</p>
            </div>
            <div class="markdown-body-pro">${renderMarkdown(data.answer)}</div>
        `;
        copyBtn.disabled = false;
        questionInput.value = "";
        showToast("Answer generated from document context!", "success");
    } catch (err) {
        console.error(err);
        outputContainer.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
        showToast(err.message, "error");
    }
}

function copyAnalysisOutput() {
    if (lastAnalysisOutput) {
        const copyBtn = document.getElementById("copyAnalysisBtn");
        copyToClipboard(lastAnalysisOutput, copyBtn);
    }
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}