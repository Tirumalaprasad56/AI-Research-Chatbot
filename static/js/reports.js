// ==========================================================================
// REPORTS STUDIO LOGIC (2026 PRO EDITION)
// ==========================================================================

let currentReportData = null;
let allReportsCache = [];

document.addEventListener("DOMContentLoaded", () => {
    initReportsPage();
});

async function initReportsPage() {
    setupEventListeners();
    await loadHistory();

    // Check query params (e.g. from Dashboard click)
    const urlParams = new URLSearchParams(window.location.search);
    const topicParam = urlParams.get("topic");
    const idParam = urlParams.get("id");

    if (idParam) {
        openReportById(parseInt(idParam));
    } else if (topicParam) {
        document.getElementById("topicInput").value = topicParam;
        generateReport();
    }
}

function setupEventListeners() {
    const generateBtn = document.getElementById("generateReportBtn");
    const topicInput = document.getElementById("topicInput");
    const newReportBtn = document.getElementById("newReportBtn");
    const searchInput = document.getElementById("historySearchInput");
    const copyBtn = document.getElementById("copyReportBtn");
    const favBtn = document.getElementById("favoriteBtn");
    const exportPdf = document.getElementById("exportPdfBtn");
    const exportDocx = document.getElementById("exportDocxBtn");
    const exportMd = document.getElementById("exportMdBtn");

    if (generateBtn) generateBtn.onclick = generateReport;
    if (topicInput) {
        topicInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") generateReport();
        });
    }

    if (newReportBtn) {
        newReportBtn.onclick = () => {
            currentReportData = null;
            document.getElementById("topicInput").value = "";
            document.getElementById("topicInput").focus();
            updateReportViewer(null);
        };
    }

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            filterHistoryList(e.target.value);
        });
    }

    if (copyBtn) {
        copyBtn.onclick = () => {
            if (currentReportData && currentReportData.report) {
                copyToClipboard(currentReportData.report, copyBtn);
            }
        };
    }

    if (favBtn) {
        favBtn.onclick = toggleCurrentFavorite;
    }

    if (exportPdf) exportPdf.onclick = () => triggerExport("pdf");
    if (exportDocx) exportDocx.onclick = () => triggerExport("docx");
    if (exportMd) exportMd.onclick = () => triggerExport("markdown");
}

function setPreset(topic) {
    const input = document.getElementById("topicInput");
    if (input) {
        input.value = topic;
        input.focus();
    }
}

async function generateReport() {
    const topicInput = document.getElementById("topicInput");
    const generateBtn = document.getElementById("generateReportBtn");
    const progressCard = document.getElementById("generationProgressCard");
    const topic = topicInput.value.trim();

    if (!topic) {
        showToast("Please enter a research topic first.", "warning");
        topicInput.focus();
        return;
    }

    // UI Loading State
    generateBtn.disabled = true;
    generateBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Synthesizing...`;
    progressCard.classList.remove("d-none");

    try {
        const res = await fetch("/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic: topic })
        });

        const data = await res.json();
        if (!res.ok || data.error) {
            throw new Error(data.error || "Synthesis failed");
        }

        currentReportData = {
            id: data.id,
            topic: data.topic,
            report: data.report,
            favorite: 0
        };

        updateReportViewer(currentReportData);
        showToast("Research Report generated successfully!", "success");
        await loadHistory();
    } catch (err) {
        console.error(err);
        showToast(err.message, "error");
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = `<i class="bi bi-magic"></i> Generate Report`;
        progressCard.classList.add("d-none");
    }
}

async function loadHistory() {
    const container = document.getElementById("historyListContainer");
    if (!container) return;

    try {
        const res = await fetch("/history");
        if (!res.ok) throw new Error("Failed to load history");
        allReportsCache = await res.json();
        renderHistoryList(allReportsCache);
    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="alert alert-danger py-2 small mb-0">Error loading history</div>`;
    }
}

