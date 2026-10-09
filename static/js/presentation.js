// ==========================================================================
// PRESENTATION STUDIO LOGIC (2026 PRO EDITION)
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    setupPresentationEvents();
    loadPresentationHistory();
});

function setupPresentationEvents() {
    const generateBtn = document.getElementById("generatePptBtn");
    const topicInput = document.getElementById("pptTopic");

    if (generateBtn) {
        generateBtn.onclick = handleGeneratePpt;
    }

    if (topicInput) {
        topicInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") handleGeneratePpt();
        });
    }
}

async function handleGeneratePpt() {
    const topicInput = document.getElementById("pptTopic");
    const slideCountSelect = document.getElementById("slideCount");
    const themeRadio = document.querySelector('input[name="pptTheme"]:checked');
    const generateBtn = document.getElementById("generatePptBtn");
    const statusMsg = document.getElementById("pptStatusMessage");
    const previewArea = document.getElementById("slidePreviewArea");
    const statusBadge = document.getElementById("deckStatusBadge");

    const topic = topicInput ? topicInput.value.trim() : "";
    const slideCount = slideCountSelect ? parseInt(slideCountSelect.value) : 8;
    const theme = themeRadio ? themeRadio.value : "Modern";

    if (!topic) {
        showToast("Please enter a presentation topic.", "warning");
        if (topicInput) topicInput.focus();
        return;
    }

    // UI Loading state
    generateBtn.disabled = true;
    generateBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Synthesizing Deck...`;
    statusBadge.className = "badge bg-warning bg-opacity-25 text-warning";
    statusBadge.innerText = "Generating...";

    statusMsg.innerHTML = `
        <div class="alert alert-primary d-flex align-items-center gap-3 mb-0" style="background:rgba(59, 130, 246, 0.15); border-color:rgba(59, 130, 246, 0.3); color:#93c5fd;">
            <div class="spinner-border spinner-border-sm" role="status"></div>
            <div>
                <strong>Structuring slide deck...</strong>
                <div class="small">Groq AI is designing ${slideCount} structured slides in '${theme}' theme.</div>
            </div>
        </div>
    `;

    try {
        const response = await fetch("/generate_ppt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                topic: topic,
                slides: slideCount,
                theme: theme
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || "Presentation generation failed.");
        }

        const blob = await response.blob();
        const filename = `${topic.substring(0, 30).replace(/[^a-zA-Z0-9_-]/g, "_")}_Presentation.pptx`;

        // Trigger immediate download
        downloadBlob(blob, filename);

        // Success state
        statusBadge.className = "badge bg-success bg-opacity-25 text-success";
        statusBadge.innerText = "Completed";

        statusMsg.innerHTML = `
            <div class="alert alert-success d-flex align-items-center justify-content-between mb-0" style="background:rgba(16, 185, 129, 0.15); border-color:rgba(16, 185, 129, 0.3); color:#6ee7b7;">
                <div class="d-flex align-items-center gap-2">
                    <i class="bi bi-check-circle-fill fs-5"></i>
                    <span><strong>Presentation Deck Ready!</strong> File downloaded automatically.</span>
                </div>
                <button type="button" class="btn btn-sm btn-outline-success" onclick="downloadLastBlob()">
                    <i class="bi bi-download"></i> Re-download
                </button>
            </div>
        `;

        // Cache last blob for re-download button
        window._lastPptBlob = blob;
        window._lastPptFilename = filename;

        // Render preview mock deck
        previewArea.innerHTML = `
            <div class="deck-preview-wrapper">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="text-white mb-0"><i class="bi bi-file-earmark-ppt-fill text-danger me-2"></i>${topic}</h5>
                    <span class="badge bg-primary bg-opacity-25 text-info">${slideCount} Slides &bull; ${theme} Theme</span>
                </div>
                <div class="card p-3 mb-3" style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
                    <div class="text-muted small text-uppercase fw-bold mb-1">Slide 1: Title & Overview</div>
                    <h6 class="text-primary mb-2">${topic}</h6>
                    <p class="text-muted small mb-0">Executive research briefing generated with high-speed Groq AI inference.</p>
                </div>
                <div class="card p-3 mb-3" style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
                    <div class="text-muted small text-uppercase fw-bold mb-1">Slide 2: Background & Context</div>
                    <h6 class="text-primary mb-2">Core Foundations</h6>
                    <ul class="text-secondary small mb-0 ps-3">
                        <li>Technological evolution and prevailing industry paradigms</li>
                        <li>Methodological benchmarks and architectural considerations</li>
                    </ul>
                </div>
                <div class="card p-3" style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
                    <div class="text-muted small text-uppercase fw-bold mb-1">Slide 3 to ${slideCount}: Content & Roadmap</div>
                    <p class="text-secondary small mb-0">Contains deep-dive comparative analyses, system methodologies, empirical findings, and strategic takeaways.</p>
                </div>
            </div>
        `;

        showToast("PowerPoint deck generated and downloaded successfully!", "success");
        await loadPresentationHistory();
    } catch (err) {
        console.error(err);
        statusBadge.className = "badge bg-danger bg-opacity-25 text-danger";
        statusBadge.innerText = "Error";
        statusMsg.innerHTML = `
            <div class="alert alert-danger d-flex align-items-center gap-2 mb-0">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <span>${err.message}</span>
            </div>
        `;
        showToast(err.message, "error");
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = `<i class="bi bi-file-earmark-ppt-fill fs-5"></i> <span>Generate Presentation (.pptx)</span>`;
    }
}

function downloadLastBlob() {
    if (window._lastPptBlob && window._lastPptFilename) {
        downloadBlob(window._lastPptBlob, window._lastPptFilename);
        showToast("Download restarted", "info");
    }
}

async function loadPresentationHistory() {
    const container = document.getElementById("presentationHistoryList");
    if (!container) return;

    try {
        const res = await fetch("/presentations");
        if (!res.ok) return;
        const presentations = await res.json();

        if (!presentations || presentations.length === 0) {
            container.innerHTML = `<div class="empty-state-pro py-3"><p class="small mb-0">No past presentations found.</p></div>`;
            return;
        }

        let html = '<div class="d-flex flex-column gap-2">';
        presentations.slice(0, 6).forEach(p => {
            const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : '';
            html += `
                <div class="history-item-pro py-2">
                    <div class="history-text" title="${p.topic}">
                        <i class="bi bi-file-earmark-ppt text-danger me-1"></i>
                        <span>${p.topic}</span>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-secondary bg-opacity-25 text-light px-2" style="font-size:10px;">${p.slides_count} slides</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (e) {
        console.error("Error loading presentation history:", e);
    }
}