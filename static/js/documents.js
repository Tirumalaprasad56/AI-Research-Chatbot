// ==========================================================================
// RESEARCH PAPERS LIBRARY LOGIC (2026 PRO EDITION)
// ==========================================================================

let activePaperId = null;
let allPapersList = [];

document.addEventListener("DOMContentLoaded", () => {
    setupPapersEvents();
    loadPapers();
});

function setupPapersEvents() {
    const uploadBtn = document.getElementById("uploadPaperBtn");
    const fileInput = document.getElementById("paperFileInput");
    const searchInput = document.getElementById("paperSearchInput");

    if (uploadBtn && fileInput) {
        uploadBtn.onclick = async () => {
            if (!fileInput.files || fileInput.files.length === 0) {
                showToast("Please select a paper to upload", "warning");
                return;
            }

            const formData = new FormData();
            formData.append("file", fileInput.files[0]);

            uploadBtn.disabled = true;
            uploadBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Uploading...`;

            try {
                const res = await fetch("/upload", {
                    method: "POST",
                    body: formData
                });
                const data = await res.json();
                if (!res.ok || data.error) throw new Error(data.error || "Upload failed");

                showToast("Research paper uploaded successfully!", "success");
                fileInput.value = "";
                await loadPapers();
                if (data.id) selectPaper(data.id);
            } catch (err) {
                showToast(err.message, "error");
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = `<i class="bi bi-cloud-arrow-up"></i> Upload Paper`;
            }
        };
    }

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            filterPapers(e.target.value);
        });
    }
}

async function loadPapers() {
    const container = document.getElementById("paperListContainer");
    const badge = document.getElementById("paperCountBadge");
    if (!container) return;

    try {
        const res = await fetch("/documents", {
            headers: { "Accept": "application/json" }
        });
        allPapersList = await res.json();

        if (badge) badge.innerText = `${allPapersList.length} files`;
        renderPapersList(allPapersList);

        if (activePaperId === null && allPapersList.length > 0) {
            selectPaper(allPapersList[0].id);
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="alert alert-danger py-2 small">Error loading library</div>`;
    }
}

function renderPapersList(papers) {
    const container = document.getElementById("paperListContainer");
    if (!container) return;

    if (!papers || papers.length === 0) {
        container.innerHTML = `
            <div class="empty-state-pro py-4">
                <i class="bi bi-inbox fs-2"></i>
                <p class="small mb-0">No research papers in library.</p>
            </div>
        `;
        return;
    }

    let html = '<div class="d-flex flex-column gap-2">';
    papers.forEach(p => {
        const isSelected = activePaperId === p.id;
        html += `
            <div class="history-item-pro ${isSelected ? 'active' : ''}" id="paper-row-${p.id}" onclick="selectPaper(${p.id})">
                <div class="history-text" title="${p.filename}">
                    <i class="bi bi-file-earmark-pdf-fill text-danger me-1"></i>
                    <span>${p.filename}</span>
                </div>
                <div class="history-actions" onclick="event.stopPropagation()">
                    <button type="button" class="btn-icon-tiny delete-hover" onclick="deletePaperItem(${p.id})" title="Delete">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function filterPapers(query) {
    if (!query || !query.trim()) {
        renderPapersList(allPapersList);
        return;
    }
    const q = query.toLowerCase();
    const filtered = allPapersList.filter(p => p.filename.toLowerCase().includes(q));
    renderPapersList(filtered);
}

async function selectPaper(id) {
    try {
        const res = await fetch(`/document/${id}`);
        const doc = await res.json();
        if (!res.ok || doc.error) throw new Error(doc.error || "Failed to load paper");

        activePaperId = doc.id;
        document.getElementById("activePaperTitle").innerText = doc.filename;

        const reader = document.getElementById("paperReaderArea");
        reader.innerHTML = `
            <pre style="white-space: pre-wrap; font-family: var(--font-mono); font-size: 13.5px; color: var(--text-secondary); margin: 0; line-height: 1.6;">${escapeHtml(doc.content)}</pre>
        `;

        document.querySelectorAll(".history-item-pro").forEach(el => el.classList.remove("active"));
        const row = document.getElementById(`paper-row-${id}`);
        if (row) row.classList.add("active");
    } catch (e) {
        showToast(e.message, "error");
    }
}

async function deletePaperItem(id) {
    if (!confirm("Are you sure you want to delete this research paper?")) return;

    try {
        const res = await fetch(`/delete_document/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");

        showToast("Paper deleted", "info");
        if (activePaperId === id) {
            activePaperId = null;
            document.getElementById("activePaperTitle").innerText = "Select a Paper to Read";
            document.getElementById("paperReaderArea").innerHTML = `
                <div class="empty-state-pro py-5">
                    <i class="bi bi-journal-text display-3 text-muted"></i>
                    <h4 class="mt-3">No Paper Loaded</h4>
                    <p>Select another document from your library.</p>
                </div>
            `;
        }
        await loadPapers();
    } catch (e) {
        showToast("Error deleting paper", "error");
    }
}

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}