function renderHistoryList(reports) {
    const container = document.getElementById("historyListContainer");
    if (!container) return;

    if (!reports || reports.length === 0) {
        container.innerHTML = `
            <div class="empty-state-pro py-4">
                <i class="bi bi-inbox fs-2"></i>
                <p class="small">No reports saved yet.</p>
            </div>
        `;
        return;
    }

    let html = "";
    reports.forEach(r => {
        const isCurrent = currentReportData && currentReportData.id === r.id;
        const starClass = r.favorite ? "bi-star-fill fav-active" : "bi-star";

        html += `
            <div class="history-item-pro ${isCurrent ? 'active' : ''}" id="history-row-${r.id}" onclick="openReportById(${r.id})">
                <div class="history-text" title="${r.topic}">
                    <i class="bi bi-file-earmark-text me-1 text-muted"></i>
                    ${r.topic}
                </div>
                <div class="history-actions" onclick="event.stopPropagation()">
                    <button type="button" class="btn-icon-tiny ${r.favorite ? 'fav-active' : ''}" onclick="toggleFavorite(${r.id})" title="Favorite">
                        <i class="bi ${starClass}"></i>
                    </button>
                    <button type="button" class="btn-icon-tiny delete-hover" onclick="deleteReport(${r.id})" title="Delete">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function filterHistoryList(query) {
    if (!query || !query.trim()) {
        renderHistoryList(allReportsCache);
        return;
    }
    const q = query.toLowerCase();
    const filtered = allReportsCache.filter(r => r.topic.toLowerCase().includes(q));
    renderHistoryList(filtered);
}

async function openReportById(id) {
    try {
        const res = await fetch(`/report/${id}`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Report not found");

        currentReportData = data;
        updateReportViewer(data);

        // Update active class in sidebar
        document.querySelectorAll(".history-item-pro").forEach(el => el.classList.remove("active"));
        const activeRow = document.getElementById(`history-row-${id}`);
        if (activeRow) activeRow.classList.add("active");
    } catch (e) {
        showToast(e.message, "error");
    }
}

function updateReportViewer(reportData) {
    const titleEl = document.getElementById("currentReportTopicTitle");
    const contentArea = document.getElementById("reportContentArea");
    const favBtn = document.getElementById("favoriteBtn");
    const copyBtn = document.getElementById("copyReportBtn");
    const exportBtn = document.getElementById("exportDropdownBtn");

    if (!reportData) {
        titleEl.innerHTML = `<i class="bi bi-file-earmark-text text-primary"></i> <span>Research Report Preview</span>`;
        contentArea.innerHTML = `
            <div class="empty-state-pro py-5">
                <i class="bi bi-journal-text display-4 text-muted"></i>
                <h4>No Report Displayed</h4>
                <p>Enter a topic above and click <strong>Generate Report</strong>, or select an existing survey from your history.</p>
            </div>
        `;
        favBtn.disabled = true;
        copyBtn.disabled = true;
        exportBtn.disabled = true;
        return;
    }

    titleEl.innerHTML = `<i class="bi bi-file-earmark-check-fill text-success"></i> <span>${reportData.topic}</span>`;
    contentArea.innerHTML = `<div class="markdown-body-pro">${renderMarkdown(reportData.report)}</div>`;

    favBtn.disabled = false;
    copyBtn.disabled = false;
    exportBtn.disabled = false;

    // Update favorite button icon
    if (reportData.favorite) {
        favBtn.innerHTML = `<i class="bi bi-star-fill text-warning"></i>`;
    } else {
        favBtn.innerHTML = `<i class="bi bi-star"></i>`;
    }
}

async function toggleCurrentFavorite() {
    if (!currentReportData) return;
    await toggleFavorite(currentReportData.id);
}

async function toggleFavorite(id) {
    try {
        const res = await fetch(`/favorite/${id}`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to favorite");

        if (currentReportData && currentReportData.id === id) {
            currentReportData.favorite = currentReportData.favorite ? 0 : 1;
            const favBtn = document.getElementById("favoriteBtn");
            favBtn.innerHTML = currentReportData.favorite 
                ? `<i class="bi bi-star-fill text-warning"></i>` 
                : `<i class="bi bi-star"></i>`;
        }

        await loadHistory();
    } catch (e) {
        showToast("Error updating favorite", "error");
    }
}

async function deleteReport(id) {
    if (!confirm("Are you sure you want to delete this research report?")) return;

    try {
        const res = await fetch(`/delete/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");

        showToast("Report deleted", "info");

        if (currentReportData && currentReportData.id === id) {
            currentReportData = null;
            updateReportViewer(null);
        }

        await loadHistory();
    } catch (e) {
        showToast("Error deleting report", "error");
    }
}

async function triggerExport(format) {
    if (!currentReportData || !currentReportData.report) {
        showToast("No report content to export", "warning");
        return;
    }

    showToast(`Generating ${format.toUpperCase()} export...`, "info");

    try {
        const res = await fetch(`/export/${format}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                report: currentReportData.report,
                title: currentReportData.topic
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Export failed");
        }

        const blob = await res.blob();
        const extension = format === "markdown" ? "md" : format;
        const filename = `${currentReportData.topic.substring(0, 30).replace(/[^a-zA-Z0-9_-]/g, "_")}_Report.${extension}`;
        downloadBlob(blob, filename);
        showToast(`${format.toUpperCase()} downloaded successfully!`, "success");
    } catch (e) {
        showToast(e.message, "error");
    }
}